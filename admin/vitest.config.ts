import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["admin/src/**/*.test.ts", "admin/src/**/*.test.tsx"]
  }
});
