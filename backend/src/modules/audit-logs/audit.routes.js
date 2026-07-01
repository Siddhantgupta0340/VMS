import express from 'express';
import { protect } from '../../middleware/auth.middleware.js';
import authorize from '../../middleware/authorize.middleware.js';
import auditController from './audit.controller.js';
import { ROLES } from '../../zodSchema/index.js';

const router = express.Router();

router.use(protect);

/**
 * GET /api/v1/audit-logs
 * Query: entityType, entityId, action, performedById, dateFrom, dateTo, page, limit
 */
router.get('/', authorize([ROLES.SUPER_ADMIN]), auditController.getAuditLogs);

/**
 * GET /api/v1/audit-logs/:id
 */
router.get('/:id', authorize([ROLES.SUPER_ADMIN]), auditController.getAuditLogById);

export default router;
