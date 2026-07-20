export const ACCESS_TOKEN_KEY = "vms_access_token";
export const REFRESH_TOKEN_KEY = "vms_refresh_token";
export const USER_KEY = "vms_user";
export const PASSWORD_CHANGE_TOKEN_KEY = "vms_password_change_token";
export const AUTH_SESSION_CLEARED_EVENT = "vms:auth-session-cleared";

const getStorageWithAccessToken = () =>
  localStorage.getItem(ACCESS_TOKEN_KEY) ? localStorage : sessionStorage;

const getStorageWithRefreshToken = () =>
  localStorage.getItem(REFRESH_TOKEN_KEY) ? localStorage : sessionStorage;

const normalizeToken = (token) => (typeof token === "string" && token.trim() ? token.trim() : null);

export const getAccessToken = () => {
  try {
    return normalizeToken(localStorage.getItem(ACCESS_TOKEN_KEY)) || normalizeToken(sessionStorage.getItem(ACCESS_TOKEN_KEY));
  } catch {
    return null;
  }
};

export const getRefreshToken = () => {
  try {
    return normalizeToken(localStorage.getItem(REFRESH_TOKEN_KEY)) || normalizeToken(sessionStorage.getItem(REFRESH_TOKEN_KEY));
  } catch {
    return null;
  }
};

export const getStoredUser = () => {
  try {
    const cached = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
};

export const setStoredUser = (user) => {
  const storage = getStorageWithAccessToken();
  storage.setItem(USER_KEY, JSON.stringify(user));
};

export const setTokenStorage = (rememberMe, accessToken, refreshToken) => {
  const storage = rememberMe ? localStorage : sessionStorage;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);

  storage.setItem(ACCESS_TOKEN_KEY, accessToken);
  storage.setItem(REFRESH_TOKEN_KEY, refreshToken || "");
};

export const updateStoredTokens = (accessToken, refreshToken) => {
  const storage = getStorageWithRefreshToken();
  storage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) {
    storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
};

export const clearAuthSession = ({ notify = true } = {}) => {
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(PASSWORD_CHANGE_TOKEN_KEY);
    sessionStorage.removeItem("vms_profile");
    localStorage.removeItem("vms_profile");
    if (notify) {
      window.dispatchEvent(new Event(AUTH_SESSION_CLEARED_EVENT));
    }
  } catch {
    // Browser storage can be unavailable in restricted modes. Treat as cleared.
  }
};

export const hasAuthTokens = () => Boolean(getAccessToken());
