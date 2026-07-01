import express from 'express';
import { protect } from '../../middleware/auth.middleware.js';
import authorize from '../../middleware/authorize.middleware.js';
import validate from '../../middleware/validate.middleware.js';
import vendorController from './vendor.controller.js';
import { VENDOR_PERMISSIONS } from './vendor.permissions.js';
import {
  createVendorSchema,
  searchVendorsSchema,
  vendorActionSchema,
  vendorIdSchema,
} from './vendor.validation.js';
import { updateVendorSchema } from '../../zodSchema/vendor.schema.js';

const router = express.Router();

router.use(protect); 

router
  .route('/')
  .post(authorize(VENDOR_PERMISSIONS.CREATE), validate(createVendorSchema), vendorController.createVendor)
  .get(authorize(VENDOR_PERMISSIONS.READ), validate(searchVendorsSchema), vendorController.getVendors);

router
  .route('/:id')
  .get(authorize(VENDOR_PERMISSIONS.READ), validate(vendorIdSchema), vendorController.getVendorById)
  .put(authorize([...VENDOR_PERMISSIONS.CREATE, ...VENDOR_PERMISSIONS.REVIEW]), validate(updateVendorSchema), vendorController.updateVendor);

router.patch('/:id/approve', authorize(VENDOR_PERMISSIONS.REVIEW), validate(vendorActionSchema), vendorController.approveVendor);
router.patch('/:id/reject', authorize(VENDOR_PERMISSIONS.REVIEW), validate(vendorActionSchema), vendorController.rejectVendor);
router.patch('/:id/block', authorize(VENDOR_PERMISSIONS.REVIEW), validate(vendorActionSchema), vendorController.blockVendor);
router.patch('/:id/unblock', authorize(VENDOR_PERMISSIONS.REVIEW), validate(vendorActionSchema), vendorController.unblockVendor);

export default router;

