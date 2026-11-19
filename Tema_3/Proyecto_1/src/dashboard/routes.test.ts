import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createApp } from "../app";
import { initDb, type DB } from "../db";
import { createDashboardService } from "./service";

let db: DB;
let server: Server;
let baseUrl: string;

beforeEach(async () => {
  db = initDb(":memory:");
  server = createApp(db).listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterEach(async () => {
  await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  db.close();
});

async function request(method: string, path: string, opts: { token?: string; body?: unknown } = {}) {
  const headers: Record<string, string> = {};
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    redirect: "manual",
  });
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? ((await res.json()) as any) : (await res.text(), null);
  return { status: res.status, body };
}

async function registerUser(email: string) {
  const { body } = await request("POST", "/auth/register", {
    body: { email, password: "secreto123", name: email.split("@")[0] },
  });
  return { token: body.token as string, id: body.user.id as number };
}

async function createUrl(token: string, url = "https://example.com/pagina"): Promise<string> {
  const { body } = await request("POST", "/urls", { token, body: { url } });
  return body.url.code;
}

/** Click real a través del redirect público. */
async function visit(code: string, times = 1) {
  for (let i = 0; i < times; i++) await request("GET", `/${code}`);
}

/** Inserta clicks históricos directamente (con fecha relativa a ahora, formato datetime()). */
function backdateClicks(code: string, count: number, modifier: string) {
  const insert = db.prepare(
    "INSERT INTO clicks (url_id, clicked_at) SELECT id, datetime('now', ?) FROM urls WHERE code = ?"
  );
  for (let i = 0; i < count; i++) insert.run(modifier, code);
}

/** Calcula una fecha con el mismo reloj y formato que usa SQLite. */
function sqlDate(...modifiers: string[]): string {
  const placeholders = modifiers.map(() => "?").join(", ");
  return (db.prepare(`SELECT date('now'${modifiers.length ? ", " + placeholders : ""}) AS d`).get(...modifiers) as {
    d: string;
  }).d;
}

const dashboard = (token: string, query = "") => request("GET", `/dashboard${query}`, { token });

