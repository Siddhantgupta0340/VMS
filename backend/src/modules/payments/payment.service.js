import ApiError from '../../utils/ApiError.js';
import paymentRepository from './payment.repository.js';
import invoiceRepository from '../invoices/invoice.repository.js';
import approvalRepository from '../approvals/approval.repository.js';
import notificationService from '../notifications/notification.service.js';
import { providerRegistry } from './providers/payment-provider.factory.js';
import { ROLES } from '../../zodSchema/index.js';
import { INVOICE_STATUS } from '../invoices/invoice.service.js';

export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  INITIATED: 'INITIATED',
  PROCESSING: 'PROCESSING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  COMPLETED: 'COMPLETED',
};

// Define valid status transitions
export const isValidPaymentStatusTransition = (from, to) => {
  const transitions = {
    [PAYMENT_STATUS.PENDING]: [PAYMENT_STATUS.INITIATED, PAYMENT_STATUS.CANCELLED, PAYMENT_STATUS.FAILED],
    [PAYMENT_STATUS.INITIATED]: [PAYMENT_STATUS.PROCESSING, PAYMENT_STATUS.CANCELLED, PAYMENT_STATUS.FAILED],
    [PAYMENT_STATUS.PROCESSING]: [PAYMENT_STATUS.SUCCESS, PAYMENT_STATUS.FAILED, PAYMENT_STATUS.CANCELLED],
    [PAYMENT_STATUS.SUCCESS]: [PAYMENT_STATUS.REFUNDED],
    [PAYMENT_STATUS.FAILED]: [PAYMENT_STATUS.INITIATED, PAYMENT_STATUS.CANCELLED],
    [PAYMENT_STATUS.CANCELLED]: [],
    [PAYMENT_STATUS.REFUNDED]: [],
  };

  return (transitions[from] || []).includes(to);
};

