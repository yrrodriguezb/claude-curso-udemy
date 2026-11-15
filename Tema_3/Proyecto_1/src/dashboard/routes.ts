import { Router, type Request, type Response } from "express";
import { requireAuth } from "../auth/middleware";
import {
  DEFAULT_DAYS,
  MAX_DAYS,
  MAX_UTC_OFFSET,
  MIN_DAYS,
  MIN_UTC_OFFSET,
  type DashboardService,
} from "./service";

function sendError(res: Response, status: number, code: string, message: string) {
  res.status(status).json({ error: { code, message } });
}

/** Entero dentro de [min, max]; `fallback` si no viene; null si es inválido. */
function parseIntParam(value: unknown, fallback: number, min: number, max: number): number | null {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !/^-?\d+$/.test(value)) return null;
  const n = Number(value);
  return n >= min && n <= max ? n : null;
}

/** GET /dashboard: resumen y tendencias de las URLs del usuario autenticado. */
export function createDashboardRouter(dashboard: DashboardService): Router {
  const router = Router();

  router.get("/", requireAuth, (req: Request, res: Response) => {
    const days = parseIntParam(req.query.days, DEFAULT_DAYS, MIN_DAYS, MAX_DAYS);
    if (days === null) {
      return sendError(res, 400, "VALIDATION_ERROR", `'days' debe ser un entero entre ${MIN_DAYS} y ${MAX_DAYS}`);
    }
    const utcOffset = parseIntParam(req.query.utcOffset, 0, MIN_UTC_OFFSET, MAX_UTC_OFFSET);
    if (utcOffset === null) {
      return sendError(
        res,
        400,
        "VALIDATION_ERROR",
        `'utcOffset' debe ser un entero (minutos) entre ${MIN_UTC_OFFSET} y ${MAX_UTC_OFFSET}`
      );
    }

    res.json({ dashboard: dashboard.get(req.user!.id, { days, utcOffset }) });
  });

  return router;
}
