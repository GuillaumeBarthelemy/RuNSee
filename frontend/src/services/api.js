import axios from "axios";
import { apiBaseUrl } from "../config/env.js";

const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 60000,
});

api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

export default api;
