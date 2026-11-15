import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import jwt from "jsonwebtoken";
import { createApp } from "../app";
import { initDb, type DB } from "../db";
import { getJwtSecret } from "./service";

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

const valid = { email: "ana@example.com", password: "secreto123", name: "Ana" };

describe("POST /auth/register", () => {
  it("201 con el usuario y un token válido", async () => {
    const { status, body } = await post("/auth/register", valid);

    expect(status).toBe(201);
    expect(body.user).toMatchObject({ email: "ana@example.com", name: "Ana" });
    expect(body.user).not.toHaveProperty("password_hash");
    expect((jwt.verify(body.token, getJwtSecret()) as jwt.JwtPayload).sub).toBe(String(body.user.id));
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
    expect(typeof body.token).toBe("string");
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
