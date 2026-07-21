import api from "../api/axios";

const mapPayment = (payment) => {
  if (!payment) return null;
  const amount = Number(payment.amount ?? payment.requestedAmount ?? 0);
  const currency = payment.currency || "INR";
  const creator = payment.created_by;
  const approver = payment.approved_by;
  const processor = payment.processed_by;

  const creatorName = payment.requestedBy || (creator
    ? `${creator.first_name || ""} ${creator.last_name || ""}`.trim() || creator.email
    : "-");

  const approverName = payment.approvedBy || (approver
    ? `${approver.first_name || ""} ${approver.last_name || ""}`.trim() || approver.email
    : "-");

  const processorName = payment.processedBy || (processor
    ? `${processor.first_name || ""} ${processor.last_name || ""}`.trim() || processor.email
    : "-");

  return {
    id: payment.id,
    paymentNumber: payment.payment_number || payment.paymentNumber || "N/A",
    invoiceId: payment.invoice_id || payment.invoiceId,
    invoiceNumber: payment.invoice?.invoice_number || payment.invoiceNumber || "N/A",
    vendor: payment.vendor?.name || payment.vendorName || "N/A",
    vendorCode: payment.vendor?.vendor_code || payment.vendorCode || "N/A",
    vendorId: payment.vendor_id || payment.vendorId,
    purchaseOrderId: payment.purchase_order_id || payment.purchaseOrderId,
    poNumber: payment.purchase_order?.po_number || payment.purchaseOrderNumber || "N/A",
    amount,
    currency,
    status: payment.status || payment.currentStatus || "PENDING",
    requiredApprovalRole: payment.required_approval_role || payment.requiredApprovalRole || "-",
    approvalBand: payment.approval_band || payment.approvalBand || "-",
    priority: payment.priority || "Normal",
    paymentMethod: payment.payment_method || payment.paymentMethod || "-",
    paymentType: payment.payment_type || payment.paymentType || "FULL",
    paymentProvider: payment.payment_provider || payment.paymentProvider || "MANUAL",
    providerTransactionId: payment.provider_transaction_id || payment.providerTransactionId || "-",
    gatewayReference: payment.gateway_reference || payment.gatewayReference || "-",
    paymentGatewayResponse: payment.payment_gateway_response || payment.paymentGatewayResponse,
    gatewayStatus: payment.gateway_status || payment.gatewayStatus,
    responseMessage: payment.response_message || payment.responseMessage,
    paymentDate: payment.payment_date || payment.paymentDate,
    dueDate: payment.due_date || payment.dueDate,
    remarks: payment.remarks || "-",
    createdBy: creatorName,
    approvedBy: approverName,
    processedBy: processorName,
    createdAt: payment.created_at || payment.requestDate,
    updatedAt: payment.updated_at || payment.updatedAt,
  };
};

export const getPayments = async (params = {}) => {
  const res = await api.get("/v1/payments", { params });
  return (res.data.payments || []).map(mapPayment);
};

export const getPendingPayments = async (params = {}) => {
  const res = await api.get("/v1/payments/pending", { params });
  return (res.data.payments || []).map(mapPayment);
};

export const getCompletedPayments = async (params = {}) => {
  const res = await api.get("/v1/payments/completed", { params });
  return (res.data.payments || []).map(mapPayment);
};

export const getPaymentStats = async () => {
  const res = await api.get("/v1/payments/stats");
  return res.data.data;
};

export const getPaymentCreationStats = async () => {
  const res = await api.get("/v1/payments/creation-stats");
  return res.data.data;
};

export const getPaymentById = async (id) => {
  const res = await api.get(`/v1/payments/${id}`);
  return mapPayment(res.data.data);
};

export const createPayment = async (payload) => {
  const res = await api.post("/v1/payments", payload);
  return res.data.data;
};

export const updatePayment = async (id, payload) => {
  const res = await api.put(`/v1/payments/${id}`, payload);
  return res.data.data;
};

export const deletePayment = async (id) => {
  const res = await api.delete(`/v1/payments/${id}`);
  return res.data;
};

export const getPaymentHistory = async (id) => {
  const res = await api.get(`/v1/payments/${id}/history`);
  return res.data.data || [];
};

export const approvePayment = async (id, remarks = "", referenceNo = "") => {
  const res = await api.patch(`/v1/payments/${id}/approve`, { remarks, referenceNo });
  return res.data;
};

export const rejectPayment = async (id, remarks = "") => {
  const res = await api.patch(`/v1/payments/${id}/reject`, { remarks });
  return res.data;
};

export const returnPayment = async (id, remarks = "") => {
  const res = await api.patch(`/v1/payments/${id}/return`, { remarks });
  return res.data;
};

export const cancelPayment = async (id, remarks = "") => {
  const res = await api.patch(`/v1/payments/${id}/cancel`, { remarks });
  return res.data;
};

export const refundPayment = async (id, remarks = "") => {
  const res = await api.patch(`/v1/payments/${id}/refund`, { remarks });
  return res.data;
};

export const retryPayment = async (id) => {
  const res = await api.post(`/v1/payments/${id}/retry`);
  return res.data;
};
