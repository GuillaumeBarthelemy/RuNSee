import express from "express";
import { chatWithAssistant } from "../controllers/assistant.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/chat", requireAuth, chatWithAssistant);

export default router;
