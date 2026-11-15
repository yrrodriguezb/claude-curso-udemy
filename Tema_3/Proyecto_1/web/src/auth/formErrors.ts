import { ApiError } from "../api/errors";

/** Mueve el foco al primer campo con error tras el render. */
export function focusFirstInvalid(form: HTMLFormElement | null) {
  requestAnimationFrame(() => form?.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus());
}

export function unexpectedMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : "Ocurrió un error inesperado. Inténtalo de nuevo.";
}
