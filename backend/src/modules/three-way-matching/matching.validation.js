import { z } from 'zod';

const uuidParam = z.object({ id: z.string().uuid('Invalid ID format') });

export const startMatchingSchema = z.object({
  body: z.object({
    invoiceId: z.string().uuid('Invalid invoice ID'),
    grnId:     z.string().uuid('Invalid GRN ID').optional(),
  }),
});

export const matchIdSchema    = z.object({ params: uuidParam });
export const invoiceIdParam   = z.object({ params: z.object({ invoiceId: z.string().uuid() }) });
export const poIdParam        = z.object({ params: z.object({ poId:      z.string().uuid() }) });



export const createGRNSchema = z.object({
  body: z.object({
    purchaseOrderId:   z.string().uuid('Invalid PO ID'),
    grnNumber:         z.string().trim().optional(),
    deliveryDate:      z.coerce.date().optional(),
    deliveryChallanNo: z.string().trim().optional(),
    deliveryAddress:   z.string().trim().optional(),
    billingAddress:    z.string().trim().optional(),
    deliveryTerms:     z.string().trim().optional(),
    paymentTerms:      z.string().trim().optional(),
    currency:          z.string().trim().optional().default('INR'),
    subtotal:          z.coerce.number().min(0).optional().default(0),
    gstAmount:         z.coerce.number().min(0).optional().default(0),
    discount:          z.coerce.number().min(0).optional().default(0),
    totalAmount:       z.coerce.number().min(0).optional().default(0),
    lineItems:         z.array(z.any()).optional(),
    remarks:           z.string().trim().optional(),
  }),
});

export const updateGRNSchema = z.object({
  params: uuidParam,
  body: z.object({
    deliveryDate:      z.coerce.date().optional(),
    deliveryChallanNo: z.string().trim().optional(),
    deliveryAddress:   z.string().trim().optional(),
    billingAddress:    z.string().trim().optional(),
    deliveryTerms:     z.string().trim().optional(),
    paymentTerms:      z.string().trim().optional(),
    subtotal:          z.coerce.number().min(0).optional(),
    gstAmount:         z.coerce.number().min(0).optional(),
    discount:          z.coerce.number().min(0).optional(),
    totalAmount:       z.coerce.number().min(0).optional(),
    lineItems:         z.array(z.any()).optional(),
    remarks:           z.string().trim().optional(),
    status:            z.enum(['draft', 'verified', 'rejected']).optional(),
  }),
});

export const searchMatchesSchema = z.object({
  query: z.object({
    status:    z.enum(['PENDING', 'MATCHED', 'UNMATCHED']).optional(),
    invoiceId: z.string().uuid().optional(),
    page:      z.coerce.number().int().positive().optional().default(1),
    limit:     z.coerce.number().int().positive().max(100).optional().default(20),
  }),
});

export default {
  startMatchingSchema,
  matchIdSchema,
  invoiceIdParam,
  poIdParam,
  createGRNSchema,
  updateGRNSchema,
  searchMatchesSchema,
};
