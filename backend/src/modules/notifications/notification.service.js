import ApiError from '../../utils/ApiError.js';
import notificationRepository from './notification.repository.js';
import prisma from '../../config/prisma.js';

export const NOTIFICATION_TYPES = {
  VENDOR_APPROVED: 'vendor_approved',
  VENDOR_REJECTED: 'vendor_rejected',
  VENDOR_BLOCKED: 'vendor_blocked',
  INVOICE_APPROVED: 'invoice_approved',
  INVOICE_REJECTED: 'invoice_rejected',
  INVOICE_CANCELLED: 'invoice_cancelled',
  INVOICE_PENDING_L1: 'invoice_pending_l1',
  INVOICE_PENDING_L2: 'invoice_pending_l2',
  INVOICE_PENDING_L3: 'invoice_pending_l3',
  PAYMENT_APPROVED: 'payment_approved',
  PAYMENT_REJECTED: 'payment_rejected',
  PAYMENT_BLOCKED: 'payment_blocked',
  PO_CREATED: 'po_created',
  INVOICE_CREATED: 'invoice_created',
  PAYMENT_CREATED: 'payment_created',
};

class NotificationService {
  /**
   * Get notifications for the logged-in user.
   */
  async getMyNotifications(userId, query) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const isRead = query.isRead !== undefined ? query.isRead === 'true' : undefined;

    const result = await notificationRepository.findAll({
      userId,
      isRead,
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      ...result,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    };
  }

  /**
   * Mark a single notification as read (must belong to user).
   */
  async markAsRead(notificationId, userId) {
    const result = await notificationRepository.markAsRead(notificationId, userId);
    if (result.count === 0) {
      throw new ApiError(404, 'Notification not found or does not belong to you.');
    }
    return { message: 'Notification marked as read.' };
  }

  /**
   * Mark all notifications as read for the user.
   */
  async markAllAsRead(userId) {
    await notificationRepository.markAllAsRead(userId);
    return { message: 'All notifications marked as read.' };
  }

  /**
   * Create a notification (called internally by other services).
   */
  async createNotification(userId, type, title, message, entityType = null, entityId = null) {
    try {
      return await notificationRepository.create({
        user_id: userId,
        type,
        title,
        message,
        entity_type: entityType,
        entity_id: entityId,
      });
    } catch (error) {
      console.error('[NotificationService] Failed to create notification:', error.message);
    }
  }

