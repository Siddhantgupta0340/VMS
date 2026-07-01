import express from 'express';
import { protect } from '../../middleware/auth.middleware.js';
import authorize from '../../middleware/authorize.middleware.js';
import dashboardController from './dashboard.controller.js';
import { ROLES } from '../../zodSchema/index.js';

const router = express.Router();

const ALL_ROLES = Object.values(ROLES);

router.use(protect);

/**
 * GET /api/v1/dashboard/overview — SUPER_ADMIN only
 */
router.get('/overview', authorize([ROLES.SUPER_ADMIN]), dashboardController.getOverview);

/**
 * GET /api/v1/dashboard/me — All authenticated roles
 */
router.get('/me', authorize(ALL_ROLES), dashboardController.getMyDashboard);

export default router;
