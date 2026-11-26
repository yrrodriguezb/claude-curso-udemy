import { createClient } from "@supabase/supabase-js";

// Inyectadas en build (esbuild `define`) desde variables de entorno.
// Ver build.mjs — el build falla si faltan. NUNCA hardcodear aquí.
declare const __SUPABASE_URL__: string;
declare const __SUPABASE_ANON_KEY__: string;

export const supabase = createClient(__SUPABASE_URL__, __SUPABASE_ANON_KEY__, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce", // los tokens no viajan en el fragmento de la URL
  },
});

export type AppRole = "employee" | "manager" | "admin";

export interface Profile {
  id: string;
  full_name: string;
  email: string | null;
  role: AppRole;
  department: string | null;
  hire_date: string | null;
  active: boolean;
}

/** Escapa texto antes de interpolarlo en HTML. */
export const escapeHtml = (value: unknown): string =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
