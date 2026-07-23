import asyncHandler from '../../middleware/asyncHandler.middleware.js';
import dashboardService from './dashboard.service.js';

class DashboardController {
<<<<<<< HEAD
=======
  getAnalytics = asyncHandler(async (req, res) => {
    const data = await dashboardService.getAnalyticsDashboard(req.query);
    res.status(200).json({ success: true, message: 'Dashboard analytics retrieved.', data });
  });

>>>>>>> origin/main
  /**
   * GET /api/v1/dashboard/overview — SUPER_ADMIN
   * Full system-wide metrics
   */
  getOverview = asyncHandler(async (req, res) => {
    const data = await dashboardService.getOverviewDashboard();
    res.status(200).json({ success: true, message: 'Dashboard overview retrieved.', data });
  });

  /**
   * GET /api/v1/dashboard/me — All authenticated roles
   * Role-specific dashboard
   */
  getMyDashboard = asyncHandler(async (req, res) => {
<<<<<<< HEAD
    const data = await dashboardService.getRoleDashboard(req.user);
=======
    const data = await dashboardService.getRoleDashboard(req.user, req.query);
>>>>>>> origin/main
    res.status(200).json({ success: true, message: 'Your dashboard loaded.', data });
  });

  /**
   * GET /api/v1/dashboard/finance-head/observation — Finance Head + Admin
   * Finance Head observation stats
   */
  getFinanceHeadObservation = asyncHandler(async (req, res) => {
    const data = await dashboardService.getFinanceHeadObservationDashboard();
    res.status(200).json({ success: true, message: 'Finance Head observation dashboard loaded.', data });
  });
<<<<<<< HEAD
=======

  getFinanceHeadDashboard = asyncHandler(async (req, res) => {
    const data = await dashboardService.getFinanceHeadDashboard(req.query);
    res.status(200).json({ success: true, message: 'Finance Head dashboard loaded.', data });
  });
>>>>>>> origin/main
}

export default new DashboardController();
