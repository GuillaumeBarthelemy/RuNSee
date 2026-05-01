import express from "express";
import {
  getActivities,
  getActivityByStravaId,
  enrichActivity,
  updateActivityRpe,
} from "../controllers/activity.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", requireAuth, getActivities);
router.get("/:stravaActivityId", requireAuth, getActivityByStravaId);
router.post("/:stravaActivityId/enrich", requireAuth, enrichActivity);
router.patch("/:stravaActivityId/rpe", requireAuth, updateActivityRpe);

export default router;
