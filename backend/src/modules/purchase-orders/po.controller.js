import asyncHandler from '../../middleware/asyncHandler.middleware.js';
import purchaseOrderService from './po.service.js';

class PurchaseOrderController {
  createPurchaseOrder = asyncHandler(async (req, res) => {
    const purchaseOrder = await purchaseOrderService.createPurchaseOrder(req.body, req.user);
    res.status(201).json({
      success: true,
      message: 'Purchase order created successfully.',
      data: purchaseOrder,
    });
  });

  calculatePurchaseOrderTax = asyncHandler(async (req, res) => {
    const tax = await purchaseOrderService.calculatePurchaseOrderTaxPreview(req.body, req.user);
    res.status(200).json({
      success: true,
      data: tax,
    });
  });

  getPurchaseOrders = asyncHandler(async (req, res) => {
    const result = await purchaseOrderService.listPurchaseOrders(req.query, req.user);
    res.status(200).json({ success: true, ...result });
  });

  getPurchaseOrderById = asyncHandler(async (req, res) => {
    const purchaseOrder = await purchaseOrderService.getPurchaseOrderById(req.params.id, req.user);
    res.status(200).json({ success: true, data: purchaseOrder });
  });

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
      data: purchaseOrder,
    });
  });
}

export default new PurchaseOrderController();
