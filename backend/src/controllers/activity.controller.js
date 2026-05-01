import prisma from "../config/prisma.js";
import { getRequiredAuthUser } from "../middleware/auth.middleware.js";
import {
  getStoredActivityByStravaIdForUser,
  listActivities,
} from "../repositories/activity.repository.js";
import { enrichActivityByStravaId } from "../services/activityEnrichment.service.js";

export async function getActivities(req, res, next) {
  try {
    const user = getRequiredAuthUser(req);
    const { from, to, type, sportType } = req.query;

    const activities = await listActivities({
      appUserId: user.id,
      from,
      to,
      type,
      sportType,
    });

    return res.json(activities);
  } catch (error) {
    next(error);
  }
}

export async function getActivityByStravaId(req, res, next) {
  try {
    const user = getRequiredAuthUser(req);
    const { stravaActivityId } = req.params;
    const activity = await getStoredActivityByStravaIdForUser(user.id, stravaActivityId);

    if (!activity) {
      return res.status(404).json({
        message: "Activity not found.",
      });
    }

    return res.json(activity);
  } catch (error) {
    next(error);
  }
}

function sanitizeRpeValue(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numeric = Math.round(Number(value));
  if (!Number.isFinite(numeric)) {
    return null;
  }

  return Math.min(10, Math.max(1, numeric));
}

export async function updateActivityRpe(req, res, next) {
  try {
    const user = getRequiredAuthUser(req);
    const { stravaActivityId } = req.params;
    const existingActivity = await getStoredActivityByStravaIdForUser(
      user.id,
      stravaActivityId,
    );

    if (!existingActivity) {
      return res.status(404).json({ message: "Activity not found." });
    }

    const sanitized = sanitizeRpeValue(req.body?.userRpe);

    await prisma.activity.update({
      where: { id: existingActivity.id },
      data: {
        userRpe: sanitized,
        userRpeUpdatedAt: sanitized === null ? null : new Date(),
      },
    });

    const updated = await getStoredActivityByStravaIdForUser(user.id, stravaActivityId);
    return res.json(updated);
  } catch (error) {
    next(error);
  }
}

export async function enrichActivity(req, res, next) {
  try {
    const user = getRequiredAuthUser(req);
    const { stravaActivityId } = req.params;
    const existingActivity = await getStoredActivityByStravaIdForUser(
      user.id,
      stravaActivityId
    );

    if (!existingActivity) {
      return res.status(404).json({
        message: "Activity not found.",
      });
    }

    const result = await enrichActivityByStravaId(user.id, stravaActivityId);

    return res.json(result);
  } catch (error) {
    next(error);
  }
}
