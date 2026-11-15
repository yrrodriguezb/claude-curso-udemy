import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as authApi from "../api/auth";
import type { PublicUser } from "../api/types";
import { getTokenExpiry, isTokenExpired } from "./jwt";
import { clearSession, loadSession, saveSession, type Session } from "./storage";

interface AuthContextValue {
  user: PublicUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function initialSession(): Session | null {
  const stored = loadSession();
  if (stored && isTokenExpired(stored.token)) {
    clearSession();
    return null;
  }
  return stored;
}

// setTimeout no admite más de ~24,8 días; el token dura 24 h, pero por si cambia.
const MAX_TIMEOUT = 2_147_483_647;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(initialSession);

  const start = useCallback((next: Session) => {
    saveSession(next);
    setSession(next);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  // Cierra la sesión cuando expira el token.
  useEffect(() => {
    if (!session) return;
    const exp = getTokenExpiry(session.token);
    if (exp === null) return logout();
    const id = setTimeout(logout, Math.min(Math.max(exp - Date.now(), 0), MAX_TIMEOUT));
    return () => clearTimeout(id);
  }, [session, logout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      token: session?.token ?? null,
      login: async (email, password) => start(await authApi.login(email, password)),
      register: async (name, email, password) => start(await authApi.register(name, email, password)),
      logout,
    }),
    [session, start, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
