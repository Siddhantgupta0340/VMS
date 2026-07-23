'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import apiClient from '@/lib/axios';
import type {
  Payment,
  CreatePaymentPayload,
  UpdatePaymentPayload,
  PaymentListResponse,
} from '@/types/payment';

export const PAYMENT_QUERY_KEYS = {
  all: ['payments'] as const,
  list: (params?: Record<string, string | number | boolean | undefined>) => ['payments', 'list', params] as const,
  pending: (params?: Record<string, string | number | boolean | undefined>) => ['payments', 'pending', params] as const,
  completed: (params?: Record<string, string | number | boolean | undefined>) => ['payments', 'completed', params] as const,
  detail: (id: string) => ['payments', 'detail', id] as const,
  history: (id: string) => ['payments', 'history', id] as const,
};

interface ErrorResponse {
  response?: {
    data?: {
      message?: string;
    };
  };
}

// ─── API Requests ────────────────────────────────────────────────────────────

const createPayment = async (payload: CreatePaymentPayload) => {
  const response = await apiClient.post<{ success: boolean; data: Payment }>('/payments', payload);
  return response.data.data;
};

const updatePayment = async ({ id, payload }: { id: string; payload: UpdatePaymentPayload }) => {
  const response = await apiClient.put<{ success: boolean; data: Payment }>(`/payments/${id}`, payload);
  return response.data.data;
};

const deletePayment = async (id: string) => {
  const response = await apiClient.delete<{ success: boolean }>(`/payments/${id}`);
  return response.data;
};

const getPayments = async (params?: Record<string, string | number | boolean | undefined>) => {
  const response = await apiClient.get<PaymentListResponse>('/payments', { params });
  return response.data;
};

const getPaymentById = async (id: string) => {
  const response = await apiClient.get<{ success: boolean; data: Payment }>(`/payments/${id}`);
  return response.data.data;
};

const approvePayment = async ({ id, remarks }: { id: string; remarks?: string }) => {
  const response = await apiClient.patch<{ success: boolean; data: Payment }>(
    `/payments/${id}/approve`,
    { remarks }
  );
  return response.data.data;
};

const rejectPayment = async ({ id, remarks }: { id: string; remarks?: string }) => {
  const response = await apiClient.patch<{ success: boolean; data: Payment }>(
    `/payments/${id}/reject`,
    { remarks }
  );
  return response.data.data;
};

const cancelPayment = async ({ id, remarks }: { id: string; remarks?: string }) => {
  const response = await apiClient.patch<{ success: boolean; data: Payment }>(
    `/payments/${id}/cancel`,
    { remarks }
  );
  return response.data.data;
};

const refundPayment = async ({ id, remarks }: { id: string; remarks?: string }) => {
  const response = await apiClient.patch<{ success: boolean; data: Payment }>(
    `/payments/${id}/refund`,
    { remarks }
  );
  return response.data.data;
};

const retryPayment = async (id: string) => {
  const response = await apiClient.post<{ success: boolean; data: Payment }>(`/payments/${id}/retry`);
  return response.data.data;
};

const getPendingPayments = async (params?: Record<string, string | number | boolean | undefined>) => {
  const response = await apiClient.get<PaymentListResponse>('/payments/pending', { params });
  return response.data;
};

const getCompletedPayments = async (params?: Record<string, string | number | boolean | undefined>) => {
  const response = await apiClient.get<PaymentListResponse>('/payments/completed', { params });
  return response.data;
};

interface PaymentLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  from_status: string | null;
  to_status: string | null;
  performed_by_id: string | null;
  remarks: string | null;
  created_at: string;
}

const getPaymentHistory = async (id: string) => {
  const response = await apiClient.get<{ success: boolean; data: PaymentLog[] }>(`/payments/${id}/history`);
  return response.data.data;
};

// ─── React Query Hooks ────────────────────────────────────────────────────────

