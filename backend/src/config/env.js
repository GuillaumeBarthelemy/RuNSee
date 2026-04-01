function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeUrl(value, fallback) {
  const candidate = (value || fallback || "").trim().replace(/\/+$/, "");

  if (!candidate) {
    return fallback;
  }

  return candidate;
}

function parseOrigins(value, fallbackOrigin) {
  const entries = String(value || fallbackOrigin || "")
    .split(",")
    .map((entry) => normalizeUrl(entry, ""))
    .filter(Boolean);

  return [...new Set(entries)];
}

const frontendUrl = normalizeUrl(process.env.FRONTEND_URL, "http://localhost:5173");
const appPort = parseNumber(process.env.APP_PORT, 3000);
const appHost = (process.env.APP_HOST || "0.0.0.0").trim() || "0.0.0.0";
const publicBaseUrl = normalizeUrl(
  process.env.APP_PUBLIC_URL,
  `http://localhost:${appPort}`
);
const frontendAllowedOrigins = parseOrigins(
  process.env.FRONTEND_ALLOWED_ORIGINS,
  frontendUrl
);

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  appPort,
  appHost,
  publicBaseUrl,
  frontendUrl,
  frontendAllowedOrigins,
  stravaClientId: process.env.STRAVA_CLIENT_ID || "",
  stravaClientSecret: process.env.STRAVA_CLIENT_SECRET || "",
  stravaRedirectUri: normalizeUrl(process.env.STRAVA_REDIRECT_URI, ""),
  stravaScope:
    process.env.STRAVA_SCOPE || "read,profile:read_all,activity:read_all",
};

export default env;
