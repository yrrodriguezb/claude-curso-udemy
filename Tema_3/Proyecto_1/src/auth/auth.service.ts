import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { AuthRepository } from "./auth.repository";
import type { AuthErrorCode, AuthPayload, AuthResult, LoginBody, PublicUser, RegisterBody } from "./auth.types";

const BCRYPT_ROUNDS = 10;
export const JWT_EXPIRES_IN = "24h";

export class AuthError extends Error {
  constructor(public readonly code: AuthErrorCode, message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET no está definido");
  }
  return "dev-secret-no-usar-en-produccion";
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function signToken(user: PublicUser): string {
  const payload: AuthPayload = { sub: String(user.id), email: user.email };
  return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN });
}

export function createAuthService(repo: AuthRepository) {
  async function register({ email, password, name }: RegisterBody): Promise<AuthResult> {
    const normalized = normalizeEmail(email);
    if (repo.findByEmail(normalized)) {
      throw new AuthError("EMAIL_TAKEN", "El email ya está registrado");
    }

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    let user: PublicUser;
    try {
      user = repo.create(normalized, hash, name.trim());
    } catch (err) {
      // Carrera entre dos registros simultáneos: lo resuelve el UNIQUE.
      if ((err as { code?: string }).code === "SQLITE_CONSTRAINT_UNIQUE") {
        throw new AuthError("EMAIL_TAKEN", "El email ya está registrado");
      }
      throw err;
    }

    return { user, token: signToken(user) };
  }

  async function login({ email, password }: LoginBody): Promise<AuthResult> {
    const row = repo.findByEmail(normalizeEmail(email));
    // Mismo error para email inexistente y password incorrecto (evita enumerar usuarios).
    if (!row || !(await bcrypt.compare(password, row.password_hash))) {
      throw new AuthError("INVALID_CREDENTIALS", "Credenciales incorrectas");
    }
    const user = repo.toPublicUser(row);
    return { user, token: signToken(user) };
  }

  return { register, login };
}

export type AuthService = ReturnType<typeof createAuthService>;
