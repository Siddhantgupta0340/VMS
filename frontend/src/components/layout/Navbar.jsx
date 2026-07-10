import {
  Bell,
  Search,
  Settings,
  UserCircle2,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";

const Navbar = () => {
  const { user } = useAuth();

  const getGreeting = () => {
    const hour = new Date().getHours();

    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white/80 px-8 backdrop-blur-xl">

      {/* Left */}

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {getGreeting()}, {user?.name?.split(" ")[0]}
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          {user?.role}
        </p>
      </div>

      {/* Right */}

      <div className="flex items-center gap-5">

        {/* Search */}

        <div className="relative">

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

        <button className="rounded-2xl border border-slate-200 bg-white p-3 transition hover:shadow-lg">

          <Bell size={20} />

        </button>

        <button className="rounded-2xl border border-slate-200 bg-white p-3 transition hover:shadow-lg">

          <Settings size={20} />

        </button>

        {/* Profile */}

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">

          <UserCircle2
            size={42}
            className="text-blue-600"
          />

          <div>

            <h3 className="font-semibold text-slate-900">
              {user?.name}
            </h3>

            <p className="text-xs text-slate-500">
              {user?.role}
            </p>

          </div>

        </div>

      </div>

    </header>
  );
};

export default Navbar;