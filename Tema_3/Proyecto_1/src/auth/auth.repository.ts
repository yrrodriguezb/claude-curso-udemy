import type { DB } from "../db";
import type { PublicUser } from "./auth.types";

interface PublicUserRow {
  id: number;
  email: string;
  name: string;
  created_at: string;
}

/** Fila con el hash: solo para verificar credenciales, nunca para una respuesta HTTP. */
export interface UserCredentialsRow extends PublicUserRow {
  password_hash: string;
}

const PUBLIC_COLUMNS = "id, email, name, created_at";

function toPublicUser(row: PublicUserRow): PublicUser {
  return { id: row.id, email: row.email, name: row.name, createdAt: row.created_at };
}

export function createAuthRepository(db: DB) {
  const findByEmailStmt = db.prepare<[string], UserCredentialsRow>(
    `SELECT ${PUBLIC_COLUMNS}, password_hash FROM users WHERE email = ?`
  );
  const createStmt = db.prepare<[string, string, string], PublicUserRow>(
    `INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?) RETURNING ${PUBLIC_COLUMNS}`
  );

  /** Incluye password_hash para comparar el password; usar `toPublicUser` antes de responder. */
  function findByEmail(email: string): UserCredentialsRow | undefined {
    return findByEmailStmt.get(email);
  }

  /** Inserta el usuario. Lanza SQLITE_CONSTRAINT_UNIQUE si el email ya existe. */
  function create(email: string, passwordHash: string, name: string): PublicUser {
    return toPublicUser(createStmt.get(email, passwordHash, name)!);
  }

  return { findByEmail, create, toPublicUser };
}

export type AuthRepository = ReturnType<typeof createAuthRepository>;
