'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePendingInvoices, useMyApprovedInvoices } from '@/hooks/useInvoices';
import { useMyDashboard } from '@/hooks/useDashboard';
import StatusBadge from '@/components/invoice/StatusBadge';
import { format } from 'date-fns';
import { FileText, ArrowRight, ClipboardList, CheckSquare, Clock } from 'lucide-react';
import Sidebar from '@/components/Sidebar';

export default function PendingApprovalDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; role: string; email: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'action_needed' | 'approved_by_me' | 'my_submissions'>('action_needed');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const userStr = localStorage.getItem('vms_user');
    if (userStr) {
      try {
        const parsedUser = JSON.parse(userStr);
        setTimeout(() => {
          setUser(parsedUser);
          if (parsedUser.role === 'CASE_MANAGER') {
            setActiveTab('my_submissions');
          }
        }, 0);
      } catch (e) {
        console.error('Failed to parse user session:', e);
      }
    }
  }, []);

  const getPendingLevel = (): string => {
    if (!user) return 'my';
    if (user.role === 'TEAM_LEAD') return 'team-lead';
    if (user.role === 'MANAGER') return 'manager';
    if (user.role === 'FINANCE_HEAD') return 'finance-head';
    return 'my';
  };

  const pendingLevel = getPendingLevel();

  // Queries
  const { data: dashboardData } = useMyDashboard();
  const stats = dashboardData?.data;

  const { data: pendingData, isLoading: isPendingLoading } = usePendingInvoices(pendingLevel, {
    page,
    limit: 10,
  });

  const { data: approvedData, isLoading: isApprovedLoading } = useMyApprovedInvoices({
    page,
    limit: 10,
  });

  const isLoading = activeTab === 'action_needed' || activeTab === 'my_submissions'
    ? isPendingLoading
    : isApprovedLoading;

  const currentData = activeTab === 'action_needed' || activeTab === 'my_submissions'
    ? pendingData
    : approvedData;

  const invoices = currentData?.invoices || [];
  const totalPages = currentData?.totalPages || 1;

  const isCM = user?.role === 'CASE_MANAGER';
  const isApprover = ['TEAM_LEAD', 'MANAGER', 'FINANCE_HEAD'].includes(user?.role || '');

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-zinc-950">
      <Sidebar user={user} />
      <div className="flex-1 overflow-y-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
        {/* Welcome Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-zinc-50 flex items-center gap-2">
              <ClipboardList className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              Invoice Approvals
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-zinc-400">
              Manage multi-level invoice workflows and review pending submissions.
            </p>
          </div>
          {isCM && (
            <Link
              href="/invoices/create"
              className="inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition duration-150 shadow-sm shadow-indigo-500/10"
            >
              Upload New Invoice
            </Link>
          )}
        </div>

        {/* Statistics Cards Grid */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
            {/* Total Invoice Amount */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-150 dark:border-zinc-850 p-5 shadow-sm flex items-center justify-between">
              <div>
                <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Total Invoice Amount
                </span>
                <span className="block mt-1.5 text-xl font-extrabold text-gray-900 dark:text-zinc-50">
                  INR {stats.invoiceStats?.totalInvoiceAmount?.toLocaleString('en-IN') || '0.00'}
                </span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-650 dark:text-indigo-400">
                <FileText className="h-5 w-5" />
              </div>
            </div>

            {/* Total Paid Amount */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-150 dark:border-zinc-850 p-5 shadow-sm flex items-center justify-between">
              <div>
                <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Total Paid Amount
                </span>
                <span className="block mt-1.5 text-xl font-extrabold text-emerald-600 dark:text-emerald-450">
                  INR {stats.invoiceStats?.totalPaidAmount?.toLocaleString('en-IN') || '0.00'}
                </span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-650 dark:text-emerald-400">
                <CheckSquare className="h-5 w-5" />
              </div>
            </div>

            {/* Remaining Outstanding */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-150 dark:border-zinc-850 p-5 shadow-sm flex items-center justify-between">
              <div>
                <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Remaining Outstanding
                </span>
                <span className="block mt-1.5 text-xl font-extrabold text-rose-600 dark:text-rose-455">
                  INR {stats.invoiceStats?.remainingOutstanding?.toLocaleString('en-IN') || '0.00'}
                </span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center text-rose-655 dark:text-rose-450">
                <Clock className="h-5 w-5" />
              </div>
            </div>

            {/* Pending Payments */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-150 dark:border-zinc-850 p-5 shadow-sm flex items-center justify-between">
              <div>
                <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Pending Payments
                </span>
                <span className="block mt-1.5 text-xl font-extrabold text-amber-600 dark:text-amber-400">
                  {stats.paymentStats?.pending || 0} Requests
                </span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center text-amber-655 dark:text-amber-450">
                <Clock className="h-5 w-5" />
              </div>
            </div>

            {/* Completed Payments */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-150 dark:border-zinc-850 p-5 shadow-sm flex items-center justify-between">
              <div>
                <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Completed Payments
                </span>
                <span className="block mt-1.5 text-xl font-extrabold text-teal-600 dark:text-teal-450">
                  {stats.paymentStats?.success || 0} Payouts
                </span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-teal-50 dark:bg-teal-950/30 flex items-center justify-center text-teal-655 dark:text-teal-450">
                <CheckSquare className="h-5 w-5" />
              </div>
            </div>

            {/* Partially Paid Invoices */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-150 dark:border-zinc-850 p-5 shadow-sm flex items-center justify-between">
              <div>
                <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Partially Paid Invoices
                </span>
                <span className="block mt-1.5 text-xl font-extrabold text-blue-600 dark:text-blue-405">
                  {stats.invoiceStats?.partiallyPaidInvoices || 0} Invoices
                </span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-655 dark:text-blue-400">
                <FileText className="h-5 w-5" />
              </div>
            </div>
          </div>
        )}

        {/* Tab Filters */}
        <div className="mb-6 border-b border-gray-200 dark:border-zinc-800">
          <nav className="flex space-x-6" aria-label="Tabs">
            {isApprover && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('action_needed');
                  setPage(1);
                }}
                className={`py-4 px-1 border-b-2 font-semibold text-sm transition flex items-center gap-2 ${
                  activeTab === 'action_needed'
                    ? 'border-indigo-600 text-indigo-650 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-zinc-300'
                }`}
              >
                <Clock className="h-4.5 w-4.5" />
                Action Needed (Pending {user?.role})
              </button>
            )}
            
            {isApprover && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('approved_by_me');
                  setPage(1);
                }}
                className={`py-4 px-1 border-b-2 font-semibold text-sm transition flex items-center gap-2 ${
                  activeTab === 'approved_by_me'
                    ? 'border-indigo-600 text-indigo-650 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-zinc-300'
                }`}
              >
                <CheckSquare className="h-4.5 w-4.5" />
                My Approved Invoices
              </button>
            )}

            {isCM && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('my_submissions');
                  setPage(1);
                }}
                className={`py-4 px-1 border-b-2 font-semibold text-sm transition flex items-center gap-2 ${
                  activeTab === 'my_submissions'
                    ? 'border-indigo-600 text-indigo-650 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-zinc-300'
                }`}
              >
                <FileText className="h-4.5 w-4.5" />
                My Pending Invoices
              </button>
            )}
          </nav>
        </div>

        {/* Content list */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-150 dark:border-zinc-850">
            <div className="h-8 w-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
            <p className="text-sm text-gray-500 dark:text-zinc-400">Loading invoices...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-150 dark:border-zinc-850 p-6">
            <ClipboardList className="mx-auto h-12 w-12 text-gray-300 dark:text-zinc-700 mb-3" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-50">No invoices found</h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
              There are no invoices in this queue matching your role status.
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-150 dark:border-zinc-850 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-150 dark:divide-zinc-800">
                <thead className="bg-gray-50 dark:bg-zinc-900/50">
                  <tr>
                    <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-zinc-450 uppercase tracking-wider">
                      Invoice No
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-zinc-450 uppercase tracking-wider">
                      Vendor
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-zinc-450 uppercase tracking-wider">
                      Invoice Amount
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-zinc-450 uppercase tracking-wider">
                      Paid Amount
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-zinc-450 uppercase tracking-wider">
                      Remaining Amount
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-zinc-450 uppercase tracking-wider">
                      Approval Status
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-zinc-450 uppercase tracking-wider">
                      Payment Status
                    </th>
                    <th className="relative px-6 py-3.5">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                  {invoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className="hover:bg-gray-50/50 dark:hover:bg-zinc-850/30 transition duration-150 cursor-pointer"
                      onClick={() => router.push(`/invoices/${inv.id}`)}
                    >
                      <td className="px-6 py-4.5 whitespace-nowrap">
                        <div className="text-sm font-bold text-indigo-650 dark:text-indigo-400">
                          {inv.invoice_number}
                        </div>
                        <div className="text-[11px] text-gray-550 dark:text-zinc-500">
                          Uploaded {formatDate(inv.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4.5 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900 dark:text-zinc-50">
                          {inv.vendor?.name || 'Unknown Vendor'}
                        </div>
                        <div className="text-xs text-gray-550 dark:text-zinc-500">
                          {inv.vendor?.vendor_code || ''}
                        </div>
                      </td>
                      <td className="px-6 py-4.5 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-zinc-50">
                        {inv.currency} {Number(inv.invoice_total || inv.amount).toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4.5 whitespace-nowrap text-sm font-bold text-emerald-600 dark:text-emerald-450">
                        {inv.currency} {Number(inv.paid_amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4.5 whitespace-nowrap text-sm font-bold text-rose-600 dark:text-rose-455">
                        {inv.currency} {Number(inv.remaining_amount ?? (inv.invoice_total || inv.amount)).toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4.5 whitespace-nowrap">
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="px-6 py-4.5 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${
                          inv.payment_status === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400'
                            : inv.payment_status === 'PARTIALLY_PAID'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-400'
                            : inv.payment_status === 'PAYMENT_PENDING'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400'
                            : inv.payment_status === 'PAYMENT_FAILED'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/30 dark:text-rose-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:text-zinc-400'
                        }`}>
                          {inv.payment_status || 'UNPAID'}
                        </span>
                      </td>
                      <td className="px-6 py-4.5 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 font-bold"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Review
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 bg-gray-50 dark:bg-zinc-900/50 border-t border-gray-150 dark:border-zinc-800 flex items-center justify-between">
                <div className="text-xs text-gray-500 dark:text-zinc-450">
                  Page {page} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 border border-gray-300 dark:border-zinc-750 rounded-lg text-xs font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-850 disabled:opacity-50 transition"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="px-3 py-1.5 border border-gray-300 dark:border-zinc-750 rounded-lg text-xs font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-850 disabled:opacity-50 transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
