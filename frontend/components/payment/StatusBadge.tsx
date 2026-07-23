import React from 'react';
import { PaymentStatus } from '@/types/payment';

interface StatusBadgeProps {
  status: PaymentStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const statusStyles: Record<PaymentStatus, { bg: string; text: string; label: string; pulse?: boolean }> = {
    PENDING: {
      bg: 'bg-zinc-100 dark:bg-zinc-800',
      text: 'text-zinc-700 dark:text-zinc-300',
      label: 'Pending Review',
    },
    INITIATED: {
      bg: 'bg-blue-50 dark:bg-blue-950/20',
      text: 'text-blue-700 dark:text-blue-400',
      label: 'Initiated',
    },
    PROCESSING: {
      bg: 'bg-indigo-50 dark:bg-indigo-950/30',
      text: 'text-indigo-700 dark:text-indigo-400',
      label: 'Processing',
      pulse: true,
    },
    SUCCESS: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/25',
      text: 'text-emerald-700 dark:text-emerald-400',
      label: 'Success',
    },
    FAILED: {
      bg: 'bg-rose-50 dark:bg-rose-950/25',
      text: 'text-rose-700 dark:text-rose-450',
      label: 'Failed',
    },
    CANCELLED: {
      bg: 'bg-gray-150 dark:bg-zinc-800/80',
      text: 'text-gray-600 dark:text-zinc-400',
      label: 'Cancelled',
    },
    REFUNDED: {
      bg: 'bg-amber-50 dark:bg-amber-950/20',
      text: 'text-amber-700 dark:text-amber-400',
      label: 'Refunded',
    },
    PARTIALLY_PAID: {
      bg: 'bg-orange-50 dark:bg-orange-950/20',
      text: 'text-orange-700 dark:text-orange-400',
      label: 'Partially Paid',
    },
    COMPLETED: {
      bg: 'bg-teal-50 dark:bg-teal-950/20',
      text: 'text-teal-700 dark:text-teal-400',
      label: 'Completed',
    },
  };

  const style = statusStyles[status] || {
    bg: 'bg-gray-50',
    text: 'text-gray-600',
    label: status,
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border border-current/10 tracking-wide uppercase transition-all duration-200 ${style.bg} ${style.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full bg-current ${style.pulse ? 'animate-ping' : 'animate-pulse'}`} />
      {style.label}
    </span>
  );
}
