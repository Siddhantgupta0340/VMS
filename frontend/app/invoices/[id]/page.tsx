'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useInvoice, useInvoiceHistory } from '@/hooks/useInvoices';
import StatusBadge from '@/components/invoice/StatusBadge';
import ApprovalTimeline from '@/components/invoice/ApprovalTimeline';
import ApprovalActions from '@/components/invoice/ApprovalActions';
import PaymentForm from '@/components/payment/PaymentForm';
import { format } from 'date-fns';
import Sidebar from '@/components/Sidebar';
import {
  Building2,
  Calendar,
  AlertOctagon,
  ArrowLeft,
  DollarSign,
  Briefcase,
} from 'lucide-react';
import type { Invoice, AuditLog } from '@/types/invoice';

interface ExtendedInvoice extends Invoice {
  payments?: {
    id: string;
    payment_number: string;
    amount: number;
    payment_method: string | null;
    status: string;
  }[];
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [user, setUser] = useState<{ id: string; role: string; email: string } | null>(null);
  const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(false);

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

  const { data: rawInvoice, isLoading, error } = useInvoice(id);
  const invoice = rawInvoice as unknown as ExtendedInvoice;
  const { data: history } = useInvoiceHistory(id);

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'N/A';
    try {
      return format(new Date(dateStr), 'MMMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-zinc-950">
        <div className="h-8 w-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
        <p className="text-sm text-gray-500 dark:text-zinc-400">Loading invoice details...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full text-center bg-white dark:bg-zinc-900 border border-red-200 rounded-2xl p-8 shadow-sm">
          <AlertOctagon className="h-12 w-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-zinc-50">Failed to load invoice</h2>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-2">
            The invoice could not be found or you do not have permission to view it.
          </p>
          <button
            type="button"
            className="mt-6 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition"
            onClick={() => router.push('/invoices/pending')}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const isRejected = invoice.status === 'REJECTED';

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-zinc-950">
      <Sidebar user={user} />
      <div className="flex-1 overflow-y-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
        {/* Breadcrumb Header */}
        <div className="mb-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Invoices
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-extrabold text-gray-900 dark:text-zinc-50">
                  Invoice {invoice.invoice_number}
                </h1>
                <StatusBadge status={invoice.status} />
              </div>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                ID: {invoice.id} • Created on {formatDate(invoice.created_at)}
              </p>
            </div>
            {user && (
              <div className="flex items-center gap-3">
                <ApprovalActions invoice={invoice} currentUser={user} />
                {['APPROVED', 'PAID'].includes(invoice.status.toUpperCase()) &&
                  ['CASE_MANAGER', 'FINANCE_HEAD', 'SUPER_ADMIN'].includes(user.role) && (
                    <button
                      type="button"
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm"
                      onClick={() => setIsPaymentFormOpen(true)}
                    >
                      <DollarSign className="h-4 w-4" />
                      Record/Request Payment
                    </button>
                  )}
              </div>
            )}
          </div>
        </div>

        {/* Rejection Alert Banner */}
        {isRejected && (
          <div className="mb-6 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-250 p-4 flex gap-3">
            <AlertOctagon className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-rose-800 dark:text-rose-400">Invoice Rejected</h4>
              <p className="text-xs text-rose-700 dark:text-rose-450 mt-1">
                Reason: &quot;{invoice.rejection_reason || 'No reason provided.'}&quot;
              </p>
              <p className="text-[10px] text-rose-500 dark:text-rose-400/70 mt-2">
                Rejected by{' '}
                {invoice.rejected_by
                  ? `${invoice.rejected_by.first_name || ''} ${invoice.rejected_by.last_name || ''}`.trim() || invoice.rejected_by.role
                  : 'Approver'}
                {' '}on {formatDate(invoice.rejected_at)}.
              </p>
            </div>
          </div>
        )}

        {/* Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Info Card */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-150 dark:border-zinc-850 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-50 border-b border-gray-100 dark:border-zinc-800 pb-3 mb-4">
                Invoice Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <span className="block text-[11px] font-bold text-gray-400 dark:text-zinc-550 uppercase tracking-wide">
                    Amount & Currency
                  </span>
                  <span className="mt-1 flex items-center gap-1 text-lg font-bold text-gray-900 dark:text-zinc-50">
                    <DollarSign className="h-4.5 w-4.5 text-gray-400" />
                    {invoice.currency} {invoice.amount.toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] font-bold text-gray-400 dark:text-zinc-550 uppercase tracking-wide">
                    Due Date
                  </span>
                  <span className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-gray-800 dark:text-zinc-200">
                    <Calendar className="h-4.5 w-4.5 text-gray-400" />
                    {formatDate(invoice.due_date)}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] font-bold text-gray-400 dark:text-zinc-550 uppercase tracking-wide">
                    Vendor Partner
                  </span>
                  <span className="mt-1 flex items-start gap-1.5 text-sm font-semibold text-gray-800 dark:text-zinc-200">
                    <Building2 className="h-4.5 w-4.5 text-gray-400 mt-0.5" />
                    <div>
                      <div>{invoice.vendor?.name}</div>
                      <div className="text-xs font-normal text-gray-500 mt-0.5">{invoice.vendor?.vendor_code}</div>
                    </div>
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] font-bold text-gray-400 dark:text-zinc-550 uppercase tracking-wide">
                    Purchase Order Reference
                  </span>
                  <span className="mt-1 flex items-start gap-1.5 text-sm font-semibold text-gray-850 dark:text-zinc-200">
                    <Briefcase className="h-4.5 w-4.5 text-gray-400 mt-0.5" />
                    <div>
                      <div>{invoice.purchase_order?.po_number}</div>
                      <div className="text-xs font-normal text-gray-500 mt-0.5">
                        PO Amount: {invoice.purchase_order?.currency} {invoice.purchase_order?.amount.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </span>
                </div>
              </div>

              {invoice.description && (
                <div className="mt-6 pt-6 border-t border-gray-100 dark:border-zinc-800">
                  <span className="block text-[11px] font-bold text-gray-400 dark:text-zinc-550 uppercase tracking-wide">
                    Invoice Description / Remarks
                  </span>
                  <p className="mt-2 text-xs text-gray-600 dark:text-zinc-350 bg-gray-50 dark:bg-zinc-900/50 p-3 rounded-xl border border-gray-100 dark:border-zinc-850">
                    {invoice.description}
                  </p>
                </div>
              )}
            </div>

            {/* Audit & Transition Logs History */}
            {history?.data && history.data.length > 0 && (
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-150 dark:border-zinc-850 p-6 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-50 border-b border-gray-100 dark:border-zinc-800 pb-3 mb-4">
                  Approval Logs Audit Trail
                </h3>
                <div className="flow-root">
                  <ul className="-mb-8">
                    {(history.data as AuditLog[]).map((log: AuditLog, logIdx: number) => (
                      <li key={log.id}>
                        <div className="relative pb-8">
                          {logIdx !== history.data.length - 1 && (
                            <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-100 dark:bg-zinc-850" />
                          )}
                          <div className="relative flex space-x-3">
                            <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-gray-650 dark:text-zinc-400 border border-gray-200 dark:border-zinc-700 uppercase">
                              {log.action.slice(0, 2)}
                            </div>
                            <div className="flex-1 min-w-0 pt-0.5">
                              <p className="text-xs font-bold text-gray-900 dark:text-zinc-55">
                                {log.action.toUpperCase()}{' '}
                                {log.from_status && (
                                  <span className="text-[10px] text-gray-400 font-normal">
                                    ({log.from_status} → {log.to_status})
                                  </span>
                                )}
                              </p>
                              {log.remarks && (
                                <p className="text-xs text-gray-600 dark:text-zinc-405 mt-1">
                                  {log.remarks}
                                </p>
                              )}
                              <p className="text-[10px] text-gray-405 dark:text-zinc-500 mt-1 flex items-center gap-1">
                                By{' '}
                                {log.performed_by
                                  ? `${log.performed_by.first_name || ''} ${log.performed_by.last_name || ''}`.trim() || log.performed_by.email
                                  : 'System'}
                                {' • '}
                                {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                              </p>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Workflow Timeline Section */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-150 dark:border-zinc-850 p-6 shadow-sm h-fit">
              <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-50 border-b border-gray-100 dark:border-zinc-800 pb-3 mb-4">
                Approval Progress
              </h3>
              <ApprovalTimeline invoice={invoice} />
            </div>

            {/* Associated Payments Card */}
            {invoice.payments && invoice.payments.length > 0 && (
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-150 dark:border-zinc-850 p-6 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-50 border-b border-gray-100 dark:border-zinc-800 pb-3 mb-4">
                  Payouts Ledger
                </h3>
                <div className="space-y-3">
                  {invoice.payments.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 bg-gray-50 dark:bg-zinc-950 rounded-xl border border-gray-100 dark:border-zinc-850 flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-900 transition"
                      onClick={() => router.push(`/payments/${p.id}`)}
                    >
                      <div>
                        <div className="text-xs font-bold text-emerald-650 dark:text-emerald-450">{p.payment_number}</div>
                        <div className="text-[10px] text-gray-500 dark:text-zinc-400 mt-0.5">Method: {p.payment_method || 'NEFT'}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-gray-900 dark:text-zinc-50">INR {Number(p.amount).toLocaleString('en-IN')}</div>
                        <div className="text-[9px] uppercase font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{p.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
      <PaymentForm
        isOpen={isPaymentFormOpen}
        onClose={() => setIsPaymentFormOpen(false)}
        invoiceId={invoice.id}
        defaultAmount={Number(invoice.remaining_amount ?? invoice.amount)}
        invoiceTotal={Number(invoice.invoice_total ?? invoice.amount)}
        paidAmount={Number(invoice.paid_amount ?? 0)}
        remainingAmount={Number(invoice.remaining_amount ?? invoice.amount)}
      />
    </div>
  );
}
