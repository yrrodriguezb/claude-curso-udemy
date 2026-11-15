import type { AuthResult } from "../api/types";

const KEY = "snap.session";

export type Session = AuthResult;

function isSession(value: unknown): value is Session {
  const s = value as Session | null;
  return (
    typeof s?.token === "string" &&
    typeof s.user?.id === "number" &&
    typeof s.user.email === "string" &&
    typeof s.user.name === "string"
  );
}

// localStorage puede lanzar (modo privado, almacenamiento bloqueado): en ese caso
// la sesión solo dura mientras la pestaña siga abierta.
export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveSession(session: Session): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    /* sin persistencia */
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nada que limpiar */
  }
}
