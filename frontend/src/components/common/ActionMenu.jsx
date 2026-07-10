import { MoreVertical } from "lucide-react";
import { useState } from "react";

const ActionMenu = ({ actions }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-lg p-1 hover:bg-slate-100 transition"
      >
        <MoreVertical size={16} className="text-slate-600" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-lg border border-slate-200 bg-white shadow-lg">
          {actions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => {
                action.onClick();
                setIsOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-4 py-2 text-sm ${
                action.destructive
                  ? "text-red-600 hover:bg-red-50"
                  : "text-slate-700 hover:bg-slate-50"
              } transition ${idx === 0 ? "rounded-t-lg" : ""} ${
                idx === actions.length - 1 ? "rounded-b-lg" : ""
              }`}
            >
              {action.icon && <action.icon size={16} />}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActionMenu;
