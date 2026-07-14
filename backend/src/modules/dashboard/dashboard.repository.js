import prisma from '../../config/prisma.js';

class DashboardRepository {
  /**
   * Get vendor counts grouped by status.
   */
  async getVendorStats() {
    const [total, pending, approved, rejected, blocked] = await Promise.all([
      prisma.vendor.count({ where: { deleted_at: null } }),
      prisma.vendor.count({ where: { deleted_at: null, status: 'pending'  } }),
      prisma.vendor.count({ where: { deleted_at: null, status: 'approved' } }),
      prisma.vendor.count({ where: { deleted_at: null, status: 'rejected' } }),
      prisma.vendor.count({ where: { deleted_at: null, status: 'blocked'  } }),
    ]);
    return { total, pending, approved, rejected, blocked };
  }

  /**
   * Get purchase order counts grouped by status + total value.
   */
  async getPurchaseOrderStats() {
    const [total, pending, open, closed, cancelled, totalValue] = await Promise.all([
      prisma.purchaseOrder.count(),
      prisma.purchaseOrder.count({ where: { status: 'pending'   } }),
      prisma.purchaseOrder.count({ where: { status: 'open'      } }),
      prisma.purchaseOrder.count({ where: { status: 'closed'    } }),
      prisma.purchaseOrder.count({ where: { status: 'cancelled' } }),
      prisma.purchaseOrder.aggregate({ _sum: { amount: true } }),
    ]);
    return { total, pending, open, closed, cancelled, totalValue: Number(totalValue._sum.amount || 0) };
  }

  /**
   * Get invoice counts for all workflow stages.
   */
  async getInvoiceStats() {
    const [
      total,
      pendingThreeWayMatch,
      pendingTeamLead,
      pendingManager,
      pendingFinanceHead,
      approved,
      rejected,
      cancelled,
      totalInvoiceAmount,
      totalPaidAmount,
      remainingOutstanding,
      partiallyPaidInvoices,
      threeWayMatchMatched,
      threeWayMatchUnmatched,
    ] = await Promise.all([
      prisma.invoice.count({ where: { deleted_at: null } }),
      prisma.invoice.count({ where: { deleted_at: null, status: 'PENDING_THREE_WAY_MATCH' } }),
      prisma.invoice.count({ where: { deleted_at: null, status: 'PENDING_TEAM_LEAD'       } }),
      prisma.invoice.count({ where: { deleted_at: null, status: 'PENDING_MANAGER'         } }),
      prisma.invoice.count({ where: { deleted_at: null, status: 'PENDING_FINANCE_HEAD'    } }),
      prisma.invoice.count({ where: { deleted_at: null, status: { in: ['APPROVED', 'approved'] } } }),
      prisma.invoice.count({ where: { deleted_at: null, status: { in: ['REJECTED', 'rejected'] } } }),
      prisma.invoice.count({ where: { deleted_at: null, status: 'CANCELLED' } }),
      prisma.invoice.aggregate({ _sum: { invoice_total: true } }),
      prisma.invoice.aggregate({ _sum: { paid_amount:   true } }),
      prisma.invoice.aggregate({ _sum: { remaining_amount: true } }),
      prisma.invoice.count({ where: { deleted_at: null, payment_status: 'PARTIALLY_PAID' } }),
      prisma.invoice.count({ where: { deleted_at: null, three_way_match_status: 'MATCHED'   } }),
      prisma.invoice.count({ where: { deleted_at: null, three_way_match_status: 'UNMATCHED' } }),
    ]);

    return {
      total,
      byWorkflowStage: {
        pendingThreeWayMatch,
        pendingTeamLead,
        pendingManager,
        pendingFinanceHead,
        approved,
        rejected,
        cancelled,
      },
      // Legacy compat
      pending: pendingTeamLead + pendingManager + pendingFinanceHead + pendingThreeWayMatch,
      approved,
      rejected,
      totalInvoiceAmount:    Number(totalInvoiceAmount._sum.invoice_total   || 0),
      totalPaidAmount:       Number(totalPaidAmount._sum.paid_amount        || 0),
      remainingOutstanding:  Number(remainingOutstanding._sum.remaining_amount || 0),
      partiallyPaidInvoices,
      threeWayMatching: {
        matched:   threeWayMatchMatched,
        unmatched: threeWayMatchUnmatched,
      },
    };
  }

