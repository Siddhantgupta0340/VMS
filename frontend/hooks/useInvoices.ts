'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import apiClient from '@/lib/axios';
import type {
  Invoice,
  CreateInvoicePayload,
  InvoiceListResponse,
  ApprovalLog,
} from '@/types/invoice';

export const INVOICE_QUERY_KEYS = {
  all: ['invoices'] as const,
  list: (params?: object) => ['invoices', 'list', params] as const,
  pending: (level: string, params?: object) => ['invoices', 'pending', level, params] as const,
  detail: (id: string) => ['invoices', 'detail', id] as const,
  history: (id: string) => ['invoices', 'history', id] as const,
};

// ─── API Requests ────────────────────────────────────────────────────────────

const createInvoice = async (payload: CreateInvoicePayload) => {
  const response = await apiClient.post<{ success: boolean; data: Invoice }>('/invoices', payload);
  return response.data.data;
};

const getInvoices = async (params?: object) => {
  const response = await apiClient.get<InvoiceListResponse>('/invoices', { params });
  return response.data;
};

const getInvoiceById = async (id: string) => {
  const response = await apiClient.get<{ success: boolean; data: Invoice }>(`/invoices/${id}`);
  return response.data.data;
};

const approveInvoice = async ({ id, remarks }: { id: string; remarks?: string }) => {
  const response = await apiClient.patch<{ success: boolean; data: Invoice }>(
    `/invoices/${id}/approve`,
    { remarks }
  );
  return response.data.data;
};

const rejectInvoice = async ({ id, rejectionReason }: { id: string; rejectionReason: string }) => {
  const response = await apiClient.patch<{ success: boolean; data: Invoice }>(
    `/invoices/${id}/reject`,
    { rejectionReason }
  );
  return response.data.data;
};

const cancelInvoice = async ({ id, remarks }: { id: string; remarks?: string }) => {
  const response = await apiClient.patch<{ success: boolean; data: Invoice }>(
    `/invoices/${id}/cancel`,
    { remarks }
  );
  return response.data.data;
};

const getPendingInvoices = async (level: 'l1' | 'l2' | 'l3' | 'my', params?: object) => {
  const endpoint = level === 'my' ? '/invoices/my/pending' : `/invoices/pending/${level}`;
  const response = await apiClient.get<InvoiceListResponse>(endpoint, { params });
  return response.data;
};

const getMyApprovedInvoices = async (params?: object) => {
  const response = await apiClient.get<InvoiceListResponse>('/invoices/my/approved', { params });
  return response.data;
};

const getInvoiceHistory = async (id: string) => {
  const response = await apiClient.get<{ success: boolean; data: ApprovalLog[] }>(
    `/invoices/${id}/history`
  );
  return response.data.data;
};

// ─── React Query Hooks ────────────────────────────────────────────────────────

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createInvoice,
    onSuccess: () => {
      toast.success('Invoice created successfully.');
      queryClient.invalidateQueries({ queryKey: INVOICE_QUERY_KEYS.all });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to create invoice.');
    },
  });
}

export function useInvoices(params?: object) {
  return useQuery({
    queryKey: INVOICE_QUERY_KEYS.list(params),
    queryFn: () => getInvoices(params),
  });
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: INVOICE_QUERY_KEYS.detail(id),
    queryFn: () => getInvoiceById(id),
    enabled: !!id,
  });
}

export function useApproveInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: approveInvoice,
    onSuccess: (data) => {
      toast.success(data.status === 'APPROVED' ? 'Invoice fully approved!' : 'Invoice approved at current level.');
      queryClient.invalidateQueries({ queryKey: INVOICE_QUERY_KEYS.all });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Approval failed.');
    },
  });
}

export function useRejectInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: rejectInvoice,
    onSuccess: () => {
      toast.success('Invoice rejected successfully.');
      queryClient.invalidateQueries({ queryKey: INVOICE_QUERY_KEYS.all });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Rejection failed.');
    },
  });
}

export function useCancelInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelInvoice,
    onSuccess: () => {
      toast.success('Invoice cancelled successfully.');
      queryClient.invalidateQueries({ queryKey: INVOICE_QUERY_KEYS.all });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Cancellation failed.');
    },
  });
}

export function usePendingInvoices(level: 'l1' | 'l2' | 'l3' | 'my', params?: object) {
  return useQuery({
    queryKey: INVOICE_QUERY_KEYS.pending(level, params),
    queryFn: () => getPendingInvoices(level, params),
  });
}

export function useMyApprovedInvoices(params?: object) {
  return useQuery({
    queryKey: INVOICE_QUERY_KEYS.pending('approved', params),
    queryFn: () => getMyApprovedInvoices(params),
  });
}

export function useInvoiceHistory(id: string) {
  return useQuery({
    queryKey: INVOICE_QUERY_KEYS.history(id),
    queryFn: () => getInvoiceHistory(id),
    enabled: !!id,
  });
}
