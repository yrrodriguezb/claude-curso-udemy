import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import jwt from "jsonwebtoken";
import { createApp } from "../app";
import { initDb, type DB } from "../db";
import { getJwtSecret } from "./auth.service";

let db: DB;
let server: Server;
let baseUrl: string;

beforeEach(async () => {
  db = initDb(":memory:");
  server = createApp(db).listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterEach(async () => {
  await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  db.close();
});

async function post(path: string, body: unknown) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json()) as any };
}

/** GET a una ruta protegida real (/dashboard) para probar el middleware. */
async function getProtected(authorization?: string) {
  const res = await fetch(`${baseUrl}/dashboard`, {
    headers: authorization ? { Authorization: authorization } : {},
  });
  return { status: res.status, headers: res.headers, body: (await res.json()) as any };
}

const decode = (token: string) => jwt.verify(token, getJwtSecret()) as jwt.JwtPayload;

const sign = (payload: object, options: jwt.SignOptions = {}, secret = getJwtSecret()) =>
  jwt.sign(payload, secret, { expiresIn: "24h", ...options });

const valid = { email: "ana@example.com", password: "secreto123", name: "Ana" };

describe("POST /auth/register", () => {
  it("201 con el usuario y un token válido", async () => {
    const { status, body } = await post("/auth/register", valid);

    expect(status).toBe(201);
    expect(body.user).toMatchObject({ email: "ana@example.com", name: "Ana" });
    expect(body.user).not.toHaveProperty("password_hash");
    expect(decode(body.token).sub).toBe(String(body.user.id));
  });

  it("guarda el password hasheado con bcrypt y firma un JWT de 24h", async () => {
    const { body } = await post("/auth/register", valid);

    const row = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(body.user.id) as {
      password_hash: string;
    };
    expect(row.password_hash).toMatch(/^\$2[aby]\$10\$/);

    const payload = decode(body.token);
    expect(payload.email).toBe("ana@example.com");
    expect(payload.exp! - payload.iat!).toBe(24 * 60 * 60);
  });

  it("guarda el email en minúsculas", async () => {
    const { body } = await post("/auth/register", { ...valid, email: "  Ana@Example.COM " });
    expect(body.user.email).toBe("ana@example.com");
  });

  it("409 si el email ya está registrado", async () => {
    await post("/auth/register", valid);
    const { status, body } = await post("/auth/register", { ...valid, email: "ANA@example.com" });
    expect(status).toBe(409);
    expect(body.error.code).toBe("EMAIL_TAKEN");
  });

  it("400 con email inválido", async () => {
    const { status, body } = await post("/auth/register", { ...valid, email: "no-es-un-email" });
    expect(status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details).toEqual([{ field: "email", message: "El email no es válido" }]);
  });

  it("400 con password muy corto", async () => {
    const { status, body } = await post("/auth/register", { ...valid, password: "1234567" });
    expect(status).toBe(400);
    expect(body.error.details.map((d: any) => d.field)).toEqual(["password"]);
  });

  it("400 con name vacío", async () => {
    const { status, body } = await post("/auth/register", { ...valid, name: "   " });
    expect(status).toBe(400);
    expect(body.error.details.map((d: any) => d.field)).toEqual(["name"]);
  });

  it("400 listando todos los campos que faltan", async () => {
    const { status, body } = await post("/auth/register", {});
    expect(status).toBe(400);
    expect(body.error.details.map((d: any) => d.field)).toEqual(["email", "password", "name"]);
  });

  it("400 si los campos no son strings", async () => {
    const { status } = await post("/auth/register", { email: 123, password: ["x"], name: {} });
    expect(status).toBe(400);
  });

  it("400 con JSON mal formado", async () => {
    const { status, body } = await post("/auth/register", "{ esto no es json");
    expect(status).toBe(400);
    expect(body.error.code).toBe("INVALID_JSON");
  });
});

describe("POST /auth/login", () => {
  beforeEach(async () => {
    await post("/auth/register", valid);
  });

  it("200 con el usuario y un token válido", async () => {
    const { status, body } = await post("/auth/login", { email: valid.email, password: valid.password });
    expect(status).toBe(200);
    expect(body.user.email).toBe("ana@example.com");
    expect(body.user).not.toHaveProperty("password_hash");
    expect(decode(body.token).sub).toBe(String(body.user.id));
  });

  it("200 con el email en mayúsculas", async () => {
    const { status } = await post("/auth/login", { email: "ANA@EXAMPLE.COM", password: valid.password });
    expect(status).toBe(200);
  });

  it("401 con password incorrecto", async () => {
    const { status, body } = await post("/auth/login", { email: valid.email, password: "incorrecto" });
    expect(status).toBe(401);
    expect(body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("401 con email inexistente (mismo error que password incorrecto)", async () => {
    const { status, body } = await post("/auth/login", { email: "nadie@example.com", password: valid.password });
    expect(status).toBe(401);
    expect(body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("400 con email inválido", async () => {
    const { status } = await post("/auth/login", { email: "mal", password: valid.password });
    expect(status).toBe(400);
  });

  it("400 sin password", async () => {
    const { status, body } = await post("/auth/login", { email: valid.email });
    expect(status).toBe(400);
    expect(body.error.details.map((d: any) => d.field)).toEqual(["password"]);
  });
});

describe("middleware requireAuth (ruta protegida)", () => {
  let token: string;
  let userId: number;

  beforeEach(async () => {
    const { body } = await post("/auth/register", valid);
    token = body.token;
    userId = body.user.id;
  });

  it("pasa con un token válido", async () => {
    const { status } = await getProtected(`Bearer ${token}`);
    expect(status).toBe(200);
  });

  it("acepta el esquema 'bearer' en minúsculas", async () => {
    const { status } = await getProtected(`bearer ${token}`);
    expect(status).toBe(200);
  });

  it("401 sin token", async () => {
    const { status, headers, body } = await getProtected();
    expect(status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
    expect(headers.get("www-authenticate")).toMatch(/^Bearer/);
  });

  it("401 con un token expirado", async () => {
    const expired = sign({ sub: String(userId), email: valid.email }, { expiresIn: -60 });
    const { status, body } = await getProtected(`Bearer ${expired}`);
    expect(status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("401 con un esquema distinto de Bearer", async () => {
    const { status } = await getProtected(`Basic ${Buffer.from("ana:secreto").toString("base64")}`);
    expect(status).toBe(401);
  });

  it("401 con 'Bearer' sin token", async () => {
    const { status } = await getProtected("Bearer");
    expect(status).toBe(401);
  });

  it("401 con un token malformado", async () => {
    const { status } = await getProtected("Bearer esto.no.es-un-jwt");
    expect(status).toBe(401);
  });

  it("401 con un token firmado con otro secreto", async () => {
    const { status } = await getProtected(`Bearer ${sign({ sub: String(userId), email: valid.email }, {}, "otro")}`);
    expect(status).toBe(401);
  });

  it("401 con un token sin firma (alg: none)", async () => {
    const unsigned = jwt.sign({ sub: String(userId), email: valid.email }, "", { algorithm: "none" } as jwt.SignOptions);
    const { status } = await getProtected(`Bearer ${unsigned}`);
    expect(status).toBe(401);
  });

  it("401 con un token válido pero sin los datos del usuario", async () => {
    const { status } = await getProtected(`Bearer ${sign({ foo: "bar" })}`);
    expect(status).toBe(401);
  });
});
