function normalizeUrl(value, fallback) {
  return String(value || fallback || "")
    .trim()
    .replace(/\/+$/, "");
}

function getBrowserHostname() {
  if (typeof window !== "undefined" && window.location?.hostname) {
    return String(window.location.hostname).trim().toLowerCase();
  }

  return "";
}

function isLocalHostname(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function getBrowserOrigin() {
  if (typeof window !== "undefined" && window.location?.origin) {
    return normalizeUrl(window.location.origin, "");
  }

  return "";
}

const fallbackAppBaseUrl = getBrowserOrigin() || "http://localhost:5173";
const browserHostname = getBrowserHostname();
const localApiBaseUrl = normalizeUrl(
  import.meta.env.VITE_LOCAL_API_BASE_URL,
  "http://localhost:3000"
);
const configuredAppBaseUrl = normalizeUrl(
  import.meta.env.VITE_APP_BASE_URL,
  fallbackAppBaseUrl
);
const configuredApiBaseUrl = normalizeUrl(
  import.meta.env.VITE_API_BASE_URL,
  localApiBaseUrl
);

export const appBaseUrl = isLocalHostname(browserHostname)
  ? fallbackAppBaseUrl
  : configuredAppBaseUrl;

export const apiBaseUrl = isLocalHostname(browserHostname)
  ? localApiBaseUrl
  : configuredApiBaseUrl;

export const stravaLoginUrl = `${apiBaseUrl}/auth/strava/login`;
