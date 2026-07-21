import ApiError from '../../utils/ApiError.js';
import paymentApprovalRepository from './payment-approval.repository.js';
import notificationService from '../notifications/notification.service.js';
import prisma from '../../config/prisma.js';
import { ROLES } from '../../zodSchema/index.js';
import {
  getRequiredPaymentApprovalRole,
  TEAM_LEAD_PAYMENT_APPROVAL_MAX,
  FINANCE_HEAD_PAYMENT_APPROVAL_THRESHOLD,
} from '../payments/payment.service.js';

// ─── Approval Status Constants ────────────────────────────────────────────────
export const PAYMENT_APPROVAL_STATUS = {
  PENDING:  'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
};

// ─── History Action Constants ─────────────────────────────────────────────────
export const APPROVAL_ACTIONS = {
  REQUESTED:         'REQUESTED',
  ASSIGNED:          'ASSIGNED',
  NOTIFICATION_SENT: 'NOTIFICATION_SENT',
  APPROVED:          'APPROVED',
  REJECTED:          'REJECTED',
};

/**
 * Find the first active user with the given role.
 * Selection strategy: first active user ordered by created_at ASC (deterministic).
 * If no user found with that role, falls back to FINANCE_HEAD.
 */
export const findEligibleApprover = async (role) => {
  const user = await prisma.user.findFirst({
    where: { role, status: 'ACTIVE', deleted_at: null },
    select: { id: true, email: true, first_name: true, last_name: true, role: true },
    orderBy: { created_at: 'asc' },
  });

  return user;
};

/**
 * Decorate a PaymentApproval record for API response.
 */
const decorateApproval = (approval) => {
  if (!approval) return null;

  const approverName = approval.approver
    ? `${approval.approver.first_name || ''} ${approval.approver.last_name || ''}`.trim() || approval.approver.email
    : null;

  const requestedByName = approval.requested_by
    ? `${approval.requested_by.first_name || ''} ${approval.requested_by.last_name || ''}`.trim() || approval.requested_by.email
    : null;

  const approvedByName = approval.approved_by
    ? `${approval.approved_by.first_name || ''} ${approval.approved_by.last_name || ''}`.trim() || approval.approved_by.email
    : null;

  const rejectedByName = approval.rejected_by
    ? `${approval.rejected_by.first_name || ''} ${approval.rejected_by.last_name || ''}`.trim() || approval.rejected_by.email
    : null;

  return {
    id: approval.id,
    paymentId: approval.payment_id,
    paymentNumber: approval.payment?.payment_number || null,
    invoiceId: approval.invoice_id,
    invoiceNumber: approval.invoice?.invoice_number || approval.payment?.invoice?.invoice_number || null,
    purchaseOrderId: approval.purchase_order_id,
    poNumber: approval.purchase_order?.po_number || approval.payment?.purchase_order?.po_number || null,
    vendorId: approval.vendor_id,
    vendorName: approval.vendor?.name || approval.payment?.vendor?.name || null,
    vendorCode: approval.vendor?.vendor_code || approval.payment?.vendor?.vendor_code || null,
    threeWayMatchId: approval.three_way_match_id,
    threeWayMatchStatus: approval.three_way_match?.status || null,
    threeWayMatchPercentage: approval.three_way_match?.match_percentage || null,
    amount: Number(approval.amount),
    currency: approval.currency,
    approvalLevel: approval.approval_level,
    requiredRole: approval.required_role,
    approverId: approval.approver_id,
    approverName,
    approverEmail: approval.approver?.email || null,
    approverEmployeeId: approval.approver?.employee_id || null,
    status: approval.status,
    remarks: approval.remarks,
    rejectionReason: approval.rejection_reason,
    requestedById: approval.requested_by_id,
    requestedBy: requestedByName,
    requestedAt: approval.requested_at,
    approvedById: approval.approved_by_id,
    approvedBy: approvedByName,
    approvedAt: approval.approved_at,
    rejectedById: approval.rejected_by_id,
    rejectedBy: rejectedByName,
    rejectedAt: approval.rejected_at,
    createdAt: approval.created_at,
    updatedAt: approval.updated_at,
    history: (approval.history || []).map((h) => ({
      id: h.id,
      action: h.action,
      previousStatus: h.previous_status,
      newStatus: h.new_status,
      performedById: h.performed_by_id,
      performedBy: h.performed_by
        ? `${h.performed_by.first_name || ''} ${h.performed_by.last_name || ''}`.trim() || h.performed_by.email
        : 'System',
      performedByRole: h.performed_by?.role || null,
      remarks: h.remarks,
      createdAt: h.created_at,
    })),
  };
};

