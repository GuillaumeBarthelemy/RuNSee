import { getRequiredAuthUser } from "../middleware/auth.middleware.js";
import {
  connectGarminForUser,
  disconnectGarminForUser,
  getProviderStatusesForUser,
  getGarminConnectionStatus,
  getGarminSyncMetrics,
  purgeGarminDataForUser,
} from "../services/providers/garminProvider.service.js";
import { enrichGarminActivitiesForUser } from "../services/providers/garminActivityEnrichment.service.js";
import {
  listGarminRecoverySnapshotsForUser,
  renormalizeGarminRecoverySnapshotsForUser,
  startGarminRecoveryBackfillForUser,
  syncRecentGarminRecoveryForUser,
} from "../services/providers/garminRecoveryBackfill.service.js";

export async function getGarminConnectionStatusController(req, res, next) {
  try {
    const user = getRequiredAuthUser(req);
    const result = await getGarminConnectionStatus(user.id);

    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

export async function getProviderStatusesController(req, res, next) {
  try {
    const user = getRequiredAuthUser(req);
    const result = await getProviderStatusesForUser(user.id);

    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

export async function connectGarminController(req, res, next) {
  try {
    const user = getRequiredAuthUser(req);
    const result = await connectGarminForUser(user.id, req.body || {});

    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

export async function disconnectGarminController(req, res, next) {
  try {
    const user = getRequiredAuthUser(req);
    const result = await disconnectGarminForUser(user.id);

    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

export async function purgeGarminDataController(req, res, next) {
  try {
    const user = getRequiredAuthUser(req);
    const result = await purgeGarminDataForUser(user.id, req.body || {});

    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

export async function getGarminSyncMetricsController(req, res, next) {
  try {
    const user = getRequiredAuthUser(req);
    const result = await getGarminSyncMetrics(user.id);

    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

export async function enrichGarminActivitiesController(req, res, next) {
  try {
    const user = getRequiredAuthUser(req);
    const result = await enrichGarminActivitiesForUser(user.id, req.body || {});

    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

export async function startGarminRecoveryBackfillController(req, res, next) {
  try {
    const user = getRequiredAuthUser(req);
    const result = await startGarminRecoveryBackfillForUser(user.id);

    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

export async function syncRecentGarminRecoveryController(req, res, next) {
  try {
    const user = getRequiredAuthUser(req);
    const result = await syncRecentGarminRecoveryForUser(user.id, { triggerSource: "ui" });

    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

export async function renormalizeGarminRecoveryController(req, res, next) {
  try {
    const user = getRequiredAuthUser(req);
    const { processedDays, updatedDays } = await renormalizeGarminRecoverySnapshotsForUser(user.id);

    return res.json({
      message: `Re-normalisation terminee : ${processedDays} jour(s) traite(s), ${updatedDays} snapshot(s) mis a jour.`,
      processedDays,
      updatedDays,
    });
  } catch (error) {
    return next(error);
  }
}

export async function listGarminRecoverySnapshotsController(req, res, next) {
  try {
    const user = getRequiredAuthUser(req);
    const result = await listGarminRecoverySnapshotsForUser(user.id, {
      days: req.query?.days,
    });

    return res.json(result);
  } catch (error) {
    return next(error);
  }
}
