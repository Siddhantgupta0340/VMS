import { z } from 'zod';

const uuidParamSchema = z.object({
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
});

export const purchaseOrderIdSchema = z.object({
  params: uuidParamSchema,
});

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
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(10),
  }),
});
