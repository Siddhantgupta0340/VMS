import api from "../api/axios";

const ACCESS_TOKEN_KEY = "vms_access_token";
const REFRESH_TOKEN_KEY = "vms_refresh_token";
const USER_KEY = "vms_user";

const setTokenStorage = (rememberMe, accessToken, refreshToken) => {
  const storage = rememberMe ? localStorage : sessionStorage;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);

  storage.setItem(ACCESS_TOKEN_KEY, accessToken);
  storage.setItem(REFRESH_TOKEN_KEY, refreshToken || "");
};

export const login = async ({ email, password, rememberMe }) => {
  try {
    const res = await api.post("/v1/auth/login", { email, password });
    const { user, accessToken, refreshToken } = res.data?.data || {};

    if (!accessToken || !user) {
      return { success: false, message: "Login failed" };
    }

    setTokenStorage(rememberMe, accessToken, refreshToken);
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem(USER_KEY, JSON.stringify(user));

    return { success: true, user };
  } catch (err) {
    return {
      success: false,
      message:
        err?.response?.data?.message || err?.message || "Login failed",
    };
  }
};

export const logout = async () => {
  // Note: backend logout is protected and expects Authorization header.
  // api interceptor will attach it automatically from stored access token.

  try {
    const accessToken =
      localStorage.getItem(ACCESS_TOKEN_KEY) ||
      sessionStorage.getItem(ACCESS_TOKEN_KEY);

    if (accessToken) {
      // backend logout is protected; api interceptor will add Authorization
      await api.post("/v1/auth/logout");
    }
  } catch {
    // ignore network/auth errors during logout
  } finally {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(USER_KEY);
  }
};

export const getCurrentUser = async () => {
  // Prefer cached user to keep initial render fast
  try {
    const cached =
      localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
    if (cached) return JSON.parse(cached);
  } catch {
    // ignore
  }

  const accessToken =
    localStorage.getItem(ACCESS_TOKEN_KEY) ||
    sessionStorage.getItem(ACCESS_TOKEN_KEY);

  if (!accessToken) return null;

  try {
    const res = await api.get("/v1/auth/profile");
    const profile = res.data?.data;

    const storage = localStorage.getItem(ACCESS_TOKEN_KEY)
      ? localStorage
      : sessionStorage;
    storage.setItem(USER_KEY, JSON.stringify(profile));

    return profile;
  } catch {
    return null;
  }
};

export const isAuthenticated = () => {
  try {
    return (
      !!localStorage.getItem(ACCESS_TOKEN_KEY) ||
      !!sessionStorage.getItem(ACCESS_TOKEN_KEY)
    );
  } catch {
    return false;
  }
};

