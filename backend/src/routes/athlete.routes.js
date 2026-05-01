import express from "express";
import {
  getCurrentAthlete,
  refreshCurrentAthlete,
} from "../controllers/athlete.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/me", requireAuth, getCurrentAthlete);
router.post("/me/refresh", requireAuth, refreshCurrentAthlete);

export default router;
