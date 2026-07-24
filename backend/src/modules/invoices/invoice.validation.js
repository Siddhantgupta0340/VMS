import { z } from 'zod';
import { INVOICE_STATUS } from '../../utils/approval-helper.js';

const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid invoice ID format'),
});

// ─── Create Invoice ───────────────────────────────────────────────────────────
export const createInvoiceSchema = z.object({
  body: z.object({
    vendorId:        z.string().uuid('Invalid vendor ID format'),
    purchaseOrderId: z.string().uuid('Invalid purchase order ID format'),
    invoiceNumber:   z.string().min(1, 'Invoice number cannot be empty').trim().optional(),
    amount:          z.coerce.number().positive('Invoice amount must be greater than 0'),
    currency:        z.string().trim().optional().default('INR'),
    invoiceDate:     z.coerce.date().optional(),
    dueDate:         z.coerce.date().optional(),
    description:     z.string().trim().optional(),
  }),
});

// ─── ID-only param ───────────────────────────────────────────────────────────
export const invoiceIdSchema = z.object({
  params: uuidParamSchema,
});

// ─── Approve ─────────────────────────────────────────────────────────────────
export const invoiceApproveSchema = z.object({
  params: uuidParamSchema,
  body: z.object({
    remarks: z.string().max(1000, 'Remarks cannot exceed 1000 characters').trim().optional().default(''),
  }).optional().default({}),
});

// ─── Reject ───────────────────────────────────────────────────────────────────
export const invoiceRejectSchema = z.object({
  params: uuidParamSchema,
  body: z.object({
    rejectionReason: z.string().max(1000, 'Rejection reason cannot exceed 1000 characters').trim().optional(),
    remarks:         z.string().max(1000, 'Remarks cannot exceed 1000 characters').trim().optional(),
  }).refine((data) => !!(data.rejectionReason?.trim() || data.remarks?.trim()), {
    message: 'Rejection reason or remarks must be provided',
    path:    ['rejectionReason'],
  }),
});

// ─── Cancel ───────────────────────────────────────────────────────────────────
export const invoiceCancelSchema = z.object({
  params: uuidParamSchema,
  body: z.object({
    remarks: z.string().max(1000, 'Remarks cannot exceed 1000 characters').trim().optional().default(''),
  }).optional().default({}),
});

// ─── Admin Review ─────────────────────────────────────────────────────────────
export const adminReviewApproveSchema = z.object({
  params: uuidParamSchema,
  body: z.object({
    remarks: z.string().max(1000, 'Remarks cannot exceed 1000 characters').trim().optional().default(''),
  }).optional().default({}),
});


// ─── Soft Delete ─────────────────────────────────────────────────────────────
export const invoiceDeleteSchema = z.object({
  params: uuidParamSchema,
  body: z.object({
    deleteReason: z.string().min(1, 'Delete reason is required.').max(500, 'Delete reason cannot exceed 500 characters').trim(),
  }),
});

// ─── Restore ─────────────────────────────────────────────────────────────────
export const invoiceRestoreSchema = z.object({
  params: uuidParamSchema,
});

// ─── Finance Head Remark ──────────────────────────────────────────────────────
export const financeHeadRemarkSchema = z.object({
  params: uuidParamSchema,
  body: z.object({
    remark: z.string().min(1, 'Remark is required.').max(2000, 'Remark cannot exceed 2000 characters').trim(),
  }),
});

// ─── Search / Filter Invoices ─────────────────────────────────────────────────
const ALL_STATUSES = [
  INVOICE_STATUS.DRAFT,
  INVOICE_STATUS.SUBMITTED,
  INVOICE_STATUS.PENDING_THREE_WAY_MATCH,
  INVOICE_STATUS.PENDING_TEAM_LEAD,
  INVOICE_STATUS.PENDING_MANAGER,
  INVOICE_STATUS.PENDING_FINANCE_HEAD,
  INVOICE_STATUS.APPROVED,
  INVOICE_STATUS.REJECTED,
  INVOICE_STATUS.CANCELLED,
];

export const searchInvoicesSchema = z.object({
  query: z.object({
    status: z.enum(ALL_STATUSES).optional(),
    paymentStatus: z.enum([
      'UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE',
      'PAYMENT_PENDING', 'PAYMENT_FAILED', 'REFUNDED',
    ]).optional(),
    vendorId:            z.string().uuid('Invalid vendor ID format').optional(),
    purchaseOrderId:     z.string().uuid('Invalid purchase order ID format').optional(),
    requiredApprovalRole: z.enum(['TEAM_LEAD', 'MANAGER', 'FINANCE_HEAD']).optional(),
    currentApprovalLevel: z.enum(['TEAM_LEAD', 'MANAGER', 'FINANCE_HEAD']).optional(),
    search:  z.string().trim().optional(),
    sortBy:  z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
    page:    z.coerce.number().int().positive().optional().default(1),
    limit:   z.coerce.number().int().positive().max(100).optional().default(10),
  }),
});

export const financeHeadObservationSchema = z.object({
  query: z.object({
    status:        z.enum(ALL_STATUSES).optional(),
    vendorId:      z.string().uuid().optional(),
    paymentStatus: z.string().optional(),
    search:        z.string().trim().optional(),
    sortBy:        z.string().optional(),
    sortOrder:     z.enum(['asc', 'desc']).optional().default('desc'),
    page:          z.coerce.number().int().positive().optional().default(1),
    limit:         z.coerce.number().int().positive().max(100).optional().default(20),
  }),
});

// Legacy alias
export const invoiceActionSchema = z.object({
  params: uuidParamSchema,
  body:   z.object({ remarks: z.string().trim().optional() }).optional().default({}),
});

export default {
  createInvoiceSchema,
  invoiceIdSchema,
  invoiceApproveSchema,
  invoiceRejectSchema,
  invoiceCancelSchema,
  adminReviewApproveSchema,
  adminReviewRejectSchema,
  invoiceDeleteSchema,
  invoiceRestoreSchema,
  financeHeadRemarkSchema,
  searchInvoicesSchema,
  financeHeadObservationSchema,
  invoiceActionSchema,
};