describe("GET /dashboard: autenticación", () => {
  it("401 sin token", async () => {
    const { status, body } = await request("GET", "/dashboard");
    expect(status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("401 con token inválido", async () => {
    const { status } = await dashboard("basura");
    expect(status).toBe(401);
  });

  it("401 con esquema distinto de Bearer", async () => {
    const res = await fetch(`${baseUrl}/dashboard`, { headers: { Authorization: "Basic abc" } });
    expect(res.status).toBe(401);
  });
});

describe("GET /dashboard: usuario sin URLs", () => {
  it("devuelve totales en cero y una serie de 30 días vacía", async () => {
    const ana = await registerUser("ana@example.com");
    const { status, body } = await dashboard(ana.token);

    expect(status).toBe(200);
    const d = body.dashboard;
    expect(d.totals).toEqual({ urls: 0, clicks: 0, avgClicksPerUrl: 0, neverClicked: 0, lastCreatedAt: null });
    expect(d.trend.weekOverWeek).toEqual({ last7Days: 0, previous7Days: 0, changePct: null });
    expect(d.range).toEqual({ days: 30, utcOffset: 0, from: sqlDate("-29 days"), to: sqlDate() });

    expect(d.trend.daily).toHaveLength(30);
    expect(d.trend.daily.every((p: any) => p.clicks === 0 && p.urlsCreated === 0)).toBe(true);
    expect(d.trend.daily[0].date).toBe(d.range.from);
    expect(d.trend.daily.at(-1).date).toBe(d.range.to);
  });

  it("no ve las URLs ni los clicks de otros usuarios", async () => {
    const ana = await registerUser("ana@example.com");
    const beto = await registerUser("beto@example.com");
    const code = await createUrl(beto.token);
    await visit(code, 3);

    const { body } = await dashboard(ana.token);
    expect(body.dashboard.totals.urls).toBe(0);
    expect(body.dashboard.totals.clicks).toBe(0);
    expect(body.dashboard.trend.daily.every((p: any) => p.clicks === 0 && p.urlsCreated === 0)).toBe(true);
  });
});

describe("GET /dashboard: usuario con URLs y clicks", () => {
  it("calcula totales y la tendencia de hoy con clicks reales del redirect", async () => {
    const ana = await registerUser("ana@example.com");
    const a = await createUrl(ana.token, "https://a.example.com/");
    const b = await createUrl(ana.token, "https://b.example.com/");
    await createUrl(ana.token, "https://c.example.com/"); // nunca visitada
    await visit(a, 2);
    await visit(b, 1);

    const { status, body } = await dashboard(ana.token);
    expect(status).toBe(200);
    const d = body.dashboard;

    expect(d.totals).toMatchObject({ urls: 3, clicks: 3, avgClicksPerUrl: 1, neverClicked: 1 });
    expect(d.totals.lastCreatedAt).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    expect(d.trend.daily.at(-1)).toEqual({ date: sqlDate(), clicks: 3, urlsCreated: 3 });
    expect(d.trend.weekOverWeek).toEqual({ last7Days: 3, previous7Days: 0, changePct: null });
  });

  it("agrupa clicks históricos por día, excluye los de fuera del rango y compara semanas", async () => {
    const ana = await registerUser("ana@example.com");
    const code = await createUrl(ana.token);
    backdateClicks(code, 2, "-3 days");
    backdateClicks(code, 1, "-10 days");
    backdateClicks(code, 4, "-40 days"); // fuera de la ventana de 30 días y de las dos semanas

    const { body } = await dashboard(ana.token);
    const byDate = new Map(body.dashboard.trend.daily.map((p: any) => [p.date, p.clicks]));

    expect(byDate.get(sqlDate("-3 days"))).toBe(2);
    expect(byDate.get(sqlDate("-10 days"))).toBe(1);
    expect(body.dashboard.trend.daily.reduce((s: number, p: any) => s + p.clicks, 0)).toBe(3);
    expect(body.dashboard.trend.weekOverWeek).toEqual({ last7Days: 2, previous7Days: 1, changePct: 100 });
  });

  it("calcula un changePct negativo", async () => {
    const ana = await registerUser("ana@example.com");
    const code = await createUrl(ana.token);
    backdateClicks(code, 1, "-2 days");
    backdateClicks(code, 4, "-9 days");

    const { body } = await dashboard(ana.token);
    expect(body.dashboard.trend.weekOverWeek).toEqual({ last7Days: 1, previous7Days: 4, changePct: -75 });
  });

  it("respeta 'days' y agrupa por el día local según 'utcOffset'", async () => {
    const ana = await registerUser("ana@example.com");
    const code = await createUrl(ana.token);
    // 03:00 UTC de hace 2 días = 22:00 del día anterior en UTC-5.
    const clickedAt = `${sqlDate("-2 days")} 03:00:00`;
    db.prepare("INSERT INTO clicks (url_id, clicked_at) SELECT id, ? FROM urls WHERE code = ?").run(clickedAt, code);

    const utc = (await dashboard(ana.token, "?days=7")).body.dashboard;
    expect(utc.trend.daily).toHaveLength(7);
    expect(utc.trend.daily.find((p: any) => p.date === sqlDate("-2 days")).clicks).toBe(1);

    const bogota = (await dashboard(ana.token, "?days=7&utcOffset=-300")).body.dashboard;
    const localDay = (db.prepare("SELECT date(?, '-300 minutes') AS d").get(clickedAt) as { d: string }).d;
    expect(bogota.range).toMatchObject({ days: 7, utcOffset: -300 });
    expect(bogota.trend.daily).toHaveLength(7);
    expect(bogota.trend.daily.find((p: any) => p.date === localDay).clicks).toBe(1);
    expect(localDay).toBe(sqlDate("-3 days"));
  });

  it("al borrar una URL sus clicks desaparecen del dashboard (CASCADE)", async () => {
    const ana = await registerUser("ana@example.com");
    const code = await createUrl(ana.token);
    await visit(code, 2);

    await request("DELETE", `/urls/${code}`, { token: ana.token });
    const { body } = await dashboard(ana.token);

    expect(body.dashboard.totals.clicks).toBe(0);
    expect(body.dashboard.trend.weekOverWeek.last7Days).toBe(0);
    expect(db.prepare("SELECT COUNT(*) AS n FROM clicks").get()).toEqual({ n: 0 });
  });
});

describe("GET /dashboard: validación de parámetros", () => {
  it.each([["?days=0"], ["?days=91"], ["?days=abc"], ["?days=7.5"], ["?utcOffset=1000"], ["?utcOffset=-800"], ["?days=7&days=8"]])(
    "400 con %s",
    async (query) => {
      const ana = await registerUser("ana@example.com");
      const { status, body } = await dashboard(ana.token, query);
      expect(status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    }
  );

  it("acepta los límites del rango", async () => {
    const ana = await registerUser("ana@example.com");
    expect((await dashboard(ana.token, "?days=1&utcOffset=-720")).body.dashboard.trend.daily).toHaveLength(1);
    expect((await dashboard(ana.token, "?days=90&utcOffset=840")).body.dashboard.trend.daily).toHaveLength(90);
  });
});

describe("createDashboardService: reloj único por petición", () => {
  it("usa el reloj inyectado para el rango, aunque sea cerca de medianoche", () => {
    const local = initDb(":memory:");
    const userId = Number(
      local.prepare("INSERT INTO users (email, password_hash, name) VALUES ('x@x.com', 'h', 'x') RETURNING id").pluck().get()
    );
    const service = createDashboardService(local, () => new Date("2026-03-01T23:59:59Z"));

    const d = service.get(userId, { days: 3, utcOffset: 0 });
    expect(d.range).toEqual({ days: 3, utcOffset: 0, from: "2026-02-27", to: "2026-03-01" });
    expect(d.trend.daily.map((p) => p.date)).toEqual(["2026-02-27", "2026-02-28", "2026-03-01"]);

    const bogota = service.get(userId, { days: 3, utcOffset: -300 });
    expect(bogota.range).toMatchObject({ from: "2026-02-27", to: "2026-03-01" });
    local.close();
  });
});
