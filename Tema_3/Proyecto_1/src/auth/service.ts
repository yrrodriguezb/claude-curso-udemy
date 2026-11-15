import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { DB } from "../db";

const BCRYPT_ROUNDS = 10;
export const JWT_EXPIRES_IN = "24h";

export type AuthErrorCode = "EMAIL_TAKEN" | "INVALID_CREDENTIALS";

export class AuthError extends Error {
  constructor(public readonly code: AuthErrorCode, message: string) {
    super(message);
    this.name = "AuthError";
  }
}

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

export interface JwtPayload {
  sub: string; // id del usuario
  email: string;
}

interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  created_at: string;
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

function toPublicUser(row: UserRow): PublicUser {
  return { id: row.id, email: row.email, name: row.name, createdAt: row.created_at };
}

function signToken(user: PublicUser): string {
  const payload: JwtPayload = { sub: String(user.id), email: user.email };
  return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN });
}

export function createAuthService(db: DB) {
  const findByEmail = db.prepare<[string], UserRow>("SELECT * FROM users WHERE email = ?");
  const insertUser = db.prepare<[string, string, string], UserRow>(
    "INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?) RETURNING *"
  );

  async function register(email: string, password: string, name: string): Promise<AuthResult> {
    const normalized = normalizeEmail(email);
    if (findByEmail.get(normalized)) {
      throw new AuthError("EMAIL_TAKEN", "El email ya está registrado");
    }

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    let row: UserRow;
    try {
      row = insertUser.get(normalized, hash, name.trim())!;
    } catch (err) {
      // Carrera entre dos registros simultáneos: lo resuelve el UNIQUE.
      if ((err as { code?: string }).code === "SQLITE_CONSTRAINT_UNIQUE") {
        throw new AuthError("EMAIL_TAKEN", "El email ya está registrado");
      }
      throw err;
    }

    const user = toPublicUser(row);
    return { user, token: signToken(user) };
  }

  async function login(email: string, password: string): Promise<AuthResult> {
    const row = findByEmail.get(normalizeEmail(email));
    // Mismo error para email inexistente y password incorrecto (evita enumerar usuarios).
    if (!row || !(await bcrypt.compare(password, row.password_hash))) {
      throw new AuthError("INVALID_CREDENTIALS", "Credenciales incorrectas");
    }
    const user = toPublicUser(row);
    return { user, token: signToken(user) };
  }

  return { register, login };
}

export type AuthService = ReturnType<typeof createAuthService>;
