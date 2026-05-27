import express from "express";
import {
  callback,
  deleteStravaApp,
  disconnectStrava,
  getStravaApp,
  login,
  loginWithPassword,
  logout,
  me,
  saveStravaApp,
  signup,
} from "../controllers/auth.controller.js";
import {
  deleteSession,
  getSessions,
  patchMe,
  patchPreferences,
  postPassword,
  postRevokeOtherSessions,
} from "../controllers/account.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { authRateLimiter } from "../middleware/rateLimit.middleware.js";

const router = express.Router();

// Endpoints sensibles : rate limiter strict (10 req / 15 min / IP).
router.post("/signup", authRateLimiter, signup);
router.post("/login", authRateLimiter, loginWithPassword);
router.post("/logout", requireAuth, logout);
router.get("/me", requireAuth, me);
router.patch("/me", requireAuth, patchMe);
router.patch("/preferences", requireAuth, patchPreferences);
router.post("/password", authRateLimiter, requireAuth, postPassword);
router.get("/sessions", requireAuth, getSessions);
router.delete("/sessions/:id", requireAuth, deleteSession);
router.post("/sessions/revoke-others", requireAuth, postRevokeOtherSessions);
router.get("/strava/app", requireAuth, getStravaApp);
router.put("/strava/app", requireAuth, saveStravaApp);
router.delete("/strava/app", requireAuth, deleteStravaApp);
router.get("/strava/login", requireAuth, login);
router.get("/strava/callback", callback);
router.post("/strava/disconnect", requireAuth, disconnectStrava);

export default router;
