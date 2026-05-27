import axios from "axios";
import { apiBaseUrl } from "../config/env.js";

const CSRF_HEADER_NAME = "X-CSRF-Token";
const UNSAFE_METHODS = new Set(["post", "put", "patch", "delete"]);

// Token CSRF en memoire : mis a jour depuis le response header `X-CSRF-Token`
// que le backend renvoie sur chaque reponse. Le cookie correspondant reste
// httpOnly cote backend (pas lisible par JS — protection XSS). Le frontend
// n'a besoin que de connaitre la valeur pour la renvoyer en request header
// sur les mutations.
let csrfToken = "";

function notifyUnauthorized() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent("runsee:unauthorized"));
}

const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 60000,
  withCredentials: true,
});

// Inject le header CSRF sur toutes les methodes mutantes.
api.interceptors.request.use((config) => {
  const method = String(config.method || "").toLowerCase();
  if (UNSAFE_METHODS.has(method) && csrfToken) {
    config.headers = config.headers || {};
    config.headers[CSRF_HEADER_NAME] = csrfToken;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    // Le backend renvoie le token sur chaque reponse — on le memorise.
    const headerToken = response?.headers?.[CSRF_HEADER_NAME.toLowerCase()]
      || response?.headers?.[CSRF_HEADER_NAME];
    if (headerToken) {
      csrfToken = String(headerToken);
    }
    return response;
  },
  (error) => {
    // Recupere aussi le token sur les reponses d'erreur (ex: 401 sur /me
    // amorce le token avant le login).
    const headerToken = error?.response?.headers?.[CSRF_HEADER_NAME.toLowerCase()]
      || error?.response?.headers?.[CSRF_HEADER_NAME];
    if (headerToken) {
      csrfToken = String(headerToken);
    }
    if (error?.response?.status === 401 && !error?.config?.skipAuthHandling) {
      notifyUnauthorized();
    }

    return Promise.reject(error);
  }
);

export default api;
