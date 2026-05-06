import express from "express";
import cors from "cors";
import prisma from "./config/prisma.js";
import authRoutes from "./routes/auth.routes.js";
import athleteRoutes from "./routes/athlete.routes.js";
import activityRoutes from "./routes/activity.routes.js";
import syncRoutes from "./routes/sync.routes.js";
import trainingAnalyticsSettingsRoutes from "./routes/trainingAnalyticsSettings.routes.js";
import raceObjectiveRoutes from "./routes/raceObjective.routes.js";
import providerRoutes from "./routes/provider.routes.js";
import assistantRoutes from "./routes/assistant.routes.js";
import env from "./config/env.js";
import { loadAuthSession } from "./middleware/auth.middleware.js";

const app = express();
const allowedOrigins = new Set(env.frontendAllowedOrigins);

function isAllowedOrigin(origin) {
  return Boolean(origin && allowedOrigins.has(origin));
}

app.use(
  cors({
    credentials: true,
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

  res.status(databaseReachable ? 200 : 503).json({
    status: databaseReachable ? "OK" : "DEGRADED",
    app: "RuNSee",
    environment: env.nodeEnv,
    timestamp: new Date().toISOString(),
    database: {
      provider: env.databaseProvider,
      reachable: databaseReachable,
    },
    localApiUrl: env.localApiUrl,
    publicApiUrl: env.publicApiUrl,
    publicAppUrl: env.publicAppUrl,
    allowedOrigins: env.frontendAllowedOrigins,
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

app.use((err, req, res, next) => {
  console.error(err);

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
