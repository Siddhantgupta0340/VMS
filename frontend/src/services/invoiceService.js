import api from "../api/axios";

const mapInvoice = (invoice) => {
  const v = invoice.vendor || invoice.purchase_order?.vendor;
  const gstVal = v ? (v.gst_number || v.tax_id || null) : null;
  const fullAddr = v ? ([v.address_line1 || v.address, v.address_line2, v.city, v.district, v.state, v.zip_code, v.country].filter(Boolean).join(", ") || v.address || null) : null;

  const match = invoice.three_way_matches?.[0];
  const grnSnap = match?.grn_snapshot || match?.grnSnapshot;
  const dcSnap = match?.delivery_challan_snapshot || match?.deliveryChallanSnapshot;
  const directGrn = invoice.purchase_order?.grns?.[0];
  const directDc = invoice.purchase_order?.delivery_challans?.[0];
  const approvedApproval = invoice.payment_approvals?.[0];

  const grnNum = grnSnap?.grnNumber || grnSnap?.grn_number || directGrn?.grn_number || "N/A";
  const grnDt = grnSnap?.receivedDate || directGrn?.received_date || directGrn?.created_at || null;
  const dcNum = dcSnap?.deliveryChallanNumber || dcSnap?.delivery_challan_number || directDc?.delivery_challan_number || "N/A";
  const dcDt = dcSnap?.deliveryDate || directDc?.delivery_date || directDc?.created_at || null;

  const invoiceTotal = Number(invoice.invoice_total ?? invoice.amount ?? 0);
  const paidAmount = Number(invoice.paid_amount ?? 0);
  const remainingAmount = Number(invoice.remaining_amount ?? (invoiceTotal - paidAmount));

  return {
    id: invoice.id,
    invoiceNumber: invoice.invoice_number,
    purchaseOrderId: invoice.purchase_order_id,
    poNumber: invoice.purchase_order?.po_number,
    poDate: invoice.purchase_order?.order_date || invoice.purchase_order?.po_date || invoice.purchase_order?.created_at,
    grnNumber: grnNum,
    grnDate: grnDt,
    deliveryChallanNumber: dcNum,
    deliveryChallanDate: dcDt,
    vendor: v?.name || null,
    vendorName: v?.name || null,
    vendorCode: v?.vendor_code || null,
    vendorId: v?.id || invoice.vendor_id || null,
    vendorEmail: v?.email || null,
    vendorPhone: v?.phone || null,
    vendorCategory: v?.category || null,
    vendorContactPerson: v?.contact_person || null,
    vendorContact: v?.contact_person || v?.phone || null,
    vendorState: v?.state || null,
    vendorGst: gstVal,
    gstNumber: gstVal,
    vendorPan: v?.pan_number || null,
    vendorAddress: fullAddr,
    vendorTaxType: v?.tax_type || null,
    vendorBankName: v?.bank_name || null,
    vendorAccountHolder: v?.account_holder || null,
    vendorBankAccountNo: v?.bank_account_no || null,
    vendorIfscCode: v?.ifsc_code || null,
    vendorBankBranch: v?.bank_branch || null,
    purchaseOrderAmount: Number(invoice.purchase_order?.amount || 0),
    purchaseOrderStatus: invoice.purchase_order?.status,
    amount: Number(invoice.amount),
    invoiceTotal: invoiceTotal,
    paidAmount: paidAmount,
    outstandingAmount: remainingAmount,
    remainingPayableAmount: remainingAmount,
    currency: invoice.currency,
    status: invoice.status,
    paymentStatus: invoice.payment_status,
    threeWayMatchStatus: invoice.three_way_match_status,
    paymentApprovalStatus: approvedApproval?.status || (invoice.status === "APPROVED" ? "APPROVED" : "PENDING"),
    approvedAmount: Number(approvedApproval?.amount || invoiceTotal),
    dueDate: invoice.due_date,
  description: invoice.description,
  createdAt: invoice.created_at,
  updatedAt: invoice.updated_at,
  createdById: invoice.created_by?.id || null,
  createdBy: invoice.created_by
    ? `${invoice.created_by.first_name || ""} ${invoice.created_by.last_name || ""}`.trim()
    : "-",
  vendorStatus: invoice.vendor?.status || "-",
  currentApprovalLevel: invoice.current_approval_level,
  requiredApprovalRole: invoice.required_approval_role,
  fileUrl: invoice.file_url,
  fileName: invoice.file_name,
  invoiceCreationMethod: invoice.invoice_creation_method,
  invoiceCategory: invoice.invoice_category,
  invoiceSource: invoice.invoice_source,
  ocrStatus: invoice.ocr_status,
  ocrConfidence: invoice.ocr_confidence,
  ocrExtractedData: invoice.ocr_extracted_data,
  attachments: invoice.attachments || [],
  taxSummary: invoice.tax_summary || invoice.purchase_order?.tax_summary || null,
  teamLeadApprover: invoice.team_lead_approver
    ? `${invoice.team_lead_approver.first_name || ""} ${invoice.team_lead_approver.last_name || ""}`.trim() || "-"
    : "-",
  managerApprover: invoice.manager_approver
    ? `${invoice.manager_approver.first_name || ""} ${invoice.manager_approver.last_name || ""}`.trim() || "-"
    : "-",
  financeHeadApprover: invoice.finance_head_approver
    ? `${invoice.finance_head_approver.first_name || ""} ${invoice.finance_head_approver.last_name || ""}`.trim() || "-"
    : "-",
  paymentTerms: invoice.purchase_order?.payment_terms,
  deliveryAddress: invoice.purchase_order?.delivery_address,
  billingAddress: invoice.purchase_order?.billing_address,
  items: Array.isArray(invoice.line_items)
    ? invoice.line_items.map(normalizePurchaseOrderItem)
    : Array.isArray(invoice.purchase_order?.line_items)
      ? invoice.purchase_order.line_items.map(normalizePurchaseOrderItem)
      : [],
  };
};

