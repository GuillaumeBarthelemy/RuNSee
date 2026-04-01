import express from "express";
import {
  getActivities,
  getActivityByStravaId,
  enrichActivity
} from "../controllers/activity.controller.js";

const router = express.Router();

router.get("/", getActivities);
router.get("/:stravaActivityId", getActivityByStravaId);
router.post("/:stravaActivityId/enrich", enrichActivity);

export default router;
