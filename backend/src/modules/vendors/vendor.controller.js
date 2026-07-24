import asyncHandler from '../../middleware/asyncHandler.middleware.js';
import vendorService from './vendor.service.js';
import { VENDOR_MESSAGES, VENDOR_STATUS } from './vendor.constants.js';

class VendorController {
  createVendor = asyncHandler(async (req, res) => {
    const vendor = await vendorService.createVendor(req.body, req.user);
    res.status(201).json({ success: true, message: VENDOR_MESSAGES.CREATED, data: vendor });
  });

  getVendors = asyncHandler(async (req, res) => {
    const result = await vendorService.listVendors(req.query, req.user);
    res.status(200).json({ success: true, ...result });
  });

  getVendorById = asyncHandler(async (req, res) => {
    const vendor = await vendorService.getVendorById(req.params.id, req.user);
    res.status(200).json({ success: true, data: vendor });
  });

  updateVendor = asyncHandler(async (req, res) => {
    const vendor = await vendorService.updateVendor(req.params.id, req.body, req.user);
    res.status(200).json({ success: true, message: VENDOR_MESSAGES.UPDATED, data: vendor });
  });

  approveVendor = asyncHandler(async (req, res) => {
    const vendor = await vendorService.changeVendorStatus(req.params.id, VENDOR_STATUS.APPROVED, req.user, req.body?.remarks);
    res.status(200).json({ success: true, message: VENDOR_MESSAGES.APPROVED, data: vendor });
  });

  rejectVendor = asyncHandler(async (req, res) => {
    const vendor = await vendorService.changeVendorStatus(req.params.id, VENDOR_STATUS.REJECTED, req.user, req.body?.remarks);
    res.status(200).json({ success: true, message: VENDOR_MESSAGES.REJECTED, data: vendor });
  });

  blockVendor = asyncHandler(async (req, res) => {
    const vendor = await vendorService.changeVendorStatus(req.params.id, VENDOR_STATUS.BLOCKED, req.user, req.body?.remarks);
    res.status(200).json({ success: true, message: VENDOR_MESSAGES.BLOCKED, data: vendor });
  });

  unblockVendor = asyncHandler(async (req, res) => {
    const vendor = await vendorService.unblockVendor(req.params.id, req.user, req.body?.remarks);
    res.status(200).json({ success: true, message: VENDOR_MESSAGES.UNBLOCKED, data: vendor });
  });
}

export default new VendorController();

