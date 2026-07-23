<<<<<<< HEAD
=======
import ApiError from '../../utils/ApiError.js';
import notificationRepository from './notification.repository.js';
import prisma from '../../config/prisma.js';
import { ROLES } from '../../zodSchema/index.js';

// ─── Notification Type Constants ──────────────────────────────────────────────
export const NOTIFICATION_TYPES = {
  // Vendor
  VENDOR_APPROVED:  'vendor_approved',
  VENDOR_REJECTED:  'vendor_rejected',
  VENDOR_BLOCKED:   'vendor_blocked',

  // Invoice status
  INVOICE_CREATED:                'invoice_created',
  INVOICE_APPROVED:               'invoice_approved',
  INVOICE_REJECTED:               'invoice_rejected',
  INVOICE_CANCELLED:              'invoice_cancelled',

  // Workflow steps (new names)
  INVOICE_PENDING_THREE_WAY_MATCH: 'invoice_pending_three_way_match',
  INVOICE_PENDING_TEAM_LEAD:       'invoice_pending_team_lead',
  INVOICE_PENDING_MANAGER:         'invoice_pending_manager',
  INVOICE_PENDING_FINANCE_HEAD:    'invoice_pending_finance_head',

  // Legacy aliases (kept for backward compat)
  INVOICE_PENDING_L1: 'invoice_pending_team_lead',
  INVOICE_PENDING_L2: 'invoice_pending_manager',
  INVOICE_PENDING_L3: 'invoice_pending_finance_head',

  // Three-Way Matching
  THREE_WAY_MATCH_COMPLETED: 'three_way_match_completed',
  THREE_WAY_MATCH_MATCHED:   'three_way_match_matched',
  THREE_WAY_MATCH_UNMATCHED: 'three_way_match_unmatched',



  // Ticket Management
  TICKET_DELETED:    'ticket_deleted',
  TICKET_RESTORED:   'ticket_restored',

  // Workflow general
  WORKFLOW_MOVED:    'workflow_moved',

  // Payment
  PAYMENT_CREATED:   'payment_created',
  PAYMENT_APPROVED:  'payment_approved',
  PAYMENT_REJECTED:  'payment_rejected',
  PAYMENT_BLOCKED:   'payment_blocked',

  // PO
  PO_CREATED:        'po_created',
};

// ─── Role → DB role string mapping (for user lookup) ─────────────────────────
const ROLE_LEVEL_MAP = {
  TEAM_LEAD:    ROLES.TEAM_LEAD,
  MANAGER:      ROLES.MANAGER,
  FINANCE_HEAD: ROLES.FINANCE_HEAD,
  THREE_WAY_MATCH: null,  // Notify Case Manager
};

class NotificationService {
  // ────────────────────────────────────────────────────────────────────────────
  // GET / MARK NOTIFICATIONS
  // ────────────────────────────────────────────────────────────────────────────

  async getMyNotifications(userId, query) {
    const page   = Number(query.page  || 1);
    const limit  = Number(query.limit || 20);
    const isRead = query.isRead !== undefined ? query.isRead === 'true' : undefined;

    const result = await notificationRepository.findAll({
      userId,
      isRead,
      skip: (page - 1) * limit,
      take: limit,
    });

    return { ...result, page, limit, totalPages: Math.ceil(result.total / limit) };
  }

  async markAsRead(notificationId, userId) {
    const result = await notificationRepository.markAsRead(notificationId, userId);
    if (result.count === 0) {
      throw new ApiError(404, 'Notification not found or does not belong to you.');
    }
    return { message: 'Notification marked as read.' };
  }

  async markAllAsRead(userId) {
    await notificationRepository.markAllAsRead(userId);
    return { message: 'All notifications marked as read.' };
  }

  // ────────────────────────────────────────────────────────────────────────────
  // CREATE NOTIFICATION (internal)
  // ────────────────────────────────────────────────────────────────────────────

