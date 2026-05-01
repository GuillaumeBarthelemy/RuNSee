import { getRequiredAuthUser } from "../middleware/auth.middleware.js";
import {
  getTrainingAnalyticsSettings,
  saveTrainingAnalyticsSettings,
} from "../services/settings/trainingAnalyticsSettings.service.js";

export async function getTrainingAnalyticsSettingsController(req, res, next) {
  try {
    const user = getRequiredAuthUser(req);
    const result = await getTrainingAnalyticsSettings(user.id);

    return res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function saveTrainingAnalyticsSettingsController(req, res, next) {
  try {
    const user = getRequiredAuthUser(req);
    const result = await saveTrainingAnalyticsSettings(user.id, req.body || {});

    return res.json(result);
  } catch (error) {
    next(error);
  }
}
