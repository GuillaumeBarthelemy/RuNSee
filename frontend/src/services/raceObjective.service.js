import api from "./api.js";

export async function listRaceObjectives() {
  const response = await api.get("/settings/race-objectives");
  return response.data;
}

export async function createRaceObjective(payload = {}) {
  const response = await api.post("/settings/race-objectives", payload);
  return response.data;
}

export async function archiveRaceObjective(raceId) {
  const response = await api.delete(`/settings/race-objectives/${raceId}`);
  return response.data;
}

export async function reactivateRaceObjective(raceId) {
  const response = await api.post(`/settings/race-objectives/${raceId}/activate`, {});
  return response.data;
}
