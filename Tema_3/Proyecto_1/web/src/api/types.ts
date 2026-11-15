// Contrato de la API (ver src/auth/service.ts y src/auth/routes.ts del backend).

export interface PublicUser {
  id: number;
  email: string;
  name: string;
  createdAt: string; // "YYYY-MM-DD HH:MM:SS" en UTC, sin "Z"
}

export interface AuthResult {
  user: PublicUser;
  token: string;
}

export interface FieldErrorDetail {
  field: string;
  message: string;
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: FieldErrorDetail[] };
}
