import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// La SPA vive bajo /app/ para no chocar con la API (/auth, /urls, /dashboard)
// ni con los enlaces cortos (/:code), que siguen en la raíz.
export default defineConfig({
  base: "/app/",
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    // En desarrollo la API corre en :3000; el proxy evita tener que configurar CORS.
    proxy: {
      "/auth": "http://localhost:3000",
    },
  },
});
