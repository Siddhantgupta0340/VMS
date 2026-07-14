import api from "../api/axios";

const mapPayment = (payment) => ({
  id: payment.id,
  paymentNumber: payment.payment_number,
  invoiceId: payment.invoice_id,
  invoiceNumber: payment.invoice?.invoice_number || "N/A",
  vendor: payment.vendor?.name || "N/A",
  vendorId: payment.vendor_id,
  purchaseOrderId: payment.purchase_order_id,
  poNumber: payment.purchase_order?.po_number || "N/A",
  amount: Number(payment.amount || 0),
  currency: payment.currency || "INR",
  status: payment.status,
  paymentMethod: payment.payment_method || "-",
  paymentType: payment.payment_type || "FULL",
  paymentProvider: payment.payment_provider || "MANUAL",
  providerTransactionId: payment.provider_transaction_id || "-",
  gatewayReference: payment.gateway_reference || "-",
  paymentGatewayResponse: payment.payment_gateway_response,
  gatewayStatus: payment.gateway_status,
  responseMessage: payment.response_message,
  paymentDate: payment.payment_date,
  dueDate: payment.due_date,
  remarks: payment.remarks || "-",
  createdBy: payment.created_by
    ? `${payment.created_by.first_name || ""} ${payment.created_by.last_name || ""}`.trim()
    : "-",
  approvedBy: payment.approved_by
    ? `${payment.approved_by.first_name || ""} ${payment.approved_by.last_name || ""}`.trim()
    : "-",
  processedBy: payment.processed_by
    ? `${payment.processed_by.first_name || ""} ${payment.processed_by.last_name || ""}`.trim()
    : "-",
  createdAt: payment.created_at,
  updatedAt: payment.updated_at,
});

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

export const getPaymentById = async (id) => {
  const res = await api.get(`/v1/payments/${id}`);
  return mapPayment(res.data.data);
};

export const createPayment = async (payload) => {
  // Payload fields: invoiceId, amount, currency, paymentMethod, referenceNo, notes
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
