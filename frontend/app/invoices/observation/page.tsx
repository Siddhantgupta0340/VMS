'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import {
  useFinanceHeadObservation,
  useAddFinanceHeadRemark,
} from '@/hooks/useInvoices';
import StatusBadge from '@/components/invoice/StatusBadge';
import { format } from 'date-fns';
import {
  Eye,
  Search,
  SlidersHorizontal,
  MessageSquarePlus,
  ArrowRight,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import RemarksDialog from '@/components/invoice/RemarksDialog';
import { toast } from 'sonner';

interface ApiErrorResponse {
  response?: {
    data?: {
      message?: string;
    };
  };
}

export default function FinanceHeadObservationDashboard() {
  const [user, setUser] = useState<{ id: string; role: string; email: string } | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [remarkingInvoiceId, setRemarkingInvoiceId] = useState<string | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('vms_user');
    if (userStr) {
      try {
        const parsed = JSON.parse(userStr);
        setTimeout(() => {
          setUser(parsed);
        }, 0);
      } catch (e) {
        console.error('Failed to parse user session:', e);
      }
    }
  }, []);

  const queryParams = {
    search: search || undefined,
    status: statusFilter || undefined,
    sortBy,
    sortOrder,
    page,
    limit: 10,
  };

  const { data, isLoading, refetch, isFetching } = useFinanceHeadObservation(queryParams);
  const invoices = data?.invoices || [];
  const totalPages = data?.totalPages || 1;
  const totalCount = data?.total || 0;

  const addRemarkMutation = useAddFinanceHeadRemark();

  const handleAddRemark = (remark: string) => {
    if (!remarkingInvoiceId) return;
    addRemarkMutation.mutate(
      { id: remarkingInvoiceId, remark },
      {
        onSuccess: () => {
          toast.success('Observation remark added to audit trail successfully.');
          setRemarkingInvoiceId(null);
          refetch();
        },
        onError: (err: unknown) => {
          const error = err as ApiErrorResponse;
          toast.error(error.response?.data?.message || 'Failed to add observation remark.');
        },
      }
    );
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  // Metrics summary calculated from the list
  const pendingMatching = invoices.filter((i) => i.status === 'PENDING_THREE_WAY_MATCH').length;
  const pendingApprovals = invoices.filter(
    (i) => i.status.startsWith('PENDING_') && i.status !== 'PENDING_THREE_WAY_MATCH'
  ).length;
  const approvedTotal = invoices.filter((i) => i.status === 'APPROVED').length;

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-zinc-950">
      <Sidebar user={user} />
      <div className="flex-1 overflow-y-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 dark:text-zinc-55 flex items-center gap-2">
                <Eye className="h-8 w-8 text-indigo-650 dark:text-indigo-400" />
                Observation Control Dashboard
              </h1>
              <p className="mt-2 text-sm text-gray-500 dark:text-zinc-400">
                Authorized overview of VMS tickets, status transition auditing, and operational compliance tracking.
              </p>
            </div>
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-zinc-700 bg-zinc-900 text-white rounded-xl text-xs font-bold transition hover:bg-zinc-800"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh Dashboard
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-150 dark:border-zinc-850 p-5 shadow-sm">
              <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide">
                Active In Matching stage
              </span>
              <span className="block mt-1.5 text-2xl font-extrabold text-gray-900 dark:text-zinc-50">
                {pendingMatching} Invoices
              </span>
            </div>
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-150 dark:border-zinc-850 p-5 shadow-sm">
              <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide">
                Awaiting Workflow Approval
              </span>
              <span className="block mt-1.5 text-2xl font-extrabold text-orange-600 dark:text-orange-400">
                {pendingApprovals} Invoices
              </span>
            </div>
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-150 dark:border-zinc-850 p-5 shadow-sm">
              <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide">
                Completed & Authorized
              </span>
              <span className="block mt-1.5 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {approvedTotal} Invoices
              </span>
            </div>
          </div>

          {/* Filters Card */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-150 dark:border-zinc-855 p-5 shadow-sm mb-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              {/* Search input */}
              <div className="relative w-full md:max-w-md">
                <Search className="absolute left-3.5 top-3 h-4.5 w-4.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search invoice number, vendor, PO reference..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 pl-10 pr-4 py-2 text-sm text-gray-955 dark:text-zinc-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Advanced select filters */}
              <div className="flex flex-wrap gap-3 w-full md:w-auto items-center justify-end">
                <div className="flex items-center gap-1.5">
                  <SlidersHorizontal className="h-4 w-4 text-gray-400" />
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setPage(1);
                    }}
                    className="rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-955 px-3 py-1.5 text-xs text-gray-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Statuses</option>
                    <option value="PENDING_THREE_WAY_MATCH">Three-Way Matching</option>
                    <option value="PENDING_ADMIN_REVIEW">Admin Review</option>
                    <option value="PENDING_TEAM_LEAD">Team Lead</option>
                    <option value="PENDING_MANAGER">Manager</option>
                    <option value="PENDING_FINANCE_HEAD">Finance Head</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-955 px-3 py-1.5 text-xs text-gray-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="created_at">Date Created</option>
                  <option value="amount">Invoice Amount</option>
                  <option value="invoice_number">Invoice Number</option>
                </select>

                <button
                  type="button"
                  onClick={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
                  className="p-1.5 rounded-lg border border-gray-350 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 text-xs text-gray-700 dark:text-zinc-300 transition uppercase"
                >
                  {sortOrder}
                </button>
              </div>
            </div>
          </div>

          {/* List Content */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-150 dark:border-zinc-855 shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center p-20">
                <div className="h-8 w-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
                <p className="text-xs text-gray-550">Loading audit statistics...</p>
              </div>
            ) : invoices.length === 0 ? (
              <div className="text-center p-16">
                <TrendingUp className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-50">No Invoices Found</h3>
                <p className="text-xs text-gray-500 mt-2">No active invoices matched your filter query parameters.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-150 dark:border-zinc-800 text-gray-400 font-bold uppercase tracking-wider bg-gray-50/50 dark:bg-zinc-900/50">
                        <th className="py-3 px-6">Invoice details</th>
                        <th className="py-3 px-6">Vendor & PO</th>
                        <th className="py-3 px-6">Grand Total</th>
                        <th className="py-3 px-6">Match %</th>
                        <th className="py-3 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-zinc-850">
                      {invoices.map((inv) => (
                        <tr
                          key={inv.id}
                          className="hover:bg-zinc-50/55 dark:hover:bg-zinc-850/30 transition-colors"
                        >
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div>
                                <div className="font-bold text-gray-900 dark:text-zinc-50 text-sm">
                                  {inv.invoice_number}
                                </div>
                                <div className="text-[10px] text-gray-500 dark:text-zinc-450 mt-0.5">
                                  Due: {formatDate(inv.due_date || '')}
                                </div>
                              </div>
                              <StatusBadge status={inv.status} />
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="font-bold text-gray-700 dark:text-zinc-300">
                              {inv.vendor?.name}
                            </div>
                            <div className="text-[10px] text-gray-500 dark:text-zinc-450 mt-0.5">
                              PO Ref: {inv.purchase_order?.po_number}
                            </div>
                          </td>
                          <td className="py-4 px-6 font-extrabold text-gray-900 dark:text-zinc-50 text-sm">
                            {inv.currency} {Number(inv.amount).toLocaleString('en-IN')}
                          </td>
                          <td className="py-4 px-6">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                                inv.three_way_match_status === 'MATCHED'
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20'
                                  : inv.three_way_match_status === 'UNMATCHED'
                                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/20'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {inv.three_way_match_status
                                ? `${inv.three_way_match_status} (${inv.three_way_match_percentage}%)`
                                : 'PENDING'}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right space-x-2">
                            <button
                              type="button"
                              onClick={() => setRemarkingInvoiceId(inv.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 border border-zinc-250 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg text-[11px] font-semibold transition"
                            >
                              <MessageSquarePlus className="h-3.5 w-3.5" />
                              Add Remark
                            </button>
                            <Link
                              href={`/invoices/${inv.id}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-semibold transition shadow-sm shadow-indigo-500/10"
                            >
                              View Details
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-6 py-4 bg-gray-50 dark:bg-zinc-900/50 border-t border-gray-150 dark:border-zinc-855 flex items-center justify-between">
                    <div className="text-xs text-gray-505 dark:text-zinc-450">
                      Showing page {page} of {totalPages} ({totalCount} total entries)
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
              </>
            )}
          </div>
        </div>
      </div>

      <RemarksDialog
        isOpen={remarkingInvoiceId !== null}
        onClose={() => setRemarkingInvoiceId(null)}
        onSubmit={handleAddRemark}
        title="Add Observation Remark"
        placeholder="Enter your observation remark for this invoice. This remark will be appended to the permanent audit trail log."
        submitButtonText="Save Remark"
        submitButtonColor="bg-indigo-650 hover:bg-indigo-755"
        isPending={addRemarkMutation.isPending}
        isRequired={true}
      />
    </div>
  );
}
