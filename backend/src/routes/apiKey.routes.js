/**
 * Routes de gestion des clés d'API personnelles.
 * Montées sur /settings/api-keys.
 * Protégées par la session utilisateur (cookie + requireAuth).
 */
import express from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  listApiKeysController,
  createApiKeyController,
  revokeApiKeyController,
} from "../controllers/apiKey.controller.js";

const router = express.Router();

router.get("/api-keys", requireAuth, listApiKeysController);
router.post("/api-keys", requireAuth, createApiKeyController);
router.delete("/api-keys/:id", requireAuth, revokeApiKeyController);

export default router;
