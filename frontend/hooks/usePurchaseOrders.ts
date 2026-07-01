'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import apiClient from '@/lib/axios';
import type {
  CreatePurchaseOrderPayload,
  CreatePurchaseOrderResponse,
  PurchaseOrderListResponse,
} from '@/types/purchase-order';

// ─── Query Keys ───────────────────────────────────────────────────────────────
export const PO_QUERY_KEYS = {
  all: ['purchase-orders'] as const,
  list: (params?: object) => ['purchase-orders', 'list', params] as const,
  detail: (id: string) => ['purchase-orders', 'detail', id] as const,
};

// ─── API Functions ─────────────────────────────────────────────────────────────

/**
 * Creates a new Purchase Order.
 * Sends a POST request with JSON body to /api/v1/purchase-orders.
 */
const createPurchaseOrder = async (
  payload: CreatePurchaseOrderPayload
): Promise<CreatePurchaseOrderResponse> => {
  const response = await apiClient.post<CreatePurchaseOrderResponse>(
    '/purchase-orders',
    payload
  );
  return response.data;
};

/**
 * Fetches a paginated list of Purchase Orders.
 */
const getPurchaseOrders = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
  vendorId?: string;
}): Promise<PurchaseOrderListResponse> => {
  const response = await apiClient.get<PurchaseOrderListResponse>('/purchase-orders', {
    params,
  });
  return response.data;
};

// ─── Hooks ─────────────────────────────────────────────────────────────────────

/**
 * useCreatePurchaseOrder
 *
 * React Query mutation hook for creating a Purchase Order.
 * - On success: shows a success toast and invalidates the PO list cache.
 * - On error: shows an error toast with the API message.
 */
export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation<
    CreatePurchaseOrderResponse,
    Error,
    CreatePurchaseOrderPayload
  >({
    mutationFn: createPurchaseOrder,
    onSuccess: (data) => {
      toast.success(data.message || 'Purchase order created successfully!');
      // Invalidate the list so it refetches
      queryClient.invalidateQueries({ queryKey: PO_QUERY_KEYS.all });
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to create purchase order. Please try again.';
      toast.error(message);
    },
  });
}

/**
 * usePurchaseOrders
 *
 * React Query hook for listing Purchase Orders with pagination.
 */
export function usePurchaseOrders(params?: {
  page?: number;
  limit?: number;
  status?: string;
  vendorId?: string;
}) {
  return useQuery({
    queryKey: PO_QUERY_KEYS.list(params),
    queryFn: () => getPurchaseOrders(params),
  });
}