const num = (value) => Number(value || 0);
const first = (...values) => values.find((value) => value !== undefined && value !== null && value !== "");
const debugInvoiceService = (...args) => {
  if (import.meta.env.DEV) console.debug(...args);
};

const normalizePurchaseOrderItem = (item, index) => {
  const quantity = num(first(item.quantity, item.qty));
  const unitPrice = num(first(item.unitPrice, item.unit_price, item.rate));
  const taxableAmount = num(first(item.taxableAmount, item.taxable_amount, quantity * unitPrice));
  const cgstAmount = num(first(item.cgstAmount, item.cgst_amount, item.cgst));
  const sgstAmount = num(first(item.sgstAmount, item.sgst_amount, item.sgst));
  const igstAmount = num(first(item.igstAmount, item.igst_amount, item.igst));
  const gstAmount = num(first(item.gstAmount, item.gst_amount, item.taxAmount, item.tax_amount, cgstAmount + sgstAmount + igstAmount));
  return {
    poItemId: first(item.id, item.itemId, item.item_id, `${index + 1}`),
    lineNumber: first(item.lineNumber, item.line_number, index + 1),
    itemName: first(item.itemName, item.item_name, item.name, ""),
    description: first(item.description, ""),
    quantity,
    unitPrice,
    taxableAmount,
    cgstRate: num(first(item.cgstRate, item.cgst_rate)),
    sgstRate: num(first(item.sgstRate, item.sgst_rate)),
    igstRate: num(first(item.igstRate, item.igst_rate)),
    cgstAmount,
    sgstAmount,
    igstAmount,
    gstAmount,
    lineTotal: num(first(item.lineTotal, item.line_total, item.total, item.amount, taxableAmount + gstAmount)),
  };
};

const normalizeTaxSummary = (summary = {}, items = [], poAmount = 0) => {
  const subtotal = num(first(summary.subtotal, summary.taxableAmount, summary.taxable_amount)) ||
    items.reduce((total, item) => total + item.taxableAmount, 0);
  const cgstTotal = num(first(summary.cgstTotal, summary.cgst_total, summary.cgst));
  const sgstTotal = num(first(summary.sgstTotal, summary.sgst_total, summary.sgst));
  const igstTotal = num(first(summary.igstTotal, summary.igst_total, summary.igst));
  const totalGst = num(first(summary.totalGst, summary.total_gst, summary.gstAmount, summary.gst_amount)) ||
    cgstTotal + sgstTotal + igstTotal;
  const otherCharges = num(first(summary.otherCharges, summary.other_charges));
  const roundOff = num(first(summary.roundOff, summary.round_off));
  const grandTotal = num(first(summary.grandTotal, summary.grand_total, poAmount));

  return { ...summary, subtotal, cgstTotal, sgstTotal, igstTotal, totalGst, otherCharges, roundOff, grandTotal };
};

