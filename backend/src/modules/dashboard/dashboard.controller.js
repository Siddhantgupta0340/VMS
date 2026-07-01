import asyncHandler from '../../middleware/asyncHandler.middleware.js';
import dashboardService from './dashboard.service.js';

class DashboardController {
  /**
   * @desc    Get full system-wide dashboard overview
   * @route   GET /api/v1/dashboard/overview
   * @access  Private (SUPER_ADMIN)
   */
  getOverview = asyncHandler(async (req, res) => {
    const data = await dashboardService.getOverviewDashboard();
    res.status(200).json({
      success: true,
      message: 'Dashboard overview retrieved successfully.',
      data,
    });
  });

  /**
   * @desc    Get role-specific dashboard for the logged-in user
   * @route   GET /api/v1/dashboard/me
   * @access  Private (All roles)
   */
  getMyDashboard = asyncHandler(async (req, res) => {
    const data = await dashboardService.getRoleDashboard(req.user);
    res.status(200).json({
      success: true,
      message: 'Your dashboard loaded successfully.',
      data,
    });
  });
}

export default new DashboardController();
