import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { backendLauncher } from "./plugins/backend-launcher.js";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    backendLauncher(),
  ],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    css: true,
    exclude: ["node_modules", "e2e"],
  },
});