const mapApprovedPurchaseOrder = (po) => {
  const v = po.vendor || {};
  const items = Array.isArray(po.line_items) ? po.line_items.map(normalizePurchaseOrderItem) : [];
  const amount = num(po.amount);
  const gstVal = v.gst_number || v.tax_id || null;
  const fullAddr = [v.address_line1 || v.address, v.address_line2, v.city, v.district, v.state, v.zip_code, v.country].filter(Boolean).join(", ") || v.address || null;

  return {
    id: po.id,
    poNumber: po.po_number,
    vendorId: po.vendor_id || v.id || null,
    vendor: v.name || null,
    vendorName: v.name || null,
    vendorCode: v.vendor_code || null,
    vendorGst: gstVal,
    gstNumber: gstVal,
    vendorCategory: v.category || null,
    category: v.category || null,
    vendorPan: v.pan_number || null,
    vendorAddress: fullAddr,
    address: fullAddr,
    vendorEmail: v.email || null,
    email: v.email || null,
    vendorPhone: v.phone || null,
    phone: v.phone || null,
    vendorState: v.state || null,
    state: v.state || null,
    vendorContactPerson: v.contact_person || null,
    contactPerson: v.contact_person || null,
    vendorTaxType: v.tax_type || null,
    taxType: v.tax_type || null,
    vendorBankName: v.bank_name || null,
    bankName: v.bank_name || null,
    vendorAccountHolder: v.account_holder || null,
    accountHolder: v.account_holder || null,
    vendorBankAccountNo: v.bank_account_no || null,
    bankAccountNo: v.bank_account_no || null,
    vendorIfscCode: v.ifsc_code || null,
    ifscCode: v.ifsc_code || null,
    vendorBankBranch: v.bank_branch || null,
    bankBranch: v.bank_branch || null,
    amount,
    currency: po.currency || "INR",
    status: po.status,
    poDate: po.po_date || po.order_date || po.created_at,
    expectedDeliveryDate: po.expected_delivery_date,
    createdAt: po.created_at,
    paymentTerms: po.payment_terms,
    billingAddress: po.billing_address || v.billing_address || null,
    deliveryAddress: po.delivery_address || v.delivery_address || null,
    items,
    taxSummary: normalizeTaxSummary(po.tax_summary || {}, items, amount),
    existingInvoices: po.invoices || [],
    grns: po.grns || [],
    deliveryChallans: po.delivery_challans || [],
  };
};

export const getInvoices = async (params = {}) => {
  const cleanParams = typeof params === "object" && params !== null ? params : {};
  const res = await api.get("/v1/invoices", { params: cleanParams });
  const rawInvoices = res.data.invoices || (Array.isArray(res.data) ? res.data : []);
  const mapped = rawInvoices.map(mapInvoice);

  const result = [...mapped];
  result.invoices = mapped;
  result.total = res.data.total ?? mapped.length;
  result.page = res.data.page ?? 1;
  result.limit = res.data.limit ?? 10;
  result.totalPages = res.data.totalPages ?? 1;

  return result;
};


export const getInvoiceById = async (id) => {
  const res = await api.get(`/v1/invoices/${id}`);
  return mapInvoice(res.data.data);
};

export const getApprovedPurchaseOrdersForInvoice = async (params = {}) => {
  console.debug("[invoiceService] Fetching approved POs with params:", params);
  const res = await api.get("/v1/invoices/approved-purchase-orders", { params });
  console.debug("[invoiceService] Response received from API:", res.data);
  const mapped = (res.data.purchaseOrders || []).map(mapApprovedPurchaseOrder);
  console.debug("[invoiceService] Mapped response records count:", mapped.length);
  return mapped;
};

export const getPurchaseOrderForInvoice = async (purchaseOrderId) => {
  const res = await api.get(`/v1/purchase-orders/${purchaseOrderId}`);
  return mapApprovedPurchaseOrder(res.data.data);
};

