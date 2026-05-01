import api from "./api.js";

export async function getTrainingAnalyticsSettings() {
  const response = await api.get("/settings/training-analytics");
  return response.data;
}

export async function saveTrainingAnalyticsSettings(payload = {}) {
  const response = await api.put("/settings/training-analytics", payload);
  return response.data;
}
