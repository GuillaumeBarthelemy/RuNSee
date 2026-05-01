import express from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  archiveRaceObjectiveController,
  createRaceObjectiveController,
  listRaceObjectivesController,
  reactivateRaceObjectiveController,
} from "../controllers/raceObjective.controller.js";

const router = express.Router();

router.get("/race-objectives", requireAuth, listRaceObjectivesController);
router.post("/race-objectives", requireAuth, createRaceObjectiveController);
router.delete("/race-objectives/:raceId", requireAuth, archiveRaceObjectiveController);
router.post("/race-objectives/:raceId/activate", requireAuth, reactivateRaceObjectiveController);

export default router;
