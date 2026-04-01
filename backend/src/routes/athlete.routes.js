import express from "express";
import {
  getCurrentAthlete,
  refreshCurrentAthlete,
} from "../controllers/athlete.controller.js";

const router = express.Router();

router.get("/me", getCurrentAthlete);
router.post("/me/refresh", refreshCurrentAthlete);

export default router;
