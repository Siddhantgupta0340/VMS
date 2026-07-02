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
    PENDING_THREE_WAY_MATCH: {
      bg: 'bg-purple-50 dark:bg-purple-950/20',
      text: 'text-purple-700 dark:text-purple-400',
      label: 'Three-Way Match',
    },
    PENDING_ADMIN_REVIEW: {
      bg: 'bg-orange-50 dark:bg-orange-950/20',
      text: 'text-orange-700 dark:text-orange-400',
      label: 'Admin Review',
    },
    PENDING_TEAM_LEAD: {
      bg: 'bg-amber-50 dark:bg-amber-950/20',
      text: 'text-amber-700 dark:text-amber-400',
      label: 'Team Lead Approval',
    },
    PENDING_MANAGER: {
      bg: 'bg-blue-50 dark:bg-blue-950/20',
      text: 'text-blue-700 dark:text-blue-400',
      label: 'Manager Approval',
    },
    PENDING_FINANCE_HEAD: {
      bg: 'bg-teal-50 dark:bg-teal-950/20',
      text: 'text-teal-700 dark:text-teal-400',
      label: 'Finance Head Approval',
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
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {style.label}
    </span>
  );
}
