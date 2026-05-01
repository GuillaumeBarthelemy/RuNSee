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

function rewriteLoopbackHost(value, targetHostname) {
  const candidate = String(value || "").trim();
  const safeTargetHostname = String(targetHostname || "").trim().toLowerCase();

  if (!candidate || !isLocalHostname(safeTargetHostname)) {
    return normalizeUrl(candidate, candidate);
  }

  try {
    const url = new URL(candidate);

    if (!isLocalHostname(String(url.hostname || "").trim().toLowerCase())) {
      return normalizeUrl(url.toString(), candidate);
    }

    url.hostname = safeTargetHostname;
    return normalizeUrl(url.toString(), candidate);
  } catch {
    return normalizeUrl(candidate, candidate);
  }
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
  rewriteLoopbackHost(import.meta.env.VITE_LOCAL_API_BASE_URL, browserHostname),
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

export function getStravaLoginUrl(returnTo = getBrowserOrigin() || appBaseUrl) {
  return buildLoginUrl(apiBaseUrl, returnTo);
}

export const stravaLoginUrl = getStravaLoginUrl(getBrowserOrigin() || appBaseUrl);

export const forgotPasswordUrl = resolveOptionalUrl(
  import.meta.env.VITE_FORGOT_PASSWORD_URL,
  getBrowserOrigin() || appBaseUrl
);
