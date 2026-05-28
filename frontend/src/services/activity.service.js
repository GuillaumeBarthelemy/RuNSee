import api from "./api.js";

export async function getActivities(params = {}) {
  // Par defaut le backend exclut rawJson (perf). Passer { includeRaw: true }
  // pour recuperer les splits complets (page Performance / records).
  const response = await api.get("/activities", { params });
  return response.data;
}

export async function getActivityById(stravaActivityId) {
  const response = await api.get(`/activities/${stravaActivityId}`);
  return response.data;
}

export async function enrichActivity(stravaActivityId) {
  const response = await api.post(`/activities/${stravaActivityId}/enrich`);
  return response.data;
}

export async function updateActivityRpe(stravaActivityId, userRpe) {
  const response = await api.patch(`/activities/${stravaActivityId}/rpe`, { userRpe });
  return response.data;
}

/**
 * Met a jour la classification utilisateur d'une activite.
 * @param {string} stravaActivityId
 * @param {{ sessionType?: string, markers?: string[], notes?: string }} payload
 */
export async function updateActivityClassification(stravaActivityId, payload) {
  const response = await api.patch(`/activities/${stravaActivityId}/classification`, payload);
  return response.data;
}

export async function getActivityBenchmark(stravaActivityId) {
  const response = await api.get(`/activities/${stravaActivityId}/benchmark`);
  return response.data;
}
