import prisma from "../config/prisma.js";
import { getRequiredAuthUser } from "../middleware/auth.middleware.js";
import {
  getStoredActivityByPublicIdForUser,
  listActivities,
} from "../repositories/activity.repository.js";
import { enrichActivityByStravaId } from "../services/activityEnrichment.service.js";
import { EXTERNAL_PROVIDER_CODES } from "../services/providers/externalProvider.constants.js";
import { buildPublicGarminActivityEnrichment } from "../services/providers/garminActivityEnrichment.service.js";

function buildActivityDetailResponse(activity) {
  if (!activity) {
    return null;
  }

  const providerEnrichments = Array.isArray(activity.providerEnrichments)
    ? activity.providerEnrichments
    : [];
  const garminActivityEnrichment = providerEnrichments.find(
    (enrichment) => enrichment.providerCode === EXTERNAL_PROVIDER_CODES.GARMINCONNECT_UNOFFICIAL,
  );

  return {
    ...activity,
    garminActivityEnrichment: buildPublicGarminActivityEnrichment(garminActivityEnrichment),
  };
}

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
    const activity = await getStoredActivityByPublicIdForUser(user.id, stravaActivityId);

    if (!activity) {
      return res.status(404).json({
        message: "Activity not found.",
      });
    }

    return res.json(buildActivityDetailResponse(activity));
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
    const existingActivity = await getStoredActivityByPublicIdForUser(
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

    const updated = await getStoredActivityByPublicIdForUser(user.id, stravaActivityId);
    return res.json(buildActivityDetailResponse(updated));
  } catch (error) {
    next(error);
  }
}

export async function enrichActivity(req, res, next) {
  try {
    const user = getRequiredAuthUser(req);
    const { stravaActivityId } = req.params;
    const existingActivity = await getStoredActivityByPublicIdForUser(
      user.id,
      stravaActivityId
    );

    if (!existingActivity) {
      return res.status(404).json({
        message: "Activity not found.",
      });
    }

    if (!existingActivity.stravaActivityId) {
      return res.status(409).json({
        message: "Enrichissement Strava indisponible pour cette activite.",
      });
    }

    const result = await enrichActivityByStravaId(user.id, existingActivity.stravaActivityId);

    return res.json(result);
  } catch (error) {
    next(error);
  }
}
