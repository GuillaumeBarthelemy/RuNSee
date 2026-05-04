import { getRequiredAuthUser } from "../middleware/auth.middleware.js";
import {
  getCurrentSyncJob,
  getSyncJobById,
  listSyncJobs,
  getSyncSummary,
  queueSyncJobForUser,
} from "../services/sync/syncJob.service.js";

export async function queueHistoricalSync(req, res, next) {
  try {
    const user = getRequiredAuthUser(req);
    const job = await queueSyncJobForUser(user.id, "historical", "ui");

    return res.status(202).json({
      jobId: job.id,
      status: job.status,
      message: "Import historique lance en arriere-plan.",
    });
  } catch (error) {
    next(error);
  }
}

export async function queueIncrementalSync(req, res, next) {
  try {
    const user = getRequiredAuthUser(req);
    const job = await queueSyncJobForUser(user.id, "incremental", "ui");

    return res.status(202).json({
      jobId: job.id,
      status: job.status,
      message: "Synchronisation incrementale lancee en arriere-plan.",
    });
  } catch (error) {
    next(error);
  }
}

export async function queueDetailBackfill(req, res, next) {
  try {
    const user = getRequiredAuthUser(req);
    const job = await queueSyncJobForUser(user.id, "detail_backfill", "ui");

    return res.status(202).json({
      jobId: job.id,
      status: job.status,
      message: "Enrichissement detaille historique lance en arriere-plan.",
    });
  } catch (error) {
    next(error);
  }
}

export async function getCurrentJob(req, res, next) {
  try {
    const user = getRequiredAuthUser(req);
    const job = await getCurrentSyncJob(user.id);

    // 200 { job: null } est sémantiquement plus correct qu'un 404 pour
    // signaler "aucune sync en cours" : ce n'est pas une erreur, c'est un
    // état attendu. Le 404 polluait la console navigateur et rendait
    // les vraies erreurs (500, 401) moins visibles.
    if (!job) {
      return res.json({ job: null });
    }

    return res.json(job);
  } catch (error) {
    next(error);
  }
}

export async function getJobById(req, res, next) {
  try {
    const user = getRequiredAuthUser(req);
    const { jobId } = req.params;
    const job = await getSyncJobById(user.id, jobId);

    if (!job) {
      return res.status(404).json({
        message: "Job introuvable.",
      });
    }

    return res.json(job);
  } catch (error) {
    next(error);
  }
}

export async function getJobs(req, res, next) {
  try {
    const user = getRequiredAuthUser(req);
    const limit = Number(req.query.limit || 20);
    const jobs = await listSyncJobs(user.id, limit);

    return res.json(jobs);
  } catch (error) {
    next(error);
  }
}

export async function getSummary(req, res, next) {
  try {
    const user = getRequiredAuthUser(req);
    const summary = await getSyncSummary(user.id);
    return res.json(summary);
  } catch (error) {
    next(error);
  }
}
