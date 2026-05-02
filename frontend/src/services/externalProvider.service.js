import api from "./api.js";

export async function getGarminConnectionStatus() {
  const response = await api.get("/providers/garmin/status");
  return response.data;
}

export async function connectGarmin(payload = {}) {
  const response = await api.post("/providers/garmin/connect", payload);
  return response.data;
}

export async function disconnectGarmin() {
  const response = await api.post("/providers/garmin/disconnect", {});
  return response.data;
}

export async function startGarminRecoveryBackfill() {
  const response = await api.post("/providers/garmin/recovery/backfill", {});
  return response.data;
}

export async function syncRecentGarminRecovery() {
  const response = await api.post("/providers/garmin/recovery/sync-recent", {});
  return response.data;
}

export async function getGarminRecoverySnapshots({ days = 56 } = {}) {
  const response = await api.get("/providers/garmin/recovery/snapshots", {
    params: {
      days,
    },
  });
  return response.data;
}
