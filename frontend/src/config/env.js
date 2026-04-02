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

function resolveOptionalUrl(value, baseUrl) {
  const trimmedValue = String(value || "").trim();

  if (!trimmedValue) {
    return "";
  }

  try {
    return new URL(trimmedValue, baseUrl || undefined).toString();
  } catch {
    return trimmedValue;
  }
}

function buildLoginUrl(baseUrl, returnTo) {
  const searchParams = new URLSearchParams();
  const safeReturnTo = normalizeUrl(returnTo, "");

  if (safeReturnTo) {
    searchParams.set("returnTo", safeReturnTo);
  }

  const queryString = searchParams.toString();
  return `${baseUrl}/auth/strava/login${queryString ? `?${queryString}` : ""}`;
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

export const stravaLoginUrl = buildLoginUrl(
  apiBaseUrl,
  getBrowserOrigin() || appBaseUrl
);

export const forgotPasswordUrl = resolveOptionalUrl(
  import.meta.env.VITE_FORGOT_PASSWORD_URL,
  getBrowserOrigin() || appBaseUrl
);
