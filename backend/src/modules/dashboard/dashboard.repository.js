import prisma from '../../config/prisma.js';

class DashboardRepository {
  /**
   * Get vendor counts grouped by status.
   */
  async getVendorStats() {
    const [total, pending, approved, rejected, blocked] = await Promise.all([
      prisma.vendor.count({ where: { deleted_at: null } }),
      prisma.vendor.count({ where: { deleted_at: null, status: 'pending' } }),
      prisma.vendor.count({ where: { deleted_at: null, status: 'approved' } }),
      prisma.vendor.count({ where: { deleted_at: null, status: 'rejected' } }),
      prisma.vendor.count({ where: { deleted_at: null, status: 'blocked' } }),
    ]);
    return { total, pending, approved, rejected, blocked };
  }

  /**
   * Get purchase order counts grouped by status + total value.
   */
  async getPurchaseOrderStats() {
    const [total, pending, open, closed, cancelled, totalValue] = await Promise.all([
      prisma.purchaseOrder.count(),
      prisma.purchaseOrder.count({ where: { status: 'pending' } }),
      prisma.purchaseOrder.count({ where: { status: 'open' } }),
      prisma.purchaseOrder.count({ where: { status: 'closed' } }),
      prisma.purchaseOrder.count({ where: { status: 'cancelled' } }),
      prisma.purchaseOrder.aggregate({ _sum: { amount: true } }),
    ]);
    return {
      total,
      pending,
      open,
      closed,
      cancelled,
      totalValue: Number(totalValue._sum.amount || 0),
    };
  }

  /**
   * Get invoice counts grouped by status + total value.
   */
  async getInvoiceStats() {
    const [
      total,
      pending,
      approved,
      rejected,
      pendingL1,
      pendingL2,
      pendingL3,
      totalInvoiceAmount,
      totalPaidAmount,
      remainingOutstanding,
      partiallyPaidInvoices
    ] = await Promise.all([
      prisma.invoice.count(),
      prisma.invoice.count({ where: { status: { in: ['pending', 'PENDING', 'PENDING_L1', 'PENDING_L2', 'PENDING_L3'] } } }),
      prisma.invoice.count({ where: { status: { in: ['approved', 'APPROVED'] } } }),
      prisma.invoice.count({ where: { status: { in: ['rejected', 'REJECTED'] } } }),
      prisma.invoice.count({ where: { status: { in: ['PENDING_L1', 'pending', 'PENDING'] }, required_approval_role: 'L1' } }),
      prisma.invoice.count({ where: { status: { in: ['PENDING_L2'] }, required_approval_role: 'L2' } }),
      prisma.invoice.count({ where: { status: { in: ['PENDING_L3'] }, required_approval_role: 'L3' } }),
      prisma.invoice.aggregate({ _sum: { invoice_total: true } }),
      prisma.invoice.aggregate({ _sum: { paid_amount: true } }),
      prisma.invoice.aggregate({ _sum: { remaining_amount: true } }),
      prisma.invoice.count({ where: { payment_status: 'PARTIALLY_PAID' } }),
    ]);

    return {
      total,
      pending,
      approved,
      rejected,
      pendingByLevel: { L1: pendingL1, L2: pendingL2, L3: pendingL3 },
      totalInvoiceAmount: Number(totalInvoiceAmount._sum.invoice_total || 0),
      totalPaidAmount: Number(totalPaidAmount._sum.paid_amount || 0),
      remainingOutstanding: Number(remainingOutstanding._sum.remaining_amount || 0),
      partiallyPaidInvoices,
    };
  }

  /**
   * Get payment counts grouped by status + total paid amount.
   */
  async getPaymentStats() {
    const [total, pending, success, failed, cancelled, refunded] = await Promise.all([
      prisma.payment.count(),
      prisma.payment.count({ where: { status: { in: ['pending', 'PENDING'] } } }),
      prisma.payment.count({ where: { status: { in: ['success', 'SUCCESS'] } } }),
      prisma.payment.count({ where: { status: { in: ['failed', 'FAILED'] } } }),
      prisma.payment.count({ where: { status: { in: ['cancelled', 'CANCELLED'] } } }),
      prisma.payment.count({ where: { status: { in: ['refunded', 'REFUNDED'] } } }),
    ]);
    return {
      total,
      pending,
      success,
      failed,
      cancelled,
      refunded,
    };
  }

  /**
   * Get the N most recent approval logs for activity feed.
   */
  async getRecentActivity(limit = 10) {
    return prisma.approvalLog.findMany({
      orderBy: { created_at: 'desc' },
      take: limit,
      include: {
        performed_by: {
          select: { id: true, email: true, first_name: true, last_name: true, role: true },
        },
      },
    });
  }

  /**
   * Get pending item counts scoped to a specific user/role.
   * Used to build role-specific dashboards.
   */
  async getPendingCountsForRole(role, userId) {
    const counts = {};

    if (role === 'CASE_MANAGER') {
      const [myVendors, myPOs, myInvoices, myPayments] = await Promise.all([
        prisma.vendor.count({ where: { created_by_id: userId, status: 'pending', deleted_at: null } }),
        prisma.purchaseOrder.count({ where: { created_by_id: userId, status: 'pending' } }),
        prisma.invoice.count({ where: { created_by_id: userId, status: 'pending' } }),
        prisma.payment.count({ where: { created_by_id: userId, status: 'pending' } }),
      ]);
      counts.myPendingVendors = myVendors;
      counts.myPendingPOs = myPOs;
      counts.myPendingInvoices = myInvoices;
      counts.myPendingPayments = myPayments;
    }

    if (role === 'FINANCE_MANAGER') {
      const [pendingVendors, pendingPayments] = await Promise.all([
        prisma.vendor.count({ where: { status: 'pending', deleted_at: null } }),
        prisma.payment.count({ where: { status: 'pending' } }),
      ]);
      counts.pendingVendorApprovals = pendingVendors;
      counts.pendingPaymentApprovals = pendingPayments;
    }

    if (['L1', 'L2', 'L3'].includes(role)) {
      const pendingInvoices = await prisma.invoice.count({
        where: { status: 'pending', required_approval_role: role },
      });
      counts.pendingInvoiceApprovals = pendingInvoices;
    }

    return counts;
  }
}

export default new DashboardRepository();
