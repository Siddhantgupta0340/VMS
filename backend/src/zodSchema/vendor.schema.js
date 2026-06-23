import { z } from 'zod';

export const createVendorSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Vendor name must be at least 2 characters').trim(),
    email: z.string().email('Invalid email address').trim().lowercase(),
    phone: z.string().min(10, 'Phone number must be at least 10 digits').trim(),
    address: z.string().min(5, 'Address is required').trim(),
    taxId: z.string().min(1, 'Tax ID/GSTIN is required').trim(),
    category: z.string().min(1, 'Category is required').trim(),
  }),
});

export const updateVendorSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid vendor ID format'),
  }),
  body: z.object({
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
  }),
});

export const deleteVendorSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid vendor ID format'),
  }),
});

export const searchVendorsSchema = z.object({
  query: z.object({
    search: z.string().trim().optional(),
    category: z.string().trim().optional(),
    isActive: z.enum(['true', 'false']).transform((val) => val === 'true').optional(),
    page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).optional().default('10'),
  }),
});

export default { createVendorSchema, updateVendorSchema, deleteVendorSchema, searchVendorsSchema };