/**
 * Lee `exp` (segundos) del payload de un JWT y lo devuelve en milisegundos.
 * No verifica la firma: solo sirve para saber cuándo cerrar la sesión en el cliente.
 */
export function getTokenExpiry(token: string): number | null {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const exp = (JSON.parse(json) as { exp?: unknown }).exp;
    return typeof exp === "number" ? exp * 1000 : null;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string, now = Date.now()): boolean {
  const exp = getTokenExpiry(token);
  return exp === null || exp <= now;
}