export const createInvoice = async ({
  purchaseOrderId,
  invoiceDate,
  dueDate,
  remarks,
  invoiceFile,
  invoiceCreationMethod = "MANUAL",
  invoiceSource,
  invoiceCategory,
  supportingDocuments = [],
}) => {
  debugInvoiceService("[InvoiceService] API called: create invoice", {
    purchaseOrderId,
    invoiceDate,
    dueDate,
    invoiceCreationMethod,
    hasAttachment: Boolean(invoiceFile),
    hasRemarks: Boolean(remarks?.trim()),
  });
  const formData = new FormData();
  formData.append("purchaseOrderId", purchaseOrderId);
  formData.append("invoiceCreationMethod", invoiceCreationMethod);
  formData.append("invoiceSource", invoiceSource || (invoiceCreationMethod === "OCR" ? "UPLOADED_PDF" : "MANUAL_ENTRY"));
  formData.append("invoiceCategory", invoiceCategory);
  if (invoiceDate) formData.append("invoiceDate", invoiceDate);
  if (dueDate) formData.append("dueDate", dueDate);
  if (remarks) formData.append("remarks", remarks);
  if (invoiceFile) formData.append("invoiceFile", invoiceFile);
  supportingDocuments.forEach((file) => formData.append("supportingDocuments", file));

  const res = await api.post("/v1/invoices", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return mapInvoice(res.data.data);
};

export const updateInvoice = async ({
  id,
  invoiceDate,
  dueDate,
  remarks,
  invoiceFile,
  lineItems,
  reason,
}) => {
  const formData = new FormData();
  if (invoiceDate) formData.append("invoiceDate", invoiceDate);
  if (dueDate) formData.append("dueDate", dueDate);
  if (remarks !== undefined) formData.append("remarks", remarks);
  if (Array.isArray(lineItems)) formData.append("lineItems", JSON.stringify(lineItems));
  if (reason) formData.append("reason", reason);
  if (invoiceFile) formData.append("invoiceFile", invoiceFile);

  const res = await api.put(`/v1/invoices/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return mapInvoice(res.data.data);
};

export const approveInvoice = async (id) => {
  const res = await api.patch(`/v1/invoices/${id}/approve`, {});
  return res.data;
};

export const approveInvoiceWithRemarks = async (id, remarks = "") => {
  const res = await api.patch(`/v1/invoices/${id}/approve`, { remarks });
  return res.data;
};

export const rejectInvoice = async (id, reason = "Rejected by approver") => {
  const res = await api.patch(`/v1/invoices/${id}/reject`, { rejectionReason: reason });
  return res.data;
};

export const cancelInvoice = async (id, reason = "") => {
  const res = await api.patch(`/v1/invoices/${id}/cancel`, { remarks: reason });
  return res.data;
};

export const softDeleteInvoice = async (id, reason = "Deleted from system dashboard") => {
  const res = await api.delete(`/v1/invoices/${id}`, { data: { deleteReason: reason } });
  return res.data;
};

export const restoreInvoice = async (id) => {
  const res = await api.post(`/v1/invoices/${id}/restore`, {});
  return res.data;
};

export const addRemark = async (id, comment) => {
  const res = await api.post(`/v1/invoices/${id}/remark`, { remark: comment });
  return res.data;
};

export const getFinanceHeadInvoiceApprovals = async (params = {}) => {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  );
  const res = await api.get("/v1/invoices/pending/finance-head", { params: cleanParams });
  return {
    invoices: (res.data.invoices || []).map(mapInvoice),
    total: Number(res.data.total || 0),
    page: Number(res.data.page || cleanParams.page || 1),
    limit: Number(res.data.limit || cleanParams.limit || 10),
    totalPages: Number(res.data.totalPages || 1),
  };
};

export const downloadInvoicePdf = async (id, fallbackInvoiceNumber = 'Invoice') => {
  const res = await api.get(`/v1/invoices/${id}/pdf`, {
    responseType: 'blob',
  });

  const blob = new Blob([res.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);

  let filename = `${fallbackInvoiceNumber}.pdf`;
  const disposition = res.headers?.['content-disposition'];
  if (disposition && disposition.includes('filename=')) {
    const matches = /filename="?([^";]+)"?/.exec(disposition);
    if (matches && matches[1]) {
      filename = matches[1];
    }
  }

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);

  return true;
};


export const getCompanyInfo = async () => {
  try {
    const res = await api.get("/v1/lookups/company");
    return res.data.data;
  } catch (err) {
    console.error("Failed to fetch company info from API:", err);
    return null;
  }
};

