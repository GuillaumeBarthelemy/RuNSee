function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBoolean(value, fallback = false) {
  const candidate = String(value || "").trim().toLowerCase();

  if (!candidate) {
    return fallback;
  }

  if (["1", "true", "yes", "on"].includes(candidate)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(candidate)) {
    return false;
  }

  return fallback;
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
const sessionCookieName = String(
  process.env.SESSION_COOKIE_NAME || "runsee_session"
).trim() || "runsee_session";
const sessionTtlDays = Math.max(
  1,
  parseNumber(process.env.SESSION_TTL_DAYS, 30)
);
const isSecureCookies =
  process.env.SESSION_COOKIE_SECURE === "true" ||
  publicApiUrl.startsWith("https://") ||
  publicAppUrl.startsWith("https://") ||
  (process.env.NODE_ENV || "development") === "production";

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
  sessionCookieName,
  sessionTtlDays,
  isSecureCookies,

  stravaClientId: process.env.STRAVA_CLIENT_ID || "",
  stravaClientSecret: process.env.STRAVA_CLIENT_SECRET || "",
  stravaRedirectUri: normalizeUrl(process.env.STRAVA_REDIRECT_URI, ""),
  stravaAppEncryptionKey:
    String(process.env.RUNSEE_STRAVA_APP_ENCRYPTION_KEY || "").trim(),
  stravaTokenEncryptionKey:
    String(
      process.env.RUNSEE_STRAVA_TOKEN_ENCRYPTION_KEY ||
      process.env.RUNSEE_STRAVA_APP_ENCRYPTION_KEY ||
      ""
    ).trim(),
  providerTokenEncryptionKey:
    String(
      process.env.RUNSEE_PROVIDER_TOKEN_ENCRYPTION_KEY ||
      process.env.RUNSEE_GARMIN_TOKEN_ENCRYPTION_KEY ||
      process.env.RUNSEE_STRAVA_TOKEN_ENCRYPTION_KEY ||
      process.env.RUNSEE_STRAVA_APP_ENCRYPTION_KEY ||
      ""
    ).trim(),
  garminconnectPythonBin:
    String(process.env.GARMINCONNECT_PYTHON_BIN || "python3").trim() || "python3",
  garminconnectBridgeTimeoutMs: Math.max(
    90000,
    parseNumber(process.env.GARMINCONNECT_BRIDGE_TIMEOUT_MS, 90000),
  ),
  garminconnectRecoveryWindowDays: Math.max(
    30,
    parseNumber(process.env.GARMINCONNECT_RECOVERY_WINDOW_DAYS, 180),
  ),
  garminconnectRecoveryBatchDays: Math.min(
    7,
    Math.max(1, parseNumber(process.env.GARMINCONNECT_RECOVERY_BATCH_DAYS, 3)),
  ),
  garminconnectRecoveryBatchDelayMs: Math.max(
    5000,
    parseNumber(process.env.GARMINCONNECT_RECOVERY_BATCH_DELAY_MS, 12000),
  ),
  garminconnectDailySyncEnabled: parseBoolean(
    process.env.GARMINCONNECT_DAILY_SYNC_ENABLED,
    true,
  ),
  garminconnectDailySyncIntervalMinutes: Math.max(
    60,
    parseNumber(process.env.GARMINCONNECT_DAILY_SYNC_INTERVAL_MINUTES, 24 * 60),
  ),
  garminconnectDailySyncStartupDelaySeconds: Math.max(
    0,
    parseNumber(process.env.GARMINCONNECT_DAILY_SYNC_STARTUP_DELAY_SECONDS, 120),
  ),
  garminconnectRecentSyncDays: Math.min(
    7,
    Math.max(1, parseNumber(process.env.GARMINCONNECT_RECENT_SYNC_DAYS, 4)),
  ),
  garminconnectActivityEnrichmentGlobalDays: Math.min(
    30,
    Math.max(1, parseNumber(process.env.GARMIN_ACTIVITY_ENRICHMENT_GLOBAL_DAYS, 30)),
  ),
  garminActivitySyncRecentDays: Math.min(
    30,
    Math.max(1, parseNumber(process.env.GARMIN_ACTIVITY_SYNC_RECENT_DAYS, 30)),
  ),
  garminBackfillWindowDays: Math.max(
    30,
    parseNumber(process.env.GARMIN_BACKFILL_WINDOW_DAYS, 180),
  ),
  garminBackfillMinIntervalMinutes: Math.max(
    15,
    parseNumber(process.env.GARMIN_BACKFILL_MIN_INTERVAL_MINUTES, 60),
  ),
  garminBackfillMaxWindowsPerRun: Math.max(
    1,
    parseNumber(process.env.GARMIN_BACKFILL_MAX_WINDOWS_PER_RUN, 1),
  ),
  stravaApprovalPrompt:
    String(process.env.STRAVA_APPROVAL_PROMPT || "force").trim() || "force",
  stravaScope:
    process.env.STRAVA_SCOPE || "read,profile:read_all,activity:read_all",
  aiAssistantEncryptionKey:
    String(process.env.RUNSEE_AI_ASSISTANT_ENCRYPTION_KEY || "").trim(),
  openaiResponsesBaseUrl: normalizeUrl(
    process.env.OPENAI_RESPONSES_BASE_URL,
    "https://api.openai.com/v1"
  ),
  openaiDefaultModel:
    String(process.env.OPENAI_DEFAULT_MODEL || "gpt-4.1-mini").trim() || "gpt-4.1-mini",
  autoIncrementalSyncEnabled: parseBoolean(
    process.env.AUTO_INCREMENTAL_SYNC_ENABLED,
    true,
  ),
  autoIncrementalSyncIntervalMinutes: Math.max(
    5,
    parseNumber(process.env.AUTO_INCREMENTAL_SYNC_INTERVAL_MINUTES, 60),
  ),
  autoIncrementalSyncStartupDelaySeconds: Math.max(
    0,
    parseNumber(process.env.AUTO_INCREMENTAL_SYNC_STARTUP_DELAY_SECONDS, 60),
  ),
};

export default env;
