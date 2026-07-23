import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/axios';
import type {
  Invoice,
  InvoiceListResponse,
  ThreeWayMatch,
  GoodsReceiptNote,
} from '@/types/invoice';

// ─── Query Keys ───────────────────────────────────────────────────────────────
export const invoiceKeys = {
  all:              () => ['invoices'],
  lists:            () => [...invoiceKeys.all(), 'list'],
  list:             (filters: Record<string, unknown>) => [...invoiceKeys.lists(), filters],
  details:          () => [...invoiceKeys.all(), 'detail'],
  detail:           (id: string) => [...invoiceKeys.details(), id],
  history:          (id: string) => [...invoiceKeys.detail(id), 'history'],
  pending:          (level: string) => [...invoiceKeys.all(), 'pending', level],
  myPending:        () => [...invoiceKeys.all(), 'my-pending'],
  myApproved:       () => [...invoiceKeys.all(), 'my-approved'],
  observation:      () => [...invoiceKeys.all(), 'finance-head-observation'],
  matching:         (invoiceId: string) => [...invoiceKeys.detail(invoiceId), 'matching'],
};

// ─── LIST INVOICES ────────────────────────────────────────────────────────────
export function useInvoices(filters: Record<string, unknown> = {}) {
  return useQuery<InvoiceListResponse>({
    queryKey: invoiceKeys.list(filters),
    queryFn:  async () => {
      const { data } = await apiClient.get('/invoices', { params: filters });
      return data;
    },
  });
}

