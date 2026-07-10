import { NavLink } from "react-router-dom";
import { useSidebar } from "../../context/SidebarContext";

const SidebarItem = ({ icon: Icon, title, path }) => {
  const { collapsed } = useSidebar();

  return (
    <NavLink
      to={path}
      className={({ isActive }) =>
        `
        flex items-center
        gap-3
        rounded-xl
        px-4
        py-3
        transition-all
        duration-200
        ${
          isActive
            ? "bg-blue-600 text-white shadow-md"
            : "text-slate-600 hover:bg-slate-100"
        }
      `
      }
    >
      <Icon size={20} />

      {!collapsed && (
        <span className="text-sm font-medium">
          {title}
        </span>
      )}
    </NavLink>
  );
};

export default SidebarItem;