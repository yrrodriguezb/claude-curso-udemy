import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "./AuthContext";

export const DEFAULT_AFTER_LOGIN = "/dashboard";

/** Solo acepta rutas internas ("/algo"), nunca "//otro-sitio" ni URLs absolutas. */
export function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : DEFAULT_AFTER_LOGIN;
}

/** Rutas privadas: sin sesión → /login?next=<ruta actual>. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return children;
}

/** Login y registro: con sesión no tiene sentido verlos → dashboard. */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return user ? <Navigate to={DEFAULT_AFTER_LOGIN} replace /> : children;
}
