import api from "../api/axios";

const mapPO = (po) => {
  const v = po.vendor;
  const gstVal = v ? (v.gst_number || v.tax_id || null) : null;
  const fullAddr = v ? ([v.address_line1 || v.address, v.address_line2, v.city, v.district, v.state, v.zip_code, v.country].filter(Boolean).join(", ") || v.address || null) : null;

  return {
    id: po.id,
    poNumber: po.po_number,
    vendor: v?.name || null,
    vendorName: v?.name || null,
    vendorCode: v?.vendor_code || null,
    vendorId: v?.id || po.vendor_id || null,
    vendorGst: gstVal,
    gstNumber: gstVal,
    vendorCategory: v?.category || null,
    vendorContactPerson: v?.contact_person || null,
    vendorContact: v?.contact_person || v?.phone || null,
    vendorEmail: v?.email || null,
    vendorPhone: v?.phone || null,
    vendorState: v?.state || null,
    vendorPan: v?.pan_number || null,
    vendorTaxType: v?.tax_type || null,
    vendorBankName: v?.bank_name || null,
    vendorAccountHolder: v?.account_holder || null,
    vendorBankAccountNo: v?.bank_account_no || null,
    vendorIfscCode: v?.ifsc_code || null,
    vendorBankBranch: v?.bank_branch || null,
    vendorAddress: fullAddr,
    amount: Number(po.amount || 0),
    currency: po.currency || "INR",
    status:
      po.status === "created"
        ? "Created"
        : po.status === "cancelled"
          ? "Cancelled"
          : po.status === "closed"
            ? "Closed"
            : po.status,
    description: po.description,
    billingAddress: po.billing_address,
    deliveryAddress: po.delivery_address,
    orderDate: po.order_date,
    expectedDelivery: po.expected_delivery_date,
    createdAt: po.created_at,
    paymentTerms: po.payment_terms,
    items: po.line_items || [],
    taxSummary: po.tax_summary || null,
    itemCount: po.line_items?.length || 0,
    poType: po.po_type || "STANDARD",
    purchaseRequisitionNumber: po.purchase_requisition_number || null,
    department: po.department || null,
    costCenter: po.cost_center || null,
    projectCode: po.project_code || null,
    requester: po.requester || null,
    buyer: po.buyer || null,
    quotationReference: po.quotation_reference || null,
    quotationDate: po.quotation_date || null,
    contractReference: po.contract_reference || null,
    createdBy:
      po.created_by
        ? `${po.created_by.first_name ?? ""} ${po.created_by.last_name ?? ""}`.trim()
        : "-",
    createdByRole: po.created_by?.role,
  };
};


export const getPurchaseOrders = async () => {
  const res = await api.get("/v1/purchase-orders");

  return (res.data.purchaseOrders || []).map(mapPO);
};

export const getPurchaseOrderById = async (id) => {
  const res = await api.get(`/v1/purchase-orders/${id}`);

  return mapPO(res.data.data);
};

const buildPurchaseOrderTaxPayload = (data) => ({
    vendorId: data.vendorId,
    otherCharges: Number(data.otherCharges || 0),
    items: data.items.map((item) => ({
      itemName: item.itemName,
      description: item.description,
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.rate || item.unitPrice || 0),
      unit: item.unit || null,
      itemCode: item.itemCode || null,
      ...(item.gstRate !== "" && item.gstRate !== undefined ? { gstRate: Number(item.gstRate) } : {}),
    })),
});

export const calculatePurchaseOrderTax = async (data) => {
  const res = await api.post("/v1/purchase-orders/calculate-tax", buildPurchaseOrderTaxPayload(data));
  return res.data.data;
};

export const createPurchaseOrder = async (data) => {
  const payload = {
    ...buildPurchaseOrderTaxPayload(data),
    description: data.notes,
    billingAddress: data.billingAddress,
    deliveryAddress: data.deliveryAddress,
    orderDate: data.orderDate,
    expectedDeliveryDate: data.expectedDelivery,
    paymentTerms: data.terms,
    poType: data.poType || 'STANDARD',
    purchaseRequisitionNumber: data.purchaseRequisitionNumber || null,
    department: data.department || null,
    costCenter: data.costCenter || null,
    projectCode: data.projectCode || null,
    requester: data.requester || null,
    buyer: data.buyer || null,
    quotationReference: data.quotationReference || null,
    quotationDate: data.quotationDate || null,
    contractReference: data.contractReference || null,
  };

  const res = await api.post("/v1/purchase-orders", payload);

  return mapPO(res.data.data);
};

export const updatePurchaseOrder = async (id, data) => {
  const payload = {
    ...buildPurchaseOrderTaxPayload(data),
    currency: data.currency || "INR",
    description: data.notes ?? data.description,
    billingAddress: data.billingAddress,
    deliveryAddress: data.deliveryAddress,
    orderDate: data.orderDate,
    expectedDeliveryDate: data.expectedDelivery,
    paymentTerms: data.terms ?? data.paymentTerms,
    reason: data.reason,
  };

  const res = await api.put(`/v1/purchase-orders/${id}`, payload);
  return mapPO(res.data.data);
};

export const deletePurchaseOrder = async (id, deleteReason) => {
  const res = await api.delete(`/v1/purchase-orders/${id}`, { data: { deleteReason } });
  return res.data;
};

/**
 * Downloads the PO as a real PDF binary from the backend.
 * The backend returns Content-Type: application/pdf — we must use responseType: 'blob'.
 * @param {string} id  PO UUID
 * @param {string} [filename]  Optional override for the saved filename
 * @returns {Promise<void>}
 */
export const downloadPurchaseOrderPdf = async (id, filename) => {
  const res = await api.get(`/v1/purchase-orders/${id}/download`, {
    responseType: 'blob',          // CRITICAL: tells Axios to treat the body as a binary Blob
  });

  // Derive filename from Content-Disposition header if not supplied
  if (!filename) {
    const contentDisp = res.headers?.['content-disposition'] || '';
    const match = contentDisp.match(/filename="?([^";\r\n]+)"?/i);
    filename = match ? match[1].trim() : `PurchaseOrder_${id}.pdf`;
  }

  // Create a temporary object URL and trigger the download
  const blob = new Blob([res.data], { type: 'application/pdf' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href     = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Revoke the object URL to free memory
  setTimeout(() => URL.revokeObjectURL(url), 5000);
};

/**
 * Opens the PO PDF in a new browser tab (useful for "Print" / "Preview" flows).
 * @param {string} id  PO UUID
 * @returns {Promise<void>}
 */
export const openPurchaseOrderPdfInNewTab = async (id) => {
  const res = await api.get(`/v1/purchase-orders/${id}/download`, {
    responseType: 'blob',
  });
  const blob = new Blob([res.data], { type: 'application/pdf' });
  const url  = URL.createObjectURL(blob);
  const win  = window.open(url, '_blank');
  if (win) win.focus();
  // The blob URL stays alive while the tab is open; revoke after a longer delay
  setTimeout(() => URL.revokeObjectURL(url), 60000);
};


