import express from "express";
import {
  connectGarminController,
  disconnectGarminController,
  getGarminConnectionStatusController,
  syncRecentGarminRecoveryController,
  startGarminRecoveryBackfillController,
} from "../controllers/provider.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/garmin/status", requireAuth, getGarminConnectionStatusController);
router.post("/garmin/connect", requireAuth, connectGarminController);
router.post("/garmin/disconnect", requireAuth, disconnectGarminController);
router.post("/garmin/recovery/backfill", requireAuth, startGarminRecoveryBackfillController);
router.post("/garmin/recovery/sync-recent", requireAuth, syncRecentGarminRecoveryController);

export default router;
