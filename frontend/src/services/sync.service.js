import api from "./api.js";

export async function startHistoricalSync() {
  const response = await api.post("/sync/jobs/historical");
  return response.data;
}

export async function startIncrementalSync() {
  const response = await api.post("/sync/jobs/incremental");
  return response.data;
}

export async function startGlobalSync() {
  const response = await api.post("/sync/all");
  return response.data;
}

export async function startDetailBackfill() {
  const response = await api.post("/sync/jobs/detail-backfill");
  return response.data;
}

export async function getCurrentSyncJob() {
  try {
    const response = await api.get("/sync/jobs/current");
    const data = response.data;
    // Nouvelle forme : 200 { job: null } quand aucune sync en cours.
    // Ancienne forme (rétrocompat) : 200 { id, status, ... } quand un job existe.
    if (data && typeof data === "object" && "job" in data) {
      return data.job;
    }
    return data || null;
  } catch (error) {
    // Rétrocompat : ancien backend renvoyait 404 pour signaler "aucun job"
    if (error?.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function getSyncSummary() {
  const response = await api.get("/sync/summary");
  return response.data;
}

export async function listSyncJobs(limit = 20) {
  const response = await api.get("/sync/jobs", { params: { limit } });
  return response.data;
}

export async function getSyncJobById(jobId) {
  const response = await api.get(`/sync/jobs/${jobId}`);
  return response.data;
}
