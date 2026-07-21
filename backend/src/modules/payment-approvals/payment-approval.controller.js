import asyncHandler from '../../middleware/asyncHandler.middleware.js';
import paymentApprovalService from './payment-approval.service.js';

class PaymentApprovalController {
  /**
   * Get all payment approvals assigned to the logged-in user.
   */
  getMyApprovals = asyncHandler(async (req, res) => {
    const result = await paymentApprovalService.getMyApprovals(req.user, req.query);
    res.status(200).json({
      success: true,
      message: 'Payment approvals retrieved successfully.',
      ...result,
    });
  });

  /**
   * Get a single payment approval by ID.
   */
  getApprovalById = asyncHandler(async (req, res) => {
    const approval = await paymentApprovalService.getApprovalById(req.params.id, req.user);
    res.status(200).json({
      success: true,
      message: 'Payment approval details retrieved successfully.',
      data: approval,
    });
  });

  /**
   * Approve a pending payment approval.
   */
  approvePaymentApproval = asyncHandler(async (req, res) => {
    const remarks = req.body?.remarks || req.body?.remarksText || '';
    const approval = await paymentApprovalService.approvePaymentApproval(req.params.id, req.user, remarks);
    res.status(200).json({
      success: true,
      message: 'Payment approval approved successfully.',
      data: approval,
    });
  });

  /**
   * Reject a pending payment approval.
   */
  rejectPaymentApproval = asyncHandler(async (req, res) => {
    const rejectionReason = req.body?.rejectionReason || req.body?.remarks || req.body?.remarksText || '';
    const approval = await paymentApprovalService.rejectPaymentApproval(req.params.id, req.user, rejectionReason);
    res.status(200).json({
      success: true,
      message: 'Payment approval rejected successfully.',
      data: approval,
    });
  });

  /**
   * Get audit/action history for a payment approval.
   */
  getApprovalHistory = asyncHandler(async (req, res) => {
    const history = await paymentApprovalService.getApprovalHistory(req.params.id, req.user);
    res.status(200).json({
      success: true,
      message: 'Payment approval history retrieved successfully.',
      data: history,
    });
  });
}

export default new PaymentApprovalController();
