import ApiError from '../../utils/ApiError.js';
import invoiceRepository from './invoice.repository.js';
import vendorRepository from '../vendors/vendor.repository.js';
import purchaseOrderRepository from '../purchase-orders/po.repository.js';
import approvalRepository from '../approvals/approval.repository.js';
import notificationService from '../notifications/notification.service.js';
import { ROLES } from '../../zodSchema/index.js';
import {
  INVOICE_STATUS,
  getRequiredInvoiceApprovalRole,
  getNextApprovalStatus,
  isValidStatusTransition,
  getCurrentApprovalLevel,
} from '../../utils/approval-helper.js';
import { VENDOR_MESSAGES, VENDOR_STATUS } from '../vendors/vendor.constants.js';

export { INVOICE_STATUS } from '../../utils/approval-helper.js';

class InvoiceService {
  /**
   * Create a new Invoice.
   * Default status is PENDING_L1.
   */
  async createInvoice(payload, user) {
    // 1. Verify Vendor
    const vendor = await vendorRepository.findById(payload.vendorId);
    if (!vendor) {
      throw new ApiError(404, VENDOR_MESSAGES.NOT_FOUND);
    }

    if (vendor.status !== VENDOR_STATUS.APPROVED) {
      throw new ApiError(400, 'Invoice can only be created for an approved vendor.');
    }

    if (user.role === ROLES.CASE_MANAGER && vendor.created_by_id !== user.id) {
      throw new ApiError(403, 'You can only create invoices for vendors created by you.');
    }

    // 2. Verify Purchase Order
    const purchaseOrder = await purchaseOrderRepository.findById(payload.purchaseOrderId);
    if (!purchaseOrder) {
      throw new ApiError(404, 'Purchase order not found.');
    }

    if (purchaseOrder.vendor_id !== payload.vendorId) {
      throw new ApiError(400, 'Purchase order does not belong to the selected vendor.');
    }

    if (purchaseOrder.status === 'cancelled') {
      throw new ApiError(400, 'Invoice cannot be created for a cancelled purchase order.');
    }

    // 3. Determine Approval Level
    const requiredApprovalRole = getRequiredInvoiceApprovalRole(payload.amount);

    return invoiceRepository.transaction(async (tx) => {
      // Create the Invoice in DB
      const invoice = await tx.invoice.create({
        data: {
          invoice_number: payload.invoiceNumber || `INV-${Date.now()}`,
          vendor_id: payload.vendorId,
          purchase_order_id: payload.purchaseOrderId,
          created_by_id: user.id,
          updated_by_id: user.id,
          amount: payload.amount,
          currency: payload.currency || 'INR',
          status: INVOICE_STATUS.PENDING_L1,
          required_approval_role: requiredApprovalRole,
          current_approval_level: 'L1',
          invoice_date: payload.invoiceDate || new Date(),
          due_date: payload.dueDate ? new Date(payload.dueDate) : null,
          description: payload.description || null,
          invoice_total: payload.amount,
          paid_amount: 0.00,
          remaining_amount: payload.amount,
          payment_status: 'UNPAID',
        },
        include: {
          vendor: true,
          purchase_order: true,
        },
      });

      // Log the submission action
      await tx.approvalLog.create({
        data: {
          entity_type: 'invoice',
          entity_id: invoice.id,
          action: 'submitted',
          from_status: null,
          to_status: INVOICE_STATUS.PENDING_L1,
          performed_by_id: user.id,
          remarks: 'Invoice submitted and initialized to Level 1 Approval queue.',
        },
      });

      // Fire notification to L1 team
      notificationService.notifyInvoiceNextLevel(invoice, 'L1').catch(() => {});

      return invoice;
    });
  }

