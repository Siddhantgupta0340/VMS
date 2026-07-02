import ApiError from '../../utils/ApiError.js';
import invoiceRepository from './invoice.repository.js';
import vendorRepository from '../vendors/vendor.repository.js';
import purchaseOrderRepository from '../purchase-orders/po.repository.js';
import approvalRepository from '../approvals/approval.repository.js';
import notificationService from '../notifications/notification.service.js';
import { ROLES } from '../../zodSchema/index.js';
import {
  INVOICE_STATUS,
  THREE_WAY_MATCH_STATUS,
  ADMIN_REVIEW_STATUS,
  getRequiredInvoiceApprovalRole,
  getNextApprovalStatus,
  isValidStatusTransition,
  getCurrentApprovalLevel,
} from '../../utils/approval-helper.js';
import { VENDOR_MESSAGES, VENDOR_STATUS } from '../vendors/vendor.constants.js';
import prisma from '../../config/prisma.js';

export { INVOICE_STATUS, THREE_WAY_MATCH_STATUS, ADMIN_REVIEW_STATUS } from '../../utils/approval-helper.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Write an audit log entry for an invoice action.
 */
const writeAuditLog = async (tx, { entityId, action, fromStatus, toStatus, userId, remarks, req }) => {
  return tx.auditLog.create({
    data: {
      entity_type:     'invoice',
      entity_id:       entityId,
      action,
      from_status:     fromStatus || null,
      to_status:       toStatus   || null,
      performed_by_id: userId     || null,
      remarks:         remarks    || null,
      ip_address:      req?.ip    || null,
      user_agent:      req?.headers?.['user-agent'] || null,
    },
  });
};

// ─── InvoiceService ───────────────────────────────────────────────────────────

