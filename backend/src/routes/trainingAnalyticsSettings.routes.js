import express from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  getTrainingAnalyticsSettingsController,
  saveTrainingAnalyticsSettingsController,
} from "../controllers/trainingAnalyticsSettings.controller.js";

const router = express.Router();

router.get("/training-analytics", requireAuth, getTrainingAnalyticsSettingsController);
router.put("/training-analytics", requireAuth, saveTrainingAnalyticsSettingsController);

export default router;
