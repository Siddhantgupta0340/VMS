'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Payment, PaymentMethod, PaymentType, PaymentProvider } from '@/types/payment';
import { useCreatePayment, useUpdatePayment } from '@/hooks/usePayments';
import { X } from 'lucide-react';

interface PaymentFormValues {
  invoiceId: string;
  amount: number;
  paymentMethod: string;
  paymentType: string;
  paymentProvider: string;
  remarks?: string;
  dueDate?: string;
}

interface PaymentFormProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId?: string;
  defaultAmount?: number;
  payment?: Payment;
  invoiceTotal?: number;
  paidAmount?: number;
  remainingAmount?: number;
}

export default function PaymentForm({
  isOpen,
  onClose,
  invoiceId,
  defaultAmount,
  payment,
  invoiceTotal,
  paidAmount,
  remainingAmount,
}: PaymentFormProps) {
  const createMutation = useCreatePayment();
  const updateMutation = useUpdatePayment();

  const isEdit = !!payment;
  const activeRemaining = remainingAmount !== undefined ? remainingAmount : (defaultAmount || 0);

  const paymentFormSchema = React.useMemo(() => {
    return z.object({
      invoiceId: z.string().uuid('Invalid invoice ID'),
      amount: z.number()
        .positive('Payment amount must be greater than 0')
        .max(activeRemaining > 0 ? activeRemaining : 999999999, `Amount cannot exceed remaining balance of INR ${activeRemaining.toFixed(2)}`),
      paymentMethod: z.string().min(1, 'Payment method is required'),
      paymentType: z.string().min(1, 'Payment type is required'),
      paymentProvider: z.string().min(1, 'Payment provider is required'),
      remarks: z.string().default(''),
      dueDate: z.string().default(''),
    });
  }, [activeRemaining]);

  const initialAmount = remainingAmount !== undefined ? remainingAmount : (defaultAmount || payment?.amount || 0);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      invoiceId: invoiceId || payment?.invoice_id || '',
      amount: initialAmount,
      paymentMethod: payment?.payment_method || 'NEFT',
      paymentType: payment?.payment_type || 'FULL',
      paymentProvider: payment?.payment_provider || 'MANUAL',
      remarks: payment?.remarks || '',
      dueDate: payment?.due_date ? new Date(payment.due_date).toISOString().split('T')[0] : '',
    },
  });

  const enteredAmount = watch('amount');
  const remainingAfterPayment = Math.max(0, activeRemaining - (Number(enteredAmount) || 0));

  useEffect(() => {
    if (isOpen) {
      reset({
        invoiceId: invoiceId || payment?.invoice_id || '',
        amount: initialAmount,
        paymentMethod: payment?.payment_method || 'NEFT',
        paymentType: payment?.payment_type || 'FULL',
        paymentProvider: payment?.payment_provider || 'MANUAL',
        remarks: payment?.remarks || '',
        dueDate: payment?.due_date ? new Date(payment.due_date).toISOString().split('T')[0] : '',
      });
    }
  }, [isOpen, invoiceId, initialAmount, payment, reset]);

  if (!isOpen) return null;

  const onSubmit = (data: PaymentFormValues) => {
    if (isEdit && payment) {
      updateMutation.mutate(
        {
          id: payment.id,
          payload: {
            amount: data.amount,
            paymentMethod: data.paymentMethod,
            paymentType: data.paymentType,
            paymentProvider: data.paymentProvider,
            remarks: data.remarks,
            dueDate: data.dueDate || undefined,
          },
        },
        {
          onSuccess: () => {
            onClose();
            reset();
          },
        }
      );
    } else {
      createMutation.mutate(
        {
          invoiceId: data.invoiceId,
          amount: data.amount,
          paymentMethod: data.paymentMethod as PaymentMethod,
          paymentType: data.paymentType as PaymentType,
          paymentProvider: data.paymentProvider as PaymentProvider,
          remarks: data.remarks,
          dueDate: data.dueDate || undefined,
        },
        {
          onSuccess: () => {
            onClose();
            reset();
          },
        }
      );
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 transition-opacity bg-zinc-950/60 dark:bg-black/80"
          onClick={onClose}
        />

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>

        <div className="inline-block align-bottom bg-white dark:bg-zinc-900 rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-gray-150 dark:border-zinc-800">
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="px-6 py-5 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-50">
                {isEdit ? 'Update Payment Request' : 'Create Payment Request'}
              </h3>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-550 transition"
                onClick={onClose}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Invoice ID (ReadOnly) */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Invoice ID
                </label>
              </div>

              {/* Invoice Payout Summary */}
              {invoiceTotal !== undefined && (
                <div className="p-4 bg-gray-50 dark:bg-zinc-950 border border-gray-150 dark:border-zinc-850 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">Invoice Total:</span>
                    <span className="font-bold text-gray-900 dark:text-zinc-100">INR {invoiceTotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">Already Paid:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">INR {paidAmount?.toLocaleString('en-IN') || '0.00'}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 dark:border-zinc-800 pt-2 font-semibold">
                    <span className="text-gray-700 dark:text-zinc-300">Remaining Amount:</span>
                    <span className="font-bold text-gray-900 dark:text-zinc-50">INR {remainingAmount?.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )}

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Payment Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3.5 py-2.5 text-sm text-gray-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  {...register('amount', { valueAsNumber: true })}
                  disabled={isPending}
                />
                {errors.amount?.message && (
                  <p className="mt-1 text-xs text-rose-600 font-medium">{String(errors.amount.message)}</p>
                )}
                {invoiceTotal !== undefined && (
                  <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/30 rounded-xl flex items-center justify-between text-xs mt-2">
                    <span className="text-indigo-700 dark:text-indigo-400 font-medium">Remaining After Payment:</span>
                    <span className={`font-bold ${remainingAfterPayment === 0 ? 'text-emerald-600' : 'text-indigo-800 dark:text-indigo-300'}`}>
                      INR {remainingAfterPayment.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Payment Method
                </label>
                <select
                  className="w-full rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3.5 py-2.5 text-sm text-gray-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  {...register('paymentMethod')}
                  disabled={isPending}
                >
                  <option value="NEFT">NEFT (National Electronic Funds Transfer)</option>
                  <option value="RTGS">RTGS (Real Time Gross Settlement)</option>
                  <option value="IMPS">IMPS (Immediate Payment Service)</option>
                  <option value="UPI">UPI (Unified Payments Interface)</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="CASH">Cash</option>
                  <option value="CREDIT_CARD">Credit Card</option>
                  <option value="DEBIT_CARD">Debit Card</option>
                  <option value="NET_BANKING">Net Banking</option>
                  <option value="WALLET">Wallet</option>
                  <option value="ACH">ACH Transfer</option>
                  <option value="WIRE_TRANSFER">Wire Transfer</option>
                </select>
              </div>

              {/* Payment Type */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Payment Type
                </label>
                <select
                  className="w-full rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3.5 py-2.5 text-sm text-gray-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  {...register('paymentType')}
                  disabled={isPending}
                >
                  <option value="FULL">Full Payment</option>
                  <option value="PARTIAL">Partial Payment</option>
                  <option value="ADVANCE">Advance Payment</option>
                  <option value="FINAL">Final Payment</option>
                  <option value="SCHEDULED">Scheduled Payment</option>
                  <option value="RECURRING">Recurring Payment</option>
                </select>
              </div>

              {/* Payment Provider */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Payment Provider
                </label>
                <select
                  className="w-full rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3.5 py-2.5 text-sm text-gray-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  {...register('paymentProvider')}
                  disabled={isPending}
                >
                  <option value="MANUAL">Manual Bank Transfer</option>
                  <option value="RAZORPAY">Razorpay Gateway</option>
                  <option value="STRIPE">Stripe Gateway</option>
                  <option value="PAYPAL">PayPal Gateway</option>
                  <option value="PHONEPE">PhonePe Gateway</option>
                  <option value="CASHFREE">Cashfree Gateway</option>
                  <option value="PAYU">PayU Gateway</option>
                  <option value="BANK_API">Direct Bank API</option>
                </select>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Scheduled Due Date
                </label>
                <input
                  type="date"
                  className="w-full rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3.5 py-2.5 text-sm text-gray-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  {...register('dueDate')}
                  disabled={isPending}
                />
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Remarks / Notes
                </label>
                <textarea
                  rows={3}
                  className="w-full rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3.5 py-2.5 text-sm text-gray-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Enter optional description or internal notes..."
                  {...register('remarks')}
                  disabled={isPending}
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 dark:bg-zinc-900/50 border-t border-gray-100 dark:border-zinc-800 flex justify-end gap-3">
              <button
                type="button"
                className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition duration-150 disabled:opacity-50"
                onClick={onClose}
                disabled={isPending}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-650 hover:bg-indigo-755 rounded-xl transition duration-150 flex items-center gap-1.5 disabled:opacity-50"
                disabled={isPending}
              >
                {isPending && (
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                {isEdit ? 'Save Changes' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
