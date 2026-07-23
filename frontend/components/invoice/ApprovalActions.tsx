import React, { useState } from 'react';
import { Invoice } from '@/types/invoice';
import {
  useApproveInvoice,
  useRejectInvoice,
  useCancelInvoice,
} from '@/hooks/useInvoices';
import RemarksDialog from './RemarksDialog';
import { Check, X, Ban } from 'lucide-react';

interface ApprovalActionsProps {
  invoice: Invoice;
  currentUser: {
    id: string;
    role: string;
  };
}

export default function ApprovalActions({ invoice, currentUser }: ApprovalActionsProps) {
  const approveMutation = useApproveInvoice();
  const rejectMutation = useRejectInvoice();
  const cancelMutation = useCancelInvoice();

  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);

  const currentLevel = invoice.current_approval_level;
  const isPending = !!currentLevel;

  // Render rules:
  // 1. User role must match current pending approval level to Approve/Reject
  const canApproveOrReject = isPending && currentUser.role === currentLevel;

  // 2. Creator can Cancel if still in pending queue
  const canCancel =
    isPending &&
    (invoice.created_by_id === currentUser.id);

  if (!canApproveOrReject && !canCancel) {
    return null;
  }

  const handleApprove = (remarks: string) => {
    approveMutation.mutate(
      { id: invoice.id, remarks },
      {
        onSuccess: () => setIsApproveOpen(false),
      }
    );
  };

  const handleReject = (rejectionReason: string) => {
    rejectMutation.mutate(
      { id: invoice.id, rejectionReason },
      {
        onSuccess: () => setIsRejectOpen(false),
      }
    );
  };

  const handleCancel = (remarks: string) => {
    cancelMutation.mutate(
      { id: invoice.id, remarks },
      {
        onSuccess: () => setIsCancelOpen(false),
      }
    );
  };

  const isAnyMutationPending =
    approveMutation.isPending || rejectMutation.isPending || cancelMutation.isPending;

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 border border-gray-150 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/30 rounded-2xl">
      {canApproveOrReject && (
        <>
          <button
            type="button"
            className="flex-1 min-w-35 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-500/10 disabled:opacity-50"
            onClick={() => setIsApproveOpen(true)}
            disabled={isAnyMutationPending}
          >
            <Check className="h-4.5 w-4.5" />
            Approve Invoice
          </button>

          <button
            type="button"
            className="flex-1 min-w-35 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm shadow-rose-500/10 disabled:opacity-50"
            onClick={() => setIsRejectOpen(true)}
            disabled={isAnyMutationPending}
          >
            <X className="h-4.5 w-4.5" />
            Reject Invoice
          </button>
        </>
      )}

      {canCancel && (
        <button
          type="button"
          className="px-4 py-2.5 border border-gray-300 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 font-semibold text-sm rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-50"
          onClick={() => setIsCancelOpen(true)}
          disabled={isAnyMutationPending}
        >
          <Ban className="h-4.5 w-4.5 text-gray-400" />
          Cancel Invoice
        </button>
      )}

      {/* Modal Dialogs */}
      <RemarksDialog
        isOpen={isApproveOpen}
        onClose={() => setIsApproveOpen(false)}
        onSubmit={handleApprove}
        title="Approve Invoice"
        placeholder="Enter optional remarks for this approval (e.g. Approved after reviewing PO)..."
        submitButtonText="Confirm Approval"
        submitButtonColor="bg-emerald-600 hover:bg-emerald-700"
        isPending={approveMutation.isPending}
      />

      <RemarksDialog
        isOpen={isRejectOpen}
        onClose={() => setIsRejectOpen(false)}
        onSubmit={handleReject}
        title="Reject Invoice"
        placeholder="Enter the mandatory reason for rejecting this invoice..."
        submitButtonText="Confirm Rejection"
        submitButtonColor="bg-rose-600 hover:bg-rose-700"
        isPending={rejectMutation.isPending}
        isRequired={true}
      />

      <RemarksDialog
        isOpen={isCancelOpen}
        onClose={() => setIsCancelOpen(false)}
        onSubmit={handleCancel}
        title="Cancel Invoice"
        placeholder="Enter optional comments for cancelling this invoice..."
        submitButtonText="Confirm Cancellation"
        submitButtonColor="bg-gray-700 hover:bg-gray-800 dark:bg-zinc-700 dark:hover:bg-zinc-800"
        isPending={cancelMutation.isPending}
      />
    </div>
  );
}
