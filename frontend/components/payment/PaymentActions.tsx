import React, { useState } from 'react';
import { Payment } from '@/types/payment';
import {
  useApprovePayment,
  useRejectPayment,
  useCancelPayment,
  useRefundPayment,
  useRetryPayment,
  useDeletePayment,
} from '@/hooks/usePayments';
import RemarksDialog from './RemarksDialog';
import { Check, X, Ban, RefreshCw, Undo, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PaymentActionsProps {
  payment: Payment;
  currentUser: {
    id: string;
    role: string;
  };
  onEdit?: () => void;
}

export default function PaymentActions({ payment, currentUser, onEdit }: PaymentActionsProps) {
  const router = useRouter();
  
  const approveMutation = useApprovePayment();
  const rejectMutation = useRejectPayment();
  const cancelMutation = useCancelPayment();
  const refundMutation = useRefundPayment();
  const retryMutation = useRetryPayment();
  const deleteMutation = useDeletePayment();

  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isRefundOpen, setIsRefundOpen] = useState(false);

  const status = payment.status;
  const isPending = status === 'PENDING';
  const isFailed = status === 'FAILED';
  const isSuccess = status === 'SUCCESS';
  const isInitiated = status === 'INITIATED';

  const isFinanceOrAdmin = currentUser.role === 'FINANCE_MANAGER' || currentUser.role === 'SUPER_ADMIN';

  // Authorization Checkers
  const canApproveOrReject = isPending && isFinanceOrAdmin;
  const canRetry = isFailed && isFinanceOrAdmin;
  const canRefund = isSuccess && isFinanceOrAdmin;
  const canCancel = (isPending || isInitiated) && (payment.created_by_id === currentUser.id || isFinanceOrAdmin);
  const canEdit = isPending && (payment.created_by_id === currentUser.id || isFinanceOrAdmin);
  const canDelete = (isPending || status === 'CANCELLED') && (payment.created_by_id === currentUser.id || isFinanceOrAdmin);

  if (!canApproveOrReject && !canRetry && !canRefund && !canCancel && !canEdit && !canDelete) {
    return null;
  }

  const handleApprove = (remarks: string) => {
    approveMutation.mutate(
      { id: payment.id, remarks },
      { onSuccess: () => setIsApproveOpen(false) }
    );
  };

  const handleReject = (remarks: string) => {
    rejectMutation.mutate(
      { id: payment.id, remarks },
      { onSuccess: () => setIsRejectOpen(false) }
    );
  };

  const handleCancel = (remarks: string) => {
    cancelMutation.mutate(
      { id: payment.id, remarks },
      { onSuccess: () => setIsCancelOpen(false) }
    );
  };

  const handleRefund = (remarks: string) => {
    refundMutation.mutate(
      { id: payment.id, remarks },
      { onSuccess: () => setIsRefundOpen(false) }
    );
  };

  const handleRetry = () => {
    retryMutation.mutate(payment.id);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this payment request?')) {
      deleteMutation.mutate(payment.id, {
        onSuccess: () => {
          router.push('/payments/pending');
        },
      });
    }
  };

  const isAnyMutationPending =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    cancelMutation.isPending ||
    refundMutation.isPending ||
    retryMutation.isPending ||
    deleteMutation.isPending;

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 border border-gray-150 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/30 rounded-2xl">
      {canApproveOrReject && (
        <>
          <button
            type="button"
            className="flex-1 min-w-35 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
            onClick={() => setIsApproveOpen(true)}
            disabled={isAnyMutationPending}
          >
            <Check className="h-4.5 w-4.5" />
            Approve Payment
          </button>

          <button
            type="button"
            className="flex-1 min-w-35 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
            onClick={() => setIsRejectOpen(true)}
            disabled={isAnyMutationPending}
          >
            <X className="h-4.5 w-4.5" />
            Reject Request
          </button>
        </>
      )}

      {canRetry && (
        <button
          type="button"
          className="flex-1 min-w-35 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
          onClick={handleRetry}
          disabled={isAnyMutationPending}
        >
          <RefreshCw className={`h-4.5 w-4.5 ${retryMutation.isPending ? 'animate-spin' : ''}`} />
          Retry Payment Gateway
        </button>
      )}

      {canRefund && (
        <button
          type="button"
          className="flex-1 min-w-35 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
          onClick={() => setIsRefundOpen(true)}
          disabled={isAnyMutationPending}
        >
          <Undo className="h-4.5 w-4.5" />
          Process Refund
        </button>
      )}

      {canCancel && (
        <button
          type="button"
          className="px-4 py-2.5 border border-gray-350 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 font-semibold text-sm rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-50"
          onClick={() => setIsCancelOpen(true)}
          disabled={isAnyMutationPending}
        >
          <Ban className="h-4.5 w-4.5 text-gray-400" />
          Cancel Payment
        </button>
      )}

      {canEdit && onEdit && (
        <button
          type="button"
          className="px-4 py-2.5 border border-gray-350 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 font-semibold text-sm rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-50"
          onClick={onEdit}
          disabled={isAnyMutationPending}
        >
          Edit Details
        </button>
      )}

      {canDelete && (
        <button
          type="button"
          className="px-4 py-2.5 border border-rose-250 dark:border-rose-900/30 text-rose-600 dark:text-rose-450 hover:bg-rose-50 dark:hover:bg-rose-950/20 font-semibold text-sm rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-50"
          onClick={handleDelete}
          disabled={isAnyMutationPending}
        >
          <Trash2 className="h-4.5 w-4.5 text-rose-500" />
          Delete Request
        </button>
      )}

      {/* Action Modals */}
      <RemarksDialog
        isOpen={isApproveOpen}
        onClose={() => setIsApproveOpen(false)}
        onSubmit={handleApprove}
        title="Approve Payment Request"
        placeholder="Enter optional remarks for this approval (e.g. Authorized to release NEFT)..."
        submitButtonText="Confirm & Authorize"
        submitButtonColor="bg-emerald-600 hover:bg-emerald-700"
        isPending={approveMutation.isPending}
      />

      <RemarksDialog
        isOpen={isRejectOpen}
        onClose={() => setIsRejectOpen(false)}
        onSubmit={handleReject}
        title="Reject Payment Request"
        placeholder="Enter mandatory reason for rejecting this payment request..."
        submitButtonText="Reject Request"
        submitButtonColor="bg-rose-600 hover:bg-rose-700"
        isPending={rejectMutation.isPending}
        isRequired={true}
      />

      <RemarksDialog
        isOpen={isCancelOpen}
        onClose={() => setIsCancelOpen(false)}
        onSubmit={handleCancel}
        title="Cancel Payment Request"
        placeholder="Enter optional reason for cancelling this payment request..."
        submitButtonText="Cancel Payment"
        submitButtonColor="bg-gray-750 hover:bg-gray-800 dark:bg-zinc-700 dark:hover:bg-zinc-800"
        isPending={cancelMutation.isPending}
      />

      <RemarksDialog
        isOpen={isRefundOpen}
        onClose={() => setIsRefundOpen(false)}
        onSubmit={handleRefund}
        title="Process Refund"
        placeholder="Enter mandatory reason for processing this payment refund..."
        submitButtonText="Confirm Refund"
        submitButtonColor="bg-amber-600 hover:bg-amber-700"
        isPending={refundMutation.isPending}
        isRequired={true}
      />
    </div>
  );
}
