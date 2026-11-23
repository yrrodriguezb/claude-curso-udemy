/**
 * Validación de formato de email (subconjunto práctico de RFC 5321/5322).
 *
 * Reglas:
 * - Longitud total ≤ 254 y parte local ≤ 64 caracteres.
 * - Parte local: caracteres "atext" separados por puntos; sin punto inicial, final ni consecutivos.
 * - Dominio: etiquetas de 1–63 caracteres alfanuméricos o guiones, sin guion inicial ni final,
 *   separadas por puntos simples, con TLD alfabético de al menos 2 letras.
 *
 * No admite direcciones entrecomilladas, IPs literales ni dominios IDN sin convertir a punycode:
 * son válidos por RFC pero no aportan valor para el registro de usuarios.
 */
export const MAX_EMAIL_LENGTH = 254;
export const MAX_LOCAL_PART_LENGTH = 64;

const LOCAL_PART = String.raw`[A-Za-z0-9!#$%&'*+/=?^_\`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_\`{|}~-]+)*`;
const DOMAIN_LABEL = String.raw`[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?`;
const TLD = String.raw`[A-Za-z]{2,63}`;

const EMAIL_RE = new RegExp(`^(${LOCAL_PART})@(?:${DOMAIN_LABEL}\\.)+${TLD}$`);

/** Devuelve true si `email` (ya recortado) tiene un formato de email válido. */
export function isValidEmail(email: string): boolean {
  if (email.length > MAX_EMAIL_LENGTH) return false;
  const match = EMAIL_RE.exec(email);
  return match !== null && match[1].length <= MAX_LOCAL_PART_LENGTH;
}
