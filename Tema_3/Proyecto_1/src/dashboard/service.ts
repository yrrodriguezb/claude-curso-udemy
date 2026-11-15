import type { DB } from "../db";

export const DEFAULT_DAYS = 30;
export const MIN_DAYS = 1;
export const MAX_DAYS = 90;
/** Desfase respecto a UTC en minutos (Colombia = -300). Rango real de zonas horarias. */
export const MIN_UTC_OFFSET = -720;
export const MAX_UTC_OFFSET = 840;

export interface DashboardOptions {
  days: number;
  utcOffset: number;
}

export interface DailyPoint {
  date: string; // YYYY-MM-DD en la zona horaria pedida
  clicks: number;
  urlsCreated: number;
}

export interface Dashboard {
  range: { days: number; utcOffset: number; from: string; to: string };
  totals: {
    urls: number;
    clicks: number; // histórico, desde urls.clicks
    avgClicksPerUrl: number;
    neverClicked: number;
    lastCreatedAt: string | null;
  };
  trend: {
    daily: DailyPoint[]; // siempre `days` elementos, orden ascendente
    weekOverWeek: { last7Days: number; previous7Days: number; changePct: number | null };
  };
}

/** Fecha en el formato que usa datetime() de SQLite: 'YYYY-MM-DD HH:MM:SS' en UTC. */
export function toSqliteDateTime(date: Date): string {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function nextDay(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

interface RangeRow {
  today: string;
  start_day: string;
  start_utc: string;
}

interface TotalsRow {
  urls: number;
  clicks: number;
  avg_clicks: number;
  never_clicked: number;
  last_created_at: string | null;
}

interface DayCountRow {
  day: string;
  n: number;
}

interface WeekRow {
  last7: number;
  previous7: number;
}

/**
 * Dashboard por usuario. Todas las queries reciben el mismo `@now` (calculado una vez
 * en JS) para que la respuesta sea coherente aunque la petición cruce la medianoche.
 * `clock` es inyectable para tests.
 */
export function createDashboardService(db: DB, clock: () => Date = () => new Date()) {
  // Calendario del rango en hora local + su inicio convertido a UTC (para filtrar por índice).
  const rangeStmt = db.prepare<{ now: string; off: string; negOff: string; back: string }, RangeRow>(`
    SELECT date(@now, @off)                                AS today,
           date(@now, @off, @back)                         AS start_day,
           datetime(date(@now, @off, @back), @negOff)      AS start_utc
  `);

  const totalsStmt = db.prepare<{ userId: number }, TotalsRow>(`
    SELECT COUNT(*)                            AS urls,
           COALESCE(SUM(clicks), 0)            AS clicks,
           COALESCE(ROUND(AVG(clicks), 1), 0)  AS avg_clicks,
           COALESCE(SUM(clicks = 0), 0)        AS never_clicked,
           MAX(created_at)                     AS last_created_at
    FROM urls
    WHERE user_id = @userId
  `);

  // Usa idx_urls_user_id + idx_clicks_url_time (índice de cobertura, no lee la tabla clicks).
  const clicksPerDayStmt = db.prepare<{ userId: number; off: string; startUtc: string; now: string }, DayCountRow>(`
    SELECT date(c.clicked_at, @off) AS day, COUNT(*) AS n
    FROM clicks c
    JOIN urls u ON u.id = c.url_id
    WHERE u.user_id = @userId
      AND c.clicked_at >= @startUtc
      AND c.clicked_at <= @now
    GROUP BY day
  `);

  const urlsPerDayStmt = db.prepare<{ userId: number; off: string; startUtc: string; now: string }, DayCountRow>(`
    SELECT date(created_at, @off) AS day, COUNT(*) AS n
    FROM urls
    WHERE user_id = @userId
      AND created_at >= @startUtc
      AND created_at <= @now
    GROUP BY day
  `);

  // Ventanas móviles de 7×24 h: no dependen de la zona horaria.
  const weekStmt = db.prepare<{ userId: number; now: string }, WeekRow>(`
    SELECT COALESCE(SUM(c.clicked_at >= datetime(@now, '-7 days')), 0) AS last7,
           COALESCE(SUM(c.clicked_at <  datetime(@now, '-7 days')), 0) AS previous7
    FROM clicks c
    JOIN urls u ON u.id = c.url_id
    WHERE u.user_id = @userId
      AND c.clicked_at >= datetime(@now, '-14 days')
      AND c.clicked_at <= @now
  `);

  function get(userId: number, { days, utcOffset }: DashboardOptions): Dashboard {
    const now = toSqliteDateTime(clock());
    const off = `${utcOffset} minutes`;
    const range = rangeStmt.get({ now, off, negOff: `${-utcOffset} minutes`, back: `-${days - 1} days` })!;
    const window = { userId, off, startUtc: range.start_utc, now };

    const totals = totalsStmt.get({ userId })!;
    const clicksByDay = new Map(clicksPerDayStmt.all(window).map((r) => [r.day, r.n]));
    const urlsByDay = new Map(urlsPerDayStmt.all(window).map((r) => [r.day, r.n]));
    const week = weekStmt.get({ userId, now })!;

    // Rellena con 0 los días sin datos para que la serie sea continua.
    const daily: DailyPoint[] = [];
    for (let day = range.start_day; day <= range.today; day = nextDay(day)) {
      daily.push({ date: day, clicks: clicksByDay.get(day) ?? 0, urlsCreated: urlsByDay.get(day) ?? 0 });
    }

    const changePct =
      week.previous7 === 0 ? null : Math.round(((week.last7 - week.previous7) / week.previous7) * 1000) / 10;

    return {
      range: { days, utcOffset, from: range.start_day, to: range.today },
      totals: {
        urls: totals.urls,
        clicks: totals.clicks,
        avgClicksPerUrl: totals.avg_clicks,
        neverClicked: totals.never_clicked,
        lastCreatedAt: totals.last_created_at,
      },
      trend: {
        daily,
        weekOverWeek: { last7Days: week.last7, previous7Days: week.previous7, changePct },
      },
    };
  }

  return { get };
}

export type DashboardService = ReturnType<typeof createDashboardService>;
