import api from "../api/axios";

const mapUser = (user) => ({
  id: user.id,
  email: user.email,
  firstName: user.first_name,
  lastName: user.last_name,
  name: `${user.first_name || ""} ${user.last_name || ""}`.trim() || "-",
  role: user.role,
  status: user.status || (user.is_active ? "ACTIVE" : "INACTIVE"),
  lastLoginAt: user.last_login_at,
  createdAt: user.created_at,
  updatedAt: user.updated_at,
});

export const getUsers = async (params = {}) => {
  const res = await api.get("/v1/users", { params });
  return (res.data.users || []).map(mapUser);
};

export const getUserById = async (id) => {
  const res = await api.get(`/v1/users/${id}`);
  return mapUser(res.data.data);
};

export const createUser = async (payload) => {
  // Payload: email, password, firstName, lastName, role
  const res = await api.post("/v1/users", payload);
  return res.data.data;
};

export const updateUser = async (id, payload) => {
  const res = await api.put(`/v1/users/${id}`, payload);
  return res.data.data;
};

export const deleteUser = async (id) => {
  const res = await api.delete(`/v1/users/${id}`);
  return res.data;
};

export const toggleUserStatus = async (id, isActive) => {
  const res = await api.patch(`/v1/users/${id}/status`, { isActive });
  return res.data.data;
};

export const adminResetPassword = async (id, newPassword) => {
  const res = await api.post(`/v1/users/${id}/reset-password`, { newPassword });
  return res.data;
};
