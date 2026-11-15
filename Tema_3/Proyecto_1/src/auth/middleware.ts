import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "./service";

export interface AuthUser {
  id: number;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

function unauthorized(res: Response, message: string) {
  res.setHeader("WWW-Authenticate", 'Bearer realm="api"');
  res.status(401).json({ error: { code: "UNAUTHORIZED", message } });
}

/**
 * Exige un header `Authorization: Bearer <jwt>` válido.
 * Si es correcto, deja la info del usuario en `req.user`; si no, responde 401.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header) return unauthorized(res, "Falta el token de autenticación");

  const [scheme, token, ...rest] = header.trim().split(/\s+/);
  if (scheme?.toLowerCase() !== "bearer" || !token || rest.length > 0) {
    return unauthorized(res, "El header Authorization debe tener el formato 'Bearer <token>'");
  }

  let payload: jwt.JwtPayload;
  try {
    // Fijamos el algoritmo para no aceptar tokens con "alg" distinto (p. ej. "none").
    const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ["HS256"] });
    if (typeof decoded === "string") throw new Error("payload inesperado");
    payload = decoded;
  } catch (err) {
    const message = err instanceof jwt.TokenExpiredError ? "El token ha expirado" : "Token inválido";
    return unauthorized(res, message);
  }

  const id = Number(payload.sub);
  if (!Number.isInteger(id) || id <= 0 || typeof payload.email !== "string") {
    return unauthorized(res, "Token inválido");
  }

  req.user = { id, email: payload.email };
  next();
}
