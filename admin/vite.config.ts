import path from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const apiProxyTarget = "http://127.0.0.1:4000";

export default defineConfig({
  root: __dirname,
  base: "/admin/",
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/api": apiProxyTarget,
      "/health": apiProxyTarget,
      "/openapi.json": apiProxyTarget,
      "/uploads": apiProxyTarget
    }
  },
  build: {
    outDir: path.resolve(__dirname, "..", "dist", "admin"),
    emptyOutDir: true,
    assetsDir: "assets"
  }
});
