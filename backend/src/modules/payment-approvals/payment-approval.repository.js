import prisma from '../../config/prisma.js';

const approvalInclude = {
  payment: {
    include: {
      invoice: { select: { id: true, invoice_number: true, amount: true, currency: true } },
      vendor: { select: { id: true, name: true, vendor_code: true } },
      purchase_order: { select: { id: true, po_number: true } },
    },
  },
  invoice: { select: { id: true, invoice_number: true, amount: true, currency: true } },
  purchase_order: { select: { id: true, po_number: true } },
  vendor: { select: { id: true, name: true, vendor_code: true } },
  three_way_match: { select: { id: true, status: true, match_percentage: true } },
  approver: {
    select: { id: true, email: true, first_name: true, last_name: true, role: true, employee_id: true },
  },
  requested_by: {
    select: { id: true, email: true, first_name: true, last_name: true, role: true },
  },
  approved_by: {
    select: { id: true, email: true, first_name: true, last_name: true, role: true },
  },
  rejected_by: {
    select: { id: true, email: true, first_name: true, last_name: true, role: true },
  },
  history: {
    orderBy: { created_at: 'asc' },
    include: {
      performed_by: {
        select: { id: true, email: true, first_name: true, last_name: true, role: true },
      },
    },
  },
};

class PaymentApprovalRepository {
  /**
   * Create a new PaymentApproval record (inside or outside a transaction).
   */
  async create(data, tx = null) {
    const client = tx || prisma;
    return client.paymentApproval.create({
      data,
      include: approvalInclude,
    });
  }

  /**
   * Create a PaymentApprovalHistory entry.
   */
  async createHistory(data, tx = null) {
    const client = tx || prisma;
    return client.paymentApprovalHistory.create({ data });
  }

  /**
   * Find a PaymentApproval by its ID (full include).
   */
  async findById(id) {
    return prisma.paymentApproval.findUnique({
      where: { id },
      include: approvalInclude,
    });
  }

  /**
   * Find all PaymentApprovals assigned to a specific approver.
   * @param {string} approverId - The user ID of the assigned approver
   * @param {string|null} status - Optional status filter (PENDING | APPROVED | REJECTED)
   */
  async findByApproverId(approverId, status = null) {
    const where = {
      approver_id: approverId,
      ...(status && { status }),
    };

    return prisma.paymentApproval.findMany({
      where,
      include: approvalInclude,
      orderBy: { requested_at: 'desc' },
    });
  }

  /**
   * Find all PaymentApprovals for a specific payment.
   */
  async findByPaymentId(paymentId) {
    return prisma.paymentApproval.findMany({
      where: { payment_id: paymentId },
      include: approvalInclude,
      orderBy: { approval_level: 'asc' },
    });
  }

  /**
   * Find all PaymentApprovals with pagination and filtering.
   */
  async findAll({ where = {}, skip = 0, take = 20 } = {}) {
    const [approvals, total] = await Promise.all([
      prisma.paymentApproval.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(take),
        include: approvalInclude,
        orderBy: { requested_at: 'desc' },
      }),
      prisma.paymentApproval.count({ where }),
    ]);

    return { approvals, total };
  }

  /**
   * Update a PaymentApproval record (inside or outside a transaction).
   */
  async update(id, data, tx = null) {
    const client = tx || prisma;
    return client.paymentApproval.update({
      where: { id },
      data,
      include: approvalInclude,
    });
  }

  /**
   * Find history entries for a PaymentApproval.
   */
  async findHistory(paymentApprovalId) {
    return prisma.paymentApprovalHistory.findMany({
      where: { payment_approval_id: paymentApprovalId },
      include: {
        performed_by: {
          select: { id: true, email: true, first_name: true, last_name: true, role: true },
        },
      },
      orderBy: { created_at: 'asc' },
    });
  }

  /**
   * Check if a PENDING approval already exists for a payment.
   */
  async findPendingByPaymentId(paymentId) {
    return prisma.paymentApproval.findFirst({
      where: { payment_id: paymentId, status: 'PENDING' },
    });
  }

  /**
   * Run a Prisma transaction.
   */
  async transaction(callback) {
    return prisma.$transaction(callback);
  }
}

export default new PaymentApprovalRepository();
