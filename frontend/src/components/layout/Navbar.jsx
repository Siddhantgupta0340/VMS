import {
  Bell,
  CheckCircle2,
  Menu,
  Search,
  UserCircle2,
} from "lucide-react";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import { useSidebar } from "../../context/SidebarContext";
import { useLocation, useNavigate } from "react-router-dom";
import {
  getNotifications,
  markRead,
  NOTIFICATIONS_CHANGED_EVENT,
} from "../../services/notificationService";

const NAVBAR_STYLES = {
  height: "h-16 md:h-20",
  padding: "px-4 md:px-8",
  sectionGap: "gap-2 sm:gap-3",
  control:
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500",
  activeControl: "border-blue-200 bg-blue-50 text-blue-700",
};

const Navbar = () => {
  const { user } = useAuth();
  const { refreshUnreadCount, unreadCount } = useNotifications();
  const { openMobileSidebar } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [latestNotifications, setLatestNotifications] = useState([]);
  const [latestLoading, setLatestLoading] = useState(false);
  const firstName = user?.first_name || user?.name?.split(" ")[0] || "there";
  const displayName = user?.name || `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() || user?.email || "User";
  const isNotificationsActive = location.pathname === "/notifications";
  const showNotificationBadge = Number.isFinite(unreadCount) && unreadCount > 0;
  const notificationBadge = unreadCount > 99 ? "99+" : unreadCount;

  const loadLatestNotifications = useCallback(async () => {
    if (!user) return;
    try {
      setLatestLoading(true);
      const data = await getNotifications({ page: 1, limit: 5 });
      setLatestNotifications(data.notifications);
    } catch {
      setLatestNotifications([]);
    } finally {
      setLatestLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!dropdownOpen) return undefined;
    loadLatestNotifications();
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen, loadLatestNotifications]);

  useEffect(() => {
    const handleNotificationsChanged = () => {
      if (dropdownOpen) loadLatestNotifications();
    };
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, handleNotificationsChanged);
    return () => window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, handleNotificationsChanged);
  }, [dropdownOpen, loadLatestNotifications]);

  const openNotificationsPage = () => {
    setDropdownOpen(false);
    navigate("/notifications");
  };

  const markNotificationRead = async (notification) => {
    if (notification.isRead) return;
    await markRead(notification.id);
    await Promise.all([loadLatestNotifications(), refreshUnreadCount()]);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();

    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <header className={`sticky top-0 z-30 flex ${NAVBAR_STYLES.height} shrink-0 items-center justify-between border-b border-slate-200 bg-white/85 ${NAVBAR_STYLES.padding} backdrop-blur-xl`}>

      {/* Left */}

      <div className={`flex min-w-0 items-center ${NAVBAR_STYLES.sectionGap}`}>
        <button
          aria-label="Open navigation menu"
          className={`${NAVBAR_STYLES.control} md:hidden`}
          onClick={openMobileSidebar}
          type="button"
        >
          <Menu size={20} />
        </button>

        <button
          aria-label="Go to dashboard"
          className="flex h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold tracking-wide text-slate-900 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 md:hidden"
          onClick={() => navigate("/dashboard")}
          type="button"
        >
          VMS
        </button>

        <div className="hidden min-w-0 sm:block">
          <h1 className="truncate text-xl font-bold tracking-tight text-slate-900 md:text-2xl">
            {getGreeting()}, {firstName}
          </h1>

          <p className="mt-1 truncate text-sm text-slate-500">
            {user?.role}
          </p>
        </div>
      </div>

      {/* Right */}

      <div className={`flex min-w-0 items-center ${NAVBAR_STYLES.sectionGap}`}>

        {/* Search */}

        <div className="relative hidden lg:block">

          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="text"
            placeholder="Search vendors, invoices..."
            className="w-72 rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 outline-none transition-all focus:border-blue-500 focus:bg-white"
          />

        </div>

        <div className="relative" ref={dropdownRef}>
          <button
            aria-current={isNotificationsActive ? "page" : undefined}
            aria-expanded={dropdownOpen}
            aria-label="Notifications"
            className={`${NAVBAR_STYLES.control} relative cursor-pointer ${isNotificationsActive ? NAVBAR_STYLES.activeControl : ""}`}
            onClick={() => setDropdownOpen((current) => !current)}
            type="button"
          >
            <Bell size={20} />
            {showNotificationBadge && (
              <span
                aria-label={`${notificationBadge} unread notifications`}
                className="absolute -right-1 -top-1 min-w-5 rounded-full bg-blue-600 px-1.5 text-center text-[11px] font-bold leading-5 text-white"
              >
                {notificationBadge}
              </span>
            )}
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <p className="text-sm font-bold text-slate-900">Latest notifications</p>
                <button className="text-xs font-semibold text-blue-700 hover:underline" onClick={openNotificationsPage} type="button">
                  View all
                </button>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {latestLoading ? (
                  <div className="p-4 text-sm text-slate-500">Loading notifications...</div>
                ) : latestNotifications.length ? (
                  latestNotifications.map((notification) => (
                    <article key={notification.id} className={`border-b border-slate-100 p-4 last:border-b-0 ${notification.isRead ? "bg-white" : "bg-blue-50/50"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <button className="min-w-0 text-left" onClick={openNotificationsPage} type="button">
                          <p className="truncate text-sm font-semibold text-slate-900">{notification.title}</p>
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{notification.message}</p>
                        </button>
                        {!notification.isRead && (
                          <button
                            aria-label="Mark notification as read"
                            className="rounded-lg p-1 text-blue-700 hover:bg-blue-100"
                            onClick={() => markNotificationRead(notification)}
                            type="button"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                        )}
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="p-4 text-sm text-slate-500">No notifications yet.</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile */}

        <div className="hidden h-11 max-w-64 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 shadow-sm sm:flex">

          <UserCircle2
            size={32}
            className="text-blue-600"
          />

          <div className="min-w-0">

            <h3 className="truncate text-sm font-semibold text-slate-900">
              {displayName}
            </h3>

            <p className="truncate text-xs text-slate-500">
              {user?.role}
            </p>

          </div>

        </div>

      </div>

    </header>
  );
};

export default Navbar;
