import React from 'react';
import { Invoice } from '@/types/invoice';
import { format } from 'date-fns';
import {
  CheckCircle2,
  XCircle,
  Clock,
  User,
  MessageSquare,
  MinusCircle,
  Ban,
} from 'lucide-react';

interface ApprovalTimelineProps {
  invoice: Invoice;
}

interface TimelineStep {
  key: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  approverName?: string | null;
  date?: string | null;
  description?: string | null;
  remarks?: string | null;
  status?: string;
}

export default function ApprovalTimeline({ invoice }: ApprovalTimelineProps) {
  const amount = invoice.amount;
  const requiresL2 = amount > 10000;
  const requiresL3 = amount > 100000;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    try {
      return format(new Date(dateStr), 'MMM d, yyyy h:mm a');
    } catch {
      return dateStr;
    }
  };

  // Helper to determine status icon and styling for L1/L2/L3 steps
  const getStepDetails = (
    level: 'L1' | 'L2' | 'L3',
    approver: any,
    approvedAt: string | null,
    remarks: string | null
  ) => {
    const isL2Required = requiresL2;
    const isL3Required = requiresL3;

    if (level === 'L2' && !isL2Required) {
      return {
        status: 'not_required',
        color: 'text-gray-400 border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900',
        icon: <MinusCircle className="h-5 w-5 text-gray-400" />,
        title: 'Level 2 Approval (Not Required)',
        description: 'Invoice amount is ₹10,000 or below.',
        approverName: null,
        date: null,
        remarks: null,
      };
    }

    if (level === 'L3' && !isL3Required) {
      return {
        status: 'not_required',
        color: 'text-gray-400 border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900',
        icon: <MinusCircle className="h-5 w-5 text-gray-400" />,
        title: 'Level 3 Approval (Not Required)',
        description: 'Invoice amount is ₹100,000 or below.',
        approverName: null,
        date: null,
        remarks: null,
      };
    }

    if (approvedAt) {
      return {
        status: 'approved',
        color: 'text-emerald-600 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20',
        icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
        title: `Level ${level} Approved`,
        approverName: approver
          ? `${approver.first_name || ''} ${approver.last_name || ''}`.trim() || approver.email
          : 'Approver',
        date: formatDate(approvedAt),
        remarks,
        description: null,
      };
    }

    // Check if rejected at this level
    if (invoice.status === 'REJECTED' && invoice.rejected_by?.role === level) {
      return {
        status: 'rejected',
        color: 'text-rose-600 border-rose-500 bg-rose-50 dark:bg-rose-950/20',
        icon: <XCircle className="h-5 w-5 text-rose-600" />,
        title: `Level ${level} Rejected`,
        approverName: invoice.rejected_by
          ? `${invoice.rejected_by.first_name || ''} ${invoice.rejected_by.last_name || ''}`.trim() || invoice.rejected_by.email
          : 'Approver',
        date: formatDate(invoice.rejected_at),
        remarks: invoice.rejection_reason,
        description: null,
      };
    }

    // Check if it is currently waiting at this level
    const isCurrentLevel = invoice.current_approval_level === level;

    if (isCurrentLevel && invoice.status !== 'REJECTED' && invoice.status !== 'CANCELLED') {
      return {
        status: 'pending',
        color: 'text-amber-600 border-amber-500 bg-amber-50 dark:bg-amber-950/10 ring-4 ring-amber-100 dark:ring-amber-900/30',
        icon: <Clock className="h-5 w-5 text-amber-600 animate-pulse" />,
        title: `Pending Level ${level} Approval`,
        description: `Awaiting action from a Level ${level} Manager.`,
        approverName: null,
        date: null,
        remarks: null,
      };
    }

    return {
      status: 'upcoming',
      color: 'text-gray-400 border-gray-200 bg-white dark:bg-zinc-950',
      icon: <Clock className="h-5 w-5 text-gray-300" />,
      title: `Level ${level} Approval`,
      description: 'Waiting for previous levels to complete.',
      approverName: null,
      date: null,
      remarks: null,
    };
  };

  const steps: TimelineStep[] = [
    {
      key: 'submit',
      title: 'Invoice Submitted',
      icon: <CheckCircle2 className="h-5 w-5 text-indigo-600" />,
      color: 'text-indigo-600 border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20',
      approverName: invoice.created_by
        ? `${invoice.created_by.first_name || ''} ${invoice.created_by.last_name || ''}`.trim() || invoice.created_by.email
        : 'Vendor Relations',
      date: formatDate(invoice.created_at),
      description: `Invoice uploaded for amount ${invoice.currency} ${amount.toLocaleString('en-IN')}.`,
      remarks: null,
      status: 'approved',
    },
    {
      key: 'L1',
      ...getStepDetails('L1', invoice.l1_approver, invoice.l1_approved_at, invoice.l1_remarks),
    },
    {
      key: 'L2',
      ...getStepDetails('L2', invoice.l2_approver, invoice.l2_approved_at, invoice.l2_remarks),
    },
    {
      key: 'L3',
      ...getStepDetails('L3', invoice.l3_approver, invoice.l3_approved_at, invoice.l3_remarks),
    },
  ];

  const isApproved = invoice.status === 'APPROVED';
  const isRejected = invoice.status === 'REJECTED';
  const isCancelled = invoice.status === 'CANCELLED';

  return (
    <div className="flow-root py-4">
      <ul className="-mb-8">
        {steps.map((step, stepIdx) => (
          <li key={step.key}>
            <div className="relative pb-8">
              {stepIdx !== steps.length - 1 && (
                <span
                  className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-250 dark:bg-zinc-800"
                  aria-hidden="true"
                />
              )}
              <div className="relative flex space-x-3">
                <div>
                  <span
                    className={`h-9 w-9 rounded-full flex items-center justify-center border-2 ${step.color}`}
                  >
                    {step.icon}
                  </span>
                </div>
                <div className="flex-1 min-w-0 pt-1.5 flex justify-between space-x-4">
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-zinc-50">
                      {step.title}
                    </p>
                    {step.approverName && (
                      <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5 flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {step.approverName}
                      </p>
                    )}
                    {step.description && (
                      <p className="text-xs text-gray-600 dark:text-zinc-300 mt-1">
                        {step.description}
                      </p>
                    )}
                    {step.remarks && (
                      <div className="mt-1.5 rounded-lg bg-gray-50 dark:bg-zinc-900/50 p-2 border border-gray-100 dark:border-zinc-850 flex items-start gap-1.5 text-xs text-gray-600 dark:text-zinc-300 italic">
                        <MessageSquare className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />
                        <span>"{step.remarks}"</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right text-xs whitespace-nowrap text-gray-500 dark:text-zinc-550">
                    <time>{step.date}</time>
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}

        {/* Final Status Step (Only if resolved: Approved, Rejected, or Cancelled) */}
        {(isApproved || isRejected || isCancelled) && (
          <li>
            <div className="relative pb-8">
              <div className="relative flex space-x-3">
                <div>
                  <span
                    className={`h-9 w-9 rounded-full flex items-center justify-center border-2 ${
                      isApproved
                        ? 'text-emerald-600 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20'
                        : isRejected
                        ? 'text-rose-600 border-rose-500 bg-rose-50 dark:bg-rose-950/20'
                        : 'text-zinc-500 border-zinc-400 bg-zinc-50 dark:bg-zinc-850'
                    }`}
                  >
                    {isApproved ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    ) : isRejected ? (
                      <XCircle className="h-5 w-5 text-rose-600" />
                    ) : (
                      <Ban className="h-5 w-5 text-zinc-500" />
                    )}
                  </span>
                </div>
                <div className="flex-1 min-w-0 pt-1.5 flex justify-between space-x-4">
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-zinc-50">
                      {isApproved
                        ? 'Approved & Ready for Payment'
                        : isRejected
                        ? 'Invoice Terminated (Rejected)'
                        : 'Invoice Cancelled'}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-zinc-300 mt-1">
                      {isApproved
                        ? 'This invoice has passed all required approval checks and is queued for payment.'
                        : isRejected
                        ? `Rejected by ${
                            invoice.rejected_by
                              ? `${invoice.rejected_by.first_name || ''} ${invoice.rejected_by.last_name || ''}`.trim()
                              : 'Manager'
                          }.`
                        : 'This invoice was cancelled and will not proceed.'}
                    </p>
                  </div>
                  <div className="text-right text-xs whitespace-nowrap text-gray-500 dark:text-zinc-550">
                    <time>
                      {formatDate(
                        isApproved
                          ? invoice.final_approved_at
                          : isRejected
                          ? invoice.rejected_at
                          : invoice.cancelled_at
                      )}
                    </time>
                  </div>
                </div>
              </div>
            </div>
          </li>
        )}
      </ul>
    </div>
  );
}
