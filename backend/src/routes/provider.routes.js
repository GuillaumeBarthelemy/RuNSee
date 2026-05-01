import express from "express";
import {
  connectGarminController,
  disconnectGarminController,
  getGarminConnectionStatusController,
} from "../controllers/provider.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/garmin/status", requireAuth, getGarminConnectionStatusController);
router.post("/garmin/connect", requireAuth, connectGarminController);
router.post("/garmin/disconnect", requireAuth, disconnectGarminController);

export default router;
