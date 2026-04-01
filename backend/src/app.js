import express from "express";
import cors from "cors";
import prisma from "./config/prisma.js";
import authRoutes from "./routes/auth.routes.js";
import athleteRoutes from "./routes/athlete.routes.js";
import activityRoutes from "./routes/activity.routes.js";
import syncRoutes from "./routes/sync.routes.js";
import env from "./config/env.js";

const app = express();
const allowedOrigins = new Set(env.frontendAllowedOrigins);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS origin not allowed: ${origin}`));
    },
  })
);
app.use(express.json());

app.get("/", (req, res) => {
  res.send("RuNSee backend is running");
});

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    app: "RuNSee",
    environment: env.nodeEnv,
    allowedOrigins: env.frontendAllowedOrigins,
  });
});

app.get("/db/health", async (req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "OK",
      database: "SQLite",
      prisma: true,
    });
  } catch (error) {
    next(error);
  }
});

app.use("/auth", authRoutes);
app.use("/athlete", athleteRoutes);
app.use("/activities", activityRoutes);
app.use("/sync", syncRoutes);

app.use((err, req, res, next) => {
  console.error(err);

  const status = err.httpStatus || 500;

  res.status(status).json({
    message: err.userMessage || "Internal server error",
    details: err.message,
  });
});

export default app;