export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPayment,
    onSuccess: () => {
      toast.success('Payment request submitted.');
      queryClient.invalidateQueries({ queryKey: PAYMENT_QUERY_KEYS.all });
    },
    onError: (err: unknown) => {
      const errMsg = (err as ErrorResponse)?.response?.data?.message;
      toast.error(errMsg || 'Failed to submit payment request.');
    },
  });
}

export function useUpdatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updatePayment,
    onSuccess: () => {
      toast.success('Payment details updated.');
      queryClient.invalidateQueries({ queryKey: PAYMENT_QUERY_KEYS.all });
    },
    onError: (err: unknown) => {
      const errMsg = (err as ErrorResponse)?.response?.data?.message;
      toast.error(errMsg || 'Update failed.');
    },
  });
}

export function useDeletePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePayment,
    onSuccess: () => {
      toast.success('Payment request deleted.');
      queryClient.invalidateQueries({ queryKey: PAYMENT_QUERY_KEYS.all });
    },
    onError: (err: unknown) => {
      const errMsg = (err as ErrorResponse)?.response?.data?.message;
      toast.error(errMsg || 'Delete failed.');
    },
  });
}

export function usePayments(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: PAYMENT_QUERY_KEYS.list(params),
    queryFn: () => getPayments(params),
  });
}

export function usePayment(id: string) {
  return useQuery({
    queryKey: PAYMENT_QUERY_KEYS.detail(id),
    queryFn: () => getPaymentById(id),
    enabled: !!id,
  });
}

export function useApprovePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: approvePayment,
    onSuccess: () => {
      toast.success('Payment approved and processing initiated.');
      queryClient.invalidateQueries({ queryKey: PAYMENT_QUERY_KEYS.all });
    },
    onError: (err: unknown) => {
      const errMsg = (err as ErrorResponse)?.response?.data?.message;
      toast.error(errMsg || 'Approval failed.');
    },
  });
}

export function useRejectPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: rejectPayment,
    onSuccess: () => {
      toast.success('Payment request rejected.');
      queryClient.invalidateQueries({ queryKey: PAYMENT_QUERY_KEYS.all });
    },
    onError: (err: unknown) => {
      const errMsg = (err as ErrorResponse)?.response?.data?.message;
      toast.error(errMsg || 'Rejection failed.');
    },
  });
}

export function useCancelPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelPayment,
    onSuccess: () => {
      toast.success('Payment cancelled.');
      queryClient.invalidateQueries({ queryKey: PAYMENT_QUERY_KEYS.all });
    },
    onError: (err: unknown) => {
      const errMsg = (err as ErrorResponse)?.response?.data?.message;
      toast.error(errMsg || 'Cancellation failed.');
    },
  });
}

export function useRefundPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: refundPayment,
    onSuccess: () => {
      toast.success('Payment refund processed successfully.');
      queryClient.invalidateQueries({ queryKey: PAYMENT_QUERY_KEYS.all });
    },
    onError: (err: unknown) => {
      const errMsg = (err as ErrorResponse)?.response?.data?.message;
      toast.error(errMsg || 'Refund failed.');
    },
  });
}

export function useRetryPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: retryPayment,
    onSuccess: () => {
      toast.success('Payment retry triggered.');
      queryClient.invalidateQueries({ queryKey: PAYMENT_QUERY_KEYS.all });
    },
    onError: (err: unknown) => {
      const errMsg = (err as ErrorResponse)?.response?.data?.message;
      toast.error(errMsg || 'Retry trigger failed.');
    },
  });
}

export function usePendingPayments(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: PAYMENT_QUERY_KEYS.pending(params),
    queryFn: () => getPendingPayments(params),
  });
}

export function useCompletedPayments(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: PAYMENT_QUERY_KEYS.completed(params),
    queryFn: () => getCompletedPayments(params),
  });
}

export function usePaymentHistory(id: string) {
  return useQuery({
    queryKey: PAYMENT_QUERY_KEYS.history(id),
    queryFn: () => getPaymentHistory(id),
    enabled: !!id,
  });
}
