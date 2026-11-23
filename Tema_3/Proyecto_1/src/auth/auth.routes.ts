import { Router, type Request, type Response } from "express";
import { AuthError, type AuthService } from "./auth.service";
import { isValidEmail } from "./email.validator";

export const MIN_PASSWORD_LENGTH = 8;

type ValidationError = { field: string; message: string };

function sendError(res: Response, status: number, code: string, message: string, details?: ValidationError[]) {
  res.status(status).json({ error: { code, message, ...(details ? { details } : {}) } });
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function validateEmail(email: string | undefined, errors: ValidationError[]) {
  if (!email?.trim()) errors.push({ field: "email", message: "El email es obligatorio" });
  else if (!isValidEmail(email.trim())) errors.push({ field: "email", message: "El email no es válido" });
}

function handleAuthError(err: unknown, res: Response) {
  if (err instanceof AuthError) {
    const status = err.code === "EMAIL_TAKEN" ? 409 : 401;
    return sendError(res, status, err.code, err.message);
  }
  throw err;
}

export function createAuthRouter(auth: AuthService): Router {
  const router = Router();

  router.post("/register", async (req: Request, res: Response) => {
    const email = asString(req.body?.email);
    const password = asString(req.body?.password);
    const name = asString(req.body?.name);

    const errors: ValidationError[] = [];
    validateEmail(email, errors);
    if (!password) errors.push({ field: "password", message: "El password es obligatorio" });
    else if (password.length < MIN_PASSWORD_LENGTH)
      errors.push({ field: "password", message: `El password debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres` });
    if (!name?.trim()) errors.push({ field: "name", message: "El nombre es obligatorio" });

    if (errors.length) return sendError(res, 400, "VALIDATION_ERROR", "Datos inválidos", errors);

    try {
      const result = await auth.register({ email: email!, password: password!, name: name! });
      res.status(201).json(result);
    } catch (err) {
      handleAuthError(err, res);
    }
  });

  router.post("/login", async (req: Request, res: Response) => {
    const email = asString(req.body?.email);
    const password = asString(req.body?.password);

    const errors: ValidationError[] = [];
    validateEmail(email, errors);
    if (!password) errors.push({ field: "password", message: "El password es obligatorio" });

    if (errors.length) return sendError(res, 400, "VALIDATION_ERROR", "Datos inválidos", errors);

    try {
      res.status(200).json(await auth.login({ email: email!, password: password! }));
    } catch (err) {
      handleAuthError(err, res);
    }
  });

  return router;
}
