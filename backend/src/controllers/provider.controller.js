import { getRequiredAuthUser } from "../middleware/auth.middleware.js";
import {
  connectGarminForUser,
  disconnectGarminForUser,
  getGarminConnectionStatus,
} from "../services/providers/garminProvider.service.js";
import {
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
