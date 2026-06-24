const { purchaseOrderSchema, purchaseOrderPatchSchema } = require("./po.validation");
const {
  createPurchaseOrderService,
  getPurchaseOrdersService,
  getPurchaseOrderByIdService,
  updatePurchaseOrderService,
  deletePurchaseOrderService,
  patchPurchaseOrderService
} = require("./po.service");

const buildDocumentPayload = (file) => {
  if (!file) return null;
  return {
    originalName: file.originalname,
    filename: file.filename,
    path: file.path,
    mimeType: file.mimetype,
    size: file.size
  };
};

const createPurchaseOrder = (req, res) => {
  try {

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Purchase order document is required"
      });
    }

    const result = purchaseOrderSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        errors: result.error.issues
      });
    }

    const createdOrder = createPurchaseOrderService(result.data, buildDocumentPayload(req.file));
    if (!createdOrder) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found"
      });
    }

    return res.status(201).json({
      success: true,
      message: "Purchase order created",
      data: createdOrder
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err?.message || String(err)
    });
  }
};

const listPurchaseOrders = (req, res) => {
  try {
    const orders = getPurchaseOrdersService();
    return res.status(200).json({
      success: true,
      message: "Purchase orders retrieved successfully",
      count: orders.length,
      data: orders
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err?.message || String(err)
    });
  }
};

const getPurchaseOrder = (req, res) => {
  try {
    const { id } = req.params;
    const order = getPurchaseOrderByIdService(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Purchase order retrieved successfully",
      data: order
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err?.message || String(err)
    });
  }
};

const updatePurchaseOrder = (req, res) => {
  try {
    const { id } = req.params;
    const result = purchaseOrderSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        errors: result.error.issues
      });
    }

    const updatedOrder = updatePurchaseOrderService(id, result.data, buildDocumentPayload(req.file));
    if (updatedOrder === "VENDOR_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Vendor not found"
      });
    }
    if (!updatedOrder) {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Purchase order updated successfully",
      data: updatedOrder
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err?.message || String(err)
    });
  }
};

const patchPurchaseOrder = (req, res) => {
  try {
    const { id } = req.params;
    const result = purchaseOrderPatchSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        errors: result.error.issues
      });
    }

    const patchedOrder = patchPurchaseOrderService(id, result.data, buildDocumentPayload(req.file));
    if (patchedOrder === "VENDOR_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Vendor not found"
      });
    }
    if (!patchedOrder) {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Purchase order patched successfully",
      data: patchedOrder
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err?.message || String(err)
    });
  }
};

const deletePurchaseOrder = (req, res) => {
  try {
    const { id } = req.params;
    const removed = deletePurchaseOrderService(id);
    if (!removed) {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Purchase order deleted successfully"
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err?.message || String(err)
    });
  }
};

module.exports = {
  createPurchaseOrder,
  listPurchaseOrders,
  getPurchaseOrder,
  updatePurchaseOrder,
  patchPurchaseOrder,
  deletePurchaseOrder
};
