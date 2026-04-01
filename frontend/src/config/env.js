function normalizeUrl(value, fallback) {
  return String(value || fallback || "")
    .trim()
    .replace(/\/+$/, "");
}

export const apiBaseUrl = normalizeUrl(
  import.meta.env.VITE_API_BASE_URL,
  "http://localhost:3000"
);

export const stravaLoginUrl = `${apiBaseUrl}/auth/strava/login`;
