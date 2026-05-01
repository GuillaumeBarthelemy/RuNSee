import api from "./api.js";

function extractUser(response) {
  return response?.data?.user ?? null;
}

export async function getCurrentUser() {
  const response = await api.get("/auth/me");
  return extractUser(response);
}

export async function signup({ displayName, email, password }) {
  const response = await api.post(
    "/auth/signup",
    { displayName, email, password },
    { skipAuthHandling: true },
  );

  return extractUser(response);
}

export async function login({ email, password }) {
  const response = await api.post(
    "/auth/login",
    { email, password },
    { skipAuthHandling: true },
  );

  return extractUser(response);
}

export async function logout() {
  await api.post("/auth/logout");
}

export async function disconnectStravaAccount() {
  const response = await api.post("/auth/strava/disconnect");
  return response.data;
}

export async function saveStravaAppConfig({ clientId, clientSecret }) {
  const response = await api.put("/auth/strava/app", {
    clientId,
    clientSecret,
  });

  return response.data;
}

export async function deleteStravaAppConfig() {
  const response = await api.delete("/auth/strava/app");
  return response.data;
}
