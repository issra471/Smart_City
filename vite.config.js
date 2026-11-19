import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";

// Le code React vit dans frontend/. Django le charge via django-vite :
//  - en dev  : http://localhost:5173/static/dist/main.jsx (servi par Vite)
//  - en prod : /static/dist/... (fichiers compilés dans frontend_dist/)
export default defineConfig({
  root: resolve(import.meta.dirname, "frontend"),
  base: "/static/dist/",
  plugins: [react(), tailwindcss()],
  server: {
    host: "localhost",
    port: 5173,
    strictPort: true,
    origin: "http://localhost:5173",
  },
  build: {
    outDir: resolve(import.meta.dirname, "frontend_dist"),
    emptyOutDir: true,
    manifest: "manifest.json",
    rollupOptions: { input: resolve(import.meta.dirname, "frontend/main.jsx") },
  },
});
