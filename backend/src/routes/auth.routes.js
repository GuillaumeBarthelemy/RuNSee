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
import { requireAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", loginWithPassword);
router.post("/logout", requireAuth, logout);
router.get("/me", requireAuth, me);
router.get("/strava/app", requireAuth, getStravaApp);
router.put("/strava/app", requireAuth, saveStravaApp);
router.delete("/strava/app", requireAuth, deleteStravaApp);
router.get("/strava/login", requireAuth, login);
router.get("/strava/callback", callback);
router.post("/strava/disconnect", requireAuth, disconnectStrava);

export default router;
