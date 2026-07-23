import asyncHandler from '../../middleware/asyncHandler.middleware.js';
import purchaseOrderService from './po.service.js';

<<<<<<< HEAD
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
=======
class PurchaseOrderController {
>>>>>>> 870185c8e3ae31efe09445248cd7c7dc457a6b52
  createPurchaseOrder = asyncHandler(async (req, res) => {
    const purchaseOrder = await purchaseOrderService.createPurchaseOrder(req.body, req.user);
    res.status(201).json({
      success: true,
      message: 'Purchase order created successfully.',
      data: purchaseOrder,
    });
  });

<<<<<<< HEAD
  /**
   * GET /api/v1/purchase-orders
   * List purchase orders with pagination and filters.
   */
=======
  calculatePurchaseOrderTax = asyncHandler(async (req, res) => {
    const tax = await purchaseOrderService.calculatePurchaseOrderTaxPreview(req.body, req.user);
    res.status(200).json({
      success: true,
      data: tax,
    });
  });

>>>>>>> 870185c8e3ae31efe09445248cd7c7dc457a6b52
  getPurchaseOrders = asyncHandler(async (req, res) => {
    const result = await purchaseOrderService.listPurchaseOrders(req.query, req.user);
    res.status(200).json({ success: true, ...result });
  });

<<<<<<< HEAD
  /**
   * GET /api/v1/purchase-orders/:id
   * Get a single Purchase Order by ID.
   */
=======
>>>>>>> 870185c8e3ae31efe09445248cd7c7dc457a6b52
  getPurchaseOrderById = asyncHandler(async (req, res) => {
    const purchaseOrder = await purchaseOrderService.getPurchaseOrderById(req.params.id, req.user);
    res.status(200).json({ success: true, data: purchaseOrder });
  });

<<<<<<< HEAD
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
=======
  updatePurchaseOrder = asyncHandler(async (req, res) => {
    const purchaseOrder = await purchaseOrderService.updatePurchaseOrder(req.params.id, req.body, req.user, req);
    res.status(200).json({
      success: true,
      message: 'Purchase order updated successfully.',
      data: purchaseOrder,
    });
  });

  deletePurchaseOrder = asyncHandler(async (req, res) => {
    const result = await purchaseOrderService.deletePurchaseOrder(req.params.id, req.user, req.body.deleteReason, req);
    res.status(200).json({ success: true, ...result });
  });

  downloadPurchaseOrderPdf = asyncHandler(async (req, res) => {
    const purchaseOrder = await purchaseOrderService.downloadPurchaseOrderPdf(req.params.id, req.user, req);
    res.status(200).json({
      success: true,
      message: 'Purchase order download authorized.',
>>>>>>> 870185c8e3ae31efe09445248cd7c7dc457a6b52
      data: purchaseOrder,
    });
  });
}

export default new PurchaseOrderController();
