'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePayment, usePaymentHistory } from '@/hooks/usePayments';
import StatusBadge from '@/components/payment/StatusBadge';
import PaymentActions from '@/components/payment/PaymentActions';
import PaymentForm from '@/components/payment/PaymentForm';
import { format } from 'date-fns';
import {
  DollarSign,
  Building2,
  Calendar,
  AlertTriangle,
  ArrowLeft,
  Briefcase,
  History,
  CreditCard,
} from 'lucide-react';

export default function PaymentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [user, setUser] = useState<{ id: string; role: string; email: string } | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem('vms_user');
    if (userStr) {
      try {
        const parsed = JSON.parse(userStr);
        setTimeout(() => {
          setUser(parsed);
        }, 0);
      } catch (e) {
        console.error('Failed to parse user:', e);
      }
    }
  }, []);

  const { data: payment, isLoading, error } = usePayment(id);
  const { data: history } = usePaymentHistory(id);

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'N/A';
    try {
      return format(new Date(dateStr), 'MMMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'N/A';
    try {
      return format(new Date(dateStr), 'MMM d, yyyy h:mm a');
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-zinc-950">
        <div className="h-8 w-8 border-4 border-emerald-250 border-t-emerald-600 rounded-full animate-spin mb-4" />
        <p className="text-sm text-gray-500 dark:text-zinc-400">Loading payout details...</p>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full text-center bg-white dark:bg-zinc-900 border border-red-200 rounded-2xl p-8 shadow-sm">
          <AlertTriangle className="h-12 w-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-zinc-50">Payment request not found</h2>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-2">
            The payment request could not be located, or you are unauthorized to view it.
          </p>
          <button
            type="button"
            className="mt-6 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition"
            onClick={() => router.push('/payments/pending')}
          >
            Return to Ledger
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Back Link */}
        <div className="mb-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Payments
          </button>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-extrabold text-gray-900 dark:text-zinc-50">
                  Payment {payment.payment_number}
                </h1>
                <StatusBadge status={payment.status} />
              </div>
              <p className="text-xs text-gray-550 dark:text-zinc-400 mt-1">
                ID: {payment.id} • Created on {formatDateTime(payment.created_at)}
              </p>
            </div>
            {user && (
              <PaymentActions
                payment={payment}
                currentUser={user}
                onEdit={() => setIsEditOpen(true)}
              />
            )}
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-150 dark:border-zinc-850 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-50 border-b border-gray-100 dark:border-zinc-800 pb-3 mb-4 flex items-center gap-1.5">
                <CreditCard className="h-4.5 w-4.5 text-gray-400" />
                Payment Specifications
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <span className="block text-[11px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wide">
                    Amount & Currency
                  </span>
                  <span className="mt-1 flex items-center gap-1 text-lg font-bold text-gray-900 dark:text-zinc-50">
                    <DollarSign className="h-4.5 w-4.5 text-gray-400" />
                    {payment.currency} {payment.amount.toLocaleString('en-IN')}
                  </span>
                </div>
                
                <div>
                  <span className="block text-[11px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wide">
                    Method & Provider
                  </span>
                  <span className="mt-1 block text-sm font-bold text-gray-800 dark:text-zinc-200">
                    {payment.payment_method} ({payment.payment_provider})
                  </span>
                </div>

                <div>
                  <span className="block text-[11px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wide">
                    Payment Type
                  </span>
                  <span className="mt-1 block text-sm font-semibold text-gray-850 dark:text-zinc-200">
                    {payment.payment_type}
                  </span>
                </div>

                <div>
                  <span className="block text-[11px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wide">
                    Payment Date
                  </span>
                  <span className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-gray-800 dark:text-zinc-200">
                    <Calendar className="h-4.5 w-4.5 text-gray-400" />
                    {formatDate(payment.payment_date)}
                  </span>
                </div>

                <div>
                  <span className="block text-[11px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wide">
                    Vendor Partner
                  </span>
                  <span className="mt-1 flex items-start gap-1.5 text-sm font-semibold text-gray-850 dark:text-zinc-200">
                    <Building2 className="h-4.5 w-4.5 text-gray-400 mt-0.5" />
                    <div>
                      <div>{payment.vendor?.name}</div>
                      <div className="text-xs font-normal text-gray-500 mt-0.5">{payment.vendor?.vendor_code}</div>
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
                      <div>{payment.purchase_order?.po_number}</div>
                      <div className="text-xs font-normal text-gray-500 mt-0.5">
                        PO Amount: {payment.purchase_order?.amount.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </span>
                </div>
              </div>

              {payment.remarks && (
                <div className="mt-6 pt-6 border-t border-gray-100 dark:border-zinc-800">
                  <span className="block text-[11px] font-bold text-gray-400 dark:text-zinc-550 uppercase tracking-wide">
                    Payment Remarks / Notes
                  </span>
                  <p className="mt-2 text-xs text-gray-600 dark:text-zinc-350 bg-gray-50 dark:bg-zinc-900/50 p-3 rounded-xl border border-gray-100 dark:border-zinc-850">
                    {payment.remarks}
                  </p>
                </div>
              )}
            </div>

            {/* Gateway Response Card (Only if success or failed gateway transactions exist) */}
            {(payment.provider_transaction_id || payment.response_message) && (
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-150 dark:border-zinc-850 p-6 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-50 border-b border-gray-100 dark:border-zinc-800 pb-3 mb-4">
                  Gateway Integration Payload
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="font-semibold text-gray-400">Transaction ID:</span>
                    <p className="mt-0.5 font-bold text-gray-850 dark:text-zinc-100">{payment.provider_transaction_id || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-400">Gateway Reference:</span>
                    <p className="mt-0.5 font-bold text-gray-850 dark:text-zinc-100">{payment.gateway_reference || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-400">Gateway Status:</span>
                    <p className="mt-0.5 font-bold text-gray-850 dark:text-zinc-100">{payment.gateway_status || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-400">Gateway Message:</span>
                    <p className="mt-0.5 font-bold text-gray-850 dark:text-zinc-100">{payment.response_message || 'N/A'}</p>
                  </div>
                </div>

                {payment.payment_gateway_response && (
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-zinc-800">
                    <span className="block font-semibold text-gray-400 text-xs mb-1">Raw response metadata:</span>
                    <pre className="bg-gray-50 dark:bg-zinc-950 p-3 rounded-xl border border-gray-100 dark:border-zinc-850 text-[10px] text-gray-700 dark:text-zinc-400 overflow-x-auto">
                      {JSON.stringify(payment.payment_gateway_response, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* History Timeline */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-150 dark:border-zinc-850 p-6 shadow-sm h-fit">
            <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-50 border-b border-gray-100 dark:border-zinc-800 pb-3 mb-4 flex items-center gap-1.5">
              <History className="h-4.5 w-4.5 text-gray-400" />
              State Audits Trail
            </h3>
            
            {history && history.length > 0 ? (
              <div className="flow-root">
                <ul className="-mb-8">
                  {history.map((log, logIdx) => (
                    <li key={log.id}>
                      <div className="relative pb-8">
                        {logIdx !== history.length - 1 && (
                          <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-100 dark:bg-zinc-850" />
                        )}
                        <div className="relative flex space-x-3">
                          <div className="h-8 w-8 rounded-full bg-gray-150 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-gray-650 dark:text-zinc-450 border border-gray-250 dark:border-zinc-700 uppercase">
                            {log.action.slice(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0 pt-0.5">
                            <p className="text-xs font-bold text-gray-905 dark:text-zinc-50">
                              {log.action.toUpperCase()}{' '}
                              {log.from_status && (
                                <span className="text-[9px] text-gray-400 font-normal">
                                  ({log.from_status} → {log.to_status})
                                </span>
                              )}
                            </p>
                            {log.remarks && (
                              <p className="text-xs text-gray-650 dark:text-zinc-400 mt-1 italic">
                                &quot;{log.remarks}&quot;
                              </p>
                            )}
                            <p className="text-[10px] text-gray-405 dark:text-zinc-500 mt-1">
                              {formatDateTime(log.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-xs text-gray-500 dark:text-zinc-400 italic">No audit trail recorded.</p>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {payment && (
        <PaymentForm
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          payment={payment}
        />
      )}
    </div>
  );
}
