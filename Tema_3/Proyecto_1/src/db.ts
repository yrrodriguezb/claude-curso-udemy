import Database from "better-sqlite3";

export type DB = Database.Database;

/**
 * Abre (o crea) la base de datos SQLite e inicializa el schema.
 * Usa ":memory:" para tests.
 */
export function initDb(filename: string = process.env.DB_PATH ?? "data.db"): DB {
  const db = new Database(filename);
  db.pragma("foreign_keys = ON");
  // WAL: lecturas y escrituras no se bloquean entre sí y cada commit no hace fsync del journal
  // (el redirect pasa de ~3 ms a ~0,06 ms). Con WAL, synchronous=NORMAL no corrompe la base
  // ante un corte de luz; como mucho se pierden los últimos commits. En ":memory:" no aplica.
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      email         TEXT    NOT NULL UNIQUE,
      password_hash TEXT    NOT NULL,
      name          TEXT    NOT NULL,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS urls (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      code       TEXT    NOT NULL UNIQUE,
      target_url TEXT    NOT NULL,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      clicks     INTEGER NOT NULL DEFAULT 0,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_urls_user_id ON urls(user_id);

    -- Un evento por visita. urls.clicks se mantiene como total histórico barato;
    -- esta tabla permite series de tiempo. Fechas siempre en formato datetime() UTC.
    CREATE TABLE IF NOT EXISTS clicks (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      url_id     INTEGER NOT NULL REFERENCES urls(id) ON DELETE CASCADE,
      clicked_at TEXT    NOT NULL DEFAULT (datetime('now')),
      referer    TEXT,
      user_agent TEXT
    );

    -- Índice de cobertura para el dashboard (filtra por url_id + rango de clicked_at sin
    -- leer la tabla) y para que el ON DELETE CASCADE no recorra toda la tabla clicks.
    CREATE INDEX IF NOT EXISTS idx_clicks_url_time ON clicks(url_id, clicked_at);
  `);

  return db;
}
