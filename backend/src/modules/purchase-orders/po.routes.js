import express from 'express';
import { protect } from '../../middleware/auth.middleware.js';
import authorize from '../../middleware/authorize.middleware.js';
import validate from '../../middleware/validate.middleware.js';
import purchaseOrderController from './po.controller.js';
import {
  createPurchaseOrderSchema,
  purchaseOrderIdSchema,
  searchPurchaseOrdersSchema,
  updatePurchaseOrderStatusSchema,
} from './po.validation.js';
import { ROLES } from '../../zodSchema/index.js';

const router = express.Router();

const READ_ROLES   = [ROLES.SUPER_ADMIN, ROLES.CASE_MANAGER, ROLES.FINANCE_HEAD, ROLES.TEAM_LEAD, ROLES.MANAGER];
const CREATE_ROLES = [ROLES.CASE_MANAGER, ROLES.FINANCE_HEAD];
const MANAGE_ROLES = [ROLES.FINANCE_HEAD, ROLES.SUPER_ADMIN];
const CREATE_ROLES = [ROLES.CASE_MANAGER];
const MANAGE_ROLES = [ROLES.FINANCE_HEAD];

router.use(protect);

router
  .route('/')
  .post(authorize(CREATE_ROLES), validate(createPurchaseOrderSchema), purchaseOrderController.createPurchaseOrder)
  .get(authorize(READ_ROLES), validate(searchPurchaseOrdersSchema), purchaseOrderController.getPurchaseOrders);

router.get('/:id', authorize(READ_ROLES), validate(purchaseOrderIdSchema), purchaseOrderController.getPurchaseOrderById);
router.patch('/:id/status', authorize(MANAGE_ROLES), validate(updatePurchaseOrderStatusSchema), purchaseOrderController.updatePurchaseOrderStatus);

export default router;
