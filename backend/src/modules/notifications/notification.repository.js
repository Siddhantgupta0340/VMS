import prisma from '../../config/prisma.js';

class NotificationRepository {
  /**
   * Create a new notification for a user.
   */
<<<<<<< HEAD
  async create(data) {
    return prisma.notification.create({ data });
=======
  async create(data, tx = null) {
    const client = tx || prisma;
    return client.notification.create({ data });
>>>>>>> 870185c8e3ae31efe09445248cd7c7dc457a6b52
  }

  /**
   * Create multiple notifications at once (bulk).
   */
<<<<<<< HEAD
  async createMany(notifications) {
    return prisma.notification.createMany({ data: notifications });
=======
  async createMany(notifications, tx = null) {
    const client = tx || prisma;
    return client.notification.createMany({ data: notifications });
>>>>>>> 870185c8e3ae31efe09445248cd7c7dc457a6b52
  }

  /**
   * Find all notifications for a user with pagination.
   */
<<<<<<< HEAD
  async findAll({ userId, isRead, skip = 0, take = 20 }) {
    const where = {
      user_id: userId,
      ...(isRead !== undefined && { is_read: isRead }),
=======
  async findAll({ userId, isRead, type, entityType, createdFrom, createdTo, skip = 0, take = 20 }) {
    const where = {
      user_id: userId,
      ...(isRead !== undefined && { is_read: isRead }),
      ...(type && { type }),
      ...(entityType && { entity_type: entityType }),
      ...((createdFrom || createdTo) && {
        created_at: {
          ...(createdFrom && { gte: createdFrom }),
          ...(createdTo && { lte: createdTo }),
        },
      }),
>>>>>>> 870185c8e3ae31efe09445248cd7c7dc457a6b52
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

<<<<<<< HEAD
=======
  async findByIdForUser(id, userId) {
    return prisma.notification.findFirst({
      where: { id, user_id: userId },
    });
  }

>>>>>>> 870185c8e3ae31efe09445248cd7c7dc457a6b52
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
<<<<<<< HEAD
=======

  async deleteForUser(id, userId) {
    return prisma.notification.deleteMany({
      where: { id, user_id: userId },
    });
  }
>>>>>>> 870185c8e3ae31efe09445248cd7c7dc457a6b52
}

export default new NotificationRepository();
