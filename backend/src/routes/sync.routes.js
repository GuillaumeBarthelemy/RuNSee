import express from "express";
import {
  queueHistoricalSync,
  queueIncrementalSync,
  queueGlobalSync,
  queueDetailBackfill,
  getCurrentJob,
  getDataQuality,
  getJobById,
  getJobs,
  getSummary,
} from "../controllers/sync.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/jobs/historical", requireAuth, queueHistoricalSync);
router.post("/jobs/incremental", requireAuth, queueIncrementalSync);
router.post("/jobs/detail-backfill", requireAuth, queueDetailBackfill);
router.post("/all", requireAuth, queueGlobalSync);
router.get("/jobs/current", requireAuth, getCurrentJob);
router.get("/jobs/:jobId", requireAuth, getJobById);
router.get("/jobs", requireAuth, getJobs);
router.get("/summary", requireAuth, getSummary);
router.get("/data-quality", requireAuth, getDataQuality);

export default router;
