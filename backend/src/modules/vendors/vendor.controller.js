const { vendorSchema, vendorPatchSchema } = require("./vendor.validation");
const {
  createVendorService,
  getVendorsService
  ,
  updateVendorService,
  deleteVendorService,
  patchVendorService
} = require("./vendor.service");

/**
 * Controller Layer
 * - Translates HTTP request/response to/from service layer
 * - Uses Zod validation schema and returns proper HTTP status codes
 * - Keeps request parsing/response formatting isolated from business logic
 */
const createVendor = (req, res) => {
  try {
    const result = vendorSchema.safeParse(req.body);

    if (!result.success) {
      // Validation Error
      return res.status(400).json({
        success: false,
        errors: result.error.issues
      });
    }

    // Delegate to Service Layer for business logic + id generation.
    const createdVendor = createVendorService(result.data);

    return res.status(201).json({
      success: true,
      message: "Vendor Created",
      data: createdVendor
    });
  } catch (err) {
    // Server Error
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err?.message || String(err)
    });
  }
};

const listVendors = (req, res) => {
  try {
    const vendors = getVendorsService();

    return res.status(200).json({
      success: true,
      message: "Vendors retrieved successfully",
      count: vendors.length,
      data: vendors
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err?.message || String(err)
    });
  }
};

const updateVendor = (req, res) => {
  try {
    const { id } = req.params;
    const result = vendorSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        errors: result.error.issues
      });
    }

    const updatedVendor = updateVendorService(id, result.data);
    if (!updatedVendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Vendor updated successfully",
      data: updatedVendor
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err?.message || String(err)
    });
  }
};

const deleteVendor = (req, res) => {
  try {
    const { id } = req.params;
    const removed = deleteVendorService(id);

    if (!removed) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Vendor deleted successfully"
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err?.message || String(err)
    });
  }
};

const patchVendor = (req, res) => {
  try {
    const { id } = req.params;
    const result = vendorPatchSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        errors: result.error.issues
      });
    }

    const patched = patchVendorService(id, result.data);
    if (!patched) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Vendor patched successfully done",
      data: patched
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
  createVendor,
  listVendors,
  updateVendor,
  deleteVendor,
  patchVendor
};

