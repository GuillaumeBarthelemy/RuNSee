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
  getGarminActivityBackfillStatusForUser,
  pauseGarminActivityBackfillForUser,
  resumeGarminActivityBackfillForUser,
  runGarminActivityBackfillWindowForUser,
  startGarminActivityBackfillForUser,
} from "../services/providers/garminHistoricalBackfill.service.js";
import {
  listGarminRecoverySnapshotsForUser,
  renormalizeGarminRecoverySnapshotsForUser,
  startGarminRecoveryBackfillForUser,
  syncRecentGarminRecoveryForUser,
} from "../services/providers/garminRecoveryBackfill.service.js";
import {
  listGarminFitnessSnapshotsForUser,
  syncGarminFitnessForUser,
  syncGarminEnduranceForUser,
} from "../services/providers/garminFitnessSync.service.js";
import {
  backfillVdotHistoryForUser,
  listVdotHistoryForUser,
} from "../services/vdotHistory.service.js";

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

export async function getGarminActivityBackfillStatusController(req, res, next) {
  try {
    const user = getRequiredAuthUser(req);
    const result = await getGarminActivityBackfillStatusForUser(user.id);

    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

export async function startGarminActivityBackfillController(req, res, next) {
  try {
    const user = getRequiredAuthUser(req);
    const result = await startGarminActivityBackfillForUser(user.id);

    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

export async function pauseGarminActivityBackfillController(req, res, next) {
  try {
    const user = getRequiredAuthUser(req);
    const result = await pauseGarminActivityBackfillForUser(user.id);

    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

export async function resumeGarminActivityBackfillController(req, res, next) {
  try {
    const user = getRequiredAuthUser(req);
    const result = await resumeGarminActivityBackfillForUser(user.id);

    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

export async function runGarminActivityBackfillWindowController(req, res, next) {
  try {
    const user = getRequiredAuthUser(req);
    const result = await runGarminActivityBackfillWindowForUser(user.id, {
      triggerSource: "manual-run-window",
      force: Boolean(req.body?.force),
    });

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

// --- Lot 5 Performance V5 — VO2max wellness Garmin ---

export async function listGarminFitnessSnapshotsController(req, res, next) {
  try {
    const user = getRequiredAuthUser(req);
    const result = await listGarminFitnessSnapshotsForUser(user.id, {
      days: req.query?.days,
    });
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

export async function syncRecentGarminFitnessController(req, res, next) {
  try {
    const user = getRequiredAuthUser(req);
    const days = req.body?.days ? Number(req.body.days) : 30;
    const result = await syncGarminFitnessForUser(user.id, { days });
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

// --- Lot Performance V5 VDOT&profil — Endurance Score + Hill Score ---

export async function syncRecentGarminEnduranceController(req, res, next) {
  try {
    const user = getRequiredAuthUser(req);
    const days = req.body?.days ? Number(req.body.days) : 30;
    const result = await syncGarminEnduranceForUser(user.id, { days });
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

// --- Lot 5 Performance V5 — VDOT history consolide ---

export async function listVdotHistoryController(req, res, next) {
  try {
    const user = getRequiredAuthUser(req);
    const result = await listVdotHistoryForUser(user.id, {
      days: req.query?.days,
    });
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

export async function backfillVdotHistoryController(req, res, next) {
  try {
    const user = getRequiredAuthUser(req);
    const days = req.body?.days ? Number(req.body.days) : 90;
    const result = await backfillVdotHistoryForUser(user.id, { days });
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}
