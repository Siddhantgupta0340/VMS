'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePayments } from '@/hooks/usePayments';
import StatusBadge from '@/components/payment/StatusBadge';
import { format } from 'date-fns';
import { DollarSign, Clock, FileSpreadsheet, ArrowRight } from 'lucide-react';

export default function PaymentsDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  const [page, setPage] = useState(1);

  // Filter params
  const params: { page: number; limit: number; status?: string } = {
    page,
    limit: 10,
  };
  if (activeTab === 'pending') {
    params.status = 'PENDING';
  }

  const { data, isLoading } = usePayments(params);
  const payments = data?.payments || [];
  const totalPages = data?.totalPages || 1;

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header section */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-zinc-50 flex items-center gap-2">
              <DollarSign className="h-8 w-8 text-emerald-600 dark:text-emerald-450" />
              Payments Administration
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-zinc-400">
              Process vendor outlays, retry gateway transfers, and audit processed payouts.
            </p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="mb-6 border-b border-gray-200 dark:border-zinc-800">
          <nav className="flex space-x-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab('pending');
                setPage(1);
              }}
              className={`py-4 px-1 border-b-2 font-semibold text-sm transition flex items-center gap-2 ${
                activeTab === 'pending'
                  ? 'border-emerald-650 text-emerald-700 dark:text-emerald-450'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-zinc-350'
              }`}
            >
              <Clock className="h-4.5 w-4.5" />
              Awaiting Approval
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('all');
                setPage(1);
              }}
              className={`py-4 px-1 border-b-2 font-semibold text-sm transition flex items-center gap-2 ${
                activeTab === 'all'
                  ? 'border-emerald-650 text-emerald-700 dark:text-emerald-450'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-zinc-350'
              }`}
            >
              <FileSpreadsheet className="h-4.5 w-4.5" />
              All Payments Ledger
            </button>
          </nav>
        </div>

        {/* Payments List */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-150 dark:border-zinc-855">
            <div className="h-8 w-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-4" />
            <p className="text-sm text-gray-500 dark:text-zinc-400">Loading ledger data...</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-150 dark:border-zinc-855 p-6">
            <DollarSign className="mx-auto h-12 w-12 text-gray-300 dark:text-zinc-700 mb-3" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-50">No payments found</h3>
            <p className="mt-1 text-xs text-gray-550 dark:text-zinc-400">
              There are no payment requests inside this queue.
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-150 dark:border-zinc-855 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-150 dark:divide-zinc-800">
                <thead className="bg-gray-50 dark:bg-zinc-900/50">
                  <tr>
                    <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-zinc-450 uppercase tracking-wider">
                      Payment Number
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-zinc-450 uppercase tracking-wider">
                      Invoice & Vendor
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-zinc-450 uppercase tracking-wider">
                      Type & Provider
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-zinc-450 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-zinc-450 uppercase tracking-wider">
                      Gateway Ref
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-zinc-450 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-zinc-450 uppercase tracking-wider">
                      Created By
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-zinc-450 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="relative px-6 py-3.5">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                  {payments.map((pay) => (
                    <tr
                      key={pay.id}
                      className="hover:bg-gray-50/50 dark:hover:bg-zinc-850/30 transition duration-150 cursor-pointer"
                      onClick={() => router.push(`/payments/${pay.id}`)}
                    >
                      <td className="px-6 py-4.5 whitespace-nowrap text-sm font-bold text-emerald-650 dark:text-emerald-450">
                        {pay.payment_number}
                      </td>
                      <td className="px-6 py-4.5 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900 dark:text-zinc-50">
                          {pay.invoice?.invoice_number || 'Legacy Invoice'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-zinc-450">
                          {pay.vendor?.name || 'Unknown Vendor'}
                        </div>
                      </td>
                      <td className="px-6 py-4.5 whitespace-nowrap">
                        <div className="text-xs font-bold text-gray-700 dark:text-zinc-350">
                          {pay.payment_type} / {pay.payment_method}
                        </div>
                        <div className="text-[10px] text-gray-400 font-semibold mt-0.5">
                          via {pay.payment_provider}
                        </div>
                      </td>
                      <td className="px-6 py-4.5 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-zinc-50">
                        {pay.currency} {pay.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4.5 whitespace-nowrap text-xs text-gray-550 dark:text-zinc-400">
                        <div className="font-semibold">{pay.provider_transaction_id || '-'}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{pay.gateway_reference || ''}</div>
                      </td>
                      <td className="px-6 py-4.5 whitespace-nowrap text-sm text-gray-500 dark:text-zinc-450">
                        {formatDate(pay.created_at)}
                      </td>
                      <td className="px-6 py-4.5 whitespace-nowrap text-xs text-gray-600 dark:text-zinc-400 font-medium">
                        {pay.created_by ? `${pay.created_by.first_name || ''} ${pay.created_by.last_name || ''}`.trim() || pay.created_by.email : 'System'}
                      </td>
                      <td className="px-6 py-4.5 whitespace-nowrap">
                        <StatusBadge status={pay.status} />
                      </td>
                      <td className="px-6 py-4.5 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-950 font-bold dark:text-emerald-450 dark:hover:text-zinc-300"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/payments/${pay.id}`);
                          }}
                        >
                          Review
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
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
                    className="px-3 py-1.5 border border-gray-350 dark:border-zinc-750 rounded-lg text-xs font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-850 disabled:opacity-50 transition"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="px-3 py-1.5 border border-gray-350 dark:border-zinc-750 rounded-lg text-xs font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-850 disabled:opacity-50 transition"
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
  );
}