  /**
   * List all invoices with optional filters and pagination.
   * Supports backward compatibility with legacy 'pending' statuses.
   */
  async listInvoices(query, user) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 10);

    const where = {
      ...(query.vendorId && { vendor_id: query.vendorId }),
      ...(query.purchaseOrderId && { purchase_order_id: query.purchaseOrderId }),
      ...(query.requiredApprovalRole && { required_approval_role: query.requiredApprovalRole }),
      ...(query.paymentStatus && { payment_status: query.paymentStatus }),
      // Case managers can only see their own created invoices
      ...(user.role === ROLES.CASE_MANAGER && { created_by_id: user.id }),
    };

    // Construct status filter (mapping PENDING_L1 queries to include legacy lowercase 'pending')
    if (query.status) {
      if (query.status === INVOICE_STATUS.PENDING_L1) {
        where.status = { in: [INVOICE_STATUS.PENDING_L1, 'pending', 'PENDING'] };
      } else {
        where.status = query.status;
      }
    }

    // Construct current level filter (for L1, it can be 'L1' or null if legacy pending status)
    if (query.currentApprovalLevel) {
      if (query.currentApprovalLevel === 'L1') {
        where.AND = [
          ...(where.AND || []),
          {
            OR: [
              { current_approval_level: 'L1' },
              {
                AND: [
                  { current_approval_level: null },
                  { status: { in: [INVOICE_STATUS.PENDING_L1, 'pending', 'PENDING'] } }
                ]
              }
            ]
          }
        ];
      } else {
        where.current_approval_level = query.currentApprovalLevel;
      }
    }

    const result = await invoiceRepository.findAll({
      where,
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      invoices: result.invoices,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    };
  }

  /**
   * Get invoice details by ID.
   */
  async getInvoiceById(id, user) {
    const invoice = await invoiceRepository.findById(id);
    if (!invoice) {
      throw new ApiError(404, 'Invoice not found.');
    }

    if (user.role === ROLES.CASE_MANAGER && invoice.created_by_id !== user.id) {
      throw new ApiError(403, 'You can only access invoices created by you.');
    }

    return invoice;
  }

  /**
   * Approve an Invoice at the current pending level.
   */
  async approveInvoice(id, user, remarks) {
    const invoice = await invoiceRepository.findById(id);
    if (!invoice) {
      throw new ApiError(404, 'Invoice not found.');
    }

    // Dynamic current level fallback for legacy records
    let currentLevel = invoice.current_approval_level;
    if (!currentLevel) {
      currentLevel = getCurrentApprovalLevel(invoice.status);
    }

    if (!currentLevel) {
      throw new ApiError(400, 'This invoice does not require any pending approvals.');
    }

    // Role Checks
    if (currentLevel === 'L1' && user.role !== ROLES.L1) {
      throw new ApiError(403, 'Only L1 Managers can approve at Level 1.');
    }
    if (currentLevel === 'L2' && user.role !== ROLES.L2) {
      throw new ApiError(403, 'Only L2 Managers can approve at Level 2.');
    }
    if (currentLevel === 'L3' && user.role !== ROLES.L3) {
      throw new ApiError(403, 'Only L3 Managers can approve at Level 3.');
    }

    // Duplicate Approval Safety
    if (currentLevel === 'L1' && invoice.l1_approver_id) {
      throw new ApiError(400, 'Invoice has already been approved at Level 1.');
    }
    if (currentLevel === 'L2' && invoice.l2_approver_id) {
      throw new ApiError(400, 'Invoice has already been approved at Level 2.');
    }
    if (currentLevel === 'L3' && invoice.l3_approver_id) {
      throw new ApiError(400, 'Invoice has already been approved at Level 3.');
    }

    const currentStatus = invoice.status;
    const nextStatus = getNextApprovalStatus(invoice.amount, currentStatus);

    if (!isValidStatusTransition(currentStatus, nextStatus)) {
      throw new ApiError(400, `Invalid workflow status transition from ${currentStatus} to ${nextStatus}.`);
    }

    const requiredApprovalLevel = getRequiredInvoiceApprovalRole(invoice.amount);
    const now = new Date();
    const updateData = {
      status: nextStatus,
      updated_by_id: user.id,
    };

    // Store approval details per level
    if (currentLevel === 'L1') {
      updateData.l1_approver_id = user.id;
      updateData.l1_approved_at = now;
      updateData.l1_remarks = remarks || '';
      updateData.current_approval_level = nextStatus === INVOICE_STATUS.APPROVED ? null : 'L2';
    } else if (currentLevel === 'L2') {
      updateData.l2_approver_id = user.id;
      updateData.l2_approved_at = now;
      updateData.l2_remarks = remarks || '';
      updateData.current_approval_level = nextStatus === INVOICE_STATUS.APPROVED ? null : 'L3';
    } else if (currentLevel === 'L3') {
      updateData.l3_approver_id = user.id;
      updateData.l3_approved_at = now;
      updateData.l3_remarks = remarks || '';
      updateData.current_approval_level = null;
    }

    if (nextStatus === INVOICE_STATUS.APPROVED) {
      updateData.final_approved_at = now;
    }

    // Print pre-approval logs for debugging
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('[Workflow Debug] Before Approval');
      console.log(`  Invoice ID             : ${id}`);
      console.log(`  Amount                 : ${invoice.amount}`);
      console.log(`  Current Status         : ${currentStatus}`);
      console.log(`  Current Approval Level : ${currentLevel}`);
      console.log(`  Required Approval Level: ${requiredApprovalLevel}`);
      console.log(`  Current User Role      : ${user.role}`);
      console.log(`  Next Status            : ${nextStatus}`);
      console.log(`  Update Data            : ${JSON.stringify(updateData, null, 2)}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }

    return invoiceRepository.transaction(async (tx) => {
      const updatedInvoice = await tx.invoice.update({
        where: { id },
        data: updateData,
        include: {
          vendor: true,
          purchase_order: true,
        },
      });

      // Print post-approval database response logs
      if (process.env.NODE_ENV !== 'production') {
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('[Workflow Debug] Database Response');
        console.log(`  Updated Invoice ID     : ${updatedInvoice.id}`);
        console.log(`  New Status             : ${updatedInvoice.status}`);
        console.log(`  New Approval Level     : ${updatedInvoice.current_approval_level}`);
        console.log(`  L1 Approver            : ${updatedInvoice.l1_approver_id}`);
        console.log(`  L2 Approver            : ${updatedInvoice.l2_approver_id}`);
        console.log(`  L3 Approver            : ${updatedInvoice.l3_approver_id}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      }

      // Log the approval action
      await tx.approvalLog.create({
        data: {
          entity_type: 'invoice',
          entity_id: id,
          action: 'approved',
          from_status: currentStatus,
          to_status: nextStatus,
          performed_by_id: user.id,
          remarks: `Approved at Level ${currentLevel}. Remarks: ${remarks || 'None'}`,
        },
      });

      // Notify relevant users
      const actorName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.role;
      if (nextStatus === INVOICE_STATUS.APPROVED) {
        notificationService.notifyInvoiceStatusChange(updatedInvoice, INVOICE_STATUS.APPROVED, actorName).catch(() => {});
      } else {
        // Notify the next level L2 / L3
        notificationService.notifyInvoiceNextLevel(updatedInvoice, updatedInvoice.current_approval_level).catch(() => {});
      }

      return updatedInvoice;
    });
  }

  /**
   * Reject an Invoice.
   */
  async rejectInvoice(id, user, rejectionReason) {
    const invoice = await invoiceRepository.findById(id);
    if (!invoice) {
      throw new ApiError(404, 'Invoice not found.');
    }

    // Dynamic current level fallback for legacy records
    let currentLevel = invoice.current_approval_level;
    if (!currentLevel) {
      currentLevel = getCurrentApprovalLevel(invoice.status);
    }

    if (!currentLevel) {
      throw new ApiError(400, 'Only pending invoices can be rejected.');
    }

    // Role Checks
    if (currentLevel === 'L1' && user.role !== ROLES.L1) {
      throw new ApiError(403, 'Only L1 Managers can reject at Level 1.');
    }
    if (currentLevel === 'L2' && user.role !== ROLES.L2) {
      throw new ApiError(403, 'Only L2 Managers can reject at Level 2.');
    }
    if (currentLevel === 'L3' && user.role !== ROLES.L3) {
      throw new ApiError(403, 'Only L3 Managers can reject at Level 3.');
    }

    const currentStatus = invoice.status;
    const nextStatus = INVOICE_STATUS.REJECTED;

    if (!isValidStatusTransition(currentStatus, nextStatus)) {
      throw new ApiError(400, `Invalid workflow status transition from ${currentStatus} to ${nextStatus}.`);
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('[Service] rejectInvoice — Before Database Update');
      console.log(`  Invoice ID       : ${id}`);
      console.log(`  Update Payload   :`, JSON.stringify({
        status: nextStatus,
        current_approval_level: null,
        rejected_by_id: user.id,
        rejected_at: new Date(),
        rejection_reason: rejectionReason,
        updated_by_id: user.id,
      }, null, 2));
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }

    return invoiceRepository.transaction(async (tx) => {
      const updatedInvoice = await tx.invoice.update({
        where: { id },
        data: {
          status: nextStatus,
          current_approval_level: null,
          rejected_by_id: user.id,
          rejected_at: new Date(),
          rejection_reason: rejectionReason,
          updated_by_id: user.id,
        },
        include: {
          vendor: true,
          purchase_order: true,
        },
      });

      if (process.env.NODE_ENV !== 'production') {
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('[Service] rejectInvoice — After Database Update (Updated Invoice)');
        console.log(`  Invoice ID             : ${updatedInvoice.id}`);
        console.log(`  New Status             : ${updatedInvoice.status}`);
        console.log(`  New Approval Level     : ${updatedInvoice.current_approval_level}`);
        console.log(`  Rejected By ID         : ${updatedInvoice.rejected_by_id}`);
        console.log(`  Rejection Reason       : "${updatedInvoice.rejection_reason}"`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      }

      // Log the rejection action
      await tx.approvalLog.create({
        data: {
          entity_type: 'invoice',
          entity_id: id,
          action: 'rejected',
          from_status: currentStatus,
          to_status: nextStatus,
          performed_by_id: user.id,
          remarks: `Rejected at Level ${currentLevel}. Reason: ${rejectionReason}`,
        },
      });

      // Notify creator
      const actorName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.role;
      notificationService.notifyInvoiceStatusChange(updatedInvoice, INVOICE_STATUS.REJECTED, actorName).catch(() => {});

      return updatedInvoice;
    });
  }

  /**
   * Cancel an Invoice.
   */
  async cancelInvoice(id, user) {
    const invoice = await invoiceRepository.findById(id);
    if (!invoice) {
      throw new ApiError(404, 'Invoice not found.');
    }

    // Only creator of invoice or Admin can cancel
    if (invoice.created_by_id !== user.id && user.role !== ROLES.SUPER_ADMIN) {
      throw new ApiError(403, 'You do not have permission to cancel this invoice.');
    }

    const currentStatus = invoice.status;
    const nextStatus = INVOICE_STATUS.CANCELLED;

    if (!isValidStatusTransition(currentStatus, nextStatus)) {
      throw new ApiError(400, `Cannot cancel invoice in ${currentStatus} status.`);
    }

    return invoiceRepository.transaction(async (tx) => {
      const updatedInvoice = await tx.invoice.update({
        where: { id },
        data: {
          status: nextStatus,
          current_approval_level: null,
          cancelled_at: new Date(),
          updated_by_id: user.id,
        },
        include: {
          vendor: true,
          purchase_order: true,
        },
      });

      // Log the cancellation action
      await tx.approvalLog.create({
        data: {
          entity_type: 'invoice',
          entity_id: id,
          action: 'cancelled',
          from_status: currentStatus,
          to_status: nextStatus,
          performed_by_id: user.id,
          remarks: 'Invoice cancelled by user.',
        },
      });

      // Notify stakeholders
      const actorName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.role;
      notificationService.notifyInvoiceStatusChange(updatedInvoice, INVOICE_STATUS.CANCELLED, actorName).catch(() => {});

      return updatedInvoice;
    });
  }

  /**
   * Get pending L1 approval invoices
   */
  async getPendingL1(query) {
    return this.listInvoices({ ...query, status: INVOICE_STATUS.PENDING_L1, currentApprovalLevel: 'L1' }, { role: 'L1' });
  }

  /**
   * Get pending L2 approval invoices
   */
  async getPendingL2(query) {
    return this.listInvoices({ ...query, status: INVOICE_STATUS.PENDING_L2, currentApprovalLevel: 'L2' }, { role: 'L2' });
  }

  /**
   * Get pending L3 approval invoices
   */
  async getPendingL3(query) {
    return this.listInvoices({ ...query, status: INVOICE_STATUS.PENDING_L3, currentApprovalLevel: 'L3' }, { role: 'L3' });
  }

  /**
   * Get approval logs/history of an invoice
   */
  async getApprovalHistory(invoiceId) {
    return approvalRepository.findByEntity('invoice', invoiceId);
  }

  /**
   * Get invoices created by Case Manager that are Approved, OR invoices reviewed by an L1/L2/L3 approver that are Approved
   */
  async getMyApprovedInvoices(query, user) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 10);

    const where = {
      status: INVOICE_STATUS.APPROVED,
      OR: [
        { created_by_id: user.id },
        { l1_approver_id: user.id },
        { l2_approver_id: user.id },
        { l3_approver_id: user.id },
      ],
    };

    const result = await invoiceRepository.findAll({
      where,
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      invoices: result.invoices,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    };
  }

  /**
   * Get invoices that are currently pending in any workflow step.
   * Robust support for legacy status string 'pending' (lowercase).
   */
  async getMyPendingInvoices(query, user) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 10);

    const where = {
      status: {
        in: [
          INVOICE_STATUS.PENDING_L1,
          INVOICE_STATUS.PENDING_L2,
          INVOICE_STATUS.PENDING_L3,
          'pending',
          'PENDING',
        ],
      },
      ...(user.role === ROLES.CASE_MANAGER && { created_by_id: user.id }),
    };

    if ([ROLES.L1, ROLES.L2, ROLES.L3].includes(user.role)) {
      if (user.role === ROLES.L1) {
        where.AND = [
          {
            OR: [
              { current_approval_level: 'L1' },
              {
                AND: [
                  { current_approval_level: null },
                  { status: { in: [INVOICE_STATUS.PENDING_L1, 'pending', 'PENDING'] } }
                ]
              }
            ]
          }
        ];
      } else {
        where.current_approval_level = user.role;
      }
    }

    const result = await invoiceRepository.findAll({
      where,
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      invoices: result.invoices,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    };
  }
}

export default new InvoiceService();
