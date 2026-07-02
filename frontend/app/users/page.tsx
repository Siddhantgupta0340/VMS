'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { useUsers, useUpdateUserStatus } from '@/hooks/useUsers';
import {
  Users as UsersIcon,
  Search,
  UserCheck,
  UserX,
  UserMinus,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';

export default function UserManagementPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ id: string; role: string; email: string } | null>(null);
  
  // Filtering & Pagination States
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Status Change Dialog States
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string; currentStatus: string } | null>(null);
  const [targetStatus, setTargetStatus] = useState<string>('');
  const [remarks, setRemarks] = useState('');

  // Fetch current user from local storage
  useEffect(() => {
    const userStr = localStorage.getItem('vms_user');
    if (userStr) {
      try {
        const parsed = JSON.parse(userStr);
        setCurrentUser(parsed);
        // RBAC Check on Frontend: only SUPER_ADMIN gets access
        if (parsed.role !== 'SUPER_ADMIN') {
          toast.error('Access Denied: Only Administrators are allowed to manage users.');
          router.push('/invoices/pending');
        }
      } catch (e) {
        console.error('Failed to parse user session', e);
        router.push('/login');
      }
    } else {
      router.push('/login');
    }
  }, [router]);

  // Queries & Mutations
  const { data, isLoading, isError, refetch } = useUsers({
    search: search || undefined,
    role: roleFilter || undefined,
    status: statusFilter || undefined,
    page,
    limit,
  });

  const updateStatusMutation = useUpdateUserStatus();

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, statusFilter]);

  const handleStatusChangeClick = (userId: string, userName: string, currentStatus: string, nextStatus: string) => {
    setSelectedUser({ id: userId, name: userName, currentStatus });
    setTargetStatus(nextStatus);
    setRemarks('');
    setIsConfirmOpen(true);
  };

  const handleConfirmStatusChange = async () => {
    if (!selectedUser) return;

    try {
      await updateStatusMutation.mutateAsync({
        id: selectedUser.id,
        status: targetStatus,
        remarks: remarks.trim() || undefined,
      });
      
      toast.success(`User status updated to ${targetStatus} successfully.`);
      setIsConfirmOpen(false);
      setSelectedUser(null);
    } catch (error: any) {
      const apiErrorMsg = error.response?.data?.message || 'Failed to update user status.';
      toast.error(apiErrorMsg);
    }
  };

  if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-sm font-medium text-gray-500">Checking permissions...</p>
        </div>
      </div>
    );
  }

  const usersList = data?.users || [];
  const totalUsers = data?.total || 0;
  const totalPages = Math.ceil(totalUsers / limit) || 1;

  // Calculate status statistics locally from total if wanted, or display aggregate overview card
  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400';
      case 'INACTIVE':
        return 'bg-gray-50 text-gray-700 ring-1 ring-gray-600/10 dark:bg-zinc-800 dark:text-zinc-400';
      case 'SUSPENDED':
        return 'bg-amber-50 text-amber-800 ring-1 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400';
      case 'LOCKED':
        return 'bg-rose-50 text-rose-700 ring-1 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400';
      case 'PENDING':
        return 'bg-yellow-50 text-yellow-800 ring-1 ring-yellow-600/20 dark:bg-yellow-500/10 dark:text-yellow-400';
      case 'DISABLED':
        return 'bg-slate-50 text-slate-700 ring-1 ring-slate-600/20 dark:bg-slate-500/10 dark:text-slate-400';
      default:
        return 'bg-gray-50 text-gray-700 dark:bg-zinc-800 dark:text-zinc-400';
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400';
      case 'FINANCE_HEAD':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400';
      case 'CASE_MANAGER':
        return 'bg-pink-50 text-pink-700 dark:bg-pink-500/10 dark:text-pink-400';
      default:
        return 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300';
    }
  };

  const formatRoleName = (role: string) => {
    return role.replace('_', ' ');
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-zinc-950">
      <Sidebar user={currentUser} />
      
      <main className="flex-1 overflow-y-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          
          {/* Welcome Header */}
          <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 dark:text-zinc-50 flex items-center gap-2">
                <UsersIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                User Account Management
              </h1>
              <p className="mt-2 text-sm text-gray-500 dark:text-zinc-400">
                Manage user states, suspend credentials, or activate registrations with full security audit trails.
              </p>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
            <div className="bg-white dark:bg-zinc-900 overflow-hidden shadow-sm border border-gray-200 dark:border-zinc-850 rounded-2xl p-6">
              <dt className="text-sm font-semibold text-gray-500 dark:text-zinc-400 truncate">Total Registered Users</dt>
              <dd className="mt-1 text-3xl font-extrabold text-gray-900 dark:text-white">{totalUsers}</dd>
            </div>
            <div className="bg-white dark:bg-zinc-900 overflow-hidden shadow-sm border border-gray-200 dark:border-zinc-850 rounded-2xl p-6">
              <dt className="text-sm font-semibold text-gray-500 dark:text-zinc-400 truncate">System Access Active</dt>
              <dd className="mt-1 text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {usersList.filter(u => u.status === 'ACTIVE').length}
              </dd>
            </div>
            <div className="bg-white dark:bg-zinc-900 overflow-hidden shadow-sm border border-gray-200 dark:border-zinc-850 rounded-2xl p-6">
              <dt className="text-sm font-semibold text-gray-500 dark:text-zinc-400 truncate">Suspended / Blocked Accounts</dt>
              <dd className="mt-1 text-3xl font-extrabold text-amber-500 dark:text-amber-400">
                {usersList.filter(u => ['SUSPENDED', 'LOCKED', 'DISABLED'].includes(u.status)).length}
              </dd>
            </div>
          </div>

          {/* Filter Board */}
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-850 rounded-2xl p-6 mb-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4.5 w-4.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search user name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 w-full rounded-xl border border-gray-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-2 text-sm text-gray-900 dark:text-zinc-150 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Role filter */}
              <div>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-2 text-sm text-gray-900 dark:text-zinc-150 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">All System Roles</option>
                  <option value="SUPER_ADMIN">System Administrator</option>
                  <option value="CASE_MANAGER">Case Manager</option>
                  <option value="TEAM_LEAD">Team Lead</option>
                  <option value="MANAGER">Manager</option>
                  <option value="FINANCE_HEAD">Finance Head</option>
                </select>
              </div>

              {/* Status filter */}
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-2 text-sm text-gray-900 dark:text-zinc-150 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">All Statuses</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                  <option value="LOCKED">LOCKED</option>
                  <option value="PENDING">PENDING</option>
                  <option value="DISABLED">DISABLED</option>
                </select>
              </div>

            </div>
          </div>

          {/* User Table List */}
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-850 rounded-2xl overflow-hidden shadow-sm">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                <p className="text-sm font-medium text-gray-500">Loading user catalog...</p>
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                <ShieldAlert className="h-10 w-10 text-rose-500 mb-2" />
                <h3 className="text-base font-bold text-gray-900 dark:text-zinc-100">Failed to load users</h3>
                <p className="text-sm text-gray-500 max-w-sm mt-1">
                  Could not retrieve the user list from the backend database server. Please check your credentials or backend port.
                </p>
                <button
                  onClick={() => refetch()}
                  className="mt-4 px-4 py-2 text-sm font-semibold text-white bg-indigo-650 hover:bg-indigo-700 rounded-xl transition"
                >
                  Retry Connection
                </button>
              </div>
            ) : usersList.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-sm text-gray-500">No users found matching the selected filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-850">
                  <thead className="bg-gray-50 dark:bg-zinc-900/50">
                    <tr>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Full Name & Email</th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">System Role</th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Account Status</th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Last Status Update</th>
                      <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-zinc-900 divide-y divide-gray-200 dark:divide-zinc-850">
                    {usersList.map((user) => {
                      const fullName = user.first_name
                        ? `${user.first_name} ${user.last_name || ''}`.trim()
                        : 'Uninitialized Name';

                      return (
                        <tr key={user.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-850/20 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-gray-900 dark:text-zinc-100">{fullName}</span>
                              <span className="text-xs text-gray-500 dark:text-zinc-450">{user.email}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${getRoleBadgeStyle(user.role)}`}>
                              {formatRoleName(user.role)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${getStatusBadgeStyle(user.status || 'ACTIVE')}`}>
                              {user.status || 'ACTIVE'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-zinc-400">
                            {user.status_changed_at ? (
                              <div className="flex flex-col">
                                <span>{new Date(user.status_changed_at).toLocaleDateString()}</span>
                                <span className="text-[10px] text-gray-400">By: {user.status_changed_by || 'System'}</span>
                              </div>
                            ) : (
                              <span className="text-xs italic text-gray-400">No updates logged</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end gap-2">
                              
                              {/* Activate Trigger */}
                              {user.status !== 'ACTIVE' && (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChangeClick(user.id, fullName, user.status || 'ACTIVE', 'ACTIVE')}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 transition duration-150"
                                >
                                  <UserCheck className="h-3.5 w-3.5" />
                                  Activate
                                </button>
                              )}

                              {/* Deactivate Trigger */}
                              {user.status === 'ACTIVE' && (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChangeClick(user.id, fullName, user.status || 'ACTIVE', 'INACTIVE')}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg text-gray-700 bg-gray-50 hover:bg-gray-100 dark:text-zinc-400 dark:bg-zinc-800 dark:hover:bg-zinc-750 transition duration-150"
                                >
                                  <UserX className="h-3.5 w-3.5" />
                                  Deactivate
                                </button>
                              )}

                              {/* Suspend Trigger */}
                              {user.status !== 'SUSPENDED' && (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChangeClick(user.id, fullName, user.status || 'ACTIVE', 'SUSPENDED')}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg text-amber-700 bg-amber-50 hover:bg-amber-100 dark:text-amber-400 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 transition duration-150"
                                >
                                  <UserMinus className="h-3.5 w-3.5" />
                                  Suspend
                                </button>
                              )}

                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {!isLoading && !isError && totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 dark:border-zinc-850 bg-white dark:bg-zinc-900 px-6 py-4">
                <div className="flex flex-1 justify-between sm:hidden">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(p => Math.max(p - 1, 1))}
                    className="relative inline-flex items-center rounded-xl border border-gray-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-550/10 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                    className="relative ml-3 inline-flex items-center rounded-xl border border-gray-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-550/10 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700 dark:text-zinc-400">
                      Showing page <span className="font-bold">{page}</span> of{' '}
                      <span className="font-bold">{totalPages}</span> ({totalUsers} total users)
                    </p>
                  </div>
                  <div>
                    <nav className="isolate inline-flex -space-x-px rounded-xl shadow-sm gap-1" aria-label="Pagination">
                      <button
                        onClick={() => setPage(p => Math.max(p - 1, 1))}
                        disabled={page === 1}
                        className="relative inline-flex items-center rounded-xl border border-gray-300 dark:border-zinc-850 px-3 py-2 text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-800 disabled:opacity-50 transition"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                        disabled={page === totalPages}
                        className="relative inline-flex items-center rounded-xl border border-gray-300 dark:border-zinc-850 px-3 py-2 text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-800 disabled:opacity-50 transition"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </main>

      {/* Confirmation Dialog Modal */}
      {isConfirmOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl animate-in fade-in-50 zoom-in-95 duration-150">
            
            {/* Warning header indicator */}
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-500/10 mb-4">
              <AlertTriangle className="h-6 w-6 text-indigo-650 dark:text-indigo-400" />
            </div>

            <h3 className="text-lg font-bold text-center text-gray-900 dark:text-white">
              Confirm Account Status Change
            </h3>
            
            <p className="mt-2 text-sm text-center text-gray-500 dark:text-zinc-400">
              Are you sure you want to change the status of <b>{selectedUser.name}</b> from{' '}
              <span className="font-bold text-gray-700 dark:text-zinc-350">{selectedUser.currentStatus}</span> to{' '}
              <span className="font-extrabold text-indigo-650 dark:text-indigo-400">{targetStatus}</span>?
            </p>

            {/* Remarks Input */}
            <div className="mt-4">
              <label htmlFor="remarks" className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-1">
                Audit Log Remarks (Optional)
              </label>
              <textarea
                id="remarks"
                rows={3}
                placeholder="Provide details about why this status change is performed..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full rounded-xl border border-gray-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-2.5 text-sm text-gray-900 dark:text-zinc-150 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsConfirmOpen(false);
                  setSelectedUser(null);
                }}
                className="px-4 py-2.5 text-sm font-semibold border border-gray-300 dark:border-zinc-800 text-gray-750 dark:text-zinc-300 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-850 transition duration-150"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmStatusChange}
                disabled={updateStatusMutation.isPending}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-650 hover:bg-indigo-700 rounded-xl shadow-sm transition duration-150 disabled:opacity-50"
              >
                {updateStatusMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                )}
                Confirm Action
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
