import { z } from 'zod';
import { INVOICE_STATUS } from '../../utils/approval-helper.js';

const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid invoice ID format'),
});

export const createInvoiceSchema = z.object({
  body: z.object({
    vendorId: z.string().uuid('Invalid vendor ID format'),
    purchaseOrderId: z.string().uuid('Invalid purchase order ID format'),
    invoiceNumber: z.string().min(1, 'Invoice number cannot be empty').trim().optional(),
    amount: z.coerce.number().positive('Invoice amount must be greater than 0'),
    currency: z.string().trim().optional().default('INR'),
    invoiceDate: z.coerce.date().optional(),
    dueDate: z.coerce.date().optional(),
    description: z.string().trim().optional(),
  }),
});

export const invoiceIdSchema = z.object({
  params: uuidParamSchema,
});

export const invoiceApproveSchema = z.object({
  params: uuidParamSchema,
  body: z.object({
    remarks: z.string().max(500, 'Remarks cannot exceed 500 characters').trim().optional().default(''),
  }).optional().default({}),
});

export const invoiceRejectSchema = z.object({
  params: uuidParamSchema,
  body: z.object({
    rejectionReason: z.string().max(500, 'Rejection reason cannot exceed 500 characters').trim().optional(),
    remarks: z.string().max(500, 'Remarks cannot exceed 500 characters').trim().optional(),
  }).refine((data) => !!(data.rejectionReason?.trim() || data.remarks?.trim()), {
    message: 'Rejection reason or remarks must be provided',
    path: ['rejectionReason'],
  }),
});

export const invoiceCancelSchema = z.object({
  params: uuidParamSchema,
  body: z.object({
    remarks: z.string().max(500, 'Remarks cannot exceed 500 characters').trim().optional().default(''),
  }).optional().default({}),
});

export const searchInvoicesSchema = z.object({
  query: z.object({
    status: z.enum([
      INVOICE_STATUS.DRAFT,
      INVOICE_STATUS.SUBMITTED,
      INVOICE_STATUS.PENDING_L1,
      INVOICE_STATUS.PENDING_L2,
      INVOICE_STATUS.PENDING_L3,
      INVOICE_STATUS.APPROVED,
      INVOICE_STATUS.REJECTED,
      INVOICE_STATUS.CANCELLED,
    ]).optional(),
    paymentStatus: z.enum([
      'UNPAID',
      'PARTIALLY_PAID',
      'PAID',
      'OVERDUE',
      'PAYMENT_PENDING',
      'PAYMENT_FAILED',
      'REFUNDED',
    ]).optional(),
    vendorId: z.string().uuid('Invalid vendor ID format').optional(),
    purchaseOrderId: z.string().uuid('Invalid purchase order ID format').optional(),
    requiredApprovalRole: z.enum(['L1', 'L2', 'L3']).optional(),
    currentApprovalLevel: z.enum(['L1', 'L2', 'L3']).optional(),
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(10),
  }),
});

// Backward compatibility export
export const invoiceActionSchema = z.object({
  params: uuidParamSchema,
  body: z.object({
    remarks: z.string().trim().optional(),
  }).optional().default({}),
});

export default {
  createInvoiceSchema,
  invoiceIdSchema,
  invoiceApproveSchema,
  invoiceRejectSchema,
  invoiceCancelSchema,
  searchInvoicesSchema,
  invoiceActionSchema,
};
