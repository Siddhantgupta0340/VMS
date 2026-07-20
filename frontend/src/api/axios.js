import axios from "axios";
import {
  clearAuthSession,
  getAccessToken,
  getRefreshToken,
  updateStoredTokens,
} from "../services/authSession";

const API_BASE_URL = "http://localhost:5000/api";

export class AuthRequiredError extends Error {
  constructor(message = "Authentication required. Redirecting to login.") {
    super(message);
    this.name = "AuthRequiredError";
    this.code = "AUTH_REQUIRED";
    this.isAuthRequired = true;
  }
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

let refreshPromise = null;

const PUBLIC_AUTH_PATHS = [
  "/v1/auth/login",
  "/v1/auth/refresh-token",
  "/v1/auth/forgot-password",
  "/v1/auth/verify-otp",
  "/v1/auth/reset-password",
  "/v1/auth/validate-activation-token",
  "/v1/auth/set-password",
  "/v1/auth/activate-account",
  "/v1/auth/resend-activation",
  "/v1/auth/complete-temporary-password",
];

const isSkippedAuthPath = (url = "") =>
  PUBLIC_AUTH_PATHS.some((path) => url.includes(path)) ||
  url.includes("/health") ||
  url.includes("/v1/auth/logout");

const redirectToLogin = () => {
  if (typeof window === "undefined") return;
  const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (window.location.pathname === "/login") return;
  window.location.replace(`/login?redirect=${encodeURIComponent(currentPath)}`);
};

const refreshAccessToken = async () => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error("No refresh token available");
  }

  const response = await axios.post(`${API_BASE_URL}/v1/auth/refresh-token`, { refreshToken }, {
    headers: { "Content-Type": "application/json" },
  });
  const { accessToken, refreshToken: nextRefreshToken } = response.data?.data || {};
  if (!accessToken) {
    throw new Error("Refresh did not return an access token");
  }
  updateStoredTokens(accessToken, nextRefreshToken);
  return accessToken;
};

api.interceptors.request.use((config) => {
  const requestUrl = config.url || "";
  if (isSkippedAuthPath(requestUrl)) {
    return config;
  }

  const token = getAccessToken();
  if (!token) {
    clearAuthSession();
    redirectToLogin();
    return Promise.reject(new AuthRequiredError());
  }

  config.headers = config.headers || {};
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};
    const status = error.response?.status;

    if (status !== 401 || originalRequest.__isRetryRequest || isSkippedAuthPath(originalRequest.url)) {
      return Promise.reject(error);
    }

    try {
      if (!getRefreshToken()) {
        throw new AuthRequiredError("Refresh token missing. Redirecting to login.");
      }
      refreshPromise ||= refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
      const token = await refreshPromise;
      originalRequest.__isRetryRequest = true;
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${token}`;
      return api(originalRequest);
    } catch (refreshError) {
      clearAuthSession();
      redirectToLogin();
      return Promise.reject(refreshError);
    }
  }
);

export default api;

