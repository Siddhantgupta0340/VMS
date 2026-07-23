import express from 'express';
import { protect } from '../../middleware/auth.middleware.js';
import authorize from '../../middleware/authorize.middleware.js';
import auditController from './audit.controller.js';
<<<<<<< HEAD
import { ROLES } from '../../zodSchema/index.js';
=======
import { PERMISSION_KEYS } from '../auth/role-permissions.js';
>>>>>>> 870185c8e3ae31efe09445248cd7c7dc457a6b52

const router = express.Router();

router.use(protect);

/**
 * GET /api/v1/audit-logs
 * Query: entityType, entityId, action, performedById, dateFrom, dateTo, page, limit, source
<<<<<<< HEAD
 * Access: Super Admin + Finance Head (observation)
 */
router.get('/', authorize([ROLES.SUPER_ADMIN, ROLES.FINANCE_HEAD]), auditController.getAuditLogs);

/**
 * GET /api/v1/audit-logs/:id
 * Access: Super Admin + Finance Head
 */
router.get('/:id', authorize([ROLES.SUPER_ADMIN, ROLES.FINANCE_HEAD]), auditController.getAuditLogById);
=======
 * Access: Super Admin (observation)
 */
router.get('/', authorize(PERMISSION_KEYS.VIEW_AUDIT_LOGS), auditController.getAuditLogs);

/**
 * GET /api/v1/audit-logs/:id
 * Access: Super Admin
 */
router.get('/:id', authorize(PERMISSION_KEYS.VIEW_AUDIT_LOGS), auditController.getAuditLogById);
>>>>>>> 870185c8e3ae31efe09445248cd7c7dc457a6b52

export default router;
