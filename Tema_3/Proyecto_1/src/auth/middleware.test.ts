import { afterAll, beforeAll, describe, expect, it } from "vitest";
import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import jwt from "jsonwebtoken";
import { requireAuth } from "./middleware";
import { getJwtSecret } from "./service";

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  // App mínima con una ruta protegida que devuelve lo que el middleware adjuntó.
  const app = express();
  app.get("/protegida", requireAuth, (req, res) => {
    res.json({ user: req.user });
  });
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

async function get(authorization?: string) {
  const res = await fetch(`${baseUrl}/protegida`, {
    headers: authorization ? { Authorization: authorization } : {},
  });
  return { status: res.status, headers: res.headers, body: (await res.json()) as any };
}

const sign = (payload: object, options: jwt.SignOptions = {}, secret = getJwtSecret()) =>
  jwt.sign(payload, secret, { expiresIn: "24h", ...options });

const validPayload = { sub: "42", email: "ana@example.com" };

describe("requireAuth", () => {
  it("pasa con un token válido y adjunta el usuario a la request", async () => {
    const { status, body } = await get(`Bearer ${sign(validPayload)}`);
    expect(status).toBe(200);
    expect(body.user).toEqual({ id: 42, email: "ana@example.com" });
  });

  it("acepta el esquema 'bearer' en minúsculas", async () => {
    const { status } = await get(`bearer ${sign(validPayload)}`);
    expect(status).toBe(200);
  });

  it("401 sin token", async () => {
    const { status, headers, body } = await get();
    expect(status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(headers.get("www-authenticate")).toMatch(/^Bearer/);
  });

  it("401 con un esquema distinto de Bearer", async () => {
    const { status } = await get(`Basic ${Buffer.from("ana:secreto").toString("base64")}`);
    expect(status).toBe(401);
  });

  it("401 con 'Bearer' sin token", async () => {
    const { status } = await get("Bearer");
    expect(status).toBe(401);
  });

  it("401 con un token expirado", async () => {
    const expired = sign(validPayload, { expiresIn: -60 }); // expiró hace 60 s
    const { status, body } = await get(`Bearer ${expired}`);
    expect(status).toBe(401);
    expect(body.error.message).toBe("El token ha expirado");
  });

  it("401 con un token malformado", async () => {
    const { status, body } = await get("Bearer esto.no.es-un-jwt");
    expect(status).toBe(401);
    expect(body.error.message).toBe("Token inválido");
  });

  it("401 con un token firmado con otro secreto", async () => {
    const { status } = await get(`Bearer ${sign(validPayload, {}, "otro-secreto")}`);
    expect(status).toBe(401);
  });

  it("401 con un token sin firma (alg: none)", async () => {
    const unsigned = jwt.sign(validPayload, "", { algorithm: "none" } as jwt.SignOptions);
    const { status } = await get(`Bearer ${unsigned}`);
    expect(status).toBe(401);
  });

  it("401 con un token válido pero sin los datos del usuario", async () => {
    const { status } = await get(`Bearer ${sign({ foo: "bar" })}`);
    expect(status).toBe(401);
  });
});
