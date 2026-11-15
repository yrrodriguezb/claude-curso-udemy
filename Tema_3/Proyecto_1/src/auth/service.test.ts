import { beforeEach, describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";
import { initDb, type DB } from "../db";
import { AuthError, createAuthService, getJwtSecret, type AuthService, type JwtPayload } from "./service";

let db: DB;
let auth: AuthService;

beforeEach(() => {
  db = initDb(":memory:");
  auth = createAuthService(db);
});

function decode(token: string) {
  return jwt.verify(token, getJwtSecret()) as JwtPayload & { iat: number; exp: number };
}

describe("register", () => {
  it("registra un usuario, hashea el password y devuelve un JWT de 24h", async () => {
    const { user, token } = await auth.register("ana@example.com", "secreto123", "Ana");

    expect(user).toMatchObject({ email: "ana@example.com", name: "Ana" });
    expect(user).not.toHaveProperty("password_hash");

    const row = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(user.id) as {
      password_hash: string;
    };
    expect(row.password_hash).not.toBe("secreto123");
    expect(row.password_hash).toMatch(/^\$2[aby]\$/);

    const payload = decode(token);
    expect(payload.sub).toBe(String(user.id));
    expect(payload.exp - payload.iat).toBe(24 * 60 * 60);
  });

  it("falla si el email ya existe (también con otras mayúsculas)", async () => {
    await auth.register("ana@example.com", "secreto123", "Ana");

    await expect(auth.register("ana@example.com", "otro123", "Ana 2")).rejects.toMatchObject({
      code: "EMAIL_TAKEN",
    });
    await expect(auth.register("ANA@Example.com", "otro123", "Ana 3")).rejects.toBeInstanceOf(AuthError);
  });
});

describe("login", () => {
  beforeEach(async () => {
    await auth.register("ana@example.com", "secreto123", "Ana");
  });

  it("devuelve un JWT válido con credenciales correctas", async () => {
    const { user, token } = await auth.login("ana@example.com", "secreto123");
    expect(user.email).toBe("ana@example.com");
    expect(decode(token).sub).toBe(String(user.id));
  });

  it("falla con password incorrecto", async () => {
    await expect(auth.login("ana@example.com", "incorrecto")).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
    });
  });

  it("falla con email inexistente", async () => {
    await expect(auth.login("nadie@example.com", "secreto123")).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
    });
  });

  it("funciona con el email en mayúsculas", async () => {
    const { user } = await auth.login("ANA@EXAMPLE.COM", "secreto123");
    expect(user.email).toBe("ana@example.com");
  });
});
