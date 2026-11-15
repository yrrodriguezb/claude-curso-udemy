import { randomInt } from "node:crypto";
import type { DB } from "../db";

const CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
export const CODE_LENGTH = 7;
export const CODE_RE = /^[A-Za-z0-9]{1,32}$/;

export type UrlErrorCode = "NOT_FOUND" | "FORBIDDEN" | "USER_NOT_FOUND";

export class UrlError extends Error {
  constructor(public readonly code: UrlErrorCode, message: string) {
    super(message);
    this.name = "UrlError";
  }
}

export interface ShortUrl {
  id: number;
  code: string;
  targetUrl: string;
  userId: number;
  clicks: number;
  createdAt: string;
}

/** Datos de la petición que se guardan con cada click. */
export interface ClickMeta {
  referer?: string;
  userAgent?: string;
}

interface UrlRow {
  id: number;
  code: string;
  target_url: string;
  user_id: number;
  clicks: number;
  created_at: string;
}

function toShortUrl(row: UrlRow): ShortUrl {
  return {
    id: row.id,
    code: row.code,
    targetUrl: row.target_url,
    userId: row.user_id,
    clicks: row.clicks,
    createdAt: row.created_at,
  };
}

function generateCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}

/** Devuelve la URL normalizada si es http(s) válida, o null. */
export function parseTargetUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function createUrlService(db: DB) {
  const insert = db.prepare<[string, string, number], UrlRow>(
    "INSERT INTO urls (code, target_url, user_id) VALUES (?, ?, ?) RETURNING *"
  );
  const byCode = db.prepare<[string], UrlRow>("SELECT * FROM urls WHERE code = ?");
  const all = db.prepare<[], UrlRow>("SELECT * FROM urls ORDER BY id DESC");
  const remove = db.prepare<[number]>("DELETE FROM urls WHERE id = ?");
  const hit = db.prepare<[string], UrlRow>(
    "UPDATE urls SET clicks = clicks + 1 WHERE code = ? RETURNING *"
  );
  const logClick = db.prepare<[number, string | null, string | null]>(
    "INSERT INTO clicks (url_id, referer, user_agent) VALUES (?, ?, ?)"
  );
  // Contador y evento en la misma transacción: o se registran ambos o ninguno.
  const resolveTx = db.transaction((code: string, meta: ClickMeta): string | undefined => {
    const row = hit.get(code);
    if (!row) return undefined;
    logClick.run(row.id, meta.referer ?? null, meta.userAgent ?? null);
    return row.target_url;
  });

  /** Crea una URL corta asociada al usuario. `targetUrl` ya debe venir validada. */
  function create(targetUrl: string, userId: number): ShortUrl {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        return toShortUrl(insert.get(generateCode(), targetUrl, userId)!);
      } catch (err) {
        const code = (err as { code?: string }).code;
        if (code === "SQLITE_CONSTRAINT_UNIQUE") continue; // colisión de código: reintentar
        if (code === "SQLITE_CONSTRAINT_FOREIGNKEY") {
          throw new UrlError("USER_NOT_FOUND", "El usuario del token ya no existe");
        }
        throw err;
      }
    }
    throw new Error("No se pudo generar un código único");
  }

  function list(): ShortUrl[] {
    return all.all().map(toShortUrl);
  }

  function get(code: string): ShortUrl | undefined {
    const row = byCode.get(code);
    return row && toShortUrl(row);
  }

  /** Borra la URL solo si pertenece al usuario. */
  function deleteOwned(code: string, userId: number): void {
    const row = byCode.get(code);
    if (!row) throw new UrlError("NOT_FOUND", "La URL no existe");
    if (row.user_id !== userId) throw new UrlError("FORBIDDEN", "No puedes borrar una URL que no es tuya");
    remove.run(row.id);
  }

  /** Registra una visita (contador + evento) y devuelve la URL destino. */
  function resolve(code: string, meta: ClickMeta = {}): string | undefined {
    return resolveTx(code, meta);
  }

  return { create, list, get, deleteOwned, resolve };
}

export type UrlService = ReturnType<typeof createUrlService>;
