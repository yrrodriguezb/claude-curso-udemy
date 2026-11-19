import express, { type NextFunction, type Request, type Response } from "express";
import type { DB } from "./db";
import { createAuthRepository } from "./auth/auth.repository";
import { createAuthService } from "./auth/auth.service";
import { createAuthRouter } from "./auth/auth.routes";
import { createUrlService } from "./urls/service";
import { createRedirectRouter, createUrlsRouter } from "./urls/routes";
import { createDashboardService } from "./dashboard/service";
import { createDashboardRouter } from "./dashboard/routes";

export function createApp(db: DB) {
  const app = express();
  app.use(express.json());

  const urls = createUrlService(db);
  app.use("/auth", createAuthRouter(createAuthService(createAuthRepository(db))));
  app.use("/urls", createUrlsRouter(urls));
  app.use("/dashboard", createDashboardRouter(createDashboardService(db)));
  app.use("/", createRedirectRouter(urls)); // debe ir después de las demás rutas

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Ruta no encontrada" } });
  });

  // Manejador de errores: JSON mal formado → 400, el resto → 500.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if ((err as { type?: string }).type === "entity.parse.failed") {
      return res.status(400).json({ error: { code: "INVALID_JSON", message: "El cuerpo no es JSON válido" } });
    }
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Error interno del servidor" } });
  });

  return app;
}
