import { getRequiredAuthUser } from "../middleware/auth.middleware.js";
import {
  archiveRaceObjective,
  createRaceObjective,
  listRaceObjectives,
  reactivateRaceObjective,
} from "../services/settings/raceObjective.service.js";

export async function listRaceObjectivesController(req, res, next) {
  try {
    const user = getRequiredAuthUser(req);
    const result = await listRaceObjectives(user.id);
    return res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function createRaceObjectiveController(req, res, next) {
  try {
    const user = getRequiredAuthUser(req);
    const result = await createRaceObjective(user.id, req.body || {});
    return res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function archiveRaceObjectiveController(req, res, next) {
  try {
    const user = getRequiredAuthUser(req);
    const result = await archiveRaceObjective(user.id, req.params?.raceId);
    return res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function reactivateRaceObjectiveController(req, res, next) {
  try {
    const user = getRequiredAuthUser(req);
    const result = await reactivateRaceObjective(user.id, req.params?.raceId);
    return res.json(result);
  } catch (error) {
    next(error);
  }
}
