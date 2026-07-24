import ApiError from '../../utils/ApiError.js';
import auditRepository from './audit.repository.js';

class AuditService {
  /**
   * Get paginated audit logs with optional filters.
   * @param {object} query - { entityType, entityId, action, performedById, dateFrom, dateTo, page, limit }
   */
  async getAuditLogs(query) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 50);

    const where = {
      ...(query.entityType && { entity_type: query.entityType }),
      ...(query.entityId && { entity_id: query.entityId }),
      ...(query.action && { action: query.action }),
      ...(query.performedById && { performed_by_id: query.performedById }),
      ...(query.dateFrom || query.dateTo
        ? {
            created_at: {
              ...(query.dateFrom && { gte: new Date(query.dateFrom) }),
              ...(query.dateTo && { lte: new Date(query.dateTo) }),
            },
          }
        : {}),
    };

    const result = await auditRepository.findAll({
      where,
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      ...result,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    };
  }

  /**
   * Get a single audit log by ID.
   */
  async getAuditLogById(id) {
    const log = await auditRepository.findById(id);
    if (!log) {
      throw new ApiError(404, 'Audit log entry not found.');
    }
    return log;
  }
}

export default new AuditService();
