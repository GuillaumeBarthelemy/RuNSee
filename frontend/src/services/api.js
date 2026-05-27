import axios from "axios";
import { apiBaseUrl } from "../config/env.js";

const CSRF_COOKIE_NAME = "runsee_csrf";
const CSRF_HEADER_NAME = "X-CSRF-Token";
const UNSAFE_METHODS = new Set(["post", "put", "patch", "delete"]);

function notifyUnauthorized() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent("runsee:unauthorized"));
}

function readCsrfTokenFromCookie() {
  if (typeof document === "undefined") return "";
  const raw = String(document.cookie || "");
  if (!raw) return "";
  for (const chunk of raw.split(";")) {
    const [name, ...rest] = chunk.split("=");
    if (String(name || "").trim() === CSRF_COOKIE_NAME) {
      return decodeURIComponent(rest.join("=").trim());
    }
  }
  return "";
}

const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 60000,
  withCredentials: true,
});

// Inject le header CSRF sur toutes les methodes mutantes.
api.interceptors.request.use((config) => {
  const method = String(config.method || "").toLowerCase();
  if (UNSAFE_METHODS.has(method)) {
    const token = readCsrfTokenFromCookie();
    if (token) {
      config.headers = config.headers || {};
      config.headers[CSRF_HEADER_NAME] = token;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && !error?.config?.skipAuthHandling) {
      notifyUnauthorized();
    }

    return Promise.reject(error);
  }
);

export default api;
