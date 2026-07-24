import prisma from '../../config/prisma.js';

class NotificationRepository {
  /**
   * Create a new notification for a user.
   */
  async create(data) {
    return prisma.notification.create({ data });
  }

  /**
   * Create multiple notifications at once (bulk).
   */
  async createMany(notifications) {
    return prisma.notification.createMany({ data: notifications });
  }

  /**
   * Find all notifications for a user with pagination.
   */
  async findAll({ userId, isRead, skip = 0, take = 20 }) {
    const where = {
      user_id: userId,
      ...(isRead !== undefined && { is_read: isRead }),
    };

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: 'desc' },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { user_id: userId, is_read: false } }),
    ]);

    return { notifications, total, unreadCount };
  }

  /**
   * Mark a single notification as read.
   */
  async markAsRead(id, userId) {
    return prisma.notification.updateMany({
      where: { id, user_id: userId },
      data: { is_read: true, read_at: new Date() },
    });
  }

  /**
   * Mark all notifications as read for a user.
   */
  async markAllAsRead(userId) {
    return prisma.notification.updateMany({
      where: { user_id: userId, is_read: false },
      data: { is_read: true, read_at: new Date() },
    });
  }

  /**
   * Count unread notifications for a user.
   */
  async countUnread(userId) {
    return prisma.notification.count({ where: { user_id: userId, is_read: false } });
  }
}

export default new NotificationRepository();
