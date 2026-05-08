import express from "express";
import {
  connectGarminController,
  disconnectGarminController,
  enrichGarminActivitiesController,
  getGarminActivityBackfillStatusController,
  getGarminConnectionStatusController,
  getGarminSyncMetricsController,
  getProviderStatusesController,
  listGarminRecoverySnapshotsController,
  pauseGarminActivityBackfillController,
  purgeGarminDataController,
  renormalizeGarminRecoveryController,
  resumeGarminActivityBackfillController,
  runGarminActivityBackfillWindowController,
  syncRecentGarminRecoveryController,
  startGarminActivityBackfillController,
  startGarminRecoveryBackfillController,
} from "../controllers/provider.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/status", requireAuth, getProviderStatusesController);
router.get("/garmin/status", requireAuth, getGarminConnectionStatusController);
router.get("/garmin/metrics", requireAuth, getGarminSyncMetricsController);
router.post("/garmin/connect", requireAuth, connectGarminController);
router.post("/garmin/disconnect", requireAuth, disconnectGarminController);
router.post("/garmin/activities/enrich", requireAuth, enrichGarminActivitiesController);
router.get("/garmin/activities/backfill/status", requireAuth, getGarminActivityBackfillStatusController);
router.post("/garmin/activities/backfill/start", requireAuth, startGarminActivityBackfillController);
router.post("/garmin/activities/backfill/pause", requireAuth, pauseGarminActivityBackfillController);
router.post("/garmin/activities/backfill/resume", requireAuth, resumeGarminActivityBackfillController);
router.post("/garmin/activities/backfill/run-window", requireAuth, runGarminActivityBackfillWindowController);
router.delete("/garmin/data", requireAuth, purgeGarminDataController);
router.post("/garmin/recovery/backfill", requireAuth, startGarminRecoveryBackfillController);
router.post("/garmin/recovery/sync-recent", requireAuth, syncRecentGarminRecoveryController);
router.post("/garmin/recovery/renormalize", requireAuth, renormalizeGarminRecoveryController);
router.get("/garmin/recovery/snapshots", requireAuth, listGarminRecoverySnapshotsController);

export default router;
