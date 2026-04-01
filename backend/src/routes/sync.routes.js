import express from "express";
import {
  queueHistoricalSync,
  queueIncrementalSync,
  getCurrentJob,
  getJobById,
  getJobs,
  getSummary,
} from "../controllers/sync.controller.js";

const router = express.Router();

router.post("/jobs/historical", queueHistoricalSync);
router.post("/jobs/incremental", queueIncrementalSync);
router.get("/jobs/current", getCurrentJob);
router.get("/jobs/:jobId", getJobById);
router.get("/jobs", getJobs);
router.get("/summary", getSummary);

export default router;
