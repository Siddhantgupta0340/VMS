import api from "../api/axios";
import {
  PASSWORD_CHANGE_TOKEN_KEY,
  clearAuthSession,
  getAccessToken,
  hasAuthTokens,
  setStoredUser,
  setTokenStorage,
} from "./authSession";
const GENERIC_LOGIN_ERROR = "Login failed. Please check your email and password.";
const SERVICE_UNAVAILABLE_MESSAGE = "The service is temporarily unavailable. Please try again shortly.";
const NETWORK_ERROR_MESSAGE = "Unable to connect to the server. Check your internet connection.";
const INTERNAL_SERVER_ERROR_MESSAGE = "Internal Server Error. Please try again later.";
const INTERNAL_ERROR_PATTERNS = [
  /prisma/i,
  /users\./i,
  /deleted_by_id/i,
  /findFirst/i,
  /stack/i,
  /SQL/i,
  /P20\d{2}/i,
];

const getSafeAuthErrorMessage = (err) => {
  const responseMessage = err?.response?.data?.message;
  const responseCode = err?.response?.data?.code;
  const status = err?.response?.status;

  if (!err?.response) {
    if (err?.code === "ECONNABORTED") return SERVICE_UNAVAILABLE_MESSAGE;
    return NETWORK_ERROR_MESSAGE;
  }

  if (status === 401) return GENERIC_LOGIN_ERROR;
  if (status === 403) return "You do not have permission to access this page.";
  if (status === 404) return "Resource not found.";
  if (status >= 500) return INTERNAL_SERVER_ERROR_MESSAGE;

  if (responseCode === "SERVICE_TEMPORARILY_UNAVAILABLE") {
    return SERVICE_UNAVAILABLE_MESSAGE;
  }

  if (typeof responseMessage === "string" && responseMessage.trim()) {
    const safeMessage = responseMessage.trim();
    if (!INTERNAL_ERROR_PATTERNS.some((pattern) => pattern.test(safeMessage))) {
      return safeMessage;
    }
  }

  return GENERIC_LOGIN_ERROR;
};

export const login = async ({ email, password, rememberMe }) => {
  try {
    const res = await api.post("/v1/auth/login", { email, password });
    const { user, accessToken, refreshToken, requiresPasswordChange, passwordChangeToken } = res.data?.data || {};

    if (requiresPasswordChange && passwordChangeToken) {
      sessionStorage.setItem(PASSWORD_CHANGE_TOKEN_KEY, passwordChangeToken);
      return { success: true, requiresPasswordChange: true, user };
    }

    if (!accessToken || !user) {
      return { success: false, message: "Login failed" };
    }

    setTokenStorage(rememberMe, accessToken, refreshToken);
    setStoredUser(user);

    return { success: true, user };
  } catch (err) {
    return {
      success: false,
      message: getSafeAuthErrorMessage(err),
      code: err?.response?.data?.code,
    };
  }
};

export const completeTemporaryPasswordChange = async ({ newPassword, confirmPassword }) => {
  const passwordChangeToken = sessionStorage.getItem(PASSWORD_CHANGE_TOKEN_KEY);
  const res = await api.post("/v1/auth/complete-temporary-password", {
    passwordChangeToken,
    newPassword,
    confirmPassword,
  });
  const { user, accessToken, refreshToken } = res.data?.data || {};
  if (!accessToken || !user) {
    return { success: false, message: "Password changed, but login session could not be created." };
  }
  setTokenStorage(false, accessToken, refreshToken);
  setStoredUser(user);
  sessionStorage.removeItem(PASSWORD_CHANGE_TOKEN_KEY);
  return { success: true, user };
};

export const validateActivationToken = async (token) => {
  const res = await api.get("/v1/auth/validate-activation-token", { params: { token } });
  return res.data.data;
};

export const setActivationPassword = async ({ token, newPassword }) => {
  const res = await api.post("/v1/auth/set-password", { token, newPassword });
  return res.data;
};

export const resendActivation = async (email) => {
  const res = await api.post("/v1/auth/resend-activation", { email });
  return res.data;
};

export const forgotPassword = async ({ email }) => {
  try {
    const res = await api.post("/v1/auth/forgot-password", { email });
    return {
      success: true,
      message: res.data?.message || "If an account exists for this email address, password reset instructions have been sent.",
    };
  } catch (err) {
    return {
      success: false,
      message: getSafeAuthErrorMessage(err),
    };
  }
};

export const verifyOtp = async ({ email, otp }) => {
  try {
    const res = await api.post("/v1/auth/verify-otp", { email, otp });
    return {
      success: true,
      message: res.data?.message || "OTP verified successfully.",
    };
  } catch (err) {
    return {
      success: false,
      message: getSafeAuthErrorMessage(err),
    };
  }
};

export const resetPassword = async ({ email, otp, newPassword }) => {
  try {
    const res = await api.post("/v1/auth/reset-password", { email, otp, newPassword });
    return {
      success: true,
      message: res.data?.message || "Password reset successfully. You can now login with your new password.",
    };
  } catch (err) {
    return {
      success: false,
      message: getSafeAuthErrorMessage(err),
    };
  }
};


export const logout = async () => {
  // Note: backend logout is protected and expects Authorization header.
  // api interceptor will attach it automatically from stored access token.

  try {
    const accessToken = getAccessToken();
    if (accessToken) {
      // backend logout is protected; api interceptor will add Authorization
      await api.post("/v1/auth/logout");
    }
  } catch {
    // ignore network/auth errors during logout
  } finally {
    clearAuthSession();
  }
};

export const getCurrentUser = async () => {
  const accessToken = getAccessToken();
  if (!accessToken) return null;

  try {
    const res = await api.get("/v1/auth/profile");
    const profile = res.data?.data;

    setStoredUser(profile);
    return profile;
  } catch {
    clearAuthSession();
    return null;
  }
};

export const isAuthenticated = () => {
  return hasAuthTokens();
};

