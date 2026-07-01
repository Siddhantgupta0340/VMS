import prisma from '../../config/prisma.js';

class AuditRepository {
  /**
   * Find audit logs with flexible filtering and pagination.
   */
  async findAll({ where = {}, skip = 0, take = 50, orderBy = { created_at: 'desc' } }) {
    const [logs, total] = await Promise.all([
      prisma.approvalLog.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          performed_by: {
            select: { id: true, email: true, first_name: true, last_name: true, role: true },
          },
        },
      }),
      prisma.approvalLog.count({ where }),
    ]);

    return { logs, total };
  }

  /**
   * Find a single audit log entry by ID.
   */
  async findById(id) {
    return prisma.approvalLog.findUnique({
      where: { id },
      include: {
        performed_by: {
          select: { id: true, email: true, first_name: true, last_name: true, role: true },
        },
      },
    });
  }
}

export default new AuditRepository();
