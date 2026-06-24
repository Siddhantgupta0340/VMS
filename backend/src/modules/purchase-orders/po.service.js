const { randomUUID } = require("crypto");

const {
  createPurchaseOrder,
  findAll,
  findById,
  updatePurchaseOrder,
  deletePurchaseOrder
} = require("./po.repository");
const { createPurchaseOrderEntity } = require("./po.model");
const { findById: findVendorById } = require("../vendors/vendor.repository");

const calculateTotalAmount = (items) =>
  items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

const createPurchaseOrderService = (validatedPayload, purchaseOrderDocument) => {
  const vendor = findVendorById(validatedPayload.vendorId);
  if (!vendor) return null;

  const id = randomUUID();
  const createdAt = new Date().toISOString();

  const purchaseOrderEntity = createPurchaseOrderEntity({
    id,
    poNumber: validatedPayload.poNumber,
    vendorId: validatedPayload.vendorId,
    poDate: validatedPayload.poDate,
    intendedDeliveryDate: validatedPayload.intendedDeliveryDate,
    expectedDeliveryDate: validatedPayload.expectedDeliveryDate,
    vendorName: validatedPayload.vendorName,
    vendorContactNumber: validatedPayload.vendorContactNumber,
    vendorEmail: validatedPayload.vendorEmail,
    vendorGSTDetails: validatedPayload.vendorGSTDetails,
    gstRate: validatedPayload.gstRate,
    costCenter: validatedPayload.costCenter,
    vendorReferenceId: validatedPayload.vendorReferenceId,
    deliveryChallanNumber: validatedPayload.deliveryChallanNumber,
    deliveryChallanDate: validatedPayload.deliveryChallanDate,
    grnReference: validatedPayload.grnReference,
    grnDate: validatedPayload.grnDate,
    vendorAddress: validatedPayload.vendorAddress,
    companyName: validatedPayload.companyName,
    departmentName: validatedPayload.departmentName,
    billingAddress: validatedPayload.billingAddress,
    shippingAddress: validatedPayload.shippingAddress,
    buyerName: validatedPayload.buyerName,
    buyerContactNumber: validatedPayload.buyerContactNumber,
    buyerEmail: validatedPayload.buyerEmail,
    items: validatedPayload.items,
    subtotal: validatedPayload.subtotal,
    taxAmount: validatedPayload.taxAmount,
    discount: validatedPayload.discount ?? 0,
    taxLessDiscount: validatedPayload.taxLessDiscount,
    finalTotal: validatedPayload.finalTotal,
    paymentTerms: validatedPayload.paymentTerms,
    paymentTermsText: validatedPayload.paymentTermsText,
    status: validatedPayload.status,
    remarks: validatedPayload.remarks,
    purchaseOrderDocument,
    createdAt,
    updatedAt: createdAt
  });

  return createPurchaseOrder(purchaseOrderEntity);
};

const getPurchaseOrdersService = () => findAll();

const getPurchaseOrderByIdService = (purchaseOrderId) => findById(purchaseOrderId);

const updatePurchaseOrderService = (purchaseOrderId, validatedPayload, purchaseOrderDocument) => {
  const existing = findById(purchaseOrderId);
  if (!existing) return null;
  if (validatedPayload.vendorId && !findVendorById(validatedPayload.vendorId)) {
    return "VENDOR_NOT_FOUND";
  }

  const updatedFields = {
    ...existing,
    ...validatedPayload,
    purchaseOrderDocument: purchaseOrderDocument || existing.purchaseOrderDocument,
    updatedAt: new Date().toISOString()
  };

  return updatePurchaseOrder(purchaseOrderId, updatedFields);
};

const deletePurchaseOrderService = (purchaseOrderId) => deletePurchaseOrder(purchaseOrderId);

const patchPurchaseOrderService = (purchaseOrderId, partialPayload, purchaseOrderDocument) => {
  const existing = findById(purchaseOrderId);
  if (!existing) return null;
  if (partialPayload.vendorId && !findVendorById(partialPayload.vendorId)) {
    return "VENDOR_NOT_FOUND";
  }

  const mergedPayload = {
    ...existing,
    ...partialPayload,
    purchaseOrderDocument: purchaseOrderDocument || existing.purchaseOrderDocument,
    updatedAt: new Date().toISOString()
  };

  if (partialPayload.items) {
    mergedPayload.subtotal = calculateTotalAmount(partialPayload.items);
  }

  if (mergedPayload.taxAmount !== undefined && mergedPayload.discount !== undefined) {
    mergedPayload.taxLessDiscount = mergedPayload.taxAmount - mergedPayload.discount;
  }

  if (mergedPayload.subtotal !== undefined && mergedPayload.taxLessDiscount !== undefined) {
    mergedPayload.finalTotal = mergedPayload.subtotal + mergedPayload.taxLessDiscount;
  }

  return updatePurchaseOrder(purchaseOrderId, mergedPayload);
};

module.exports = {
  createPurchaseOrderService,
  getPurchaseOrdersService,
  getPurchaseOrderByIdService,
  updatePurchaseOrderService,
  deletePurchaseOrderService,
  patchPurchaseOrderService
};
