import express from "express";
import {
  getActivities,
  getActivityByStravaId,
  enrichActivity,
  getActivityBenchmark,
  updateActivityClassification,
  updateActivityRpe,
} from "../controllers/activity.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", requireAuth, getActivities);
router.get("/:stravaActivityId", requireAuth, getActivityByStravaId);
router.post("/:stravaActivityId/enrich", requireAuth, enrichActivity);
router.patch("/:stravaActivityId/rpe", requireAuth, updateActivityRpe);
router.patch("/:stravaActivityId/classification", requireAuth, updateActivityClassification);
router.get("/:stravaActivityId/benchmark", requireAuth, getActivityBenchmark);

export default router;
