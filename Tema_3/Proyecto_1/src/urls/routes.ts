import { Router, type Request, type Response } from "express";
import { requireAuth } from "../auth/middleware";
import { CODE_RE, UrlError, parseTargetUrl, type UrlService } from "./service";

const STATUS_BY_CODE = { NOT_FOUND: 404, FORBIDDEN: 403, USER_NOT_FOUND: 401 } as const;

/** Límite para headers que se guardan por click (evita filas enormes). */
export const MAX_CLICK_HEADER_LENGTH = 512;

function truncatedHeader(req: Request, name: string): string | undefined {
  return req.get(name)?.slice(0, MAX_CLICK_HEADER_LENGTH) || undefined;
}

function sendError(res: Response, status: number, code: string, message: string) {
  res.status(status).json({ error: { code, message } });
}

function handleUrlError(err: unknown, res: Response) {
  if (err instanceof UrlError) {
    const code = err.code === "USER_NOT_FOUND" ? "UNAUTHORIZED" : err.code;
    return sendError(res, STATUS_BY_CODE[err.code], code, err.message);
  }
  throw err;
}

/** API de URLs: crear y borrar requieren auth; leer es público. */
export function createUrlsRouter(urls: UrlService): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json({ urls: urls.list() });
  });

  router.get("/:code", (req: Request<{ code: string }>, res) => {
    const url = urls.get(req.params.code);
    if (!url) return sendError(res, 404, "NOT_FOUND", "La URL no existe");
    res.json({ url });
  });

  router.post("/", requireAuth, (req: Request, res: Response) => {
    const raw = req.body?.url;
    const target = typeof raw === "string" ? parseTargetUrl(raw) : null;
    if (!target) {
      return sendError(res, 400, "VALIDATION_ERROR", "El campo 'url' debe ser una URL http(s) válida");
    }
    try {
      res.status(201).json({ url: urls.create(target, req.user!.id) });
    } catch (err) {
      handleUrlError(err, res);
    }
  });

  router.delete("/:code", requireAuth, (req: Request<{ code: string }>, res: Response) => {
    try {
      urls.deleteOwned(req.params.code, req.user!.id);
      res.status(204).end();
    } catch (err) {
      handleUrlError(err, res);
    }
  });

  return router;
}

/** Redirect público: GET /:code → 302 a la URL destino. */
export function createRedirectRouter(urls: UrlService): Router {
  const router = Router();

  router.get("/:code", (req: Request<{ code: string }>, res, next) => {
    if (!CODE_RE.test(req.params.code)) return next();
    const target = urls.resolve(req.params.code, {
      referer: truncatedHeader(req, "referer"),
      userAgent: truncatedHeader(req, "user-agent"),
    });
    if (!target) return next(); // cae en el 404 general
    res.redirect(302, target);
  });

  return router;
}
