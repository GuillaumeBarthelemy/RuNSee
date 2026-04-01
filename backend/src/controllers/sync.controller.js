import {
  createSyncJob,
  startSyncJobInBackground,
  getCurrentSyncJob,
  getSyncJobById,
  listSyncJobs,
  getSyncSummary,
} from "../services/sync/syncJob.service.js";

export async function queueHistoricalSync(req, res, next) {
  try {
    const job = await createSyncJob("historical", "ui");
    startSyncJobInBackground(job.id);

    return res.status(202).json({
      jobId: job.id,
      status: job.status,
      message: "Import historique lancé en arrière-plan.",
    });
  } catch (error) {
    next(error);
  }
}

export async function queueIncrementalSync(req, res, next) {
  try {
    const job = await createSyncJob("incremental", "ui");
    startSyncJobInBackground(job.id);

    return res.status(202).json({
      jobId: job.id,
      status: job.status,
      message: "Synchronisation incrémentale lancée en arrière-plan.",
    });
  } catch (error) {
    next(error);
  }
}

export async function getCurrentJob(req, res, next) {
  try {
    const job = await getCurrentSyncJob();

    if (!job) {
      return res.status(404).json({
        message: "Aucune synchronisation en cours.",
      });
    }

    return res.json(job);
  } catch (error) {
    next(error);
  }
}

export async function getJobById(req, res, next) {
  try {
    const { jobId } = req.params;
    const job = await getSyncJobById(jobId);

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
    const limit = Number(req.query.limit || 20);
    const jobs = await listSyncJobs(limit);

    return res.json(jobs);
  } catch (error) {
    next(error);
  }
}

export async function getSummary(req, res, next) {
  try {
    const summary = await getSyncSummary();
    return res.json(summary);
  } catch (error) {
    next(error);
  }
}
