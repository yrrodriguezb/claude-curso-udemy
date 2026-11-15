// Mismas reglas que el backend (src/auth/routes.ts), para avisar antes de enviar.
export const MIN_PASSWORD_LENGTH = 8;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type FieldErrors = Record<string, string>;

function checkEmail(email: string, errors: FieldErrors) {
  if (!email.trim()) errors.email = "Escribe tu email.";
  else if (!EMAIL_RE.test(email.trim())) errors.email = "Ese email no parece válido (ejemplo: ana@correo.com).";
}

export function validateLogin(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  checkEmail(email, errors);
  if (!password) errors.password = "Escribe tu contraseña.";
  return errors;
}

export function validateRegister(name: string, email: string, password: string, confirm: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!name.trim()) errors.name = "Escribe tu nombre.";
  checkEmail(email, errors);
  if (!password) errors.password = "Elige una contraseña.";
  else if (password.length < MIN_PASSWORD_LENGTH)
    errors.password = `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  if (password && confirm !== password) errors.confirm = "Las contraseñas no coinciden.";
  return errors;
}
