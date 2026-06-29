const { randomUUID } = require("crypto");

const {
  createInvoice,
  findAll,
  findById,
  updateInvoice,
  deleteInvoice
} = require("./invoice.repository");
const { createInvoiceEntity } = require("./invoice.model");
const { findById: findPOById } = require("../purchase-orders/po.repository");

const createInvoiceService = (validatedPayload) => {
  const po = findPOById(validatedPayload.purchaseOrderId);
  if (!po) return null;

  const id = randomUUID();
  const now = new Date().toISOString();

  const invoiceEntity = createInvoiceEntity({
    id,
    invoiceNumber: validatedPayload.invoiceNumber,
    purchaseOrderId: validatedPayload.purchaseOrderId,
    invoiceDate: validatedPayload.invoiceDate,
    amount: validatedPayload.amount,
    status: validatedPayload.status ?? "Draft",
    remarks: validatedPayload.remarks,
    createdAt: now,
    updatedAt: now
  });

  return createInvoice(invoiceEntity);
};

const getInvoicesService = () => findAll();
const getInvoiceByIdService = (invoiceId) => findById(invoiceId);

const updateInvoiceService = (invoiceId, validatedPayload) => {
  const existing = findById(invoiceId);
  if (!existing) return null;
  if (validatedPayload.purchaseOrderId && !findPOById(validatedPayload.purchaseOrderId)) {
    return "PO_NOT_FOUND";
  }

  const updatedInvoice = {
    ...existing,
    ...validatedPayload,
    updatedAt: new Date().toISOString()
  };

  return updateInvoice(invoiceId, updatedInvoice);
};

const deleteInvoiceService = (invoiceId) => deleteInvoice(invoiceId);

const patchInvoiceService = (invoiceId, partialPayload) => {
  const existing = findById(invoiceId);
  if (!existing) return null;
  if (partialPayload.purchaseOrderId && !findPOById(partialPayload.purchaseOrderId)) {
    return "PO_NOT_FOUND";
  }

  const patchedInvoice = {
    ...existing,
    ...partialPayload,
    updatedAt: new Date().toISOString()
  };

  return updateInvoice(invoiceId, patchedInvoice);
};

module.exports = {
  createInvoiceService,
  getInvoicesService,
  getInvoiceByIdService,
  updateInvoiceService,
  deleteInvoiceService,
  patchInvoiceService
};
