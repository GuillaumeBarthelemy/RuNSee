import prisma from "../config/prisma.js";
import { listActivities } from "../repositories/activity.repository.js";
import { enrichActivityByStravaId } from "../services/activityEnrichment.service.js";

export async function getActivities(req, res, next) {
  try {
    const { from, to, type, sportType } = req.query;

    const activities = await listActivities({
      from,
      to,
      type,
      sportType
    });

    return res.json(activities);
  } catch (error) {
    next(error);
  }
}

export async function getActivityByStravaId(req, res, next) {
  try {
    const { stravaActivityId } = req.params;

    const activity = await prisma.activity.findUnique({
      where: {
        stravaActivityId
      }
    });

    if (!activity) {
      return res.status(404).json({
        message: "Activity not found."
      });
    }

    return res.json(activity);
  } catch (error) {
    next(error);
  }
}

export async function enrichActivity(req, res, next) {
  try {
    const { stravaActivityId } = req.params;

    const result = await enrichActivityByStravaId(stravaActivityId);

    return res.json(result);
  } catch (error) {
    next(error);
  }
}
