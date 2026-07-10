import { createContext, useContext, useEffect, useState } from "react";
import {
  login as loginService,
  logout as logoutService,
  getCurrentUser,
  isAuthenticated,
} from "../services/authService";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        if (!isAuthenticated()) {
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

  const login = async (credentials) => {
    const result = await loginService(credentials);
    if (result.success) setUser(result.user);
    return result;
  };

  const logout = async () => {
    await logoutService();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
        bootstrapping,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

