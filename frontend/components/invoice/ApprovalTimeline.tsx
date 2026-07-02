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
  Shield,
  Activity,
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
  const requiresManager = amount > 10000;
  const requiresFinanceHead = amount > 100000;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    try {
      return format(new Date(dateStr), 'MMM d, yyyy h:mm a');
    } catch {
      return dateStr;
    }
  };

  const steps: TimelineStep[] = [
    // Step 1: Submission
    {
      key: 'submit',
      title: 'Invoice Submitted',
      icon: <CheckCircle2 className="h-5 w-5 text-indigo-650" />,
      color: 'text-indigo-600 border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20',
      approverName: invoice.created_by
        ? `${invoice.created_by.first_name || ''} ${invoice.created_by.last_name || ''}`.trim() || invoice.created_by.email
        : 'Vendor Relations',
      date: formatDate(invoice.created_at),
      description: `Invoice uploaded for amount ${invoice.currency} ${amount.toLocaleString('en-IN')}.`,
      remarks: null,
      status: 'approved',
    },

    // Step 2: Three-Way Matching
    {
      key: 'three-way-match',
      title: 'Three-Way Matching',
      icon: invoice.three_way_match_status === 'MATCHED' ? (
        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
      ) : invoice.three_way_match_status === 'UNMATCHED' ? (
        <XCircle className="h-5 w-5 text-rose-600" />
      ) : (
        <Activity className="h-5 w-5 text-purple-600 animate-pulse" />
      ),
      color: invoice.three_way_match_status === 'MATCHED'
        ? 'text-emerald-600 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20'
        : invoice.three_way_match_status === 'UNMATCHED'
        ? 'text-rose-600 border-rose-500 bg-rose-50 dark:bg-rose-950/20'
        : 'text-purple-600 border-purple-500 bg-purple-50 dark:bg-purple-950/10',
      approverName: invoice.matching_completed_by_id ? 'Case Manager' : null,
      date: formatDate(invoice.matching_completed_at),
      description: invoice.three_way_match_status === 'MATCHED'
        ? `Verification completed successfully (${invoice.three_way_match_percentage}% match).`
        : invoice.three_way_match_status === 'UNMATCHED'
        ? `Verification failed. Discrepancy found (${invoice.three_way_match_percentage || 0}% match).`
        : 'Awaiting Case Manager to run automated comparison of PO, GRN, and Invoice.',
      remarks: invoice.matching_remarks,
      status: invoice.three_way_match_status ? (invoice.three_way_match_status === 'MATCHED' ? 'approved' : 'rejected') : 'pending',
    },

    // Step 3: Admin Review
    {
      key: 'admin-review',
      title: 'Admin Match Review',
      icon: invoice.admin_review_status === 'APPROVED' ? (
        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
      ) : invoice.admin_review_status === 'REJECTED' ? (
        <XCircle className="h-5 w-5 text-rose-600" />
      ) : (
        <Shield className="h-5 w-5 text-orange-600" />
      ),
      color: invoice.admin_review_status === 'APPROVED'
        ? 'text-emerald-600 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20'
        : invoice.admin_review_status === 'REJECTED'
        ? 'text-rose-600 border-rose-500 bg-rose-50 dark:bg-rose-950/20'
        : 'text-orange-600 border-orange-500 bg-orange-50 dark:bg-orange-950/10',
      approverName: invoice.admin_review_status ? 'Super Admin' : null,
      date: formatDate(invoice.admin_reviewed_at),
      description: invoice.admin_review_status === 'APPROVED'
        ? 'Admin approved the matching report and pushed invoice to Team Lead approval.'
        : invoice.admin_review_status === 'REJECTED'
        ? 'Admin rejected matching report due to mismatches. Correction requested.'
        : 'Waiting for Admin to review and authorize the Three-Way Match results.',
      remarks: invoice.admin_remarks,
      status: invoice.admin_review_status ? (invoice.admin_review_status === 'APPROVED' ? 'approved' : 'rejected') : 'pending',
    },

    // Step 4: Team Lead Approval (Mandatory first role level)
    {
      key: 'team-lead',
      title: 'Team Lead Approval',
      icon: invoice.team_lead_approved_at ? (
        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
      ) : invoice.status === 'REJECTED' && invoice.rejected_by_id && invoice.current_approval_level === 'TEAM_LEAD' ? (
        <XCircle className="h-5 w-5 text-rose-600" />
      ) : (
        <Clock className="h-5 w-5 text-amber-600" />
      ),
      color: invoice.team_lead_approved_at
        ? 'text-emerald-600 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20'
        : invoice.status === 'REJECTED' && invoice.rejected_by_id && invoice.current_approval_level === 'TEAM_LEAD'
        ? 'text-rose-600 border-rose-500 bg-rose-50 dark:bg-rose-950/20'
        : 'text-amber-600 border-amber-500 bg-amber-50 dark:bg-amber-950/10',
      approverName: invoice.team_lead_approver
        ? `${invoice.team_lead_approver.first_name || ''} ${invoice.team_lead_approver.last_name || ''}`.trim() || invoice.team_lead_approver.email
        : null,
      date: formatDate(invoice.team_lead_approved_at),
      description: invoice.team_lead_approved_at
        ? 'Team Lead verified and approved.'
        : invoice.status === 'REJECTED' && invoice.current_approval_level === 'TEAM_LEAD'
        ? 'Rejected by Team Lead.'
        : invoice.current_approval_level === 'TEAM_LEAD'
        ? 'Awaiting review and approval from Team Lead.'
        : 'Pending previous workflow steps.',
      remarks: invoice.team_lead_remarks,
      status: invoice.team_lead_approved_at ? 'approved' : (invoice.current_approval_level === 'TEAM_LEAD' ? 'pending' : 'upcoming'),
    },

    // Step 5: Manager Approval (Amount > 10K)
    {
      key: 'manager',
      title: 'Manager Approval',
      icon: !requiresManager ? (
        <MinusCircle className="h-5 w-5 text-gray-400" />
      ) : invoice.manager_approved_at ? (
        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
      ) : invoice.status === 'REJECTED' && invoice.rejected_by_id && invoice.current_approval_level === 'MANAGER' ? (
        <XCircle className="h-5 w-5 text-rose-600" />
      ) : (
        <Clock className="h-5 w-5 text-amber-600" />
      ),
      color: !requiresManager
        ? 'text-gray-450 border-gray-250 bg-gray-50 dark:bg-zinc-900'
        : invoice.manager_approved_at
        ? 'text-emerald-600 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20'
        : 'text-amber-600 border-amber-500 bg-amber-50 dark:bg-amber-950/10',
      approverName: invoice.manager_approver
        ? `${invoice.manager_approver.first_name || ''} ${invoice.manager_approver.last_name || ''}`.trim() || invoice.manager_approver.email
        : null,
      date: formatDate(invoice.manager_approved_at),
      description: !requiresManager
        ? 'Not required (Amount is ≤ ₹10,000).'
        : invoice.manager_approved_at
        ? 'Manager verified and approved.'
        : invoice.status === 'REJECTED' && invoice.current_approval_level === 'MANAGER'
        ? 'Rejected by Manager.'
        : invoice.current_approval_level === 'MANAGER'
        ? 'Awaiting review and approval from Manager.'
        : 'Pending previous workflow steps.',
      remarks: invoice.manager_remarks,
      status: !requiresManager ? 'not_required' : (invoice.manager_approved_at ? 'approved' : (invoice.current_approval_level === 'MANAGER' ? 'pending' : 'upcoming')),
    },

    // Step 6: Finance Head Approval (Amount > 100K)
    {
      key: 'finance-head',
      title: 'Finance Head Approval',
      icon: !requiresFinanceHead ? (
        <MinusCircle className="h-5 w-5 text-gray-400" />
      ) : invoice.finance_head_approved_at ? (
        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
      ) : invoice.status === 'REJECTED' && invoice.rejected_by_id && invoice.current_approval_level === 'FINANCE_HEAD' ? (
        <XCircle className="h-5 w-5 text-rose-600" />
      ) : (
        <Clock className="h-5 w-5 text-amber-600" />
      ),
      color: !requiresFinanceHead
        ? 'text-gray-450 border-gray-250 bg-gray-50 dark:bg-zinc-900'
        : invoice.finance_head_approved_at
        ? 'text-emerald-600 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20'
        : 'text-amber-600 border-amber-500 bg-amber-50 dark:bg-amber-950/10',
      approverName: invoice.finance_head_approver
        ? `${invoice.finance_head_approver.first_name || ''} ${invoice.finance_head_approver.last_name || ''}`.trim() || invoice.finance_head_approver.email
        : null,
      date: formatDate(invoice.finance_head_approved_at),
      description: !requiresFinanceHead
        ? 'Not required (Amount is ≤ ₹1,00,000).'
        : invoice.finance_head_approved_at
        ? 'Finance Head verified and approved.'
        : invoice.status === 'REJECTED' && invoice.current_approval_level === 'FINANCE_HEAD'
        ? 'Rejected by Finance Head.'
        : invoice.current_approval_level === 'FINANCE_HEAD'
        ? 'Awaiting review and approval from Finance Head.'
        : 'Pending previous workflow steps.',
      remarks: invoice.finance_head_remarks,
      status: !requiresFinanceHead ? 'not_required' : (invoice.finance_head_approved_at ? 'approved' : (invoice.current_approval_level === 'FINANCE_HEAD' ? 'pending' : 'upcoming')),
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
                        ? `Rejected: ${invoice.rejection_reason || 'Discrepancy found in verification.'}`
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
