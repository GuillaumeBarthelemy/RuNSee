import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import prisma from "./config/prisma.js";
import { globalRateLimiter } from "./middleware/rateLimit.middleware.js";
import { csrfMiddleware } from "./middleware/csrf.middleware.js";
import authRoutes from "./routes/auth.routes.js";
import athleteRoutes from "./routes/athlete.routes.js";
import activityRoutes from "./routes/activity.routes.js";
import syncRoutes from "./routes/sync.routes.js";
import trainingAnalyticsSettingsRoutes from "./routes/trainingAnalyticsSettings.routes.js";
import raceObjectiveRoutes from "./routes/raceObjective.routes.js";
import providerRoutes from "./routes/provider.routes.js";
import assistantRoutes from "./routes/assistant.routes.js";
import apiKeyRoutes from "./routes/apiKey.routes.js";
import publicApiRoutes from "./routes/publicApi.routes.js";
import env from "./config/env.js";
import { loadAuthSession } from "./middleware/auth.middleware.js";

const app = express();
// trust proxy configurable via env.TRUST_PROXY :
//   - 0 en dev (deploy direct)
//   - 1 en prod (1 reverse proxy nginx devant)
// Empeche le spoofing de x-forwarded-for par un client direct.
app.set("trust proxy", env.trustProxy);

// Helmet — headers de securite (CSP, X-Frame-Options, HSTS en prod, etc.)
// `crossOriginResourcePolicy: false` car le front fetch les avatars Strava
// cross-origin ; on garde le reste (defaults raisonnables).
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false, // CSP configuree au niveau frontend / reverse proxy
  })
);

// Compression gzip/brotli des reponses (gros payloads JSON : /activities).
// Filet origin->edge en complement de la compression Cloudflare.
app.use(compression());

// Rate limiter global (300 req / 15 min / IP).
app.use(globalRateLimiter);

const allowedOrigins = new Set(env.frontendAllowedOrigins);

function isAllowedOrigin(origin) {
  return Boolean(origin && allowedOrigins.has(origin));
}

app.use(
  cors({
    credentials: true,
    // Expose X-CSRF-Token au JS frontend (necessaire pour double-submit
    // cross-subdomain : api.runnsee.net <-> runsee.runnsee.net).
    exposedHeaders: ["X-CSRF-Token"],
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS origin not allowed: ${origin}`));
    },
  })
);
app.use((req, res, next) => {
  const requestOrigin = String(req.get("origin") || "").trim();

  if (isAllowedOrigin(requestOrigin)) {
    res.header("Access-Control-Allow-Origin", requestOrigin);
    res.header("Access-Control-Allow-Credentials", "true");
  }

  next();
});
app.use(express.json());
// CSRF avant chargement session pour que meme la creation de cookie soit
// possible sur la 1ere requete (login). Le token est genere a la 1ere
// requete GET et renvoye dans les mutations suivantes.
app.use(csrfMiddleware);
app.use(loadAuthSession);

app.get("/", (req, res) => {
  res.send("RuNSee backend is running");
});

app.get("/health", async (req, res) => {
  let databaseReachable = false;

  try {
    await prisma.$queryRaw`SELECT 1`;
    databaseReachable = true;
  } catch (error) {
    console.error("Health database probe failed", error);
  }

  // Endpoint public minimaliste pour ne pas divulguer la stack interne
  // (provider DB, URLs internes, origins CORS). Les details restent
  // visibles dans les logs serveur.
  res.status(databaseReachable ? 200 : 503).json({
    status: databaseReachable ? "OK" : "DEGRADED",
    timestamp: new Date().toISOString(),
  });
});

app.get("/db/health", async (req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "OK",
      database: env.databaseProvider,
      prisma: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

app.use("/auth", authRoutes);
app.use("/athlete", athleteRoutes);
app.use("/activities", activityRoutes);
app.use("/sync", syncRoutes);
app.use("/settings", trainingAnalyticsSettingsRoutes);
app.use("/settings", raceObjectiveRoutes);
app.use("/providers", providerRoutes);
app.use("/assistant", assistantRoutes);
app.use("/settings", apiKeyRoutes);
app.use("/api/v1", publicApiRoutes);

// Liste des champs sensibles a masquer dans les logs d'erreur.
const SENSITIVE_LOG_FIELDS = new Set([
  "password",
  "oldpassword",
  "newpassword",
  "token",
  "accesstoken",
  "refreshtoken",
  "secret",
  "clientsecret",
  "apikey",
  "authorization",
  "cookie",
  "mfacode",
]);

function sanitizeLogPayload(value, depth = 0) {
  if (depth > 4 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => sanitizeLogPayload(v, depth + 1));
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (SENSITIVE_LOG_FIELDS.has(String(k).toLowerCase())) {
      out[k] = "[REDACTED]";
    } else {
      out[k] = sanitizeLogPayload(v, depth + 1);
    }
  }
  return out;
}

app.use((err, req, res, next) => {
  // Log structure sans payload requete (qui peut contenir mot de passe,
  // token Garmin, etc.). On garde method/url/status pour diagnostic.
  console.error("[error]", {
    method: req.method,
    url: req.originalUrl,
    status: err.httpStatus || 500,
    code: err.code || err.errorCode || null,
    message: err.message,
    stack: err.stack,
    // body sanitize seulement en dev pour aide debug ; jamais en prod
    ...(env.nodeEnv !== "production" && req.body
      ? { body: sanitizeLogPayload(req.body) }
      : {}),
  });

  const status = err.httpStatus || 500;
  const publicMessage = err.userMessage || "Internal server error";
  const code = err.code || err.errorCode || (status >= 500 ? "INTERNAL_SERVER_ERROR" : "REQUEST_ERROR");
  const legacyDetails = status >= 500 ? undefined : err.message;
  const errorDetails = status >= 500 ? undefined : { message: err.message };

  res.status(status).json({
    message: publicMessage,
    ...(legacyDetails ? { details: legacyDetails } : {}),
    error: {
      code,
      message: publicMessage,
      ...(errorDetails ? { details: errorDetails } : {}),
    },
    ...(err.connection ? { connection: err.connection } : {}),
  });
});

export default app;
