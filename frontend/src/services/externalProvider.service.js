import api from "./api.js";

export async function getProviderStatuses() {
  const response = await api.get("/providers/status");
  return response.data;
}

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

export async function purgeGarminData({ confirm } = {}) {
  const response = await api.delete("/providers/garmin/data", {
    data: {
      confirm,
    },
  });
  return response.data;
}

export async function getGarminSyncMetrics() {
  const response = await api.get("/providers/garmin/metrics");
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

export async function renormalizeGarminRecovery() {
  const response = await api.post("/providers/garmin/recovery/renormalize", {});
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

export async function enrichGarminActivities(payload = {}) {
  const response = await api.post("/providers/garmin/activities/enrich", payload);
  return response.data;
}

export async function getGarminActivityBackfillStatus() {
  const response = await api.get("/providers/garmin/activities/backfill/status");
  return response.data;
}

export async function startGarminActivityBackfill() {
  const response = await api.post("/providers/garmin/activities/backfill/start", {});
  return response.data;
}

export async function pauseGarminActivityBackfill() {
  const response = await api.post("/providers/garmin/activities/backfill/pause", {});
  return response.data;
}

export async function resumeGarminActivityBackfill() {
  const response = await api.post("/providers/garmin/activities/backfill/resume", {});
  return response.data;
}
