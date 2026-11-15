import { ApiError } from "./errors";
import type { ApiErrorBody } from "./types";

const UNREACHABLE = "No se pudo conectar con el servidor. Comprueba que la API esté en marcha e inténtalo de nuevo.";

interface RequestOptions {
  method?: "GET" | "POST" | "DELETE";
  body?: unknown;
  token?: string;
}

function isApiErrorBody(data: unknown): data is ApiErrorBody {
  const err = (data as ApiErrorBody | null)?.error;
  return typeof err?.code === "string" && typeof err.message === "string";
}

/**
 * fetch contra la API. Devuelve el JSON si la respuesta es 2xx; si no, lanza ApiError
 * con el `{ error: { code, message, details } }` del backend.
 */
export async function apiFetch<T>(path: string, { method = "GET", body, token }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", UNREACHABLE);
  }

  if (res.status === 204) return undefined as T;
  const data: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    if (isApiErrorBody(data)) {
      const { code, message, details } = data.error;
      throw new ApiError(res.status, code, message, details);
    }
    // Sin cuerpo JSON: típicamente el proxy de Vite no alcanza la API (502/504).
    if (res.status >= 500) throw new ApiError(res.status, "NETWORK_ERROR", UNREACHABLE);
    throw new ApiError(res.status, "HTTP_ERROR", `El servidor respondió con el estado ${res.status}.`);
  }

  if (data === null) throw new ApiError(res.status, "INVALID_RESPONSE", "El servidor devolvió una respuesta inesperada.");
  return data as T;
}
