const express = require("express");
const path = require("path");

// Express solo sirve el frontend estático. Auth y datos → Supabase (Auth + RLS).
const fail = (msg) => {
  console.error(msg);
  process.exit(1);
};

const isLocal = (host) => host === "localhost" || host === "127.0.0.1";

const PORT = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) fail("PORT no válido.");

// Por defecto solo loopback; en despliegue definir HOST=0.0.0.0 explícitamente.
const HOST = process.env.HOST || "127.0.0.1";
const IS_PROD = process.env.NODE_ENV === "production";

let supabaseUrl;
try {
  supabaseUrl = new URL(process.env.SUPABASE_URL ?? "");
} catch {
  fail("Falta o no es válida la variable de entorno SUPABASE_URL.");
}
if (supabaseUrl.protocol !== "https:" && !isLocal(supabaseUrl.hostname)) {
  fail("SUPABASE_URL debe usar https.");
}

const supabaseOrigin = supabaseUrl.origin;
const supabaseWs = supabaseOrigin.replace(/^http/, "ws");

const csp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  `connect-src 'self' ${supabaseOrigin} ${supabaseWs}`,
  "img-src 'self' data:",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  ...(IS_PROD ? ["upgrade-insecure-requests"] : []),
].join("; ");

const app = express();
app.disable("x-powered-by");
app.set("query parser", false); // no se leen query params → evita la superficie de `qs`

app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", csp);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  if (IS_PROD) {
    res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  }
  next();
});

app.use(
  express.static(path.join(__dirname, "public"), {
    index: "index.html",
    dotfiles: "deny",
    setHeaders: (res, filePath) => {
      // Las páginas muestran datos de RRHH: que no queden en caché tras logout.
      if (filePath.endsWith(".html")) res.setHeader("Cache-Control", "no-store");
    },
  }),
);

app.listen(PORT, HOST, () => {
  console.log(`NexusHR → http://${HOST}:${PORT}`);
});
