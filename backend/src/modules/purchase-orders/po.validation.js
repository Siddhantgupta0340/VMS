import { z } from 'zod';

const uuidParamSchema = z.object({
<<<<<<< HEAD
  id: z.string().uuid('Invalid purchase order ID — must be a valid UUID'),
});

/**
 * Schema for creating a new Purchase Order.
 * All monetary and date fields are coerced for resilience against string inputs.
 */
export const createPurchaseOrderSchema = z.object({
  body: z.object({
    vendorId: z
      .string({ required_error: 'Vendor ID is required' })
      .uuid('Invalid vendor ID — must be a valid UUID'),

    poNumber: z
      .string()
      .min(1, 'PO number cannot be empty')
      .trim()
      .optional(),

    amount: z
      .preprocess(
        (val) => {
          if (val === '' || val === null || val === undefined) return NaN;
          return Number(val);
        },
        z.number({
          required_error: 'Amount is required',
          invalid_type_error: 'Amount must be a valid number',
        }).positive('Amount must be greater than 0')
      ),

    currency: z
      .string()
      .trim()
      .min(1, 'Currency cannot be empty')
      .optional()
      .default('INR'),

    description: z
      .string()
      .trim()
      .optional(),

    orderDate: z
      .preprocess(
        (val) => (val ? new Date(val) : undefined),
        z.date({ invalid_type_error: 'Order date must be a valid ISO date' }).optional()
      ),

    expectedDeliveryDate: z
      .preprocess(
        (val) => (val ? new Date(val) : undefined),
        z.date({ invalid_type_error: 'Expected delivery date must be a valid ISO date' }).optional()
      ),
  }),
=======
  id: z.string().uuid('Invalid purchase order ID - must be a valid UUID'),
});

const poItemSchema = z.object({
  itemName: z.string().trim().min(1, 'Item name is required'),
  description: z.string().trim().optional().default(''),
  hsnCode: z.string().trim().optional(),
  unit: z.string().trim().optional(),
  quantity: z.coerce.number().positive('Quantity must be greater than 0'),
  unitPrice: z.coerce.number().nonnegative('Unit price cannot be negative').optional(),
  rate: z.coerce.number().nonnegative('Rate cannot be negative').optional(),
  gstRate: z.coerce.number().min(0).max(100).optional(),
}).refine((item) => item.unitPrice !== undefined || item.rate !== undefined, {
  message: 'Unit price or rate is required',
  path: ['unitPrice'],
});

const purchaseOrderTaxPayloadSchema = z.object({
  vendorId: z
    .string({ required_error: 'Vendor ID is required' })
    .uuid('Invalid vendor ID - must be a valid UUID'),
  items: z.array(poItemSchema).min(1, 'At least one line item is required'),
  otherCharges: z.coerce.number().nonnegative('Other charges cannot be negative').optional().default(0),
});

const requiredDate = (label) => z.preprocess(
  (val) => (val ? new Date(val) : undefined),
  z.date({
    required_error: `${label} is required`,
    invalid_type_error: `${label} must be a valid ISO date`,
  }),
);

export const createPurchaseOrderSchema = z.object({
  body: purchaseOrderTaxPayloadSchema.extend({
    currency: z.string().trim().min(1, 'Currency cannot be empty').optional().default('INR'),
    description: z.string().trim().optional(),
    billingAddress: z.string().trim().optional().default(''),
    deliveryAddress: z.string().trim().optional().default(''),
    orderDate: requiredDate('Purchase Order Date').optional().default(() => new Date()),
    expectedDeliveryDate: z.preprocess(
      (val) => (val ? new Date(val) : undefined),
      z.date({ invalid_type_error: 'Expected delivery date must be a valid ISO date' }).optional(),
    ),
    items: z.array(poItemSchema).min(1, 'At least one line item is required'),
    otherCharges: z.coerce.number().nonnegative('Other charges cannot be negative').optional().default(0),
    paymentTerms: z.string().trim().optional().default('Net 30'),
  }),
});

export const updatePurchaseOrderSchema = z.object({
  params: uuidParamSchema,
  body: purchaseOrderTaxPayloadSchema.extend({
    currency: z.string().trim().min(1, 'Currency cannot be empty').optional().default('INR'),
    description: z.string().trim().optional(),
    billingAddress: z.string().trim().optional(),
    deliveryAddress: z.string().trim().optional(),
    orderDate: z.preprocess(
      (val) => (val ? new Date(val) : undefined),
      z.date({ invalid_type_error: 'Order date must be a valid ISO date' }).optional(),
    ),
    expectedDeliveryDate: z.preprocess(
      (val) => (val ? new Date(val) : undefined),
      z.date({ invalid_type_error: 'Expected delivery date must be a valid ISO date' }).optional(),
    ),
    paymentTerms: z.string().optional(),
    reason: z.string().trim().max(500, 'Reason cannot exceed 500 characters').optional(),
  }),
});

export const deletePurchaseOrderSchema = z.object({
  params: uuidParamSchema,
  body: z.object({
    deleteReason: z.string().trim().min(1, 'Delete reason is required.').max(500, 'Delete reason cannot exceed 500 characters'),
  }),
});

export const calculatePurchaseOrderTaxSchema = z.object({
  body: purchaseOrderTaxPayloadSchema,
>>>>>>> origin/main
});

export const purchaseOrderIdSchema = z.object({
  params: uuidParamSchema,
});

<<<<<<< HEAD
export const updatePurchaseOrderStatusSchema = z.object({
  params: uuidParamSchema,
  body: z.object({
    status: z.enum(['pending', 'open', 'closed', 'cancelled'], {
      errorMap: () => ({ message: 'Status must be one of: pending, open, closed, cancelled' }),
    }),
  }),
});

export const searchPurchaseOrdersSchema = z.object({
  query: z.object({
    status: z
      .enum(['pending', 'open', 'closed', 'cancelled'])
      .optional(),
    vendorId: z
      .string()
      .uuid('Invalid vendor ID format')
      .optional(),
=======
export const searchPurchaseOrdersSchema = z.object({
  query: z.object({
    status: z.enum(['created', 'closed', 'cancelled']).optional(),
    vendorId: z.string().uuid('Invalid vendor ID format').optional(),
>>>>>>> origin/main
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(10),
  }),
});
