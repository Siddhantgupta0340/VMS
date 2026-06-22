const express = require("express");
const router = express.Router();

const {
  createVendor,
  listVendors
  ,
  updateVendor,
  deleteVendor,
  patchVendor
} = require("./vendor.controller");

/**
 * Route Layer
 * - Defines endpoints for the Vendor module
 * - Keeps routing definitions isolated from controller logic
 */
router.post("/", createVendor);
router.get("/", listVendors);
router.put("/:id", updateVendor);
router.delete("/:id", deleteVendor);
router.patch("/:id", patchVendor);

module.exports = router;


