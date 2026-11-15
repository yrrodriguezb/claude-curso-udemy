import type { FieldErrorDetail } from "./types";

/** Error de la API (o de red) con el `code` que devuelve el backend. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: FieldErrorDetail[];

  constructor(status: number, code: string, message: string, details: FieldErrorDetail[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** `details` del backend como { campo: mensaje } (se queda con el primero de cada campo). */
  fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const d of this.details) out[d.field] ??= d.message;
    return out;
  }
}
