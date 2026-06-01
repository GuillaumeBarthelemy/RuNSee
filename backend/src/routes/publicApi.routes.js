/**
 * Routes API publique RunNSee — /api/v1
 *
 * Authentification : Bearer token (clé d'API personnelle).
 * Toutes les routes sont en lecture seule (GET).
 * Chaque endpoint vérifie le scope requis.
 *
 * Endpoints :
 *   GET /api/v1/activities        ?from=&to=&sport=&page=&limit=
 *   GET /api/v1/activities/:id
 *   GET /api/v1/recovery          ?from=&to=&limit=
 *   GET /api/v1/fitness           ?from=&to=
 *   GET /api/v1/objectives
 */
import express from "express";
import { loadApiKeyAuth, requireApiAuth, requireScope } from "../middleware/apiKey.middleware.js";
import { publicApiRateLimiter } from "../middleware/rateLimit.middleware.js";
import {
  listActivitiesV1,
  getActivityV1,
  listRecoveryV1,
  listFitnessV1,
  listObjectivesV1,
} from "../controllers/publicApi.controller.js";

const router = express.Router();

// Middleware commun à toutes les routes
router.use(publicApiRateLimiter, loadApiKeyAuth, requireApiAuth);

router.get("/activities",    requireScope("activities:read"), listActivitiesV1);
router.get("/activities/:id", requireScope("activities:read"), getActivityV1);
router.get("/recovery",      requireScope("recovery:read"),   listRecoveryV1);
router.get("/fitness",       requireScope("fitness:read"),    listFitnessV1);
router.get("/objectives",    requireScope("objectives:read"), listObjectivesV1);

export default router;
