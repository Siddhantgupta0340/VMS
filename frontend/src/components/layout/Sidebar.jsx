import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { hasPermission } from "../../config/permissions";
import { navigation } from "../../constants/navigation";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import { useSidebar } from "../../context/SidebarContext";
import SidebarItem from "./SidebarItem";

const Sidebar = () => {
  const {
    closeMobileSidebar,
    collapsed,
    mobileOpen,
    toggleSidebar,
  } = useSidebar();
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();

  const filteredNavigation = navigation
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => (
        hasPermission(user, item.permission) &&
        (!item.allowedRoles || item.allowedRoles.includes(user?.role)) &&
        !item.excludedRoles?.includes(user?.role)
      )),
    }))
    .filter((section) => section.items.length > 0);
  const compact = collapsed && !mobileOpen;

  const handleLogout = () => {
    closeMobileSidebar();
    logout();
    navigate("/login", { replace: true });
  };

  const profileName = `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() || user?.email;
  const notificationBadge = unreadCount > 99 ? "99+" : unreadCount > 0 ? String(unreadCount) : undefined;

  return (
    <>
      {mobileOpen && (
        <button
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 bg-slate-950/50 md:hidden"
          onClick={closeMobileSidebar}
          type="button"
        />
      )}

      <aside
        aria-label="Primary navigation"
        className={`
          fixed
          inset-y-0
          left-0
          z-50
          flex
          h-dvh
          min-h-0
          flex-col
          overflow-hidden
          bg-slate-950
          text-white
          shadow-2xl
          transition-all
          duration-300
          md:relative
          md:z-auto
          md:h-screen
          md:translate-x-0
          md:shadow-none
          ${collapsed ? "md:w-20" : "md:w-72"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          w-72
        `}
      >
        <div className="flex h-20 shrink-0 items-center justify-between border-b border-slate-800 px-4">
          <div
            className={`min-w-0 overflow-hidden transition-all duration-300 ${
              compact ? "md:w-0 md:opacity-0" : "opacity-100"
            }`}
          >
            <h1 className="truncate text-xl font-bold tracking-wide">
              VMS
            </h1>

            <p className="mt-1 truncate text-xs text-slate-400">
              Vendor Management System
            </p>
          </div>

          <button
            aria-label={compact ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-700 text-slate-300 transition hover:bg-slate-800 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300 md:flex"
            onClick={toggleSidebar}
            type="button"
          >
            {compact ? (
              <ChevronRight size={18} />
            ) : (
              <ChevronLeft size={18} />
            )}
          </button>

          <button
            aria-label="Close navigation menu"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-700 text-slate-300 transition hover:bg-slate-800 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300 md:hidden"
            onClick={closeMobileSidebar}
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="min-h-0 flex-1 overflow-hidden overflow-y-auto overflow-x-hidden scroll-smooth custom-scrollbar px-3 py-4" aria-label="Sidebar menu">
          <div className="space-y-4">
            {filteredNavigation.map((section, index) => (
              <section key={section.section || `section-${index}`}>
                {section.section && !compact && (
                  <h2 className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[2px] text-slate-500">
                    {section.section}
                  </h2>
                )}

                <div className="space-y-1">
                  {section.items.map((item) => (
                    <SidebarItem
                      badge={item.path === "/notifications" ? notificationBadge : item.badge}
                      activePaths={item.activePaths}
                      icon={item.icon}
                      key={item.pathByRole?.[user?.role] || item.path}
                      onNavigate={closeMobileSidebar}
                      path={item.pathByRole?.[user?.role] || item.path}
                      title={item.titleByRole?.[user?.role] || item.title}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </nav>

        <div className="shrink-0 border-t border-slate-800 px-3 py-4">
          <button
            className={`
              flex
              h-11
              w-full
              items-center
              ${compact ? "justify-center px-0" : "gap-3 px-3"}
              rounded-xl
              text-slate-300
              transition-colors
              hover:bg-red-500
              hover:text-white
              focus-visible:outline
              focus-visible:outline-2
              focus-visible:outline-offset-2
              focus-visible:outline-red-300
            `}
            onClick={handleLogout}
            title={compact ? "Logout" : undefined}
            type="button"
          >
            <LogOut aria-hidden="true" size={20} />

            {!compact && (
              <span className="min-w-0 truncate text-sm font-medium">
                Logout
              </span>
            )}
          </button>

          {!compact && user && (
            <div className="mt-4 rounded-xl bg-slate-900 px-3 py-3">
              <h3 className="truncate text-sm font-semibold">
                {profileName}
              </h3>

              <p className="mt-1 truncate text-xs text-slate-400">
                {user.role}
              </p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