class InvoiceService {
  // ────────────────────────────────────────────────────────────────────────────
  // CREATE INVOICE
  // Default entry point: Case Manager creates → PENDING_THREE_WAY_MATCH
  // ────────────────────────────────────────────────────────────────────────────
  async createInvoice(payload, user, req = null) {
    // 1. Validate vendor
    const vendor = await vendorRepository.findById(payload.vendorId);
    if (!vendor) throw new ApiError(404, VENDOR_MESSAGES.NOT_FOUND);
    if (vendor.status !== VENDOR_STATUS.APPROVED) {
      throw new ApiError(400, 'Invoice can only be created for an approved vendor.');
    }
    if (user.role === ROLES.CASE_MANAGER && vendor.created_by_id !== user.id) {
      throw new ApiError(403, 'You can only create invoices for vendors created by you.');
    }

    // 2. Validate purchase order
    const purchaseOrder = await purchaseOrderRepository.findById(payload.purchaseOrderId);
    if (!purchaseOrder) throw new ApiError(404, 'Purchase order not found.');
    if (purchaseOrder.vendor_id !== payload.vendorId) {
      throw new ApiError(400, 'Purchase order does not belong to the selected vendor.');
    }
    if (purchaseOrder.status === 'cancelled') {
      throw new ApiError(400, 'Invoice cannot be created for a cancelled purchase order.');
    }

    // 3. Determine highest approval role required
    const requiredApprovalRole = getRequiredInvoiceApprovalRole(payload.amount);

    return invoiceRepository.transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          invoice_number:        payload.invoiceNumber || `INV-${Date.now()}`,
          vendor_id:             payload.vendorId,
          purchase_order_id:     payload.purchaseOrderId,
          created_by_id:         user.id,
          updated_by_id:         user.id,
          amount:                payload.amount,
          currency:              payload.currency || 'INR',
          status:                INVOICE_STATUS.PENDING_THREE_WAY_MATCH,
          required_approval_role: requiredApprovalRole,
          current_approval_level: null,
          three_way_match_status: THREE_WAY_MATCH_STATUS.PENDING,
          admin_review_status:    ADMIN_REVIEW_STATUS.PENDING,
          invoice_date:          payload.invoiceDate || new Date(),
          due_date:              payload.dueDate ? new Date(payload.dueDate) : null,
          description:           payload.description || null,
          invoice_total:         payload.amount,
          paid_amount:           0.00,
          remaining_amount:      payload.amount,
          payment_status:        'UNPAID',
        },
        include: { vendor: true, purchase_order: true },
      });

      await writeAuditLog(tx, {
        entityId:   invoice.id,
        action:     'created',
        fromStatus: null,
        toStatus:   INVOICE_STATUS.PENDING_THREE_WAY_MATCH,
        userId:     user.id,
        remarks:    `Invoice submitted. Requires Three-Way Matching before approval. Required approval level: ${requiredApprovalRole}.`,
        req,
      });

      // Notify Case Manager that matching can now begin
      notificationService.notifyInvoiceStatusChange(invoice, INVOICE_STATUS.PENDING_THREE_WAY_MATCH, user.first_name || 'System').catch(() => {});

      return invoice;
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // LIST INVOICES
  // ────────────────────────────────────────────────────────────────────────────
  async listInvoices(query, user) {
    const page  = Number(query.page  || 1);
    const limit = Number(query.limit || 10);

    const where = {
      deleted_at: null, // Always exclude soft-deleted invoices
      ...(query.vendorId          && { vendor_id:             query.vendorId }),
      ...(query.purchaseOrderId   && { purchase_order_id:     query.purchaseOrderId }),
      ...(query.requiredApprovalRole && { required_approval_role: query.requiredApprovalRole }),
      ...(query.paymentStatus     && { payment_status:        query.paymentStatus }),
      // Case Managers can only see their own created invoices
      ...(user.role === ROLES.CASE_MANAGER && { created_by_id: user.id }),
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.currentApprovalLevel) {
      where.current_approval_level = query.currentApprovalLevel;
    }

    const result = await invoiceRepository.findAll({
      where,
      skip:  (page - 1) * limit,
      take:  limit,
    });

    return {
      invoices:    result.invoices,
      total:       result.total,
      page,
      limit,
      totalPages:  Math.ceil(result.total / limit),
    };
  }

  // ────────────────────────────────────────────────────────────────────────────
  // GET INVOICE BY ID
  // ────────────────────────────────────────────────────────────────────────────
  async getInvoiceById(id, user) {
    const invoice = await invoiceRepository.findById(id);
    if (!invoice) throw new ApiError(404, 'Invoice not found.');
    if (invoice.deleted_at && user.role !== ROLES.SUPER_ADMIN && user.role !== ROLES.FINANCE_HEAD) {
      throw new ApiError(404, 'Invoice not found.');
    }
    if (user.role === ROLES.CASE_MANAGER && invoice.created_by_id !== user.id) {
      throw new ApiError(403, 'You can only access invoices created by you.');
    }
    return invoice;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // APPROVE INVOICE (Team Lead / Manager / Finance Head)
  // Routes through the 3-level approval hierarchy
  // ────────────────────────────────────────────────────────────────────────────
  async approveInvoice(id, user, remarks, req = null) {
    const invoice = await invoiceRepository.findById(id);
    if (!invoice) throw new ApiError(404, 'Invoice not found.');
    if (invoice.deleted_at) throw new ApiError(400, 'Cannot approve a deleted invoice.');

    const currentLevel = getCurrentApprovalLevel(invoice.status);

    console.log(currentLevel)

    if (!currentLevel || !['TEAM_LEAD', 'MANAGER', 'FINANCE_HEAD'].includes(currentLevel)) {
      throw new ApiError(400, 'This invoice is not in a state that requires role-level approval.');
    }

    // Role gating
    if (currentLevel === 'TEAM_LEAD'    && user.role !== ROLES.TEAM_LEAD)    throw new ApiError(403, 'Only Team Leads can approve at this level.');
    if (currentLevel === 'MANAGER'      && user.role !== ROLES.MANAGER)      throw new ApiError(403, 'Only Managers can approve at this level.');
    if (currentLevel === 'FINANCE_HEAD' && user.role !== ROLES.FINANCE_HEAD) throw new ApiError(403, 'Only Finance Heads can approve at this level.');

    // Duplicate approval safety
    if (currentLevel === 'TEAM_LEAD'    && invoice.team_lead_approver_id)    throw new ApiError(400, 'Invoice has already been approved at Team Lead level.');
    if (currentLevel === 'MANAGER'      && invoice.manager_approver_id)      throw new ApiError(400, 'Invoice has already been approved at Manager level.');
    if (currentLevel === 'FINANCE_HEAD' && invoice.finance_head_approver_id) throw new ApiError(400, 'Invoice has already been approved at Finance Head level.');

    const currentStatus = invoice.status;
    const nextStatus    = getNextApprovalStatus(invoice.amount, currentStatus);

    if (!isValidStatusTransition(currentStatus, nextStatus)) {
      throw new ApiError(400, `Invalid workflow transition: ${currentStatus} → ${nextStatus}`);
    }

    const now        = new Date();
    const updateData = { status: nextStatus, updated_by_id: user.id };

    if (currentLevel === 'TEAM_LEAD') {
      updateData.team_lead_approver_id  = user.id;
      updateData.team_lead_approved_at  = now;
      updateData.team_lead_remarks      = remarks || '';
      updateData.current_approval_level = nextStatus === INVOICE_STATUS.APPROVED ? null : 'MANAGER';
    } else if (currentLevel === 'MANAGER') {
      updateData.manager_approver_id    = user.id;
      updateData.manager_approved_at    = now;
      updateData.manager_remarks        = remarks || '';
      updateData.current_approval_level = nextStatus === INVOICE_STATUS.APPROVED ? null : 'FINANCE_HEAD';
    } else if (currentLevel === 'FINANCE_HEAD') {
      updateData.finance_head_approver_id  = user.id;
      updateData.finance_head_approved_at  = now;
      updateData.finance_head_remarks      = remarks || '';
      updateData.current_approval_level    = null;
    }

    if (nextStatus === INVOICE_STATUS.APPROVED) {
      updateData.final_approved_at = now;
    }

    return invoiceRepository.transaction(async (tx) => {
      const updatedInvoice = await tx.invoice.update({
        where:   { id },
        data:    updateData,
        include: { vendor: true, purchase_order: true },
      });

      await writeAuditLog(tx, {
        entityId:   id,
        action:     'approved',
        fromStatus: currentStatus,
        toStatus:   nextStatus,
        userId:     user.id,
        remarks:    `Approved at ${currentLevel} level. Remarks: ${remarks || 'None'}`,
        req,
      });

      const actorName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.role;
      if (nextStatus === INVOICE_STATUS.APPROVED) {
        notificationService.notifyInvoiceStatusChange(updatedInvoice, INVOICE_STATUS.APPROVED, actorName).catch(() => {});
      } else {
        notificationService.notifyInvoiceNextLevel(updatedInvoice, updatedInvoice.current_approval_level).catch(() => {});
      }

      return updatedInvoice;
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // ADMIN REVIEW — Approve (after Three-Way Matching)
  // ────────────────────────────────────────────────────────────────────────────
  async adminApproveInvoice(id, user, remarks, req = null) {
    const invoice = await invoiceRepository.findById(id);
    if (!invoice) throw new ApiError(404, 'Invoice not found.');
    if (invoice.deleted_at) throw new ApiError(400, 'Cannot review a deleted invoice.');

    if (invoice.status !== INVOICE_STATUS.PENDING_ADMIN_REVIEW) {
      throw new ApiError(400, 'Invoice is not pending Admin Review.');
    }

    if (![ROLES.SUPER_ADMIN].includes(user.role)) {
      throw new ApiError(403, 'Only Admins can perform Admin Review.');
    }

    // Three-Way Match must have been completed before Admin can review
    if (invoice.three_way_match_status === THREE_WAY_MATCH_STATUS.PENDING) {
      throw new ApiError(400, 'Three-Way Matching must be completed before Admin Review.');
    }

    const currentStatus = invoice.status;
    const nextStatus    = INVOICE_STATUS.PENDING_TEAM_LEAD;
    const now           = new Date();

    return invoiceRepository.transaction(async (tx) => {
      const updatedInvoice = await tx.invoice.update({
        where: { id },
        data: {
          status:                INVOICE_STATUS.PENDING_TEAM_LEAD,
          current_approval_level: 'TEAM_LEAD',
          admin_review_status:   ADMIN_REVIEW_STATUS.APPROVED,
          admin_reviewed_by_id:  user.id,
          admin_reviewed_at:     now,
          admin_remarks:         remarks || '',
          updated_by_id:         user.id,
        },
        include: { vendor: true, purchase_order: true },
      });

      await writeAuditLog(tx, {
        entityId:   id,
        action:     'admin_review_approved',
        fromStatus: currentStatus,
        toStatus:   nextStatus,
        userId:     user.id,
        remarks:    `Admin Review approved. Invoice forwarded to Team Lead. Remarks: ${remarks || 'None'}`,
        req,
      });

      // Notify Team Lead users
      notificationService.notifyInvoiceNextLevel(updatedInvoice, 'TEAM_LEAD').catch(() => {});

      return updatedInvoice;
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // ADMIN REVIEW — Reject (send back)
  // ────────────────────────────────────────────────────────────────────────────
  async adminRejectInvoice(id, user, remarks, req = null) {
    const invoice = await invoiceRepository.findById(id);
    if (!invoice) throw new ApiError(404, 'Invoice not found.');
    if (invoice.deleted_at) throw new ApiError(400, 'Cannot review a deleted invoice.');

    if (invoice.status !== INVOICE_STATUS.PENDING_ADMIN_REVIEW) {
      throw new ApiError(400, 'Invoice is not pending Admin Review.');
    }

    if (![ROLES.SUPER_ADMIN].includes(user.role)) {
      throw new ApiError(403, 'Only Admins can perform Admin Review.');
    }

    if (!remarks?.trim()) {
      throw new ApiError(400, 'Remarks are required when rejecting at Admin Review stage.');
    }

    const currentStatus = invoice.status;
    const now           = new Date();

    return invoiceRepository.transaction(async (tx) => {
      const updatedInvoice = await tx.invoice.update({
        where: { id },
        data: {
          status:               INVOICE_STATUS.REJECTED,
          current_approval_level: null,
          admin_review_status:  ADMIN_REVIEW_STATUS.REJECTED,
          admin_reviewed_by_id: user.id,
          admin_reviewed_at:    now,
          admin_remarks:        remarks,
          rejected_by_id:       user.id,
          rejected_at:          now,
          rejection_reason:     remarks,
          updated_by_id:        user.id,
        },
        include: { vendor: true, purchase_order: true },
      });

      await writeAuditLog(tx, {
        entityId:   id,
        action:     'admin_review_rejected',
        fromStatus: currentStatus,
        toStatus:   INVOICE_STATUS.REJECTED,
        userId:     user.id,
        remarks:    `Admin Review rejected. Mismatch report returned. Remarks: ${remarks}`,
        req,
      });

      const actorName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Admin';
      notificationService.notifyInvoiceStatusChange(updatedInvoice, INVOICE_STATUS.REJECTED, actorName).catch(() => {});

      return updatedInvoice;
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // REJECT INVOICE (Team Lead / Manager / Finance Head)
  // ────────────────────────────────────────────────────────────────────────────
  async rejectInvoice(id, user, rejectionReason, req = null) {
    const invoice = await invoiceRepository.findById(id);
    if (!invoice) throw new ApiError(404, 'Invoice not found.');
    if (invoice.deleted_at) throw new ApiError(400, 'Cannot reject a deleted invoice.');

    const currentLevel = getCurrentApprovalLevel(invoice.status);

    if (!currentLevel || !['TEAM_LEAD', 'MANAGER', 'FINANCE_HEAD'].includes(currentLevel)) {
      throw new ApiError(400, 'Only pending invoices can be rejected.');
    }

    if (currentLevel === 'TEAM_LEAD'    && user.role !== ROLES.TEAM_LEAD)    throw new ApiError(403, 'Only Team Leads can reject at this level.');
    if (currentLevel === 'MANAGER'      && user.role !== ROLES.MANAGER)      throw new ApiError(403, 'Only Managers can reject at this level.');
    if (currentLevel === 'FINANCE_HEAD' && user.role !== ROLES.FINANCE_HEAD) throw new ApiError(403, 'Only Finance Heads can reject at this level.');

    const currentStatus = invoice.status;
    const nextStatus    = INVOICE_STATUS.REJECTED;

    if (!isValidStatusTransition(currentStatus, nextStatus)) {
      throw new ApiError(400, `Invalid workflow transition: ${currentStatus} → ${nextStatus}`);
    }

    const now = new Date();

    return invoiceRepository.transaction(async (tx) => {
      const updatedInvoice = await tx.invoice.update({
        where: { id },
        data: {
          status:                INVOICE_STATUS.REJECTED,
          current_approval_level: null,
          rejected_by_id:        user.id,
          rejected_at:           now,
          rejection_reason:      rejectionReason,
          updated_by_id:         user.id,
        },
        include: { vendor: true, purchase_order: true },
      });

      await writeAuditLog(tx, {
        entityId:   id,
        action:     'rejected',
        fromStatus: currentStatus,
        toStatus:   nextStatus,
        userId:     user.id,
        remarks:    `Rejected at ${currentLevel} level. Reason: ${rejectionReason}`,
        req,
      });

      const actorName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.role;
      notificationService.notifyInvoiceStatusChange(updatedInvoice, INVOICE_STATUS.REJECTED, actorName).catch(() => {});

      return updatedInvoice;
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // CANCEL INVOICE
  // ────────────────────────────────────────────────────────────────────────────
  async cancelInvoice(id, user, req = null) {
    const invoice = await invoiceRepository.findById(id);
    if (!invoice) throw new ApiError(404, 'Invoice not found.');
    if (invoice.deleted_at) throw new ApiError(400, 'Cannot cancel a deleted invoice.');

    if (invoice.created_by_id !== user.id && user.role !== ROLES.SUPER_ADMIN) {
      throw new ApiError(403, 'You do not have permission to cancel this invoice.');
    }

    const currentStatus = invoice.status;
    const nextStatus    = INVOICE_STATUS.CANCELLED;

    if (!isValidStatusTransition(currentStatus, nextStatus)) {
      throw new ApiError(400, `Cannot cancel invoice in ${currentStatus} status.`);
    }

    const now = new Date();

    return invoiceRepository.transaction(async (tx) => {
      const updatedInvoice = await tx.invoice.update({
        where: { id },
        data: {
          status:                INVOICE_STATUS.CANCELLED,
          current_approval_level: null,
          cancelled_at:          now,
          updated_by_id:         user.id,
        },
        include: { vendor: true, purchase_order: true },
      });

      await writeAuditLog(tx, {
        entityId:   id,
        action:     'cancelled',
        fromStatus: currentStatus,
        toStatus:   nextStatus,
        userId:     user.id,
        remarks:    'Invoice cancelled.',
        req,
      });

      const actorName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.role;
      notificationService.notifyInvoiceStatusChange(updatedInvoice, INVOICE_STATUS.CANCELLED, actorName).catch(() => {});

      return updatedInvoice;
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // SOFT DELETE INVOICE
  // Every role can delete based on permissions defined in routes
  // ────────────────────────────────────────────────────────────────────────────
  async softDeleteInvoice(id, user, deleteReason, req = null) {
    const invoice = await invoiceRepository.findById(id);
    if (!invoice) throw new ApiError(404, 'Invoice not found.');
    if (invoice.deleted_at) throw new ApiError(400, 'Invoice has already been deleted.');

    // Role-based delete permissions
    const canDelete = (
      user.role === ROLES.SUPER_ADMIN ||
      user.role === ROLES.FINANCE_HEAD ||
      (user.role === ROLES.CASE_MANAGER && invoice.created_by_id === user.id) ||
      (user.role === ROLES.TEAM_LEAD) ||
      (user.role === ROLES.MANAGER)
    );

    if (!canDelete) {
      throw new ApiError(403, 'You do not have permission to delete this invoice.');
    }

    // Cannot delete approved/paid invoices
    if (invoice.status === INVOICE_STATUS.APPROVED && invoice.payment_status === 'PAID') {
      throw new ApiError(400, 'Cannot delete a fully paid invoice.');
    }

    if (!deleteReason?.trim()) {
      throw new ApiError(400, 'Delete reason is required.');
    }

    const now = new Date();

    return invoiceRepository.transaction(async (tx) => {
      const updatedInvoice = await tx.invoice.update({
        where: { id },
        data: {
          deleted_at:    now,
          deleted_by_id: user.id,
          delete_reason: deleteReason,
          updated_by_id: user.id,
        },
        include: { vendor: true, purchase_order: true },
      });

      await writeAuditLog(tx, {
        entityId:   id,
        action:     'deleted',
        fromStatus: invoice.status,
        toStatus:   null,
        userId:     user.id,
        remarks:    `Soft deleted. Reason: ${deleteReason}`,
        req,
      });

      // Notify stakeholders
      const actorName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.role;
      notificationService.notifyTicketDeleted(invoice, actorName, deleteReason).catch(() => {});

      return { message: 'Invoice deleted successfully.', invoice: updatedInvoice };
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // RESTORE DELETED INVOICE
  // ────────────────────────────────────────────────────────────────────────────
  async restoreInvoice(id, user, req = null) {
    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new ApiError(404, 'Invoice not found.');
    if (!invoice.deleted_at) throw new ApiError(400, 'Invoice is not deleted.');

    if (![ROLES.SUPER_ADMIN, ROLES.FINANCE_HEAD].includes(user.role)) {
      throw new ApiError(403, 'Only Super Admin or Finance Head can restore deleted invoices.');
    }

    return invoiceRepository.transaction(async (tx) => {
      const restoredInvoice = await tx.invoice.update({
        where: { id },
        data: {
          deleted_at:    null,
          deleted_by_id: null,
          delete_reason: null,
          updated_by_id: user.id,
        },
        include: { vendor: true, purchase_order: true },
      });

      await writeAuditLog(tx, {
        entityId:   id,
        action:     'restored',
        fromStatus: null,
        toStatus:   invoice.status,
        userId:     user.id,
        remarks:    'Invoice restored from soft delete.',
        req,
      });

      return { message: 'Invoice restored successfully.', invoice: restoredInvoice };
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // PENDING QUERIES — Role-specific queues
  // ────────────────────────────────────────────────────────────────────────────
  async getPendingThreeWayMatch(query) {
    return this.listInvoices({ ...query, status: INVOICE_STATUS.PENDING_THREE_WAY_MATCH }, { role: ROLES.CASE_MANAGER });
  }

  async getPendingAdminReview(query) {
    return this.listInvoices({ ...query, status: INVOICE_STATUS.PENDING_ADMIN_REVIEW }, { role: ROLES.SUPER_ADMIN });
  }

  async getPendingTeamLead(query) {
    return this.listInvoices({ ...query, status: INVOICE_STATUS.PENDING_TEAM_LEAD, currentApprovalLevel: 'TEAM_LEAD' }, { role: ROLES.TEAM_LEAD });
  }

  async getPendingManager(query) {
    return this.listInvoices({ ...query, status: INVOICE_STATUS.PENDING_MANAGER, currentApprovalLevel: 'MANAGER' }, { role: ROLES.MANAGER });
  }

  async getPendingFinanceHead(query) {
    return this.listInvoices({ ...query, status: INVOICE_STATUS.PENDING_FINANCE_HEAD, currentApprovalLevel: 'FINANCE_HEAD' }, { role: ROLES.FINANCE_HEAD });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // APPROVAL HISTORY
  // ────────────────────────────────────────────────────────────────────────────
  async getApprovalHistory(invoiceId) {
    // Try new AuditLog first, fall back to legacy ApprovalLog
    const [auditLogs, approvalLogs] = await Promise.all([
      prisma.auditLog.findMany({
        where:   { entity_type: 'invoice', entity_id: invoiceId },
        orderBy: { created_at: 'asc' },
        include: {
          performed_by: {
            select: { id: true, email: true, first_name: true, last_name: true, role: true },
          },
        },
      }),
      approvalRepository.findByEntity('invoice', invoiceId),
    ]);

    // Merge and deduplicate by timestamp
    const combined = [...auditLogs, ...approvalLogs].sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at),
    );

    return combined;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // MY APPROVED / PENDING INVOICES
  // ────────────────────────────────────────────────────────────────────────────
  async getMyApprovedInvoices(query, user) {
    const page  = Number(query.page  || 1);
    const limit = Number(query.limit || 10);

    const where = {
      deleted_at: null,
      status:     INVOICE_STATUS.APPROVED,
      OR: [
        { created_by_id:          user.id },
        { team_lead_approver_id:  user.id },
        { manager_approver_id:    user.id },
        { finance_head_approver_id: user.id },
      ],
    };

    const result = await invoiceRepository.findAll({ where, skip: (page - 1) * limit, take: limit });
    return { invoices: result.invoices, total: result.total, page, limit, totalPages: Math.ceil(result.total / limit) };
  }

  async getMyPendingInvoices(query, user) {
    const page  = Number(query.page  || 1);
    const limit = Number(query.limit || 10);

    const pendingStatuses = [
      INVOICE_STATUS.PENDING_THREE_WAY_MATCH,
      INVOICE_STATUS.PENDING_ADMIN_REVIEW,
      INVOICE_STATUS.PENDING_TEAM_LEAD,
      INVOICE_STATUS.PENDING_MANAGER,
      INVOICE_STATUS.PENDING_FINANCE_HEAD,
    ];

    const where = {
      deleted_at: null,
      status:     { in: pendingStatuses },
      ...(user.role === ROLES.CASE_MANAGER && { created_by_id: user.id }),
    };

    if (user.role === ROLES.TEAM_LEAD) {
      where.current_approval_level = 'TEAM_LEAD';
    } else if (user.role === ROLES.MANAGER) {
      where.current_approval_level = 'MANAGER';
    } else if (user.role === ROLES.FINANCE_HEAD) {
      where.current_approval_level = 'FINANCE_HEAD';
    }

    const result = await invoiceRepository.findAll({ where, skip: (page - 1) * limit, take: limit });
    return { invoices: result.invoices, total: result.total, page, limit, totalPages: Math.ceil(result.total / limit) };
  }

  // ────────────────────────────────────────────────────────────────────────────
  // FINANCE HEAD OBSERVATION — view all tickets with full detail
  // ────────────────────────────────────────────────────────────────────────────
  async getFinanceHeadObservationDashboard(query) {
    const page   = Number(query.page   || 1);
    const limit  = Number(query.limit  || 20);
    const search = query.search || '';

    const where = {
      ...(query.status && { status: query.status }),
      ...(query.vendorId && { vendor_id: query.vendorId }),
      ...(query.paymentStatus && { payment_status: query.paymentStatus }),
      ...(search && {
        OR: [
          { invoice_number: { contains: search, mode: 'insensitive' } },
          { vendor: { name: { contains: search, mode: 'insensitive' } } },
          { purchase_order: { po_number: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    };

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip:    (page - 1) * limit,
        take:    limit,
        orderBy: query.sortBy
          ? { [query.sortBy]: query.sortOrder || 'desc' }
          : { created_at: 'desc' },
        include: {
          vendor:        { select: { id: true, name: true, vendor_code: true, email: true } },
          purchase_order: { select: { id: true, po_number: true, amount: true } },
          created_by:    { select: { id: true, first_name: true, last_name: true, email: true, role: true } },
          team_lead_approver:    { select: { id: true, first_name: true, last_name: true } },
          manager_approver:      { select: { id: true, first_name: true, last_name: true } },
          finance_head_approver: { select: { id: true, first_name: true, last_name: true } },
          rejected_by:           { select: { id: true, first_name: true, last_name: true } },
          three_way_matches:     true,
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    return {
      invoices,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Finance Head adds a remark (observation) to an invoice without modifying workflow
  async addFinanceHeadRemark(invoiceId, user, remark, req = null) {
    const invoice = await invoiceRepository.findById(invoiceId);
    if (!invoice) throw new ApiError(404, 'Invoice not found.');

    if (user.role !== ROLES.FINANCE_HEAD && user.role !== ROLES.SUPER_ADMIN) {
      throw new ApiError(403, 'Only Finance Head can add observation remarks.');
    }

    // Just write an audit log — do not change any workflow state
    await prisma.auditLog.create({
      data: {
        entity_type:     'invoice',
        entity_id:       invoiceId,
        action:          'observation_remark_added',
        performed_by_id: user.id,
        remarks:         remark,
        ip_address:      req?.ip || null,
        user_agent:      req?.headers?.['user-agent'] || null,
      },
    });

    return { message: 'Observation remark added successfully.' };
  }
}

export default new InvoiceService();
