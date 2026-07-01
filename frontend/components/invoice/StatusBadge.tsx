import React from 'react';
import { InvoiceStatus } from '@/types/invoice';

interface StatusBadgeProps {
  status: InvoiceStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const statusStyles: Record<InvoiceStatus, { bg: string; text: string; label: string }> = {
    DRAFT: {
      bg: 'bg-gray-100 dark:bg-zinc-800',
      text: 'text-gray-800 dark:text-gray-200',
      label: 'Draft',
    },
    SUBMITTED: {
      bg: 'bg-indigo-50 dark:bg-indigo-950/30',
      text: 'text-indigo-750 dark:text-indigo-400',
      label: 'Submitted',
    },
    PENDING_L1: {
      bg: 'bg-amber-50 dark:bg-amber-950/20',
      text: 'text-amber-700 dark:text-amber-400',
      label: 'Pending L1 Approval',
    },
    PENDING_L2: {
      bg: 'bg-orange-50 dark:bg-orange-950/20',
      text: 'text-orange-700 dark:text-orange-400',
      label: 'Pending L2 Approval',
    },
    PENDING_L3: {
      bg: 'bg-red-50 dark:bg-red-950/20',
      text: 'text-red-700 dark:text-red-400',
      label: 'Pending L3 Approval',
    },
    APPROVED: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/25',
      text: 'text-emerald-700 dark:text-emerald-400',
      label: 'Fully Approved',
    },
    REJECTED: {
      bg: 'bg-rose-50 dark:bg-rose-950/25',
      text: 'text-rose-700 dark:text-rose-450',
      label: 'Rejected',
    },
    CANCELLED: {
      bg: 'bg-zinc-100 dark:bg-zinc-800/80',
      text: 'text-zinc-650 dark:text-zinc-400',
      label: 'Cancelled',
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
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
      {style.label}
    </span>
  );
}