const buildPaymentNumber = () => `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

class PaymentService {
  /**
   * Create a new payment request against an approved invoice.
   */
  async createPayment(payload, user) {
    const invoice = await invoiceRepository.findById(payload.invoiceId);
    if (!invoice) {
      throw new ApiError(404, 'Invoice not found.');
    }

    // Business Rule: Only approved invoices can be paid
    if (invoice.status.toUpperCase() !== INVOICE_STATUS.APPROVED) {
      throw new ApiError(400, 'Payment can only be requested for an APPROVED invoice.');
    }

    if (user.role === ROLES.CASE_MANAGER && invoice.created_by_id !== user.id) {
      throw new ApiError(403, 'You can only create payments for invoices created by you.');
    }

    // Calculate outstanding/allocated balance to check for overpayments
    const existingPayments = await paymentRepository.findAll({
      where: {
        invoice_id: payload.invoiceId,
        status: { in: [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.INITIATED, PAYMENT_STATUS.PROCESSING, PAYMENT_STATUS.SUCCESS] },
      },
      take: 100,
    });

    const totalAllocated = existingPayments.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const remainingAllocated = Number(invoice.invoice_total) - totalAllocated;
    const paymentAmount = Number(payload.amount);

    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      throw new ApiError(400, 'Payment amount must be positive.');
    }

    if (paymentAmount > remainingAllocated + 0.01) {
      throw new ApiError(400, `Overpayment blocked. Remaining unallocated invoice balance: INR ${remainingAllocated.toFixed(2)}`);
    }

    const paymentNumber = buildPaymentNumber();

    return paymentRepository.transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          payment_number: paymentNumber,
          invoice_id: payload.invoiceId,
          vendor_id: invoice.vendor_id,
          purchase_order_id: invoice.purchase_order_id,
          amount: paymentAmount,
          currency: payload.currency || invoice.currency || 'INR',
          status: PAYMENT_STATUS.PENDING,
          payment_method: payload.paymentMethod || 'NEFT',
          payment_type: payload.paymentType || 'FULL',
          payment_provider: payload.paymentProvider || 'MANUAL',
          remarks: payload.remarks || '',
          due_date: payload.dueDate ? new Date(payload.dueDate) : null,
          created_by_id: user.id,
          updated_by_id: user.id,
        },
      });

      // Update the invoice payment_status to PAYMENT_PENDING if it was UNPAID
      if (invoice.payment_status === 'UNPAID') {
        await tx.invoice.update({
          where: { id: invoice.id },
          data: { payment_status: 'PAYMENT_PENDING' }
        });
      }

      // Log payment creation
      await tx.approvalLog.create({
        data: {
          entity_type: 'payment',
          entity_id: payment.id,
          action: 'created',
          from_status: null,
          to_status: PAYMENT_STATUS.PENDING,
          performed_by_id: user.id,
          remarks: `Payment request initialized for amount ${payment.currency} ${payment.amount}`,
        },
      });

      // Notify Finance Team
      notificationService.createNotification(
        user.id,
        'payment_created',
        ' Payment Requested',
        `Payment request ${payment.payment_number} created for amount ${payment.currency} ${payment.amount}.`,
        'payment',
        payment.id
      ).catch(() => {});

      return payment;
    });
  }

  /**
   * Update details of a PENDING payment request.
   */
  async updatePayment(id, payload, user) {
    const payment = await paymentRepository.findById(id);
    if (!payment) {
      throw new ApiError(404, 'Payment not found.');
    }

    if (payment.status !== PAYMENT_STATUS.PENDING) {
      throw new ApiError(400, 'Only pending payment requests can be modified.');
    }

    if (user.role === ROLES.CASE_MANAGER && payment.created_by_id !== user.id) {
      throw new ApiError(403, 'You do not have permission to modify this payment request.');
    }

    const updateData = {
      payment_method: payload.paymentMethod || payment.payment_method,
      payment_type: payload.paymentType || payment.payment_type,
      payment_provider: payload.paymentProvider || payment.payment_provider,
      remarks: payload.remarks || payment.remarks,
      provider_transaction_id: payload.providerTransactionId || payment.provider_transaction_id,
      gateway_reference: payload.gatewayReference || payment.gateway_reference,
      due_date: payload.dueDate ? new Date(payload.dueDate) : payment.due_date,
      payment_date: payload.paymentDate ? new Date(payload.paymentDate) : payment.payment_date,
      updated_by_id: user.id,
    };

    // Re-verify overpayment if amount changed
    if (payload.amount && Number(payload.amount) !== Number(payment.amount)) {
      const invoice = await invoiceRepository.findById(payment.invoice_id);
      const existingPayments = await paymentRepository.findAll({
        where: {
          invoice_id: payment.invoice_id,
          id: { not: id },
          status: { in: [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.INITIATED, PAYMENT_STATUS.PROCESSING, PAYMENT_STATUS.SUCCESS] },
        },
        take: 100,
      });

      const totalAllocated = existingPayments.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const remainingAllocated = Number(invoice.invoice_total) - totalAllocated;
      const newAmount = Number(payload.amount);

      if (newAmount > remainingAllocated + 0.01) {
        throw new ApiError(400, `Updated amount exceeds remaining invoice balance. Max allowed: INR ${remainingAllocated.toFixed(2)}`);
      }
      updateData.amount = newAmount;
    }

    return paymentRepository.update(id, updateData);
  }

  /**
   * Delete a pending/cancelled payment.
   */
  async deletePayment(id, user) {
    const payment = await paymentRepository.findById(id);
    if (!payment) {
      throw new ApiError(404, 'Payment not found.');
    }

    const allowedDeleteStatuses = [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.CANCELLED];
    if (!allowedDeleteStatuses.includes(payment.status)) {
      throw new ApiError(400, 'Only pending or cancelled payments can be deleted.');
    }

    if (user.role !== ROLES.FINANCE_HEAD) {
      throw new ApiError(403, 'Only Finance Heads can delete payment requests.');
    }

    return paymentRepository.delete(id);
  }

  /**
   * Get payments with optional queries.
   */
  async listPayments(query, user) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 10);

    const where = {
      ...(query.status && { status: query.status }),
      ...(query.invoiceId && { invoice_id: query.invoiceId }),
      ...(query.vendorId && { vendor_id: query.vendorId }),
      ...(query.purchaseOrderId && { purchase_order_id: query.purchaseOrderId }),
      ...(query.paymentMethod && { payment_method: query.paymentMethod }),
      ...(query.paymentType && { payment_type: query.paymentType }),
      ...(query.paymentProvider && { payment_provider: query.paymentProvider }),
      ...(user.role === ROLES.CASE_MANAGER && { created_by_id: user.id }),
    };

    const result = await paymentRepository.findAll({
      where,
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      payments: result.payments,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    };
  }

  async getPaymentById(id, user) {
    const payment = await paymentRepository.findById(id);
    if (!payment) {
      throw new ApiError(404, 'Payment not found.');
    }

    if (user.role === ROLES.CASE_MANAGER && payment.created_by_id !== user.id) {
      throw new ApiError(403, 'You do not have permission to view this payment details.');
    }

    return payment;
  }

  /**
   * Finance Manager reviews and approves the payment request.
   * This transitions status to INITIATED and fires background gateway execution.
   */
  async approvePayment(id, user, remarks) {
    const payment = await paymentRepository.findById(id);
    if (!payment) {
      throw new ApiError(404, 'Payment not found.');
    }

    if (payment.status !== PAYMENT_STATUS.PENDING) {
      throw new ApiError(400, 'Only pending payment requests can be approved.');
    }

    if (user.role !== ROLES.FINANCE_MANAGER && user.role !== ROLES.SUPER_ADMIN) {
      throw new ApiError(403, 'Only Finance Managers or Admins can approve payments.');
    }

    if (![ROLES.TEAM_LEAD, ROLES.MANAGER, ROLES.FINANCE_HEAD, ROLES.SUPER_ADMIN].includes(user.role)) {
      throw new ApiError(403, 'Approval permission denied.');
    }

    assertPaymentAssignedToRole(payment, user);
    assertVendorBankReadyForPayment(payment.vendor);

    const updatedPayment = await paymentRepository.transaction(async (tx) => {
      const updated = await tx.payment.update({
        where: { id },
        data: {
          status: PAYMENT_STATUS.INITIATED,
          approved_by_id: user.id,
          processed_by_id: user.id,
          remarks: remarks || payment.remarks,
        },
      });

      // Log approval
      await tx.approvalLog.create({
        data: {
          entity_type: 'payment',
          entity_id: id,
          action: 'approved',
          from_status: PAYMENT_STATUS.PENDING,
          to_status: PAYMENT_STATUS.INITIATED,
          performed_by_id: user.id,
          remarks: remarks || 'Payment approved and initiated.',
        },
      });

      // Notify next step
      const actorName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.role;
      notificationService.notifyPaymentStatusChange(updated, PAYMENT_STATUS.INITIATED, actorName).catch(() => {});

      return updated;
    });

    // Fire background async processor for provider gateway execution AFTER transaction commits
    this.processGatewayPayment(id).catch(console.error);

    return updatedPayment;
  }

  /**
   * Reject a payment request.
   */
  async rejectPayment(id, user, remarks) {
    const payment = await paymentRepository.findById(id);
    if (!payment) {
      throw new ApiError(404, 'Payment not found.');
    }

    if (payment.status !== PAYMENT_STATUS.PENDING) {
      throw new ApiError(400, 'Only pending payments can be rejected.');
    }

    if (user.role !== ROLES.FINANCE_MANAGER && user.role !== ROLES.SUPER_ADMIN) {
      throw new ApiError(403, 'Only Finance Managers can reject payments.');
    }

    if (![ROLES.TEAM_LEAD, ROLES.MANAGER, ROLES.FINANCE_HEAD, ROLES.SUPER_ADMIN].includes(user.role)) {
      throw new ApiError(403, 'Approval permission denied.');
    }

    assertPaymentAssignedToRole(payment, user);

    return paymentRepository.transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id },
        data: {
          status: PAYMENT_STATUS.FAILED,
          remarks: remarks || 'Rejected by finance.',
        },
      });

      await tx.approvalLog.create({
        data: {
          entity_type: 'payment',
          entity_id: id,
          action: 'rejected',
          from_status: PAYMENT_STATUS.PENDING,
          to_status: PAYMENT_STATUS.FAILED,
          performed_by_id: user.id,
          remarks: remarks || 'Rejected by finance.',
        },
      });

      const actorName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.role;
      notificationService.notifyPaymentStatusChange(updatedPayment, PAYMENT_STATUS.FAILED, actorName).catch(() => {});

      return updatedPayment;
    });
  }

  /**
   * Cancel a payment (only if pending or initiated).
   */
  async cancelPayment(id, user, remarks) {
    const payment = await paymentRepository.findById(id);
    if (!payment) {
      throw new ApiError(404, 'Payment not found.');
    }

    const allowedCancel = [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.INITIATED];
    if (!allowedCancel.includes(payment.status)) {
      throw new ApiError(400, 'Cannot cancel payment after processing has started.');
    }

    return paymentRepository.transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id },
        data: {
          status: PAYMENT_STATUS.CANCELLED,
          remarks: remarks || 'Cancelled by user.',
        },
      });

      await tx.approvalLog.create({
        data: {
          entity_type: 'payment',
          entity_id: id,
          action: 'cancelled',
          from_status: payment.status,
          to_status: PAYMENT_STATUS.CANCELLED,
          performed_by_id: user.id,
          remarks: remarks || 'Cancelled by user.',
        },
      });

      const actorName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.role;
      notificationService.notifyPaymentStatusChange(updatedPayment, PAYMENT_STATUS.CANCELLED, actorName).catch(() => {});

      return updatedPayment;
    });
  }

  /**
   * Refund a successful payment.
   */
  async refundPayment(id, user, remarks) {
    const payment = await paymentRepository.findById(id);
    if (!payment) {
      throw new ApiError(404, 'Payment not found.');
    }

    if (payment.status !== PAYMENT_STATUS.SUCCESS) {
      throw new ApiError(400, 'Only successful payments can be refunded.');
    }

    if (user.role !== ROLES.FINANCE_MANAGER && user.role !== ROLES.SUPER_ADMIN) {
    if (user.role !== ROLES.FINANCE_HEAD) {
      throw new ApiError(403, 'Unauthorized refund access.');
    }

    return paymentRepository.transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id },
        data: {
          status: PAYMENT_STATUS.REFUNDED,
          remarks: remarks || 'Refund processed.',
        },
      });

      await tx.approvalLog.create({
        data: {
          entity_type: 'payment',
          entity_id: id,
          action: 'refunded',
          from_status: PAYMENT_STATUS.SUCCESS,
          to_status: PAYMENT_STATUS.REFUNDED,
          performed_by_id: user.id,
          remarks: remarks || 'Refund processed.',
        },
      });

      // Adjust invoice remaining and paid amounts
      const invoice = await tx.invoice.findUnique({ where: { id: payment.invoice_id } });
      const refundAmount = Number(payment.amount);
      const newPaid = Math.max(0, Number(invoice.paid_amount) - refundAmount);
      const newRemaining = Math.max(0, Number(invoice.invoice_total) - newPaid);
      let newPaymentStatus = 'PARTIALLY_PAID';
      if (newPaid <= 0.01) {
        newPaymentStatus = 'UNPAID';
      }

      await tx.invoice.update({
        where: { id: payment.invoice_id },
        data: {
          paid_amount: newPaid,
          remaining_amount: newRemaining,
          payment_status: newPaymentStatus,
        },
      });

      const actorName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.role;
      notificationService.createNotification(
        payment.created_by_id,
        'payment_refunded',
        '🔄 Payment Refunded',
        `Payment ${payment.payment_number} of ${payment.currency} ${payment.amount} has been refunded by ${actorName}.`,
        'payment',
        payment.id
      ).catch(() => {});

      return updatedPayment;
    });
  }

  /**
   * Retry a failed payment.
   */
  async retryPayment(id, user) {
    const payment = await paymentRepository.findById(id);
    if (!payment) {
      throw new ApiError(404, 'Payment not found.');
    }

    if (payment.status !== PAYMENT_STATUS.FAILED) {
      throw new ApiError(400, 'Only failed payments can be retried.');
    }

    const updatedPayment = await paymentRepository.transaction(async (tx) => {
      const updated = await tx.payment.update({
        where: { id },
        data: {
          status: PAYMENT_STATUS.INITIATED,
          gateway_status: null,
          response_message: 'Retrying payment...',
          provider_transaction_id: null,
          gateway_reference: null,
        },
      });

      await tx.approvalLog.create({
        data: {
          entity_type: 'payment',
          entity_id: id,
          action: 'retried',
          from_status: PAYMENT_STATUS.FAILED,
          to_status: PAYMENT_STATUS.INITIATED,
          performed_by_id: user.id,
          remarks: 'Payment retry initiated.',
        },
      });

      return updated;
    });

    // Fire background async processor for provider gateway execution AFTER transaction commits
    this.processGatewayPayment(id).catch(console.error);

    return updatedPayment;
  }

  /**
   * Process payment through the configured provider gateway (Razorpay, Stripe, UPI, IMPS, Cash, etc.)
   */
  async processGatewayPayment(paymentId, paymentObj = null) {
    const payment = paymentObj || await paymentRepository.findById(paymentId);
    if (!payment) {
      console.log(`[processGatewayPayment] Payment ${paymentId} not found.`);
      return;
    }
    if (payment.status !== PAYMENT_STATUS.INITIATED) {
      console.log(`[processGatewayPayment] Payment ${paymentId} status is not INITIATED (status: ${payment.status}). Returning.`);
      return;
    }

    console.log(`[processGatewayPayment] Starting gateway transaction processing for Payment: ${payment.payment_number}`);

    try {
      // 1. Mark as PROCESSING in DB
      await paymentRepository.update(paymentId, { status: PAYMENT_STATUS.PROCESSING });

      // 2. Fetch the corresponding Provider from registry
      const provider = providerRegistry.get(payment.payment_provider);

      // 3. Process execution
      const gatewayResponse = await provider.process(
        Number(payment.amount),
        payment.currency,
        payment.payment_number
      );

      console.log(`[processGatewayPayment] Gateway responded with status: ${gatewayResponse.status} for Payment: ${payment.payment_number}`);

      // 4. Update the DB with responses
      await paymentRepository.transaction(async (tx) => {
        const statusMap = {
          SUCCESS: PAYMENT_STATUS.SUCCESS,
          FAILED: PAYMENT_STATUS.FAILED,
        };

        const finalStatus = statusMap[gatewayResponse.status] || PAYMENT_STATUS.FAILED;

        const updatedPayment = await tx.payment.update({
          where: { id: paymentId },
          data: {
            status: finalStatus,
            provider_transaction_id: gatewayResponse.transactionId,
            gateway_reference: gatewayResponse.gatewayReference,
            payment_gateway_response: gatewayResponse.response,
            gateway_status: gatewayResponse.status,
            response_message: gatewayResponse.message,
            payment_date: finalStatus === PAYMENT_STATUS.SUCCESS ? new Date() : null,
          },
        });

        // Log the results
        await tx.approvalLog.create({
          data: {
            entity_type: 'payment',
            entity_id: paymentId,
            action: finalStatus.toLowerCase(),
            from_status: PAYMENT_STATUS.PROCESSING,
            to_status: finalStatus,
            remarks: `Gateway execution completed. Response: ${gatewayResponse.message}`,
          },
        });

        // 5. Update invoice financial tracking fields
        const invoice = await tx.invoice.findUnique({ where: { id: payment.invoice_id } });
        const successfulPayments = await tx.payment.findMany({
          where: { invoice_id: payment.invoice_id, status: PAYMENT_STATUS.SUCCESS },
        });

        const totalPaid = successfulPayments.reduce((sum, p) => sum + Number(p.amount), 0);
        const remainingAmount = Math.max(0, Number(invoice.invoice_total) - totalPaid);

        let paymentStatus = 'UNPAID';
        if (remainingAmount <= 0.01 && totalPaid > 0) {
          paymentStatus = 'PAID';
        } else if (totalPaid > 0) {
          paymentStatus = 'PARTIALLY_PAID';
        } else if (finalStatus === PAYMENT_STATUS.FAILED && Number(invoice.paid_amount) === 0) {
          paymentStatus = 'PAYMENT_FAILED';
        } else {
          paymentStatus = invoice.payment_status; // preserve previous
        }

        await tx.invoice.update({
          where: { id: payment.invoice_id },
          data: {
            paid_amount: totalPaid,
            remaining_amount: remainingAmount,
            payment_status: paymentStatus,
            last_payment_date: finalStatus === PAYMENT_STATUS.SUCCESS ? new Date() : invoice.last_payment_date,
            last_payment_id: finalStatus === PAYMENT_STATUS.SUCCESS ? paymentId : invoice.last_payment_id,
          },
        });

        // Log the status transitions
        if (finalStatus === PAYMENT_STATUS.SUCCESS) {
          await tx.approvalLog.create({
            data: {
              entity_type: 'invoice',
              entity_id: payment.invoice_id,
              action: paymentStatus === 'PAID' ? 'paid' : 'partial_payment',
              from_status: invoice.payment_status,
              to_status: paymentStatus,
              remarks: paymentStatus === 'PAID'
                ? `Invoice fully paid. Total paid amount: INR ${totalPaid.toFixed(2)}`
                : `Invoice partially paid. Total paid: INR ${totalPaid.toFixed(2)}, Remaining: INR ${remainingAmount.toFixed(2)}`,
            },
          });
        }

        // Send notifications
        notificationService.createNotification(
          payment.created_by_id,
          finalStatus === PAYMENT_STATUS.SUCCESS ? 'payment_completed' : 'payment_failed',
          finalStatus === PAYMENT_STATUS.SUCCESS ? ' Payment Success' : ' Payment Failed',
          `Payment request ${payment.payment_number} for amount ${payment.currency} ${payment.amount} has ${finalStatus.toLowerCase()}.`,
          'payment',
          paymentId
        ).catch(() => {});
      });

    } catch (error) {
      console.error(`[PaymentService] Gateway process crash for payment ID ${paymentId}:`, error.message);
      // Revert/mark as FAILED if crash
      await paymentRepository.update(paymentId, {
        status: PAYMENT_STATUS.FAILED,
        response_message: `Gateway execution failed: ${error.message}`,
      }).catch(console.error);
    }
  }

  /**
   * Get payment details/logs history
   */
  async getPaymentHistory(paymentId) {
    return approvalRepository.findByEntity('payment', paymentId);
  }

  /**
   * Pending list queue
   */
  async getPendingPayments(query) {
    return this.listPayments({ ...query, status: PAYMENT_STATUS.PENDING });
  }

  /**
   * Completed list queue
   */
  async getCompletedPayments(query) {
    return this.listPayments({ ...query, status: PAYMENT_STATUS.SUCCESS });
  }
}

export default new PaymentService();
