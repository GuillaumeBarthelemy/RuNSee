/* global process */
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

function parsePort(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const frontendPort = parsePort(env.FRONTEND_PORT, 5173);
  const frontendHost = (env.FRONTEND_HOST || "127.0.0.1").trim() || "127.0.0.1";

  return {
    plugins: [react()],
    server: {
      host: frontendHost,
      port: frontendPort,
      strictPort: true,
    },
    preview: {
      host: frontendHost,
      port: frontendPort,
      strictPort: true,
    },
  };
});