  async createNotification(userId, type, title, message, entityType = null, entityId = null) {
    try {
      return await notificationRepository.create({
        user_id:     userId,
        type,
        title,
        message,
        entity_type: entityType,
        entity_id:   entityId,
      });
    } catch (error) {
      console.error('[NotificationService] Failed to create notification:', error.message);
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // VENDOR NOTIFICATIONS
  // ────────────────────────────────────────────────────────────────────────────

  async notifyVendorStatusChange(vendor, newStatus, actorName) {
    if (!vendor.created_by_id) return;

    const typeMap = {
      approved: NOTIFICATION_TYPES.VENDOR_APPROVED,
      rejected: NOTIFICATION_TYPES.VENDOR_REJECTED,
      blocked:  NOTIFICATION_TYPES.VENDOR_BLOCKED,
    };

    const titleMap = {
      approved: ' Vendor Approved',
      rejected: ' Vendor Rejected',
      blocked:  ' Vendor Blocked',
    };

    const messageMap = {
      approved: `Your vendor "${vendor.name}" has been approved by ${actorName}. You can now create purchase orders.`,
      rejected: `Your vendor "${vendor.name}" has been rejected by ${actorName}. Please review and resubmit.`,
      blocked:  `Your vendor "${vendor.name}" has been blocked by ${actorName}.`,
    };

    await this.createNotification(
      vendor.created_by_id,
      typeMap[newStatus],
      titleMap[newStatus],
      messageMap[newStatus],
      'vendor',
      vendor.id,
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // INVOICE STATUS CHANGE NOTIFICATIONS (notify creator)
  // ────────────────────────────────────────────────────────────────────────────

  async notifyInvoiceStatusChange(invoice, newStatus, actorName) {
    if (!invoice.created_by_id) return;

    const s = (newStatus || '').toUpperCase();

    const typeMap = {
      PENDING_THREE_WAY_MATCH: NOTIFICATION_TYPES.INVOICE_PENDING_THREE_WAY_MATCH,
      PENDING_TEAM_LEAD:       NOTIFICATION_TYPES.INVOICE_PENDING_TEAM_LEAD,
      PENDING_MANAGER:         NOTIFICATION_TYPES.INVOICE_PENDING_MANAGER,
      PENDING_FINANCE_HEAD:    NOTIFICATION_TYPES.INVOICE_PENDING_FINANCE_HEAD,
      APPROVED:                NOTIFICATION_TYPES.INVOICE_APPROVED,
      REJECTED:                NOTIFICATION_TYPES.INVOICE_REJECTED,
      CANCELLED:               NOTIFICATION_TYPES.INVOICE_CANCELLED,
    };

    const titleMap = {
      PENDING_THREE_WAY_MATCH: ' Three-Way Matching Required',
      PENDING_TEAM_LEAD:       ' Pending Team Lead Approval',
      PENDING_MANAGER:         ' Pending Manager Approval',
      PENDING_FINANCE_HEAD:    ' Pending Finance Head Approval',
      APPROVED:                ' Invoice Approved',
      REJECTED:                ' Invoice Rejected',
      CANCELLED:               ' Invoice Cancelled',
    };

    const messageMap = {
      PENDING_THREE_WAY_MATCH: `Invoice ${invoice.invoice_number} is ready for Three-Way Matching.`,
      PENDING_TEAM_LEAD:       `Invoice ${invoice.invoice_number} has been forwarded to Team Lead for approval.`,
      PENDING_MANAGER:         `Invoice ${invoice.invoice_number} has been forwarded to Manager for approval.`,
      PENDING_FINANCE_HEAD:    `Invoice ${invoice.invoice_number} has been forwarded to Finance Head for approval.`,
      APPROVED:                `Invoice ${invoice.invoice_number} has been fully approved by ${actorName}. Payment can now be processed.`,
      REJECTED:                `Invoice ${invoice.invoice_number} has been rejected by ${actorName}. Reason: ${invoice.rejection_reason || 'None'}`,
      CANCELLED:               `Invoice ${invoice.invoice_number} has been cancelled by ${actorName}.`,
    };

    const type    = typeMap[s]    || NOTIFICATION_TYPES.WORKFLOW_MOVED;
    const title   = titleMap[s]   || '🔄 Invoice Status Updated';
    const message = messageMap[s] || `Invoice ${invoice.invoice_number} status changed to ${newStatus}.`;

    await this.createNotification(invoice.created_by_id, type, title, message, 'invoice', invoice.id);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // NOTIFY NEXT LEVEL (broadcast to all users with the required role)
  // ────────────────────────────────────────────────────────────────────────────

  async notifyInvoiceNextLevel(invoice, nextLevel) {
    try {
      // Map level name to DB role value
      const levelToRole = {
        TEAM_LEAD:    ROLES.TEAM_LEAD,
        MANAGER:      ROLES.MANAGER,
        FINANCE_HEAD: ROLES.FINANCE_HEAD,
        // Legacy
        L1: ROLES.TEAM_LEAD,
        L2: ROLES.MANAGER,
        L3: ROLES.FINANCE_HEAD,
      };

      const dbRole = levelToRole[nextLevel];
      if (!dbRole) return;

      const users = await prisma.user.findMany({
        where:  { role: dbRole, status: 'ACTIVE', deleted_at: null },
        select: { id: true },
      });

      if (!users || users.length === 0) return;

      const typeMap = {
        TEAM_LEAD:    NOTIFICATION_TYPES.INVOICE_PENDING_TEAM_LEAD,
        MANAGER:      NOTIFICATION_TYPES.INVOICE_PENDING_MANAGER,
        FINANCE_HEAD: NOTIFICATION_TYPES.INVOICE_PENDING_FINANCE_HEAD,
      };

      const humanLabel = {
        TEAM_LEAD:    'Team Lead',
        MANAGER:      'Manager',
        FINANCE_HEAD: 'Finance Head',
      };

      const notifications = users.map((user) => ({
        user_id:     user.id,
        type:        typeMap[nextLevel] || NOTIFICATION_TYPES.WORKFLOW_MOVED,
        title:       ` New Invoice Pending ${humanLabel[nextLevel] || nextLevel} Approval`,
        message:     `Invoice ${invoice.invoice_number} for ${invoice.currency} ${invoice.amount} requires your ${humanLabel[nextLevel] || nextLevel} approval.`,
        entity_type: 'invoice',
        entity_id:   invoice.id,
        is_read:     false,
      }));

      await notificationRepository.createMany(notifications);
    } catch (error) {
      console.error('[NotificationService] notifyInvoiceNextLevel failed:', error.message);
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // THREE-WAY MATCHING NOTIFICATIONS
  // ────────────────────────────────────────────────────────────────────────────

  async notifyMatchingCompleted(invoice, matchStatus, matchPercentage) {
    try {
      // Notify all Team Leads (Next level in workflow)
      const teamLeads = await prisma.user.findMany({
        where:  { role: ROLES.TEAM_LEAD, status: 'ACTIVE', deleted_at: null },
        select: { id: true },
      });

      if (!teamLeads || teamLeads.length === 0) return;

      const isMatched = matchStatus === 'MATCHED';
      const notifications = teamLeads.map((tl) => ({
        user_id:     tl.id,
        type:        isMatched ? NOTIFICATION_TYPES.THREE_WAY_MATCH_MATCHED : NOTIFICATION_TYPES.THREE_WAY_MATCH_UNMATCHED,
        title:       isMatched
          ? ` Three-Way Match: MATCHED (${matchPercentage}%)`
          : ` Three-Way Match: UNMATCHED (${matchPercentage}%)`,
        message:     isMatched
          ? `Invoice ${invoice.invoice_number} has passed Three-Way Matching (${matchPercentage}% match). Awaiting your Team Lead approval.`
          : `Invoice ${invoice.invoice_number} has FAILED Three-Way Matching (${matchPercentage}% match). Please review the mismatch report.`,
        entity_type: 'invoice',
        entity_id:   invoice.id,
        is_read:     false,
      }));

      await notificationRepository.createMany(notifications);
    } catch (error) {
      console.error('[NotificationService] notifyMatchingCompleted failed:', error.message);
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // TICKET DELETION NOTIFICATION
  // ────────────────────────────────────────────────────────────────────────────

  async notifyTicketDeleted(invoice, actorName, deleteReason) {
    // Notify Finance Head users
    try {
      const financeHeads = await prisma.user.findMany({
        where:  { role: ROLES.FINANCE_HEAD, status: 'ACTIVE', deleted_at: null },
        select: { id: true },
      });

      const notifications = [];

      // Notify Finance Heads
      for (const fh of financeHeads) {
        notifications.push({
          user_id:     fh.id,
          type:        NOTIFICATION_TYPES.TICKET_DELETED,
          title:       '🗑️ Invoice Deleted',
          message:     `Invoice ${invoice.invoice_number} was deleted by ${actorName}. Reason: ${deleteReason}`,
          entity_type: 'invoice',
          entity_id:   invoice.id,
          is_read:     false,
        });
      }

      // Notify creator
      if (invoice.created_by_id) {
        notifications.push({
          user_id:     invoice.created_by_id,
          type:        NOTIFICATION_TYPES.TICKET_DELETED,
          title:       '🗑️ Invoice Deleted',
          message:     `Your invoice ${invoice.invoice_number} was deleted by ${actorName}. Reason: ${deleteReason}`,
          entity_type: 'invoice',
          entity_id:   invoice.id,
          is_read:     false,
        });
      }

      if (notifications.length > 0) {
        await notificationRepository.createMany(notifications);
      }
    } catch (error) {
      console.error('[NotificationService] notifyTicketDeleted failed:', error.message);
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // PAYMENT NOTIFICATIONS
  // ────────────────────────────────────────────────────────────────────────────

  async notifyPaymentStatusChange(payment, newStatus, actorName) {
    if (!payment.created_by_id) return;

    const statusKey = String(newStatus).toLowerCase();

    const typeMap = {
      pending:   NOTIFICATION_TYPES.PAYMENT_CREATED,
      initiated: NOTIFICATION_TYPES.PAYMENT_APPROVED,
      approved:  NOTIFICATION_TYPES.PAYMENT_APPROVED,
      rejected:  NOTIFICATION_TYPES.PAYMENT_REJECTED,
      failed:    NOTIFICATION_TYPES.PAYMENT_REJECTED,
      blocked:   NOTIFICATION_TYPES.PAYMENT_BLOCKED,
      cancelled: NOTIFICATION_TYPES.INVOICE_CANCELLED,
      refunded:  NOTIFICATION_TYPES.PAYMENT_APPROVED,
    };

    const titleMap = {
      pending:   ' Payment Requested',
      initiated: ' Payment Initiated',
      approved:  ' Payment Approved',
      rejected:  ' Payment Rejected',
      failed:    ' Payment Gateway Failed',
      blocked:   ' Payment Blocked',
      cancelled: ' Payment Cancelled',
      refunded:  ' Payment Refunded',
    };

    const messageMap = {
      pending:   `Payment of ${payment.currency} ${payment.amount} has been requested.`,
      initiated: `Payment of ${payment.currency} ${payment.amount} has been initiated by ${actorName}.`,
      approved:  `Payment of ${payment.currency} ${payment.amount} has been approved by ${actorName}.`,
      rejected:  `Payment of ${payment.currency} ${payment.amount} has been rejected by ${actorName}.`,
      failed:    `Payment of ${payment.currency} ${payment.amount} has failed gateway verification.`,
      blocked:   `Payment of ${payment.currency} ${payment.amount} has been blocked by ${actorName}.`,
      cancelled: `Payment of ${payment.currency} ${payment.amount} has been cancelled by ${actorName}.`,
      refunded:  `Payment of ${payment.currency} ${payment.amount} has been refunded by ${actorName}.`,
    };

    const type    = typeMap[statusKey]    || NOTIFICATION_TYPES.PAYMENT_CREATED;
    const title   = titleMap[statusKey]   || 'Payment Status Update';
    const message = messageMap[statusKey] || `Payment status changed to ${newStatus}.`;

    await this.createNotification(payment.created_by_id, type, title, message, 'payment', payment.id);
  }
}

export default new NotificationService();
>>>>>>> a88ae1768d12205223891c6a6c1f656438518083
