import { z } from 'zod';
import { INVOICE_STATUS } from '../../utils/approval-helper.js';

const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid invoice ID format'),
});

<<<<<<< HEAD
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
=======
export const INVOICE_SOURCES = [
  'MANUAL_ENTRY',
  'UPLOADED_PDF',
  'SCANNED_PDF',
  'SCANNED_IMAGE',
  'EMAIL_ATTACHMENT',
  'SYSTEM_IMPORT',
];

export const INVOICE_CREATION_METHODS = ['MANUAL', 'OCR'];

export const INVOICE_CATEGORIES = [
  'TAX_INVOICE',
  'PROFORMA_INVOICE',
  'DEBIT_NOTE',
  'CREDIT_NOTE',
  'COMMERCIAL_INVOICE',
  'SERVICE_INVOICE',
  'PURCHASE_INVOICE',
  'RECURRING_INVOICE',
  'OTHER',
];
>>>>>>> 870185c8e3ae31efe09445248cd7c7dc457a6b52

// ─── ID-only param ───────────────────────────────────────────────────────────
export const invoiceIdSchema = z.object({
  params: uuidParamSchema,
});

<<<<<<< HEAD
=======
export const createInvoiceSchema = z.object({
  body: z.object({
    purchaseOrderId: z.string().uuid('Invalid purchase order ID format'),
    vendorId: z.string().uuid('Invalid vendor ID format').optional(),
    amount: z.coerce.number().positive().optional(),
    currency: z.string().optional().default('INR'),
    invoiceCreationMethod: z.enum(INVOICE_CREATION_METHODS, { message: 'Invoice creation method is required.' }).optional().default('MANUAL'),
    invoiceSource: z.enum(INVOICE_SOURCES, { message: 'Invoice Source is required.' }).optional().default('MANUAL_ENTRY'),
    invoiceCategory: z.enum(INVOICE_CATEGORIES, { message: 'Invoice Category is required.' }).optional().default('TAX_INVOICE'),
    invoiceDate: z.preprocess(
      (val) => (val ? new Date(val) : undefined),
      z.date({ invalid_type_error: 'Invoice date must be a valid date' }).optional(),
    ),
    dueDate: z.preprocess(
      (val) => (val ? new Date(val) : undefined),
      z.date({ invalid_type_error: 'Due Date must be a valid date' }).optional(), // Due Date is required
    ),
    remarks: z.string().trim().max(2000, 'Remarks cannot exceed 2000 characters').optional().default(''),
  }),
});

export const approvedPurchaseOrdersForInvoiceSchema = z.object({
  query: z.object({
    search: z.string().trim().optional(),
    limit: z.coerce.number().int().positive().max(50).optional().default(25),
  }),
});

>>>>>>> 870185c8e3ae31efe09445248cd7c7dc457a6b52
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

<<<<<<< HEAD
<<<<<<< HEAD
=======
export const updateInvoiceSchema = z.object({
  params: uuidParamSchema,
  body: z.object({
    invoiceDate: z.preprocess(
      (val) => (val ? new Date(val) : undefined),
      z.date({ invalid_type_error: 'Invoice date must be a valid date' }).optional(),
    ),
    dueDate: z.preprocess(
      (val) => (val ? new Date(val) : undefined),
      z.date({ invalid_type_error: 'Due Date must be a valid date' }).optional(),
    ),
    remarks: z.string().trim().max(2000, 'Remarks cannot exceed 2000 characters').optional(),
    lineItems: z.array(z.record(z.any())).optional(),
    reason: z.string().trim().max(500, 'Reason cannot exceed 500 characters').optional(),
  }),
});

>>>>>>> 870185c8e3ae31efe09445248cd7c7dc457a6b52
// ─── Admin Review ─────────────────────────────────────────────────────────────
export const adminReviewApproveSchema = z.object({
  params: uuidParamSchema,
  body: z.object({
    remarks: z.string().max(1000, 'Remarks cannot exceed 1000 characters').trim().optional().default(''),
  }).optional().default({}),
});
=======
>>>>>>> a88ae1768d12205223891c6a6c1f656438518083


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
<<<<<<< HEAD
=======
  INVOICE_STATUS.PAID,
>>>>>>> 870185c8e3ae31efe09445248cd7c7dc457a6b52
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
<<<<<<< HEAD
=======
    eligibleForPayment: z.string().optional(),
>>>>>>> 870185c8e3ae31efe09445248cd7c7dc457a6b52
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
<<<<<<< HEAD
  createInvoiceSchema,
=======
>>>>>>> 870185c8e3ae31efe09445248cd7c7dc457a6b52
  invoiceIdSchema,
  invoiceApproveSchema,
  invoiceRejectSchema,
  invoiceCancelSchema,
<<<<<<< HEAD
<<<<<<< HEAD
=======
  updateInvoiceSchema,
>>>>>>> 870185c8e3ae31efe09445248cd7c7dc457a6b52
  adminReviewApproveSchema,
  adminReviewRejectSchema,
=======
>>>>>>> a88ae1768d12205223891c6a6c1f656438518083
  invoiceDeleteSchema,
  invoiceRestoreSchema,
  financeHeadRemarkSchema,
  searchInvoicesSchema,
  financeHeadObservationSchema,
<<<<<<< HEAD
  invoiceActionSchema,
};
=======
  createInvoiceSchema,
  approvedPurchaseOrdersForInvoiceSchema,
  invoiceActionSchema,
};

// Due Date is required

>>>>>>> 870185c8e3ae31efe09445248cd7c7dc457a6b52
