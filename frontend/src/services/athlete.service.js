import api from "./api.js";

export async function getCurrentAthlete() {
  const response = await api.get("/athlete/me");
  return response.data;
}
