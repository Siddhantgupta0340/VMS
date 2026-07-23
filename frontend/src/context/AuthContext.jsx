import { createContext, useContext, useEffect, useState } from "react";
import {
  login as loginService,
  logout as logoutService,
  getCurrentUser,
  isAuthenticated,
  completeTemporaryPasswordChange,
} from "../services/authService";
import { AUTH_SESSION_CLEARED_EVENT, clearAuthSession } from "../services/authSession";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        if (!isAuthenticated()) {
          clearAuthSession({ notify: false });
          setUser(null);
          return;
        }

        const currentUser = await getCurrentUser();
        if (currentUser) setUser(currentUser);
      } finally {
        setBootstrapping(false);
      }
    };

    bootstrap();
  }, []);

  useEffect(() => {
    const handleSessionCleared = () => {
      setUser(null);
      setBootstrapping(false);
    };

    window.addEventListener(AUTH_SESSION_CLEARED_EVENT, handleSessionCleared);
    return () => window.removeEventListener(AUTH_SESSION_CLEARED_EVENT, handleSessionCleared);
  }, []);

  const login = async (credentials) => {
    const result = await loginService(credentials);
    if (result.success && !result.requiresPasswordChange) setUser(result.user);
    return result;
  };

  const completeLogin = (nextUser) => {
    setUser(nextUser);
  };

  const completeRequiredPasswordChange = async (payload) => {
    const result = await completeTemporaryPasswordChange(payload);
    if (result.success) setUser(result.user);
    return result;
  };

  const logout = async () => {
    await logoutService();
    setUser(null);
  };

  const clearSession = () => {
    clearAuthSession();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        completeLogin,
        completeRequiredPasswordChange,
        logout,
        clearSession,
        isAuthenticated: !!user,
        bootstrapping,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

