import asyncHandler from '../../middleware/asyncHandler.middleware.js';
import purchaseOrderService from './po.service.js';

/**
 * PurchaseOrderController
 *
 * Handles HTTP layer only:
 * - Extract validated req.body / req.params / req.user
 * - Delegate all business logic to PurchaseOrderService
 * - Return standardized JSON responses
 */
class PurchaseOrderController {
  /**
   * POST /api/v1/purchase-orders
   * Create a new Purchase Order.
   * Requires role: CASE_MANAGER | FINANCE_MANAGER
   */
  createPurchaseOrder = asyncHandler(async (req, res) => {
    const purchaseOrder = await purchaseOrderService.createPurchaseOrder(req.body, req.user);
    res.status(201).json({
      success: true,
      message: 'Purchase order created successfully.',
      data: purchaseOrder,
    });
  });

  /**
   * GET /api/v1/purchase-orders
   * List purchase orders with pagination and filters.
   */
  getPurchaseOrders = asyncHandler(async (req, res) => {
    const result = await purchaseOrderService.listPurchaseOrders(req.query, req.user);
    res.status(200).json({ success: true, ...result });
  });

  /**
   * GET /api/v1/purchase-orders/:id
   * Get a single Purchase Order by ID.
   */
  getPurchaseOrderById = asyncHandler(async (req, res) => {
    const purchaseOrder = await purchaseOrderService.getPurchaseOrderById(req.params.id, req.user);
    res.status(200).json({ success: true, data: purchaseOrder });
  });

  /**
   * PATCH /api/v1/purchase-orders/:id/status
   * Update a Purchase Order's status.
   * Requires role: FINANCE_MANAGER
   * Uses validated req.body.status — set by validate middleware.
   */
  updatePurchaseOrderStatus = asyncHandler(async (req, res) => {
    // req.body.status is already validated and set by the validate middleware
    const { status } = req.body;
    const purchaseOrder = await purchaseOrderService.updatePurchaseOrderStatus(req.params.id, status);
    res.status(200).json({
      success: true,
      message: `Purchase order status updated to "${status}" successfully.`,
      data: purchaseOrder,
    });
  });
}

export default new PurchaseOrderController();
