import { z } from 'zod';

const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid vendor ID format'),
});

const emptyStringToUndefined = (value) => (value === '' ? undefined : value);
const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const phoneRegex = /^[+\d][\d\s\-()]{6,19}$/;
const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const accountNumberRegex = /^\d{9,18}$/;
const vendorStatusValues = [
  'pending',
  'approved',
  'rejected',
  'blocked',
  'PENDING',
  'ACTIVE',
  'APPROVED',
  'INACTIVE',
  'REJECTED',
  'BLOCKED',
];

const mapSnakeToCamel = (val) => {
  if (!val || typeof val !== 'object') return val;
  const mapped = { ...val };
  const keysMap = {
    tax_id: 'taxId',
    pan_number: 'panNumber',
    zip_code: 'zipCode',
    address_line1: 'addressLine1',
    address_line2: 'addressLine2',
    vendor_type: 'vendorType',
    msme_number: 'msmeNumber',
    tax_type: 'taxType',
    contact_person: 'contactPerson',
    contact_designation: 'contactDesignation',
    alternate_phone: 'alternatePhone',
    bank_name: 'bankName',
    account_holder: 'accountHolder',
    bank_account_no: 'bankAccountNo',
    ifsc_code: 'ifscCode',
    bank_branch: 'bankBranch',
    payment_terms: 'paymentTerms',
  };
  for (const [snake, camel] of Object.entries(keysMap)) {
    if (snake in val && !(camel in val)) {
      mapped[camel] = val[snake];
    }
  }
  return mapped;
};

const vendorBodySchema = z.object({
  name: z.string().min(1, 'Vendor name is required').trim(),
  email: z.string().email('Invalid vendor email').trim().lowercase(),
  phone: z.string().trim().refine((value) => phoneRegex.test(value), 'Invalid phone number'),
  address: z.string().min(1, 'Address is required').trim(),
  addressLine1: z.string().trim().optional(),
  addressLine2: z.string().trim().optional(),
  city: z.string().trim().optional(),
  district: z.string().trim().optional(),
  state: z.string().trim().optional(),
  country: z.string().trim().optional(),
  zipCode: z.string().trim().optional(),
  taxId: z.string().min(1, 'GST number is required').trim().transform((value) => value.toUpperCase()).refine((value) => gstRegex.test(value), 'Invalid GST number'),
  gstNumber: z.string().trim().transform((value) => value.toUpperCase()).refine((value) => !value || gstRegex.test(value), 'Invalid GST number').optional(),
  panNumber: z.string().trim().transform((value) => value.toUpperCase()).refine((value) => !value || panRegex.test(value), 'Invalid PAN number').optional(),
  cin: z.string().trim().optional(),
  msmeNumber: z.string().trim().optional(),
  taxType: z.enum(['Regular', 'Composition', 'Exempt', 'REGULAR', 'COMPOSITION', 'EXEMPT']).optional(),
  category: z.string().min(1, 'Category is required').trim(),
  vendorType: z.string().min(1, 'Vendor type is required').trim(),
  contactPerson: z.string().trim().optional(),
  contactDesignation: z.string().trim().optional(),
  alternatePhone: z.string().trim().refine((value) => !value || phoneRegex.test(value), 'Invalid alternate phone number').optional(),
  bankName: z.string().trim().optional(),
  accountHolder: z.string().trim().optional(),
  bankAccountNo: z.string().trim().refine((value) => !value || accountNumberRegex.test(value), 'Invalid account number').optional(),
  ifscCode: z.string().trim().transform((value) => value.toUpperCase()).refine((value) => !value || ifscRegex.test(value), 'Invalid IFSC code').optional(),
  bankBranch: z.string().trim().optional(),
  paymentTerms: z.string().trim().optional(),
});

export const createVendorSchema = z.object({
  body: z.preprocess(mapSnakeToCamel, vendorBodySchema),
});

export const updateVendorSchema = z.object({
  params: uuidParamSchema,
  body: z.preprocess(
    mapSnakeToCamel,
    vendorBodySchema.partial().extend({
      status: z.enum(vendorStatusValues).optional(),
      isActive: z.boolean().optional(),
    }).refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided for update',
      path: ['body'],
    }),
  ),
});

export const vendorIdSchema = z.object({
  params: uuidParamSchema,
});

export const vendorDocumentSchema = z.object({
  params: uuidParamSchema,
  body: z.object({
    documentType: z.enum([
      'GST_CERTIFICATE',
      'PAN_CARD',
      'VENDOR_AGREEMENT',
      'CANCELLED_CHEQUE',
      'MSME_CERTIFICATE',
      'BANK_PROOF',
      'ADDITIONAL_DOCUMENT',
    ]),
    documentName: z.string().trim().optional(),
  }),
});

export const vendorDocumentIdSchema = z.object({
  params: uuidParamSchema.extend({
    documentId: z.string().uuid('Invalid document ID format'),
  }),
});

export const deleteVendorSchema = z.object({
  params: uuidParamSchema,
});

export const vendorActionSchema = z.object({
  params: uuidParamSchema,
  body: z.object({
    remarks: z.string().trim().optional(),
    reason: z.string().trim().optional(),
    correctiveAction: z.string().trim().optional(),
    blockCategory: z.string().trim().optional(),
    action: z.enum(['approve', 'reject', 'hold', 'block', 'return_to_pending', 'unblock']).optional(),
    followUpDate: z.coerce.date().optional(),
  }).optional().default({}),
});

export const searchVendorsSchema = z.object({
  query: z.object({
    status: z.preprocess(emptyStringToUndefined, z.enum(vendorStatusValues).optional()),
    search: z.preprocess(emptyStringToUndefined, z.string().trim().optional()),
    category: z.preprocess(emptyStringToUndefined, z.string().trim().optional()),
    startDate: z.preprocess(emptyStringToUndefined, z.coerce.date().optional()),
    endDate: z.preprocess(emptyStringToUndefined, z.coerce.date().optional()),
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(10),
    sortField: z.enum(['created_at', 'updated_at', 'vendor_code', 'name', 'status', 'category']).optional().default('created_at'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
});

export default {
  createVendorSchema,
  updateVendorSchema,
  deleteVendorSchema,
  searchVendorsSchema,
  vendorIdSchema,
  vendorDocumentSchema,
  vendorDocumentIdSchema,
  vendorActionSchema,
};