class PaymentApprovalService {

  /**
   * Create a PaymentApproval record for an invoice (pre-payment approval workflow).
   * Must be called INSIDE a Prisma transaction (tx).
   */
  async createPaymentApprovalForInvoice(invoice, requestedByUser, tx) {
    const amount = Number(invoice.invoice_total || invoice.amount || 0);
    const currency = invoice.currency || 'INR';

    // 1. Determine required role based on amount
    const requiredRole = getRequiredPaymentApprovalRole(amount, currency);

    // 2. Find the first active user with that role
    let approver = await findEligibleApprover(requiredRole);
    let usedRole = requiredRole;

    if (!approver) {
      // Fallback: try FINANCE_HEAD if primary role not found
      const fallbackApprover = await findEligibleApprover(ROLES.FINANCE_HEAD);
      if (!fallbackApprover) {
        throw new ApiError(
          500,
          `No active ${requiredRole} user found to assign payment approval. Please create an active ${requiredRole} user.`,
        );
      }
      approver = fallbackApprover;
      usedRole = ROLES.FINANCE_HEAD;
    }

    // Find the ThreeWayMatch for this invoice to link to the approval
    const latestMatch = await tx.threeWayMatch.findFirst({
      where: { invoice_id: invoice.id, status: 'MATCHED' },
      orderBy: { created_at: 'desc' },
      select: { id: true },
    });
    const threeWayMatchId = latestMatch?.id || null;

    // 3. Create PaymentApproval record
    const approval = await tx.paymentApproval.create({
      data: {
        payment_id:        null, // No payment record yet
        invoice_id:        invoice.id,
        purchase_order_id: invoice.purchase_order_id,
        vendor_id:         invoice.vendor_id,
        three_way_match_id: threeWayMatchId || null,
        amount:            amount,
        currency:          currency,
        approval_level:    1,
        required_role:     usedRole,
        approver_id:       approver.id,
        status:            PAYMENT_APPROVAL_STATUS.PENDING,
        requested_by_id:   requestedByUser?.id || null,
        requested_at:      new Date(),
      },
    });

    // 4. Create initial history records
    await tx.paymentApprovalHistory.create({
      data: {
        payment_approval_id: approval.id,
        payment_id:          null,
        invoice_id:          invoice.id,
        action:              APPROVAL_ACTIONS.REQUESTED,
        previous_status:     null,
        new_status:          PAYMENT_APPROVAL_STATUS.PENDING,
        performed_by_id:     requestedByUser?.id || null,
        remarks:             `Payment approval requested. Required role: ${usedRole}. Assigned to: ${approver.email}.`,
      },
    });

    await tx.paymentApprovalHistory.create({
      data: {
        payment_approval_id: approval.id,
        payment_id:          null,
        invoice_id:          invoice.id,
        action:              APPROVAL_ACTIONS.ASSIGNED,
        previous_status:     null,
        new_status:          PAYMENT_APPROVAL_STATUS.PENDING,
        performed_by_id:     null,
        remarks:             `Approval assigned to ${approver.first_name || ''} ${approver.last_name || ''} (${approver.role}) — ${approver.email}`,
      },
    });

    return { approval, approver };
  }

  // ────────────────────────────────────────────────────────────────────────────
  // CREATE PAYMENT APPROVAL
  // Called INSIDE a Prisma transaction from payment.service.js createPayment().
  // Order: 1) Resolve approver → 2) Create record → 3) Create history → return.
  // Notification is sent OUTSIDE this transaction, AFTER commit succeeds.
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Create a PaymentApproval record for a payment.
   * Must be called INSIDE a Prisma transaction (tx).
   *
   * @param {object} payment - The payment record (must have id, invoice_id, vendor_id, purchase_order_id, amount, currency)
   * @param {object} requestedByUser - The user creating the payment (Case Manager)
   * @param {object} tx - Prisma transaction client
   * @param {string|null} threeWayMatchId - The matched ThreeWayMatch ID if available
   * @returns {PaymentApproval} The created approval record
   */
  async createPaymentApproval(payment, requestedByUser, tx, threeWayMatchId = null) {
    const amount = Number(payment.amount || 0);
    const currency = payment.currency || 'INR';

    // 1. Determine required role based on amount
    const requiredRole = getRequiredPaymentApprovalRole(amount, currency);

    // 2. Find the first active user with that role
    const approver = await findEligibleApprover(requiredRole);

    if (!approver) {
      // Fallback: try FINANCE_HEAD if primary role not found
      const fallbackApprover = await findEligibleApprover(ROLES.FINANCE_HEAD);
      if (!fallbackApprover) {
        throw new ApiError(
          500,
          `No active ${requiredRole} user found to assign payment approval. Please create an active ${requiredRole} user.`,
        );
      }
      return this._createApprovalRecord(payment, requestedByUser, fallbackApprover, ROLES.FINANCE_HEAD, 1, tx, threeWayMatchId);
    }

    return this._createApprovalRecord(payment, requestedByUser, approver, requiredRole, 1, tx, threeWayMatchId);
  }

