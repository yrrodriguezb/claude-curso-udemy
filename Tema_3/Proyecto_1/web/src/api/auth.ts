import { apiFetch } from "./client";
import type { AuthResult } from "./types";

export function login(email: string, password: string): Promise<AuthResult> {
  return apiFetch<AuthResult>("/auth/login", { method: "POST", body: { email, password } });
}

export function register(name: string, email: string, password: string): Promise<AuthResult> {
  return apiFetch<AuthResult>("/auth/register", { method: "POST", body: { name, email, password } });
}
