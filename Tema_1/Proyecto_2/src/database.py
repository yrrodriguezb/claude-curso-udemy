"""Conexión a SQLite e inicialización de tablas."""

import os
import sqlite3
from collections.abc import Iterator

DB_PATH = os.environ.get("TODOS_DB_PATH", "todos.db")

SCHEMA = """
CREATE TABLE IF NOT EXISTS todos (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT    NOT NULL,
    description TEXT,
    status      TEXT    NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'done')),
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
"""


def get_connection(db_path: str | None = None) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path or DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db(db_path: str | None = None) -> None:
    with get_connection(db_path) as conn:
        conn.executescript(SCHEMA)
    conn.close()


def get_db() -> Iterator[sqlite3.Connection]:
    """Dependencia de FastAPI: abre una conexión por request y la cierra al final."""
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()