  /**
   * Get payment counts grouped by status.
   */
  async getPaymentStats() {
    const [total, pending, success, failed, cancelled, refunded] = await Promise.all([
      prisma.payment.count(),
      prisma.payment.count({ where: { status: { in: ['pending',   'PENDING'   ] } } }),
      prisma.payment.count({ where: { status: { in: ['success',   'SUCCESS'   ] } } }),
      prisma.payment.count({ where: { status: { in: ['failed',    'FAILED'    ] } } }),
      prisma.payment.count({ where: { status: { in: ['cancelled', 'CANCELLED' ] } } }),
      prisma.payment.count({ where: { status: { in: ['refunded',  'REFUNDED'  ] } } }),
    ]);
    return { total, pending, success, failed, cancelled, refunded };
  }

  /**
   * Get Three-Way Matching statistics.
   */
  async getThreeWayMatchStats() {
    const [total, matched, unmatched, pending] = await Promise.all([
      prisma.threeWayMatch.count(),
      prisma.threeWayMatch.count({ where: { status: 'MATCHED'   } }),
      prisma.threeWayMatch.count({ where: { status: 'UNMATCHED' } }),
      prisma.threeWayMatch.count({ where: { status: 'PENDING'   } }),
    ]);
    return { total, matched, unmatched, pending };
  }

  /**
   * Get recent audit log activity feed.
   */
  async getRecentActivity(limit = 10) {
    // Try new AuditLog first, fall back to ApprovalLog
    try {
      return await prisma.auditLog.findMany({
        orderBy: { created_at: 'desc' },
        take:    limit,
        include: {
          performed_by: {
            select: { id: true, email: true, first_name: true, last_name: true, role: true },
          },
        },
      });
    } catch {
      return prisma.approvalLog.findMany({
        orderBy: { created_at: 'desc' },
        take:    limit,
        include: {
          performed_by: {
            select: { id: true, email: true, first_name: true, last_name: true, role: true },
          },
        },
      });
    }
  }

