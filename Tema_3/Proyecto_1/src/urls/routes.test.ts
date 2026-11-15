import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import jwt from "jsonwebtoken";
import { createApp } from "../app";
import { initDb, type DB } from "../db";
import { getJwtSecret } from "../auth/service";
import { MAX_CLICK_HEADER_LENGTH } from "./routes";

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

async function request(method: string, path: string, opts: { token?: string; body?: unknown } = {}) {
  const headers: Record<string, string> = {};
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    redirect: "manual",
  });
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? ((await res.json()) as any) : (await res.text(), null);
  return { status: res.status, headers: res.headers, body };
}

/** Registra un usuario por la API real y devuelve su token e id. */
async function registerUser(email: string) {
  const { body } = await request("POST", "/auth/register", {
    body: { email, password: "secreto123", name: email.split("@")[0] },
  });
  return { token: body.token as string, id: body.user.id as number };
}

async function createUrl(token: string, url = "https://example.com/pagina") {
  return request("POST", "/urls", { token, body: { url } });
}

describe("POST /urls (protegido)", () => {
  it("201 y asocia la URL al usuario autenticado", async () => {
    const ana = await registerUser("ana@example.com");
    const { status, body } = await createUrl(ana.token);

    expect(status).toBe(201);
    expect(body.url).toMatchObject({ targetUrl: "https://example.com/pagina", userId: ana.id, clicks: 0 });
    expect(body.url.code).toMatch(/^[A-Za-z0-9]{7}$/);

    const row = db.prepare("SELECT user_id FROM urls WHERE code = ?").get(body.url.code) as { user_id: number };
    expect(row.user_id).toBe(ana.id);
  });

  it("401 sin token", async () => {
    const { status, body } = await request("POST", "/urls", { body: { url: "https://example.com" } });
    expect(status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(db.prepare("SELECT COUNT(*) AS n FROM urls").get()).toEqual({ n: 0 });
  });

  it("401 con token inválido", async () => {
    const { status } = await request("POST", "/urls", { token: "basura", body: { url: "https://example.com" } });
    expect(status).toBe(401);
  });

  it("401 si el usuario del token ya no existe", async () => {
    const ghost = jwt.sign({ sub: "999", email: "fantasma@example.com" }, getJwtSecret(), { expiresIn: "1h" });
    const { status } = await createUrl(ghost);
    expect(status).toBe(401);
  });

  it.each([["no-es-una-url"], ["ftp://example.com/archivo"], ["javascript:alert(1)"], [""]])(
    "400 con url inválida: %j",
    async (url) => {
      const ana = await registerUser("ana@example.com");
      const { status, body } = await createUrl(ana.token, url);
      expect(status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    }
  );

  it("400 si falta el campo url", async () => {
    const ana = await registerUser("ana@example.com");
    const { status } = await request("POST", "/urls", { token: ana.token, body: {} });
    expect(status).toBe(400);
  });
});

describe("DELETE /urls/:code (protegido, solo el dueño)", () => {
  it("204 cuando el dueño borra su URL", async () => {
    const ana = await registerUser("ana@example.com");
    const { body } = await createUrl(ana.token);

    const del = await request("DELETE", `/urls/${body.url.code}`, { token: ana.token });
    expect(del.status).toBe(204);
    expect((await request("GET", `/urls/${body.url.code}`)).status).toBe(404);
  });

  it("403 cuando otro usuario intenta borrarla, y la URL sigue existiendo", async () => {
    const ana = await registerUser("ana@example.com");
    const beto = await registerUser("beto@example.com");
    const { body } = await createUrl(ana.token);

    const del = await request("DELETE", `/urls/${body.url.code}`, { token: beto.token });
    expect(del.status).toBe(403);
    expect(del.body.error.code).toBe("FORBIDDEN");
    expect((await request("GET", `/urls/${body.url.code}`)).status).toBe(200);
  });

  it("401 sin token, y la URL sigue existiendo", async () => {
    const ana = await registerUser("ana@example.com");
    const { body } = await createUrl(ana.token);

    expect((await request("DELETE", `/urls/${body.url.code}`)).status).toBe(401);
    expect((await request("GET", `/urls/${body.url.code}`)).status).toBe(200);
  });

  it("404 si la URL no existe", async () => {
    const ana = await registerUser("ana@example.com");
    const { status } = await request("DELETE", "/urls/noexiste", { token: ana.token });
    expect(status).toBe(404);
  });
});

describe("rutas de lectura (públicas)", () => {
  it("GET /urls lista todas las URLs sin token", async () => {
    const ana = await registerUser("ana@example.com");
    const beto = await registerUser("beto@example.com");
    await createUrl(ana.token, "https://a.example.com/");
    await createUrl(beto.token, "https://b.example.com/");

    const { status, body } = await request("GET", "/urls");
    expect(status).toBe(200);
    expect(body.urls.map((u: any) => u.targetUrl).sort()).toEqual(["https://a.example.com/", "https://b.example.com/"]);
  });

  it("GET /urls/:code devuelve la URL sin token", async () => {
    const ana = await registerUser("ana@example.com");
    const { body: created } = await createUrl(ana.token);

    const { status, body } = await request("GET", `/urls/${created.url.code}`);
    expect(status).toBe(200);
    expect(body.url).toEqual(created.url);
  });

  it("GET /urls/:code da 404 si no existe", async () => {
    expect((await request("GET", "/urls/noexiste")).status).toBe(404);
  });
});

describe("GET /:code (redirect público)", () => {
  it("302 a la URL destino sin token y cuenta el click", async () => {
    const ana = await registerUser("ana@example.com");
    const { body } = await createUrl(ana.token, "https://example.com/destino?x=1");

    const res = await request("GET", `/${body.url.code}`);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://example.com/destino?x=1");

    await request("GET", `/${body.url.code}`);
    expect((await request("GET", `/urls/${body.url.code}`)).body.url.clicks).toBe(2);
  });

  it("registra cada click como evento con referer y user-agent (recortados)", async () => {
    const ana = await registerUser("ana@example.com");
    const { body } = await createUrl(ana.token);

    const res = await fetch(`${baseUrl}/${body.url.code}`, {
      redirect: "manual",
      headers: { Referer: "https://t.co/abc", "User-Agent": "x".repeat(MAX_CLICK_HEADER_LENGTH + 100) },
    });
    expect(res.status).toBe(302);

    const rows = db.prepare("SELECT url_id, referer, user_agent, clicked_at FROM clicks").all() as any[];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ url_id: body.url.id, referer: "https://t.co/abc" });
    expect(rows[0].user_agent).toHaveLength(MAX_CLICK_HEADER_LENGTH);
    expect(rows[0].clicked_at).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  it("no registra clicks para códigos inexistentes", async () => {
    await request("GET", "/noexiste");
    expect(db.prepare("SELECT COUNT(*) AS n FROM clicks").get()).toEqual({ n: 0 });
  });

  it("404 si el código no existe", async () => {
    const { status, body } = await request("GET", "/noexiste");
    expect(status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });
});
