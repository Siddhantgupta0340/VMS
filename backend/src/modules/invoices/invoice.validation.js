const { z } = require("zod");

const invoiceSchema = z.object({
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  purchaseOrderId: z.string().uuid("Purchase order ID must be a valid UUID"),
  invoiceDate: z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Invoice date must be a valid date"),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  status: z.enum(["Draft", "Submitted", "Approved", "Paid", "Rejected"]).optional(),
  remarks: z.string().max(500).optional()
});

const invoicePatchSchema = invoiceSchema.partial().refine(
  (payload) => Object.keys(payload).length > 0,
  {
    message: "At least one field is required to patch an invoice"
  }
);

module.exports = {
  invoiceSchema,
  invoicePatchSchema
};
