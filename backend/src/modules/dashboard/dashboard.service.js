import dashboardRepository from './dashboard.repository.js';

class DashboardService {
  /**
   * Get full system-wide dashboard metrics (SUPER_ADMIN only).
   */
  async getOverviewDashboard() {
    const [vendors, purchaseOrders, invoices, payments, threeWayMatching, recentActivity] = await Promise.all([
      dashboardRepository.getVendorStats(),
      dashboardRepository.getPurchaseOrderStats(),
      dashboardRepository.getInvoiceStats(),
      dashboardRepository.getPaymentStats(),
      dashboardRepository.getThreeWayMatchStats(),
      dashboardRepository.getRecentActivity(10),
    ]);

    return {
      vendorStats: vendors,
      purchaseOrderStats: purchaseOrders,
      invoiceStats: invoices,
      paymentStats: payments,
      threeWayMatchingStats: threeWayMatching,
      recentActivity,
    };
  }

  /**
   * Get role-specific dashboard for logged-in user.
   * Returns role-relevant metrics + overall summary.
   */
  async getRoleDashboard(user) {
    const [vendors, purchaseOrders, invoices, payments, threeWayMatching, recentActivity, pendingCounts] =
      await Promise.all([
        dashboardRepository.getVendorStats(),
        dashboardRepository.getPurchaseOrderStats(),
        dashboardRepository.getInvoiceStats(),
        dashboardRepository.getPaymentStats(),
        dashboardRepository.getThreeWayMatchStats(),
        dashboardRepository.getRecentActivity(5),
        dashboardRepository.getPendingCountsForRole(user.role, user.id),
      ]);

    return {
      vendorStats: vendors,
      purchaseOrderStats: purchaseOrders,
      invoiceStats: invoices,
      paymentStats: payments,
      threeWayMatchingStats: threeWayMatching,
      pendingCounts,
      recentActivity,
    };
  }

  /**
   * Finance Head Observation Dashboard.
   * Comprehensive view of all tickets with workflow tracking.
   */
  async getFinanceHeadObservationDashboard() {
    const stats = await dashboardRepository.getFinanceHeadObservationStats();
    return stats;
  }
}

export default new DashboardService();
