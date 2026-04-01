import express from "express";
import { login, callback } from "../controllers/auth.controller.js";

const router = express.Router();

router.get("/strava/login", login);
router.get("/strava/callback", callback);

export default router;
