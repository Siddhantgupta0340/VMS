import api from "../api/axios";

/**
 * Backend -> Frontend Mapping
 */
const mapVendor = (vendor) => ({
  id: vendor.id,

  vendorCode: vendor.vendor_code,
  companyName: vendor.name,

  email: vendor.email,
  phone: vendor.phone,

  contactPerson: vendor.contact_person,

  category: vendor.category,

  status: vendor.status,

  address: vendor.address,
  city: vendor.city,
  state: vendor.state,
  postalCode: vendor.zip_code,

  gst: vendor.tax_id,

  bankAccountNo: vendor.bank_account_no,
  ifscCode: vendor.ifsc_code,

  paymentTerms: vendor.payment_terms,

  // approvedBy: vendor.approved_by_id,
  approvedAt: vendor.approved_at,

  blockedAt: vendor.blocked_at,

  rejectedAt: vendor.rejected_at,

  // createdBy: vendor.created_by_id,

  createdAt: vendor.created_at,

  approvedAt: vendor.approved_at,

createdBy: vendor.created_by
  ? `${vendor.created_by.first_name} ${vendor.created_by.last_name} (${vendor.created_by.role})`
  : "-",

approvedBy: vendor.approved_by
  ? `${vendor.approved_by.first_name} ${vendor.approved_by.last_name} (${vendor.approved_by.role})`
  : "-",

  updatedAt: vendor.updated_at,

  deletedAt: vendor.deleted_at,
});

export const getVendors = async (params = {}) => {
  try {
    const res = await api.get("/v1/vendors", {
      params,
    });

    console.log("GET VENDORS RESPONSE");
    console.log(res.data);

    const vendors = res.data?.vendors || [];

    return vendors.map(mapVendor);
  } catch (err) {
    console.error(err);
    return [];
  }
};

export const getVendorById = async (id) => {
  const res = await api.get(`/v1/vendors/${id}`);
  return mapVendor(res.data.data);
};

export const getVendor = async (id) => {
  const res = await api.get(`/v1/vendors/${id}`);
  return mapVendor(res.data.data);
};

export const createVendor = async (formData) => {
  const payload = {
    name: formData.companyName,
    vendorCode: formData.vendorCode,
    email: formData.email,
    phone: formData.phone,
    address: formData.address,
    city: formData.city,
    state: formData.state,
    zipCode: formData.postalCode,
    taxId: formData.gst,
    category: formData.vendorCategory,
    contactPerson: formData.contactPerson,
    bankAccountNo: formData.accountNumber,
    ifscCode: formData.ifsc,
    paymentTerms: formData.paymentTerms,
  };

  const res = await api.post("/v1/vendors", payload);

  return res.data.data;
};

export const updateVendor = async (id, formData) => {
  const payload = {
    name: formData.companyName,
    email: formData.email,
    phone: formData.phone,
    address: formData.address,
    city: formData.city,
    state: formData.state,
    zipCode: formData.postalCode,
    taxId: formData.gst,
    category: formData.vendorCategory,
    contactPerson: formData.contactPerson,
    bankAccountNo: formData.accountNumber,
    ifscCode: formData.ifsc,
    paymentTerms: formData.paymentTerms,
  };

  const res = await api.put(`/v1/vendors/${id}`, payload);

  return res.data.data;
};

export const approveVendor = async (id, remarks = "") => {
  const res = await api.patch(`/v1/vendors/${id}/approve`, {
    remarks,
  });

  return res.data.data;
};

export const rejectVendor = async (id, remarks = "") => {
  const res = await api.patch(`/v1/vendors/${id}/reject`, {
    remarks,
  });

  return res.data.data;
};

export const blockVendor = async (id, remarks = "") => {
  const res = await api.patch(`/v1/vendors/${id}/block`, {
    remarks,
  });

  return res.data.data;
};

export const unblockVendor = async (id, remarks = "") => {
  const res = await api.patch(`/v1/vendors/${id}/unblock`, {
    remarks,
  });

  return res.data.data;
};