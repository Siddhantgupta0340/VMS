const { invoiceSchema, invoicePatchSchema } = require("./invoice.validation");
const {
  createInvoiceService,
  getInvoicesService,
  getInvoiceByIdService,
  updateInvoiceService,
  deleteInvoiceService,
  patchInvoiceService
} = require("./invoice.service");

const createInvoice = (req, res) => {
  try {
    const result = invoiceSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        errors: result.error.issues
      });
    }

    const createdInvoice = createInvoiceService(result.data);
    if (!createdInvoice) {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found"
      });
    }

    return res.status(201).json({
      success: true,
      message: "Invoice created",
      data: createdInvoice
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err?.message || String(err)
    });
  }
};

const listInvoices = (req, res) => {
  try {
    const invoices = getInvoicesService();
    return res.status(200).json({
      success: true,
      message: "Invoices retrieved successfully",
      count: invoices.length,
      data: invoices
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err?.message || String(err)
    });
  }
};

const getInvoice = (req, res) => {
  try {
    const { id } = req.params;
    const invoice = getInvoiceByIdService(id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Invoice retrieved successfully",
      data: invoice
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err?.message || String(err)
    });
  }
};

const updateInvoice = (req, res) => {
  try {
    const { id } = req.params;
    const result = invoiceSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        errors: result.error.issues
      });
    }

    const updatedInvoice = updateInvoiceService(id, result.data);
    if (updatedInvoice === "PO_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found"
      });
    }
    if (!updatedInvoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Invoice updated successfully",
      data: updatedInvoice
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err?.message || String(err)
    });
  }
};

const patchInvoice = (req, res) => {
  try {
    const { id } = req.params;
    const result = invoicePatchSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        errors: result.error.issues
      });
    }

    const patchedInvoice = patchInvoiceService(id, result.data);
    if (patchedInvoice === "PO_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found"
      });
    }
    if (!patchedInvoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Invoice patched successfully",
      data: patchedInvoice
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err?.message || String(err)
    });
  }
};

const deleteInvoice = (req, res) => {
  try {
    const { id } = req.params;
    const removed = deleteInvoiceService(id);
    if (!removed) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Invoice deleted successfully"
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
  createInvoice,
  listInvoices,
  getInvoice,
  updateInvoice,
  patchInvoice,
  deleteInvoice
};
