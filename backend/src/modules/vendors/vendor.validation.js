const { z } = require("zod");

/**
 * Validation Layer
 * - Owns request payload validation using Zod
 * - Keeps validation rules centralized and replaceable later
 */
const vendorSchema = z.object({
  vendorName: z.string().min(3, "vendorName must be at least 3 characters"),
  companyName: z.string().min(1),
  email: z.string().email("email must be a valid email address"),
  phone: z.string().regex(/^\d{10}$/, "phone must be exactly 10 digits"),
  gstNumber: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  country: z.string().min(1),
  category: z.string().min(1),
  contactPerson: z.string().min(1)
});

// Partial schema for PATCH requests: all fields optional but validated when present
const vendorPatchSchema = vendorSchema.partial();

module.exports = {
  vendorSchema,
  vendorPatchSchema
};
