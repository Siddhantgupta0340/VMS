import asyncHandler from '../../middleware/asyncHandler.middleware.js';
import auditService from './audit.service.js';

class AuditController {
  /**
   * @desc    Get paginated audit logs (system-wide activity log)
   * @route   GET /api/v1/audit-logs
   * @access  Private (SUPER_ADMIN)
   * @query   entityType, entityId, action, performedById, dateFrom, dateTo, page, limit
   */
  getAuditLogs = asyncHandler(async (req, res) => {
<<<<<<< HEAD
    const result = await auditService.getAuditLogs(req.query);
=======
    const result = await auditService.getAuditLogs(req.query, req.user);
>>>>>>> 870185c8e3ae31efe09445248cd7c7dc457a6b52
    res.status(200).json({
      success: true,
      message: 'Audit logs retrieved successfully.',
      ...result,
    });
  });

  /**
   * @desc    Get a single audit log entry
   * @route   GET /api/v1/audit-logs/:id
   * @access  Private (SUPER_ADMIN)
   */
  getAuditLogById = asyncHandler(async (req, res) => {
<<<<<<< HEAD
    const log = await auditService.getAuditLogById(req.params.id);
=======
    const log = await auditService.getAuditLogById(req.params.id, req.user);
>>>>>>> 870185c8e3ae31efe09445248cd7c7dc457a6b52
    res.status(200).json({
      success: true,
      data: log,
    });
  });
}

export default new AuditController();
