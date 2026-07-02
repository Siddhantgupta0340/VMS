import express from 'express';
import { protect } from '../../middleware/auth.middleware.js';
import authorize from '../../middleware/authorize.middleware.js';
import auditController from './audit.controller.js';
import { ROLES } from '../../zodSchema/index.js';

const router = express.Router();

router.use(protect);

/**
 * GET /api/v1/audit-logs
 * Query: entityType, entityId, action, performedById, dateFrom, dateTo, page, limit, source
 * Access: Super Admin + Finance Head (observation)
 */
router.get('/', authorize([ROLES.SUPER_ADMIN, ROLES.FINANCE_HEAD]), auditController.getAuditLogs);

/**
 * GET /api/v1/audit-logs/:id
 * Access: Super Admin + Finance Head
 */
router.get('/:id', authorize([ROLES.SUPER_ADMIN, ROLES.FINANCE_HEAD]), auditController.getAuditLogById);

export default router;
