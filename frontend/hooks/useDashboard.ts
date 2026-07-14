'use client';

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/axios';

export interface DashboardStats {
  success: boolean;
  message: string;
  data: {
    vendorStats: {
      total: number;
      pending: number;
      approved: number;
      rejected: number;
      blocked: number;
    };
    purchaseOrderStats: {
      total: number;
      pending: number;
      open: number;
      closed: number;
      cancelled: number;
      totalValue: number;
    };
    invoiceStats: {
      total: number;
      pending: number;
      approved: number;
      rejected: number;
      pendingByLevel: {
        TEAM_LEAD?: number;
        MANAGER?: number;
        FINANCE_HEAD?: number;
        PENDING_THREE_WAY_MATCH?: number;
      };
      totalInvoiceAmount: number;
      totalPaidAmount: number;
      remainingOutstanding: number;
      partiallyPaidInvoices: number;
    };
    paymentStats: {
      total: number;
      pending: number;
      success: number;
      failed: number;
      cancelled: number;
      refunded: number;
    };
    recentActivity: Array<{
      id: string;
      entity_type: string;
      entity_id: string;
      action: string;
      from_status: string | null;
      to_status: string | null;
      remarks: string | null;
      created_at: string;
      performed_by?: {
        id: string;
        email: string;
        first_name: string | null;
        last_name: string | null;
        role: string;
      };
    }>;
    pendingCounts?: Record<string, number>;
  };
}

const getMyDashboard = async () => {
  const response = await apiClient.get<DashboardStats>('/dashboard/me');
  return response.data;
};

const getDashboardOverview = async () => {
  const response = await apiClient.get<DashboardStats>('/dashboard/overview');
  return response.data;
};

export function useMyDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'me'],
    queryFn: getMyDashboard,
  });
}

export function useDashboardOverview() {
  return useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: getDashboardOverview,
  });
}
