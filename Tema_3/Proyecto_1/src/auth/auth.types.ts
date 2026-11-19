/** Payload que se firma en el JWT. */
export interface AuthPayload {
  sub: string; // id del usuario
  email: string;
}

/** Body de POST /auth/register (ya validado). */
export interface RegisterBody {
  email: string;
  password: string;
  name: string;
}

/** Body de POST /auth/login (ya validado). */
export interface LoginBody {
  email: string;
  password: string;
}

/** Lo que el middleware adjunta en `req.user`. */
export interface AuthUser {
  id: number;
  email: string;
}

/** Usuario tal como se expone en respuestas HTTP: nunca incluye password_hash. */
export interface PublicUser {
  id: number;
  email: string;
  name: string;
  createdAt: string;
}

export interface AuthResult {
  user: PublicUser;
  token: string;
}

export type AuthErrorCode = "EMAIL_TAKEN" | "INVALID_CREDENTIALS";

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
