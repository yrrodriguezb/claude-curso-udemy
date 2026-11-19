import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "./auth.service";
import "./auth.types"; // augmenta Express.Request con `user`

function unauthorized(res: Response) {
  res.setHeader("WWW-Authenticate", 'Bearer realm="api"');
  res.status(401).json({ error: "Unauthorized" });
}

/**
 * Exige un header `Authorization: Bearer <jwt>` válido.
 * Si es correcto, deja `{ id, email }` en `req.user`; si falta o es inválido, responde 401.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header) return unauthorized(res);

  const [scheme, token, ...rest] = header.trim().split(/\s+/);
  if (scheme?.toLowerCase() !== "bearer" || !token || rest.length > 0) return unauthorized(res);

  let payload: jwt.JwtPayload;
  try {
    // Fijamos el algoritmo para no aceptar tokens con "alg" distinto (p. ej. "none").
    const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ["HS256"] });
    if (typeof decoded === "string") return unauthorized(res);
    payload = decoded;
  } catch {
    return unauthorized(res); // firma inválida, malformado o expirado
  }

  const id = Number(payload.sub);
  if (!Number.isInteger(id) || id <= 0 || typeof payload.email !== "string") return unauthorized(res);

  req.user = { id, email: payload.email };
  next();
}
