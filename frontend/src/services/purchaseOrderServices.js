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

export const downloadPurchaseOrderPdf = async (id) => {
  const res = await api.get(`/v1/purchase-orders/${id}/download`);
  return mapPO(res.data.data);
};