  /**
   * Notify vendor creator when their vendor is approved/rejected/blocked.
   */
  async notifyVendorStatusChange(vendor, newStatus, actorName) {
    if (!vendor.created_by_id) return;

    const typeMap = {
      approved: NOTIFICATION_TYPES.VENDOR_APPROVED,
      rejected: NOTIFICATION_TYPES.VENDOR_REJECTED,
      blocked: NOTIFICATION_TYPES.VENDOR_BLOCKED,
    };

    const titleMap = {
      approved: '✅ Vendor Approved',
      rejected: '❌ Vendor Rejected',
      blocked: '🚫 Vendor Blocked',
    };

    const messageMap = {
      approved: `Your vendor "${vendor.name}" has been approved by ${actorName}. You can now create purchase orders.`,
      rejected: `Your vendor "${vendor.name}" has been rejected by ${actorName}. Please review and resubmit.`,
      blocked: `Your vendor "${vendor.name}" has been blocked by ${actorName}.`,
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

  /**
   * Notify invoice creator when their invoice is approved/rejected/cancelled.
   */
  async notifyInvoiceStatusChange(invoice, newStatus, actorName) {
    if (!invoice.created_by_id) return;

    const normalizedStatus = newStatus.toUpperCase();

    let type = NOTIFICATION_TYPES.INVOICE_APPROVED;
    let title = '✅ Invoice Approved';
    let msg = `Invoice ${invoice.invoice_number} has been fully approved by ${actorName}. Payment can now be processed.`;

    if (normalizedStatus === 'REJECTED') {
      type = NOTIFICATION_TYPES.INVOICE_REJECTED;
      title = '❌ Invoice Rejected';
      msg = `Invoice ${invoice.invoice_number} has been rejected by ${actorName}. Reason: ${invoice.rejection_reason || 'None'}`;
    } else if (normalizedStatus === 'CANCELLED') {
      type = NOTIFICATION_TYPES.INVOICE_CANCELLED;
      title = '🚫 Invoice Cancelled';
      msg = `Invoice ${invoice.invoice_number} has been cancelled by ${actorName}.`;
    }

    await this.createNotification(invoice.created_by_id, type, title, msg, 'invoice', invoice.id);
  }

  /**
   * Notify users of a role about an invoice pending their level of approval.
   */
  async notifyInvoiceNextLevel(invoice, nextLevel) {
    try {
      const users = await prisma.user.findMany({
        where: { role: nextLevel, is_active: true, deleted_at: null },
        select: { id: true },
      });

      if (!users || users.length === 0) return;

      const typeMap = {
        L1: NOTIFICATION_TYPES.INVOICE_PENDING_L1,
        L2: NOTIFICATION_TYPES.INVOICE_PENDING_L2,
        L3: NOTIFICATION_TYPES.INVOICE_PENDING_L3,
      };

      const notifications = users.map((user) => ({
        user_id: user.id,
        type: typeMap[nextLevel] || NOTIFICATION_TYPES.INVOICE_PENDING_L1,
        title: `📥 Pending Level ${nextLevel} Approval`,
        message: `Invoice ${invoice.invoice_number} for amount ${invoice.currency} ${invoice.amount} requires your Level ${nextLevel} approval.`,
        entity_type: 'invoice',
        entity_id: invoice.id,
        is_read: false,
      }));

      await notificationRepository.createMany(notifications);
    } catch (error) {
      console.error('[NotificationService] Failed to notify next level:', error.message);
    }
  }

  /**
   * Notify payment creator when their payment is approved/rejected/blocked.
   */
  async notifyPaymentStatusChange(payment, newStatus, actorName) {
    if (!payment.created_by_id) return;

    const statusKey = String(newStatus).toLowerCase();

    const typeMap = {
      pending: NOTIFICATION_TYPES.PAYMENT_CREATED,
      initiated: NOTIFICATION_TYPES.PAYMENT_APPROVED,
      approved: NOTIFICATION_TYPES.PAYMENT_APPROVED,
      rejected: NOTIFICATION_TYPES.PAYMENT_REJECTED,
      failed: NOTIFICATION_TYPES.PAYMENT_REJECTED,
      blocked: NOTIFICATION_TYPES.PAYMENT_BLOCKED,
      cancelled: NOTIFICATION_TYPES.INVOICE_CANCELLED,
      refunded: NOTIFICATION_TYPES.PAYMENT_APPROVED,
    };

    const titleMap = {
      pending: '💳 Payment Requested',
      initiated: '✅ Payment Initiated',
      approved: '✅ Payment Approved',
      rejected: '❌ Payment Request Rejected',
      failed: '❌ Payment Gateway Failed',
      blocked: '🚫 Payment Blocked',
      cancelled: '🚫 Payment Cancelled',
      refunded: '🔄 Payment Refunded',
    };

    const messageMap = {
      pending: `Payment of ${payment.currency} ${payment.amount} has been requested.`,
      initiated: `Payment of ${payment.currency} ${payment.amount} has been initiated by ${actorName}.`,
      approved: `Payment of ${payment.currency} ${payment.amount} has been approved by ${actorName}.`,
      rejected: `Payment of ${payment.currency} ${payment.amount} has been rejected by ${actorName}.`,
      failed: `Payment of ${payment.currency} ${payment.amount} has failed gateway verification.`,
      blocked: `Payment of ${payment.currency} ${payment.amount} has been blocked by ${actorName}.`,
      cancelled: `Payment of ${payment.currency} ${payment.amount} has been cancelled by ${actorName}.`,
      refunded: `Payment of ${payment.currency} ${payment.amount} has been refunded by ${actorName}.`,
    };

    const type = typeMap[statusKey] || NOTIFICATION_TYPES.PAYMENT_CREATED;
    const title = titleMap[statusKey] || '💳 Payment Status Update';
    const message = messageMap[statusKey] || `Payment of ${payment.currency} ${payment.amount} changed status to ${newStatus}.`;

    await this.createNotification(
      payment.created_by_id,
      type,
      title,
      message,
      'payment',
      payment.id,
    );
  }
}

export default new NotificationService();
