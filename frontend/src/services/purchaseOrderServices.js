import api from "../api/axios";

const mapPO = (po) => ({
  id: po.id,

  poNumber: po.po_number,

  vendor: po.vendor?.name,

  vendorId: po.vendor?.id,

  amount: Number(po.amount),

  currency: po.currency,

  status:
    po.status === "open"
      ? "Approved"
      : po.status === "cancelled"
      ? "Rejected"
      : po.status === "closed"
      ? "Closed"
      : "Pending",

  description: po.description,

  orderDate: po.order_date,

  expectedDelivery: po.expected_delivery_date,

  createdAt: po.created_at,

  paymentTerms: po.payment_terms,

  items: po.line_items || [],

  itemCount: po.line_items?.length || 0,

  createdBy:
    po.created_by
      ? `${po.created_by.first_name ?? ""} ${po.created_by.last_name ?? ""}`.trim()
      : "-",

  createdByRole: po.created_by?.role,
});


export const getPurchaseOrders = async () => {
  const res = await api.get("/v1/purchase-orders");

  console.log("PO RESPONSE");
  console.log(res.data);

  return (res.data.purchaseOrders || []).map(mapPO);
};

export const getPurchaseOrderById = async (id) => {
  const res = await api.get(`/v1/purchase-orders/${id}`);

  return mapPO(res.data.data);
};

export const createPurchaseOrder = async (data) => {
  const payload = {
  vendorId: data.vendorId,

  amount: Number(data.total),

  currency: "INR",

  description: data.notes,

  orderDate: data.orderDate,

  expectedDeliveryDate: data.expectedDelivery,

  paymentTerms: data.terms,

  items: data.items,
};

  const res = await api.post("/v1/purchase-orders", payload);

  return res.data.data;
};

export const updatePOStatus = async (id, status) => {
  const res = await api.patch(`/v1/purchase-orders/${id}/status`, {
    status,
  });

  return res.data.data;
};