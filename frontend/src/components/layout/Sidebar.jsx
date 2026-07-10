import {
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";

import { navigation } from "../../constants/navigation";
import { useSidebar } from "../../context/SidebarContext";
import { useAuth } from "../../context/AuthContext";

const Sidebar = () => {
  const { collapsed, toggleSidebar } = useSidebar();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  console.log("========== SIDEBAR DEBUG ==========");
console.log("Current User:", user);
console.log("Current Role:", user?.role);
console.log("Navigation:", navigation);
console.log("Permissions:", navigation.map(s => ({
  section: s.section,
  items: s.items.map(i => ({
    title: i.title,
    roles: i.roles
  }))
})));

  const filteredNavigation = navigation
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) =>
          item.roles &&
          user &&
          item.roles.includes(user.role)
      ),
    }))
    .filter((section) => section.items.length > 0);
console.log("Filtered Navigation:", filteredNavigation);
  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <aside
      className={`
        relative
        h-screen
        bg-slate-950
        text-white
        transition-all
        duration-300
        ${collapsed ? "w-24" : "w-72"}
      `}
    >
      {/* Logo */}

      <div className="flex items-center justify-between border-b border-slate-800 px-6 py-6">
        <div
          className={`overflow-hidden transition-all duration-300 ${
            collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
          }`}
        >
          <h1 className="text-2xl font-bold tracking-wide">
            VMS
          </h1>

          <p className="mt-1 text-xs text-slate-400">
            Vendor Management System
          </p>
        </div>

        <button
          onClick={toggleSidebar}
          className="rounded-xl border border-slate-700 p-2 transition hover:bg-slate-800"
        >
          {collapsed ? (
            <ChevronRight size={18} />
          ) : (
            <ChevronLeft size={18} />
          )}
        </button>
      </div>

      {/* Navigation */}

      <div className="mt-6 flex h-[calc(100%-170px)] flex-col justify-between overflow-y-auto">
        <div>
          {filteredNavigation.map((section) => (
            <div
              key={section.section}
              className="mb-8"
            >
              {!collapsed && (
                <p className="mb-3 px-6 text-[11px] font-semibold uppercase tracking-[2px] text-slate-500">
                  {section.section}
                </p>
              )}

              <div className="space-y-2 px-3">
                {section.items.map((item) => {
                  const Icon = item.icon;

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) =>
                        `
                        group
                        flex
                        items-center
                        gap-4
                        rounded-2xl
                        px-4
                        py-3
                        transition-all
                        duration-200

                        ${
                          isActive
                            ? "bg-blue-600 text-white shadow-lg"
                            : "text-slate-300 hover:bg-slate-900 hover:text-white"
                        }
                      `
                      }
                    >
                      <Icon
                        size={21}
                        className="flex-shrink-0"
                      />

                      {!collapsed && (
                        <span className="text-[15px] font-medium">
                          {item.title}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom */}

        <div className="border-t border-slate-800 px-4 pt-5">
          <button
            onClick={handleLogout}
            className="
              flex
              w-full
              items-center
              gap-4
              rounded-2xl
              px-4
              py-3
              text-slate-300
              transition
              hover:bg-red-500
              hover:text-white
            "
          >
            <LogOut size={20} />

            {!collapsed && (
              <span className="font-medium">
                Logout
              </span>
            )}
          </button>

          {!collapsed && user && (
            <div className="mt-6 rounded-2xl bg-slate-900 p-4">
              <h3 className="font-semibold">
  {`${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || user.email}
</h3>

              <p className="mt-1 text-xs text-slate-400">
                {user.role}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;