  /**
   * Internal: creates the actual PaymentApproval and history records inside a transaction.
   */
  async _createApprovalRecord(payment, requestedByUser, approver, requiredRole, approvalLevel, tx, threeWayMatchId) {
    // 3. Create PaymentApproval record
    const approval = await tx.paymentApproval.create({
      data: {
        payment_id:        payment.id,
        invoice_id:        payment.invoice_id,
        purchase_order_id: payment.purchase_order_id,
        vendor_id:         payment.vendor_id,
        three_way_match_id: threeWayMatchId || null,
        amount:            Number(payment.amount),
        currency:          payment.currency || 'INR',
        approval_level:    approvalLevel,
        required_role:     requiredRole,
        approver_id:       approver.id,
        status:            PAYMENT_APPROVAL_STATUS.PENDING,
        requested_by_id:   requestedByUser?.id || null,
        requested_at:      new Date(),
      },
    });

    // 4. Create initial history record
    await tx.paymentApprovalHistory.create({
      data: {
        payment_approval_id: approval.id,
        payment_id:          payment.id,
        invoice_id:          payment.invoice_id,
        action:              APPROVAL_ACTIONS.REQUESTED,
        previous_status:     null,
        new_status:          PAYMENT_APPROVAL_STATUS.PENDING,
        performed_by_id:     requestedByUser?.id || null,
        remarks:             `Payment approval requested. Required role: ${requiredRole}. Assigned to: ${approver.email}.`,
      },
    });

    await tx.paymentApprovalHistory.create({
      data: {
        payment_approval_id: approval.id,
        payment_id:          payment.id,
        invoice_id:          payment.invoice_id,
        action:              APPROVAL_ACTIONS.ASSIGNED,
        previous_status:     null,
        new_status:          PAYMENT_APPROVAL_STATUS.PENDING,
        performed_by_id:     null,
        remarks:             `Approval assigned to ${approver.first_name || ''} ${approver.last_name || ''} (${approver.role}) — ${approver.email}`,
      },
    });

    return { approval, approver };
  }

  // ────────────────────────────────────────────────────────────────────────────
  // SEND NOTIFICATION (after transaction commit)
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Send a notification to the assigned approver AFTER the transaction commits.
   * If notification fails, logs the error but does NOT roll back the approval.
   */
  async sendApprovalNotification(approval, approver) {
    try {
      await notificationService.notifyPaymentApprovalAssigned(approval, approver);

      // Log notification sent in history (outside transaction — best effort)
      await paymentApprovalRepository.createHistory({
        payment_approval_id: approval.id,
        payment_id:          approval.payment_id,
        invoice_id:          approval.invoice_id,
        action:              APPROVAL_ACTIONS.NOTIFICATION_SENT,
        previous_status:     PAYMENT_APPROVAL_STATUS.PENDING,
        new_status:          PAYMENT_APPROVAL_STATUS.PENDING,
        performed_by_id:     null,
        remarks:             `Notification sent to approver ${approver.email}`,
      }).catch(() => {});
    } catch (err) {
      console.error('[PaymentApprovalService] Failed to send approval notification:', err?.message);
      // Do NOT throw — notification failure must not undo the approval record
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // GET MY APPROVALS (for logged-in approver)
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Get all PaymentApprovals assigned to the currently logged-in user.
   * Supports: TEAM_LEAD, MANAGER, FINANCE_HEAD, SUPER_ADMIN
   */
  async getMyApprovals(user, query = {}) {
    const page  = Math.max(1, parseInt(query.page  || 1));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || 20)));
    const status = query.status || null;

    let where = {};