// ─── GET SINGLE INVOICE ───────────────────────────────────────────────────────
export function useInvoice(id: string) {
  return useQuery<{ success: boolean; data: Invoice }>({
    queryKey: invoiceKeys.detail(id),
    queryFn:  async () => {
      const { data } = await apiClient.get(`/invoices/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

// ─── APPROVAL HISTORY ─────────────────────────────────────────────────────────
export function useInvoiceHistory(id: string) {
  return useQuery<{ success: boolean; data: unknown[] }>({
    queryKey: invoiceKeys.history(id),
    queryFn:  async () => {
      const { data } = await apiClient.get(`/invoices/${id}/history`);
      return data;
    },
    enabled: !!id,
  });
}

// ─── PENDING QUEUES ───────────────────────────────────────────────────────────

export function usePendingThreeWayMatch(params = {}) {
  return useQuery<InvoiceListResponse>({
    queryKey: invoiceKeys.pending('three-way-match'),
    queryFn:  async () => {
      const { data } = await apiClient.get('/invoices/pending/three-way-match', { params });
      return data;
    },
  });
}

// usePendingAdminReview removed.

/** Formerly useGetPendingL1 */
export function usePendingTeamLead(params = {}) {
  return useQuery<InvoiceListResponse>({
    queryKey: invoiceKeys.pending('team-lead'),
    queryFn:  async () => {
      const { data } = await apiClient.get('/invoices/pending/team-lead', { params });
      return data;
    },
  });
}

/** Formerly useGetPendingL2 */
export function usePendingManager(params = {}) {
  return useQuery<InvoiceListResponse>({
    queryKey: invoiceKeys.pending('manager'),
    queryFn:  async () => {
      const { data } = await apiClient.get('/invoices/pending/manager', { params });
      return data;
    },
  });
}

/** Formerly useGetPendingL3 */
export function usePendingFinanceHead(params = {}) {
  return useQuery<InvoiceListResponse>({
    queryKey: invoiceKeys.pending('finance-head'),
    queryFn:  async () => {
      const { data } = await apiClient.get('/invoices/pending/finance-head', { params });
      return data;
    },
  });
}

export function useMyPendingInvoices(params = {}) {
  return useQuery<InvoiceListResponse>({
    queryKey: invoiceKeys.myPending(),
    queryFn:  async () => {
      const { data } = await apiClient.get('/invoices/my/pending', { params });
      return data;
    },
  });
}

export function useMyApprovedInvoices(params = {}) {
  return useQuery<InvoiceListResponse>({
    queryKey: invoiceKeys.myApproved(),
    queryFn:  async () => {
      const { data } = await apiClient.get('/invoices/my/approved', { params });
      return data;
    },
  });
}

// ─── FINANCE HEAD OBSERVATION ─────────────────────────────────────────────────
export function useFinanceHeadObservation(params = {}) {
  return useQuery<InvoiceListResponse>({
    queryKey: invoiceKeys.observation(),
    queryFn:  async () => {
      const { data } = await apiClient.get('/invoices/observation', { params });
      return data;
    },
  });
}

// ─── MUTATIONS ────────────────────────────────────────────────────────────────

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await apiClient.post('/invoices', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.pending('three-way-match') });
    },
  });
}

export function useApproveInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, remarks }: { id: string; remarks?: string }) => {
      const { data } = await apiClient.patch(`/invoices/${id}/approve`, { remarks });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.myPending() });
    },
  });
}

export function useRejectInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, rejectionReason, remarks }: { id: string; rejectionReason: string; remarks?: string }) => {
      const { data } = await apiClient.patch(`/invoices/${id}/reject`, { rejectionReason, remarks });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });
}

export function useCancelInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, remarks }: { id: string; remarks?: string }) => {
      const { data } = await apiClient.patch(`/invoices/${id}/cancel`, { remarks });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });
}

// Admin Review mutations removed.

// Soft Delete & Restore
export function useDeleteInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, deleteReason }: { id: string; deleteReason: string }) => {
      const { data } = await apiClient.delete(`/invoices/${id}`, { data: { deleteReason } });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(variables.id) });
    },
  });
}

export function useRestoreInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { data } = await apiClient.post(`/invoices/${id}/restore`);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(variables.id) });
    },
  });
}

// Finance Head remark
export function useAddFinanceHeadRemark() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, remark }: { id: string; remark: string }) => {
      const { data } = await apiClient.post(`/invoices/${id}/remark`, { remark });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.history(variables.id) });
    },
  });
}

// ─── THREE-WAY MATCHING HOOKS ─────────────────────────────────────────────────

export function useInvoiceMatching(invoiceId: string) {
  return useQuery<{ success: boolean; data: ThreeWayMatch[] }>({
    queryKey: invoiceKeys.matching(invoiceId),
    queryFn:  async () => {
      const { data } = await apiClient.get(`/three-way-matching/invoice/${invoiceId}`);
      return data;
    },
    enabled: !!invoiceId,
  });
}

export function useStartMatching() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { invoiceId: string; grnId?: string }) => {
      const { data } = await apiClient.post('/three-way-matching/start', payload);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(variables.invoiceId) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.matching(variables.invoiceId) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.pending('three-way-match') });
    },
  });
}

// ─── GRN HOOKS ────────────────────────────────────────────────────────────────

export const grnKeys = {
  all: () => ['grns'],
  byPO: (poId: string) => ['grns', 'by-po', poId],
  detail: (id: string) => ['grns', id],
};

export function useGRNsByPurchaseOrder(poId: string) {
  return useQuery<{ success: boolean; data: GoodsReceiptNote[] }>({
    queryKey: grnKeys.byPO(poId),
    queryFn:  async () => {
      const { data } = await apiClient.get(`/three-way-matching/grn/by-po/${poId}`);
      return data;
    },
    enabled: !!poId,
  });
}

export function useCreateGRN() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await apiClient.post('/three-way-matching/grn', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: grnKeys.all() });
    },
  });
}

/** Unified pending invoices fetch hook */
export function usePendingInvoices(level: string, params: Record<string, unknown> = {}) {
  return useQuery<InvoiceListResponse>({
    queryKey: invoiceKeys.pending(level),
    queryFn: async () => {
      let url = '/invoices/my/pending';
      const lvl = String(level || 'my').toLowerCase();
      if (lvl === 'team-lead') {
        url = '/invoices/pending/team-lead';
      } else if (lvl === 'manager') {
        url = '/invoices/pending/manager';
      } else if (lvl === 'finance-head') {
        url = '/invoices/pending/finance-head';
      } else if (lvl === 'three-way-match' || lvl === '3wm') {
        url = '/invoices/pending/three-way-match';
      }
      const { data } = await apiClient.get(url, { params });
      return data;
    },
  });
}
