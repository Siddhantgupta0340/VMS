import dashboardRepository from './dashboard.repository.js';

class DashboardService {
  /**
   * Get full system-wide dashboard metrics (SUPER_ADMIN).
   */
  async getOverviewDashboard() {
    const [vendors, purchaseOrders, invoices, payments, recentActivity] = await Promise.all([
      dashboardRepository.getVendorStats(),
      dashboardRepository.getPurchaseOrderStats(),
      dashboardRepository.getInvoiceStats(),
      dashboardRepository.getPaymentStats(),
      dashboardRepository.getRecentActivity(10),
    ]);

    return {
      vendors,
      purchaseOrders,
      invoices,
      payments,
      recentActivity,
    };
  }

  /**
   * Get role-specific dashboard for a logged-in user.
   * Returns role-relevant metrics + overall summary.
   */
  async getRoleDashboard(user) {
    const [vendors, purchaseOrders, invoices, payments, recentActivity, pendingCounts] =
      await Promise.all([
        dashboardRepository.getVendorStats(),
        dashboardRepository.getPurchaseOrderStats(),
        dashboardRepository.getInvoiceStats(),
        dashboardRepository.getPaymentStats(),
        dashboardRepository.getRecentActivity(5),
        dashboardRepository.getPendingCountsForRole(user.role, user.id),
      ]);

    return {
      summary: {
        vendors,
        purchaseOrders,
        invoices,
        payments,
      },
      pendingActions: pendingCounts,
      recentActivity,
    };
  }
}

export default new DashboardService();