    if (user.role === ROLES.SUPER_ADMIN) {
      // SUPER_ADMIN sees all approvals
      where = status ? { status } : {};
    } else if ([ROLES.TEAM_LEAD, ROLES.MANAGER, ROLES.FINANCE_HEAD].includes(user.role)) {
      // Approvers only see their own assigned approvals
      where = {
        approver_id: user.id,
        ...(status && { status }),
      };
    } else {
      // Case Manager sees approvals they requested
      where = {
        requested_by_id: user.id,
        ...(status && { status }),
      };
    }

    const result = await paymentApprovalRepository.findAll({
      where,
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      approvals: result.approvals.map(decorateApproval),
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    };
  }

  /**
   * Get a single PaymentApproval by ID.
   * Access control: approver, requested_by, or SUPER_ADMIN.
   */
  async getApprovalById(id, user) {
    const approval = await paymentApprovalRepository.findById(id);
    if (!approval) throw new ApiError(404, 'Payment Approval not found.');

    // Access check
    const canView =
      user.role === ROLES.SUPER_ADMIN ||
      approval.approver_id === user.id ||
      approval.requested_by_id === user.id ||
      [ROLES.TEAM_LEAD, ROLES.MANAGER, ROLES.FINANCE_HEAD].includes(user.role);

    if (!canView) throw new ApiError(403, 'You do not have permission to view this approval.');

    return decorateApproval(approval);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // APPROVE
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Approve a PaymentApproval.
   * Verifies: auth → is assigned approver → status PENDING → updates DB.
   */
  async approvePaymentApproval(approvalId, user, remarks = '') {
    if (!remarks?.trim()) {
      throw new ApiError(400, 'Remarks are required to approve a payment approval.');
    }

    const approval = await paymentApprovalRepository.findById(approvalId);
    if (!approval) throw new ApiError(404, 'Payment Approval not found.');

    if (approval.status !== PAYMENT_APPROVAL_STATUS.PENDING) {
      throw new ApiError(400, `This approval is already ${approval.status}. Only PENDING approvals can be approved.`);
    }

    // Verify the logged-in user IS the assigned approver (or SUPER_ADMIN)
    if (user.role !== ROLES.SUPER_ADMIN && approval.approver_id !== user.id) {
      throw new ApiError(403, 'You are not the assigned approver for this payment approval.');
    }

    const now = new Date();

    const updated = await paymentApprovalRepository.transaction(async (tx) => {
      // 1. Update PaymentApproval
      const updatedApproval = await tx.paymentApproval.update({
        where: { id: approvalId },
        data: {
          status:        PAYMENT_APPROVAL_STATUS.APPROVED,
          approved_by_id: user.id,
          approved_at:   now,
          remarks:       remarks.trim(),
        },
      });

      // 2. Update related Payment approval_status (if linked)
      if (approval.payment_id) {
        await tx.payment.update({
          where: { id: approval.payment_id },
          data: {
            approval_status: 'APPROVED',
            approved_by_id:  user.id,
            approved_at:     now,
            // Move from PENDING_APPROVAL to PENDING (ready for processing)
            ...(approval.payment?.status === 'PENDING_APPROVAL' && { status: 'PENDING' }),
          },
        });
      }

      // 3. Create audit log
      await tx.auditLog.create({
        data: {
          entity_type:     'payment_approval',
          entity_id:       approvalId,
          action:          'payment_approval_approved',
          from_status:     PAYMENT_APPROVAL_STATUS.PENDING,
          to_status:       PAYMENT_APPROVAL_STATUS.APPROVED,
          performed_by_id: user.id,
          remarks:         remarks.trim(),
        },
      });

      // 4. Create history
      await tx.paymentApprovalHistory.create({
        data: {
          payment_approval_id: approvalId,
          payment_id:          approval.payment_id,
          invoice_id:          approval.invoice_id,
          action:              APPROVAL_ACTIONS.APPROVED,
          previous_status:     PAYMENT_APPROVAL_STATUS.PENDING,
          new_status:          PAYMENT_APPROVAL_STATUS.APPROVED,
          performed_by_id:     user.id,
          remarks:             remarks.trim(),
        },
      });

      return updatedApproval;
    });

    // 5. Send notification to payment requester (Case Manager) — after transaction
    const fullApproval = await paymentApprovalRepository.findById(approvalId);
    notificationService.notifyPaymentApprovalResult(fullApproval, 'APPROVED', user).catch(() => {});

    return decorateApproval(fullApproval);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // REJECT
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Reject a PaymentApproval.
   * Rejection reason is required.
   */
  async rejectPaymentApproval(approvalId, user, rejectionReason = '') {
    if (!rejectionReason?.trim()) {
      throw new ApiError(400, 'Rejection reason is required to reject a payment approval.');
    }

    const approval = await paymentApprovalRepository.findById(approvalId);
    if (!approval) throw new ApiError(404, 'Payment Approval not found.');

    if (approval.status !== PAYMENT_APPROVAL_STATUS.PENDING) {
      throw new ApiError(400, `This approval is already ${approval.status}. Only PENDING approvals can be rejected.`);
    }

    if (user.role !== ROLES.SUPER_ADMIN && approval.approver_id !== user.id) {
      throw new ApiError(403, 'You are not the assigned approver for this payment approval.');
    }

    const now = new Date();

    await paymentApprovalRepository.transaction(async (tx) => {
      // 1. Update PaymentApproval
      await tx.paymentApproval.update({
        where: { id: approvalId },
        data: {
          status:           PAYMENT_APPROVAL_STATUS.REJECTED,
          rejected_by_id:   user.id,
          rejected_at:      now,
          rejection_reason: rejectionReason.trim(),
        },
      });

      // 2. Update related Payment approval_status to REJECTED (if linked)
      if (approval.payment_id) {
        await tx.payment.update({
          where: { id: approval.payment_id },
          data: {
            approval_status: 'REJECTED',
            status:          'FAILED',
          },
        });
      }

      // 3. Create audit log
      await tx.auditLog.create({
        data: {
          entity_type:     'payment_approval',
          entity_id:       approvalId,
          action:          'payment_approval_rejected',
          from_status:     PAYMENT_APPROVAL_STATUS.PENDING,
          to_status:       PAYMENT_APPROVAL_STATUS.REJECTED,
          performed_by_id: user.id,
          remarks:         rejectionReason.trim(),
        },
      });

      // 4. Create history
      await tx.paymentApprovalHistory.create({
        data: {
          payment_approval_id: approvalId,
          payment_id:          approval.payment_id,
          invoice_id:          approval.invoice_id,
          action:              APPROVAL_ACTIONS.REJECTED,
          previous_status:     PAYMENT_APPROVAL_STATUS.PENDING,
          new_status:          PAYMENT_APPROVAL_STATUS.REJECTED,
          performed_by_id:     user.id,
          remarks:             rejectionReason.trim(),
        },
      });
    });

    // 5. Notify Case Manager (payment requester) of rejection — after transaction
    const fullApproval = await paymentApprovalRepository.findById(approvalId);
    notificationService.notifyPaymentApprovalResult(fullApproval, 'REJECTED', user).catch(() => {});

    return decorateApproval(fullApproval);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // GET APPROVAL HISTORY
  // ────────────────────────────────────────────────────────────────────────────

  async getApprovalHistory(approvalId, user) {
    const approval = await paymentApprovalRepository.findById(approvalId);
    if (!approval) throw new ApiError(404, 'Payment Approval not found.');

    const canView =
      user.role === ROLES.SUPER_ADMIN ||
      approval.approver_id === user.id ||
      approval.requested_by_id === user.id ||
      [ROLES.TEAM_LEAD, ROLES.MANAGER, ROLES.FINANCE_HEAD].includes(user.role);

    if (!canView) throw new ApiError(403, 'Access denied.');

    const history = await paymentApprovalRepository.findHistory(approvalId);
    return history.map((h) => ({
      id:              h.id,
      action:          h.action,
      previousStatus:  h.previous_status,
      newStatus:       h.new_status,
      performedById:   h.performed_by_id,
      performedBy:     h.performed_by
        ? `${h.performed_by.first_name || ''} ${h.performed_by.last_name || ''}`.trim() || h.performed_by.email
        : 'System',
      performedByRole: h.performed_by?.role || null,
      remarks:         h.remarks,
      createdAt:       h.created_at,
    }));
  }

  // ────────────────────────────────────────────────────────────────────────────
  // GET APPROVALS BY PAYMENT
  // ────────────────────────────────────────────────────────────────────────────

  async getApprovalsByPaymentId(paymentId) {
    const approvals = await paymentApprovalRepository.findByPaymentId(paymentId);
    return approvals.map(decorateApproval);
  }
}

export default new PaymentApprovalService();
