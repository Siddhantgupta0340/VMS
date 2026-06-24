const { z } = require("zod");

const parseJsonArray = z.preprocess((value) => {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}, z.array(z.any()));

const poItemSchema = z.object({
  itemNo: z.string().min(1, "Item number is required"),
  sku: z.string().min(1, "SKU is required"),
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number().int("Quantity must be an integer").positive("Quantity must be greater than zero"),
  unitPrice: z.coerce.number().nonnegative("Unit price must be zero or more"),
  total: z.coerce.number().nonnegative("Total must be zero or more"),
  taxDetails: z.string().optional(),
  uom: z.string().optional()
}).refine((item) => item.total === item.quantity * item.unitPrice, {
  message: "Item total must equal quantity * unitPrice",
  path: ["total"]
});

const dateString = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: "must be a valid date"
});

const paymentTermsEnum = z.enum(["Net 30", "Net 45", "Advance Payment", "Partial Payment", "Manual"]);
const statusEnum = z.enum(["Draft", "Issued", "Approved", "Partially Received", "Closed", "Cancelled"]);

const purchaseOrderSchema = z.object({
  vendorId: z.string().uuid("vendorId must be a valid UUID"),
  poNumber: z.string().min(1, "PO Number is required"),
  poDate: dateString,
  intendedDeliveryDate: dateString,
  expectedDeliveryDate: dateString,
  vendorName: z.string().min(1, "Vendor Name is required"),
  vendorContactNumber: z.string().min(1, "Vendor Contact Number is required"),
  vendorEmail: z.string().email("Vendor Email must be a valid email"),
  vendorGSTDetails: z.string().optional(),
  gstRate: z.coerce.number().nonnegative("GST Rate must be zero or more"),
  costCenter: z.string().optional(),
  vendorReferenceId: z.string().optional(),
  deliveryChallanNumber: z.string().optional(),
  deliveryChallanDate: z.string().optional().refine((value) => value === undefined || !Number.isNaN(Date.parse(value)), "Delivery Challan Date must be a valid date"),
  grnReference: z.string().optional(),
  grnDate: z.string().optional().refine((value) => value === undefined || !Number.isNaN(Date.parse(value)), "GRN Date must be a valid date"),
  vendorAddress: z.string().optional(),
  companyName: z.string().optional(),
  departmentName: z.string().optional(),
  billingAddress: z.string().optional(),
  shippingAddress: z.string().optional(),
  buyerName: z.string().optional(),
  buyerContactNumber: z.string().optional(),
  buyerEmail: z.string().email("Buyer Email must be a valid email").optional(),
  items: parseJsonArray.pipe(z.array(poItemSchema).min(1, "At least one purchase order item is required")),
  subtotal: z.coerce.number().nonnegative("Subtotal must be zero or more"),
  taxAmount: z.coerce.number().nonnegative("Tax amount must be zero or more"),
  discount: z.coerce.number().nonnegative("Discount must be zero or more").optional().default(0),
  taxLessDiscount: z.coerce.number().nonnegative("Tax less discount must be zero or more"),
  finalTotal: z.coerce.number().nonnegative("Final total must be zero or more"),
  paymentTerms: paymentTermsEnum,
  paymentTermsText: z.string().optional(),
  status: statusEnum,
  remarks: z.string().max(1000).optional()
}).refine((data) => data.taxLessDiscount === data.taxAmount - (data.discount ?? 0), {
  message: "Tax less discount must equal taxAmount minus discount",
  path: ["taxLessDiscount"]
}).refine((data) => data.finalTotal === data.subtotal + data.taxLessDiscount, {
  message: "Final total must equal subtotal plus tax less discount",
  path: ["finalTotal"]
}).refine(
  (data) => data.paymentTerms !== "Manual" || (data.paymentTermsText && data.paymentTermsText.trim().length > 0),
  {
    message: "paymentTermsText is required when paymentTerms is Manual",
    path: ["paymentTermsText"]
  }
);

const purchaseOrderPatchSchema = z.object({
  vendorId: z.string().uuid().optional(),
  poNumber: z.string().min(1).optional(),
  poDate: dateString.optional(),
  intendedDeliveryDate: dateString.optional(),
  expectedDeliveryDate: dateString.optional(),
  vendorName: z.string().min(1).optional(),
  vendorContactNumber: z.string().min(1).optional(),
  vendorEmail: z.string().email("Vendor Email must be a valid email").optional(),
  vendorGSTDetails: z.string().optional(),
  gstRate: z.coerce.number().nonnegative("GST Rate must be zero or more").optional(),
  costCenter: z.string().optional(),
  vendorReferenceId: z.string().optional(),
  deliveryChallanNumber: z.string().optional(),
  deliveryChallanDate: z.string().optional().refine((value) => value === undefined || !Number.isNaN(Date.parse(value)), "Delivery Challan Date must be a valid date"),
  grnReference: z.string().optional(),
  grnDate: z.string().optional().refine((value) => value === undefined || !Number.isNaN(Date.parse(value)), "GRN Date must be a valid date"),
  vendorAddress: z.string().optional(),
  companyName: z.string().optional(),
  departmentName: z.string().optional(),
  billingAddress: z.string().optional(),
  shippingAddress: z.string().optional(),
  buyerName: z.string().optional(),
  buyerContactNumber: z.string().optional(),
  buyerEmail: z.string().email("Buyer Email must be a valid email").optional(),
  items: parseJsonArray.pipe(z.array(poItemSchema).min(1, "At least one purchase order item is required")).optional(),
  subtotal: z.coerce.number().nonnegative("Subtotal must be zero or more").optional(),
  taxAmount: z.coerce.number().nonnegative("Tax amount must be zero or more").optional(),
  discount: z.coerce.number().nonnegative("Discount must be zero or more").optional(),
  taxLessDiscount: z.coerce.number().nonnegative("Tax less discount must be zero or more").optional(),
  finalTotal: z.coerce.number().nonnegative("Final total must be zero or more").optional(),
  paymentTerms: paymentTermsEnum.optional(),
  paymentTermsText: z.string().optional(),
  status: statusEnum.optional(),
  remarks: z.string().max(1000).optional()
}).superRefine((payload, ctx) => {
  if (Object.keys(payload).length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one field is required to patch a purchase order"
    });
  }

  if (payload.paymentTerms === "Manual" && !(payload.paymentTermsText && payload.paymentTermsText.trim().length > 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["paymentTermsText"],
      message: "paymentTermsText is required when paymentTerms is Manual"
    });
  }
});

module.exports = {
  purchaseOrderSchema,
  purchaseOrderPatchSchema
};
