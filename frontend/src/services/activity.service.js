import api from "./api.js";

export async function getActivities(params = {}) {
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
