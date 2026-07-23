import { NavLink, useLocation } from "react-router-dom";

import { useSidebar } from "../../context/SidebarContext";

const sidebarItemStyles = {
  itemHeight: "h-11",
  itemGap: "gap-3",
  itemPadding: "px-3",
  iconSize: 20,
  radius: "rounded-xl",
};

const SidebarItem = ({
  activePaths = [],
  badge,
  disabled = false,
  icon: Icon,
  onNavigate,
  path,
  title,
}) => {
  const { collapsed, mobileOpen } = useSidebar();
  const location = useLocation();
  const compact = collapsed && !mobileOpen;
  const hasBadge = badge !== undefined && badge !== null && String(badge) !== "";
  const isPathActive = (isActive) => {
    if (isActive) return true;
    return activePaths.some((activePath) => (
      location.pathname === activePath ||
      location.pathname.startsWith(`${activePath}/`)
    ));
  };

  const content = (
    <>
      <Icon
        aria-hidden="true"
        size={sidebarItemStyles.iconSize}
        className="shrink-0"
      />

      {!compact && (
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {title}
        </span>
      )}

      {hasBadge && (
        <span
          aria-label={`${badge} unread`}
          className={`shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold leading-4 text-blue-700 ${
            compact ? "absolute right-1.5 top-1" : ""
          }`}
        >
          {badge}
        </span>
      )}

      {compact && (
        <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-visible:opacity-100">
          {title}
        </span>
      )}
    </>
  );

  const className = ({ isActive }) => `
    group
    relative
    flex
    ${sidebarItemStyles.itemHeight}
    w-full
    items-center
    ${compact ? "justify-center px-0" : sidebarItemStyles.itemGap}
    ${compact ? "" : sidebarItemStyles.itemPadding}
    ${sidebarItemStyles.radius}
    text-left
    transition-colors
    duration-150
    focus-visible:outline
    focus-visible:outline-2
    focus-visible:outline-offset-2
    focus-visible:outline-blue-300
    ${
      disabled
        ? "cursor-not-allowed text-slate-600"
        : isPathActive(isActive)
          ? "bg-blue-600 text-white shadow-sm"
          : "text-slate-300 hover:bg-slate-900 hover:text-white"
    }
  `;

  if (disabled) {
    return (
      <button
        aria-disabled="true"
        className={className({ isActive: false })}
        disabled
        title={compact ? title : undefined}
        type="button"
      >
        {content}
      </button>
    );
  }

  return (
    <NavLink
      className={className}
      onClick={onNavigate}
      title={compact ? title : undefined}
      to={path}
    >
      {content}
    </NavLink>
  );
};

export default SidebarItem;
