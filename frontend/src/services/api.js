import axios from "axios";
import { apiBaseUrl } from "../config/env.js";

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
