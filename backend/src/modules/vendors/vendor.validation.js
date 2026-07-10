import { z } from 'zod';

const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid vendor ID format'),
});

const mapSnakeToCamel = (val) => {
  if (!val || typeof val !== 'object') return val;
  const mapped = { ...val };
  const keysMap = {
    tax_id: 'taxId',
    vendor_code: 'vendorCode',
    zip_code: 'zipCode',
    contact_person: 'contactPerson',
    bank_account_no: 'bankAccountNo',
    ifsc_code: 'ifscCode',
    payment_terms: 'paymentTerms'
  };
  for (const [snake, camel] of Object.entries(keysMap)) {
    if (snake in val && !(camel in val)) {
      mapped[camel] = val[snake];
    }
  }
  return mapped;
};

export const createVendorSchema = z.object({
  body: z.preprocess(mapSnakeToCamel, z.object({
    name: z.string().min(1, 'Vendor name is required').trim(),
    vendorCode: z.string().min(1, 'Vendor code cannot be empty').trim().optional(),
    email: z.string().email('Invalid vendor email').trim().lowercase(),
    phone: z.string().min(5, 'Phone is required').trim(),
    address: z.string().min(1, 'Address is required').trim(),
    city: z.string().trim().optional(),
    state: z.string().trim().optional(),
    zipCode: z.string().trim().optional(),
    taxId: z.string().min(1, 'Tax ID is required').trim(),
    category: z.string().min(1, 'Category is required').trim(),
    contactPerson: z.string().trim().optional(),
    bankAccountNo: z.string().trim().optional(),
    ifscCode: z.string().trim().optional(),
    paymentTerms: z.string().trim().optional(),
  })),
});

export const updateVendorSchema = z.object({
  params: uuidParamSchema,
  body: z.preprocess(mapSnakeToCamel, z.object({
    name: z.string().min(2, 'Vendor name must be at least 2 characters').trim().optional(),
    email: z.string().email('Invalid email address').trim().lowercase().optional(),
    phone: z.string().min(10, 'Phone number must be at least 10 digits').trim().optional(),
    address: z.string().min(5, 'Address is required').trim().optional(),
    taxId: z.string().min(1, 'Tax ID/GSTIN is required').trim().optional(),
    category: z.string().min(1, 'Category is required').trim().optional(),
    isActive: z.boolean().optional(),
  }).refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
    path: ['body'],
  })),
});

export const vendorIdSchema = z.object({
  params: uuidParamSchema,
});

export const deleteVendorSchema = z.object({ 
  params: uuidParamSchema,
});

export const vendorActionSchema = z.object({
  params: uuidParamSchema,
  body: z.object({
    remarks: z.string().trim().optional(),
  }).optional().default({}),
});

export const searchVendorsSchema = z.object({
  query: z.object({
    status: z.enum(['pending', 'approved', 'rejected', 'blocked']).optional(),
    search: z.string().trim().optional(),
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(10),
  }),
});

export default {
  createVendorSchema,
  updateVendorSchema,
  deleteVendorSchema,
  searchVendorsSchema,
  vendorIdSchema,
  vendorActionSchema,
};
