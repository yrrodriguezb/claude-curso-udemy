import { build } from "esbuild";

const required = ["SUPABASE_URL", "SUPABASE_ANON_KEY"];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Faltan variables de entorno: ${missing.join(", ")}`);
  process.exit(1);
}

const url = new URL(process.env.SUPABASE_URL);
if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
  console.error("SUPABASE_URL debe usar https.");
  process.exit(1);
}

// La clave acaba en el JS del navegador: SOLO se admite la clave pública (anon / publishable).
const assertPublicKey = (key) => {
  if (key.startsWith("sb_secret_")) return false;
  if (key.startsWith("sb_publishable_")) return true;
  const parts = key.split(".");
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    return payload.role === "anon";
  } catch {
    return false;
  }
};

if (!assertPublicKey(process.env.SUPABASE_ANON_KEY)) {
  console.error("SUPABASE_ANON_KEY no es una clave pública (anon/publishable). ¿Es la service_role? Abortando.");
  process.exit(1);
}

await build({
  entryPoints: { auth: "src/auth.ts", app: "src/app.ts" },
  outdir: "public/dist",
  bundle: true,
  format: "esm",
  target: "es2022",
  minify: true,
  sourcemap: false,
  define: {
    __SUPABASE_URL__: JSON.stringify(url.origin),
    __SUPABASE_ANON_KEY__: JSON.stringify(process.env.SUPABASE_ANON_KEY),
  },
});

console.log("Build OK → public/dist/");