  /**
   * Get pending item counts scoped to a specific user/role.
   * Updated for new role names.
   */
  async getPendingCountsForRole(role, userId) {
    const counts = {};

    if (role === 'CASE_MANAGER') {
      const [myVendors, myPOs, myInvoices, myPayments, myPendingMatching] = await Promise.all([
        prisma.vendor.count({ where: { created_by_id: userId, status: 'pending', deleted_at: null } }),
        prisma.purchaseOrder.count({ where: { created_by_id: userId, status: 'pending' } }),
        prisma.invoice.count({ where: { created_by_id: userId, deleted_at: null, status: { in: ['PENDING_THREE_WAY_MATCH', 'pending', 'PENDING'] } } }),
        prisma.payment.count({ where: { created_by_id: userId, status: 'pending' } }),
        prisma.invoice.count({ where: { created_by_id: userId, deleted_at: null, status: 'PENDING_THREE_WAY_MATCH' } }),
      ]);
      counts.myPendingVendors   = myVendors;
      counts.myPendingPOs       = myPOs;
      counts.myPendingInvoices  = myInvoices;
      counts.myPendingPayments  = myPayments;
      counts.myPendingMatching  = myPendingMatching;
    }

    // Finance Head gets vendor approvals, payment approvals, and all pending invoices
    if (role === 'FINANCE_HEAD') {
      const [pendingVendors, pendingPayments, pendingFinanceHeadInvoices, totalInvoices, matchingStats] = await Promise.all([
        prisma.vendor.count({ where: { status: 'pending', deleted_at: null } }),
        prisma.payment.count({ where: { status: 'pending' } }),
        prisma.invoice.count({ where: { deleted_at: null, status: 'PENDING_FINANCE_HEAD' } }),
        prisma.invoice.count({ where: { deleted_at: null } }),
        prisma.threeWayMatch.count({ where: { status: 'UNMATCHED' } }),
      ]);
      counts.pendingVendorApprovals       = pendingVendors;
      counts.pendingPaymentApprovals      = pendingPayments;
      counts.pendingFinanceHeadInvoices   = pendingFinanceHeadInvoices;
      counts.totalInvoices                = totalInvoices;
      counts.unmatchedThreeWayMatches     = matchingStats;
    }

    // Team Lead (formerly L1)
    if (role === 'TEAM_LEAD') {
      const pendingInvoices = await prisma.invoice.count({
        where: { deleted_at: null, status: 'PENDING_TEAM_LEAD' },
      });
      counts.pendingInvoiceApprovals = pendingInvoices;
    }

    // Manager (formerly L2)
    if (role === 'MANAGER') {
      const pendingInvoices = await prisma.invoice.count({
        where: { deleted_at: null, status: 'PENDING_MANAGER' },
      });
      counts.pendingInvoiceApprovals = pendingInvoices;
    }

    // Super Admin gets all pending items
    if (role === 'SUPER_ADMIN') {
      const [pendingVendors, pendingPayments] = await Promise.all([
        prisma.vendor.count({ where: { status: 'pending', deleted_at: null } }),
        prisma.payment.count({ where: { status: 'pending' } }),
      ]);
      counts.pendingVendorApprovals     = pendingVendors;
      counts.pendingPaymentApprovals    = pendingPayments;
    }

    return counts;
  }

  /**
   * Finance Head Observation — Comprehensive overview.
   */
  async getFinanceHeadObservationStats() {
    const [
      totalInvoices,
      pendingByStage,
      approved,
      rejected,
      totalMatchStats,
      recentApprovals,
      paymentsPending,
    ] = await Promise.all([
      prisma.invoice.count({ where: { deleted_at: null } }),
      // Pending by each stage
      Promise.all([
        prisma.invoice.count({ where: { deleted_at: null, status: 'PENDING_THREE_WAY_MATCH' } }),
        prisma.invoice.count({ where: { deleted_at: null, status: 'PENDING_TEAM_LEAD'       } }),
        prisma.invoice.count({ where: { deleted_at: null, status: 'PENDING_MANAGER'         } }),
        prisma.invoice.count({ where: { deleted_at: null, status: 'PENDING_FINANCE_HEAD'    } }),
      ]),
      prisma.invoice.count({ where: { deleted_at: null, status: { in: ['APPROVED', 'approved'] } } }),
      prisma.invoice.count({ where: { deleted_at: null, status: { in: ['REJECTED', 'rejected'] } } }),
      prisma.threeWayMatch.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.invoice.findMany({
        where: { deleted_at: null, status: { in: ['APPROVED', 'approved'] } },
        orderBy: { final_approved_at: 'desc' },
        take: 5,
        include: {
          vendor: { select: { name: true, vendor_code: true } },
        },
      }),
      prisma.payment.count({ where: { status: { in: ['pending', 'PENDING'] } } }),
    ]);

    const matchStatMap = {};
    for (const stat of totalMatchStats) {
      matchStatMap[stat.status] = stat._count.id;
    }

    return {
      totalInvoices,
      byStage: {
        pendingThreeWayMatch: pendingByStage[0],
        pendingTeamLead:      pendingByStage[1],
        pendingManager:       pendingByStage[2],
        pendingFinanceHead:   pendingByStage[3],
        approved,
        rejected,
      },
      threeWayMatching: {
        matched:   matchStatMap['MATCHED']   || 0,
        unmatched: matchStatMap['UNMATCHED'] || 0,
        pending:   matchStatMap['PENDING']   || 0,
      },
      recentApprovals,
      paymentsPending,
    };
  }
}

export default new DashboardRepository();
