import api from "./api.js";

export async function startHistoricalSync() {
  const response = await api.post("/sync/jobs/historical");
  return response.data;
}

export async function startIncrementalSync() {
  const response = await api.post("/sync/jobs/incremental");
  return response.data;
}

export async function getCurrentSyncJob() {
  try {
    const response = await api.get("/sync/jobs/current");
    return response.data;
  } catch (error) {
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
