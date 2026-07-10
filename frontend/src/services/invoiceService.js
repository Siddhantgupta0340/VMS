import api from "../api/axios";
import { ROLES } from "../config/permissions";

const mapInvoice = (invoice) => ({
  id: invoice.id,

  invoiceNumber: invoice.invoice_number,

  purchaseOrderId: invoice.purchase_order_id,

  poNumber: invoice.purchase_order?.po_number,

  vendor: invoice.vendor?.name,

  vendorId: invoice.vendor?.id,

  vendorEmail: invoice.vendor?.email,

  vendorCode: invoice.vendor?.vendor_code,

  purchaseOrderAmount: Number(invoice.purchase_order?.amount || 0),

  purchaseOrderStatus: invoice.purchase_order?.status,

  amount: Number(invoice.amount),

  currency: invoice.currency,

  status: invoice.status,

  paymentStatus: invoice.payment_status,

  invoiceDate: invoice.invoice_date,

  dueDate: invoice.due_date,

  description: invoice.description,

  createdAt: invoice.created_at,

  createdById: invoice.created_by?.id || null,

  createdBy:
    invoice.created_by
      ? `${invoice.created_by.first_name} ${invoice.created_by.last_name}`
      : "-",

  currentApprovalLevel: invoice.current_approval_level,

  requiredApprovalRole: invoice.required_approval_role,

  teamLeadApprover: invoice.team_lead_approver
    ? `${invoice.team_lead_approver.first_name || ""} ${invoice.team_lead_approver.last_name || ""}`.trim() || "-"
    : "-",

  managerApprover: invoice.manager_approver
    ? `${invoice.manager_approver.first_name || ""} ${invoice.manager_approver.last_name || ""}`.trim() || "-"
    : "-",

  financeHeadApprover: invoice.finance_head_approver
    ? `${invoice.finance_head_approver.first_name || ""} ${invoice.finance_head_approver.last_name || ""}`.trim() || "-"
    : "-",

  items: invoice.purchase_order?.line_items || [],
});

export const getInvoices = async () => {
  const res = await api.get("/v1/invoices");

  return (res.data.invoices || []).map(mapInvoice);
};

export const createInvoice = async (data) => {

  const payload = {

  vendorId: data.vendorId,

  purchaseOrderId: data.purchaseOrderId,

  invoiceNumber: data.invoiceNumber,

  amount: Number(data.total),

  currency: "INR",

  invoiceDate: data.invoiceDate,

  dueDate: data.dueDate,

  description: data.notes,

};

  const res = await api.post("/v1/invoices", payload);

  return res.data.data;

};

export const approveInvoice = async (id) => {

  const res = await api.patch(`/v1/invoices/${id}/approve`, {});

  return res.data;

};

export const rejectInvoice = async (id, reason = "Rejected by approver") => {

  const res = await api.patch(`/v1/invoices/${id}/reject`, {

    rejectionReason: reason,

  });

  return res.data;

};

  export const getInvoiceById = async (id) => {
  const res = await api.get(`/v1/invoices/${id}`);

  return mapInvoice(res.data.data);
};