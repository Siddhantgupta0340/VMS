import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { useAuth } from "./AuthContext";
import {
  getUnreadCount,
  NOTIFICATIONS_CHANGED_EVENT,
} from "../services/notificationService";

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(null);
  const [countLoading, setCountLoading] = useState(false);
  const [countError, setCountError] = useState(false);

  const refreshUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(null);
      setCountError(false);
      return 0;
    }

    try {
      setCountLoading(true);
      const count = await getUnreadCount();
      setUnreadCount(count);
      setCountError(false);
      return count;
    } catch {
      setUnreadCount(null);
      setCountError(true);
      return 0;
    } finally {
      setCountLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  useEffect(() => {
    if (!user) return undefined;

    const handleNotificationsChanged = () => {
      refreshUnreadCount();
    };
    const intervalId = window.setInterval(refreshUnreadCount, 60000);

    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, handleNotificationsChanged);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, handleNotificationsChanged);
    };
  }, [refreshUnreadCount, user]);

  return (
    <NotificationContext.Provider
      value={{
        countError,
        countLoading,
        refreshUnreadCount,
        unreadCount,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
