function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeUrl(value, fallback) {
  const candidate = String(value || fallback || "")
    .trim()
    .replace(/\/+$/, "");

  if (!candidate) {
    return String(fallback || "").trim().replace(/\/+$/, "");
  }

  return candidate;
}

function parseOrigins(value, fallbackEntries = []) {
  const fallbackList = Array.isArray(fallbackEntries) ? fallbackEntries : [fallbackEntries];
  const entries = [
    ...fallbackList,
    ...String(value || "")
    .split(",")
  ]
    .map((entry) => normalizeUrl(entry, ""))
    .filter(Boolean);

  return [...new Set(entries)];
}

function resolveDatabaseProvider(value) {
  const candidate = String(value || "").trim().toLowerCase();

  if (candidate.startsWith("file:")) {
    return "sqlite";
  }

  if (candidate.startsWith("postgresql:") || candidate.startsWith("postgres:")) {
    return "postgresql";
  }

  return "unknown";
}

const frontendPort = parseNumber(process.env.FRONTEND_PORT, 5173);
const appPort = parseNumber(process.env.APP_PORT, 3000);
const appHost = String(process.env.APP_HOST || "0.0.0.0").trim() || "0.0.0.0";

const localAppUrl = normalizeUrl(
  process.env.LOCAL_APP_URL,
  `http://localhost:${frontendPort}`
);

const localApiUrl = normalizeUrl(
  process.env.LOCAL_API_URL,
  `http://localhost:${appPort}`
);

const publicAppUrl = normalizeUrl(
  process.env.PUBLIC_APP_URL || process.env.FRONTEND_URL,
  localAppUrl
);

const publicApiUrl = normalizeUrl(
  process.env.PUBLIC_API_URL || process.env.APP_PUBLIC_URL,
  localApiUrl
);

const frontendAllowedOrigins = parseOrigins(
  process.env.FRONTEND_ALLOWED_ORIGINS,
  [localAppUrl, publicAppUrl]
);
const databaseProvider = resolveDatabaseProvider(process.env.DATABASE_URL);

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  appPort,
  appHost,
  frontendPort,
  localAppUrl,
  localApiUrl,
  publicAppUrl,
  publicApiUrl,

  // Compatibility aliases kept to avoid breaking the current codebase.
  publicBaseUrl: publicApiUrl,
  frontendUrl: publicAppUrl,
  frontendAllowedOrigins,
  databaseProvider,

  stravaClientId: process.env.STRAVA_CLIENT_ID || "",
  stravaClientSecret: process.env.STRAVA_CLIENT_SECRET || "",
  stravaRedirectUri: normalizeUrl(process.env.STRAVA_REDIRECT_URI, ""),
  stravaScope:
    process.env.STRAVA_SCOPE || "read,profile:read_all,activity:read_all",
};

export default env;
