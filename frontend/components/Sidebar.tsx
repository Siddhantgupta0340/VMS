import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Scale,
  CreditCard,
  PlusCircle,
  Eye,
  LogOut,
  Building2,
  Users,
} from 'lucide-react';

interface SidebarProps {
  user: {
    id: string;
    email: string;
    role: string;
    first_name?: string | null;
    last_name?: string | null;
  } | null;
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  if (!user) return null;

  const role = user.role.toUpperCase();

  const handleLogout = () => {
    localStorage.removeItem('vms_user');
    window.location.href = '/login';
  };

  // Define sidebar navigation items based on user role
  const navItems = [
    // Dashboard (All roles)
    {
      label: 'Overview Dashboard',
      href: '/invoices/pending',
      icon: <LayoutDashboard className="h-5 w-5" />,
      roles: ['SUPER_ADMIN', 'FINANCE_HEAD', 'CASE_MANAGER', 'TEAM_LEAD', 'MANAGER'],
    },
    // Case Manager action items
    {
      label: 'Create PO',
      href: '/purchase-orders/create',
      icon: <PlusCircle className="h-5 w-5" />,
      roles: ['CASE_MANAGER', 'SUPER_ADMIN'],
    },
    // Three-Way Matching Board
    {
      label: 'Three-Way Matching',
      href: '/three-way-matching',
      icon: <Scale className="h-5 w-5" />,
      roles: ['CASE_MANAGER', 'SUPER_ADMIN', 'FINANCE_HEAD'],
    },
    // Finance Head Observation Dashboard
    {
      label: 'Observation Board',
      href: '/invoices/observation',
      icon: <Eye className="h-5 w-5" />,
      roles: ['FINANCE_HEAD', 'SUPER_ADMIN'],
    },
    // Payments section
    {
      label: 'Payments System',
      href: '/payments/pending',
      icon: <CreditCard className="h-5 w-5" />,
      roles: ['SUPER_ADMIN', 'FINANCE_HEAD', 'CASE_MANAGER'],
    },
    // User Management (Admin only)
    {
      label: 'User Management',
      href: '/users',
      icon: <Users className="h-5 w-5" />,
      roles: ['SUPER_ADMIN'],
    },
  ];

  const filteredItems = navItems.filter((item) => item.roles.includes(role));

  const getRoleLabel = () => {
    if (role === 'SUPER_ADMIN') return 'System Administrator';
    if (role === 'CASE_MANAGER') return 'Case Manager';
    if (role === 'TEAM_LEAD') return 'Team Lead';
    if (role === 'MANAGER') return 'Manager';
    if (role === 'FINANCE_HEAD') return 'Finance Head';
    return role;
  };

  const getUserInitials = () => {
    const first = user.first_name ? user.first_name[0] : '';
    const last = user.last_name ? user.last_name[0] : '';
    return (first + last).toUpperCase() || user.email.slice(0, 2).toUpperCase();
  };

  return (
    <div className="flex flex-col w-64 bg-zinc-900 border-r border-zinc-800 text-zinc-350 min-h-screen">
      {/* Header Branding */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-zinc-800 bg-zinc-950/20">
        <Building2 className="h-7 w-7 text-indigo-400 shrink-0" />
        <div>
          <h1 className="text-base font-extrabold text-white tracking-wide">VMS Enterprise</h1>
          <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest">A/P Control Room</span>
        </div>
      </div>

      {/* User Session Info Card */}
      <div className="mx-4 my-6 p-4 rounded-xl bg-zinc-950/50 border border-zinc-800/80 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-indigo-650 hover:bg-indigo-700 text-white font-bold flex items-center justify-center text-sm shadow-sm transition">
          {getUserInitials()}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-white truncate">
            {user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user.email}
          </p>
          <span className="inline-block mt-0.5 text-[9px] font-bold text-zinc-500 bg-zinc-800/80 px-2 py-0.5 rounded uppercase tracking-wider">
            {getRoleLabel()}
          </span>
        </div>
      </div>

      {/* Navigation list */}
      <nav className="flex-1 px-4 space-y-1">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition duration-150 ${
                isActive
                  ? 'bg-indigo-650 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-500/10'
                  : 'hover:bg-zinc-800/60 hover:text-zinc-50'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer / Actions */}
      <div className="p-4 border-t border-zinc-800 bg-zinc-950/20">
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 text-sm font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800/60 rounded-xl transition"
        >
          <LogOut className="h-5 w-5 shrink-0 text-zinc-500" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
