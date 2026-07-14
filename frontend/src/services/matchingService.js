import api from "../api/axios";

const mapMatch = (match) => ({
  id: match.id,
  invoiceId: match.invoice_id,
  invoiceNumber: match.invoice?.invoice_number || match.invoice_snapshot?.invoice_number || "N/A",
  poNumber: match.purchase_order?.po_number || match.po_snapshot?.po_number || "N/A",
  poId: match.purchase_order_id,
  grnId: match.grn_id,
  grnNumber: match.grn?.grn_number || match.grn_snapshot?.grn_number || "N/A",
  status: match.status,
  matchPercentage: Number(match.match_percentage || 0),
  matchedFieldsCount: match.matched_fields_count || 0,
  totalFieldsCount: match.total_fields_count || 0,
  unmatchedFields: Array.isArray(match.unmatched_fields)
    ? match.unmatched_fields
    : typeof match.unmatched_fields === "string"
    ? JSON.parse(match.unmatched_fields)
    : [],
  matchedFields: Array.isArray(match.matched_fields)
    ? match.matched_fields
    : typeof match.matched_fields === "string"
    ? JSON.parse(match.matched_fields)
    : [],
  warnings: Array.isArray(match.warnings)
    ? match.warnings
    : typeof match.warnings === "string"
    ? JSON.parse(match.warnings)
    : [],
  approvalRecommendation: match.approval_recommendation,
  poSnapshot: match.po_snapshot,
  grnSnapshot: match.grn_snapshot,
  invoiceSnapshot: match.invoice_snapshot,
  completedBy: match.completed_by
    ? `${match.completed_by.first_name || ""} ${match.completed_by.last_name || ""}`.trim()
    : "-",
  completedAt: match.completed_at,
  remarks: match.remarks,
  adminReviewStatus: match.admin_review_status,
  adminReviewedBy: match.admin_reviewed_by
    ? `${match.admin_reviewed_by.first_name || ""} ${match.admin_reviewed_by.last_name || ""}`.trim()
    : "-",
  adminReviewedAt: match.admin_reviewed_at,
  adminRemarks: match.admin_remarks,
  createdAt: match.created_at,
  updatedAt: match.updated_at,
});

export const getMatches = async (params = {}) => {
  const res = await api.get("/v1/three-way-matching", { params });
  return (res.data.matches || []).map(mapMatch);
};

export const getMatchReport = async (id) => {
  const res = await api.get(`/v1/three-way-matching/${id}`);
  return mapMatch(res.data.data);
};

export const getMatchReportByInvoice = async (invoiceId) => {
  const res = await api.get(`/v1/three-way-matching/invoice/${invoiceId}`);
  // backend returns array
  const list = Array.isArray(res.data.data) ? res.data.data : [res.data.data].filter(Boolean);
  return list.map(mapMatch);
};

export const startMatching = async (invoiceId, grnId = undefined) => {
  const res = await api.post("/v1/three-way-matching/start", { invoiceId, grnId });
  return res.data.data;
};

export const adminApproveMatch = async (id, remarks = "") => {
  const res = await api.patch(`/v1/three-way-matching/${id}/approve`, { remarks });
  return res.data;
};

export const adminRejectMatch = async (id, remarks = "") => {
  const res = await api.patch(`/v1/three-way-matching/${id}/reject`, { remarks });
  return res.data;
};

export const createGRN = async (payload) => {
  const res = await api.post("/v1/three-way-matching/grn", payload);
  return res.data.data;
};

export const getGRNsByPO = async (poId) => {
  const res = await api.get(`/v1/three-way-matching/grn/by-po/${poId}`);
  return res.data.data || [];
};

export const getGRNById = async (id) => {
  const res = await api.get(`/v1/three-way-matching/grn/${id}`);
  return res.data.data;
};

export const updateGRN = async (id, payload) => {
  const res = await api.put(`/v1/three-way-matching/grn/${id}`, payload);
  return res.data.data;
};
