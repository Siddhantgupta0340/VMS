import api from "../api/axios";

const mapNotification = (n) => ({
  id: n.id,
  userId: n.user_id,
  title: n.title,
  message: n.message,
  type: n.type,
  entityType: n.entity_type,
  entityId: n.entity_id,
  isRead: n.is_read,
  readAt: n.read_at,
  createdAt: n.created_at,
});

export const getNotifications = async (params = {}) => {
  const res = await api.get("/v1/notifications", { params });
  return {
    notifications: (res.data.notifications || []).map(mapNotification),
    total: res.data.total || 0,
  };
};

export const markAllRead = async () => {
  const res = await api.patch("/v1/notifications/read-all");
  return res.data;
};

export const markRead = async (id) => {
  const res = await api.patch(`/v1/notifications/${id}/read`);
  return res.data;
};
