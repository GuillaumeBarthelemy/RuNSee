/* global process */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

function readPackageVersion() {
  try {
    const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url)));
    return pkg.version || "0.0.0";
  } catch { return "0.0.0"; }
}

function readGitShortSha() {
  try {
    return execSync("git rev-parse --short HEAD", { cwd: process.cwd() }).toString().trim();
  } catch { return ""; }
}

function parsePort(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseAllowedHostname(value) {
  const candidate = String(value || "").trim();

  if (!candidate) {
    return "";
  }

  try {
    return new URL(candidate).hostname;
  } catch {
    return "";
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const frontendPort = parsePort(env.FRONTEND_PORT, 5173);
  const frontendHost = (env.FRONTEND_HOST || "127.0.0.1").trim() || "127.0.0.1";
  const publicAppHostname = parseAllowedHostname(env.VITE_APP_BASE_URL);
  const allowedHosts = publicAppHostname ? [publicAppHostname] : [];
  const disableHmr = String(env.FRONTEND_DISABLE_HMR || "").trim().toLowerCase() === "true";

  const buildTimeIso = new Date().toISOString();
  const buildVersion = readPackageVersion();
  const buildSha = readGitShortSha();

  return {
    plugins: [react()],
    define: {
      __APP_VERSION__: JSON.stringify(buildVersion),
      __APP_BUILD_DATE__: JSON.stringify(buildTimeIso),
      __APP_BUILD_SHA__: JSON.stringify(buildSha),
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) {
              return undefined;
            }

            if (id.includes("recharts")) {
              return "charts";
            }

            if (id.includes("leaflet") || id.includes("react-leaflet")) {
              return "maps";
            }

            if (id.includes("react-router-dom") || id.includes("react-dom") || id.includes("react")) {
              return "vendor";
            }

            return "vendor";
          },
        },
      },
    },
    server: {
      host: frontendHost,
      port: frontendPort,
      strictPort: true,
      allowedHosts,
      hmr: disableHmr ? false : undefined,
    },
    preview: {
      host: frontendHost,
      port: frontendPort,
      strictPort: true,
      allowedHosts,
    },
  };
});
