import express from 'express';
import { protect } from '../../middleware/auth.middleware.js';
import authorize from '../../middleware/authorize.middleware.js';
import validate from '../../middleware/validate.middleware.js';
import purchaseOrderController from './po.controller.js';
import {
  createPurchaseOrderSchema,
<<<<<<< HEAD
  purchaseOrderIdSchema,
  searchPurchaseOrdersSchema,
  updatePurchaseOrderStatusSchema,
} from './po.validation.js';
=======
  calculatePurchaseOrderTaxSchema,
  purchaseOrderIdSchema,
  searchPurchaseOrdersSchema,
  updatePurchaseOrderSchema,
  deletePurchaseOrderSchema,
} from './po.validation.js';
import { PERMISSION_KEYS } from '../auth/role-permissions.js';
>>>>>>> origin/main
import { ROLES } from '../../zodSchema/index.js';

const router = express.Router();

<<<<<<< HEAD
const READ_ROLES   = [ROLES.SUPER_ADMIN, ROLES.CASE_MANAGER, ROLES.FINANCE_HEAD, ROLES.TEAM_LEAD, ROLES.MANAGER];
const CREATE_ROLES = [ROLES.CASE_MANAGER];
const MANAGE_ROLES = [ROLES.FINANCE_HEAD];
=======
const DOWNLOAD_ROLES = [
  PERMISSION_KEYS.DOWNLOAD_PURCHASE_ORDER,
  ROLES.CASE_MANAGER,
  ROLES.TEAM_LEAD,
  ROLES.MANAGER,
  ROLES.FINANCE_HEAD,
  ROLES.SUPER_ADMIN,
];

const READ_ACCESS = [
  PERMISSION_KEYS.VIEW_PURCHASE_ORDERS,
  ROLES.CASE_MANAGER,
  ROLES.TEAM_LEAD,
  ROLES.MANAGER,
  ROLES.FINANCE_HEAD,
  ROLES.SUPER_ADMIN,
];

const CREATE_ACCESS = [PERMISSION_KEYS.MANAGE_PURCHASE_ORDERS, ROLES.CASE_MANAGER, ROLES.SUPER_ADMIN];
>>>>>>> origin/main

router.use(protect);

router
  .route('/')
<<<<<<< HEAD
  .post(authorize(CREATE_ROLES), validate(createPurchaseOrderSchema), purchaseOrderController.createPurchaseOrder)
  .get(authorize(READ_ROLES), validate(searchPurchaseOrdersSchema), purchaseOrderController.getPurchaseOrders);

router.get('/:id', authorize(READ_ROLES), validate(purchaseOrderIdSchema), purchaseOrderController.getPurchaseOrderById);
router.patch('/:id/status', authorize(MANAGE_ROLES), validate(updatePurchaseOrderStatusSchema), purchaseOrderController.updatePurchaseOrderStatus);
=======
  .post(authorize(CREATE_ACCESS), validate(createPurchaseOrderSchema), purchaseOrderController.createPurchaseOrder)
  .get(authorize(READ_ACCESS), validate(searchPurchaseOrdersSchema), purchaseOrderController.getPurchaseOrders);

router.post('/calculate-tax', authorize(CREATE_ACCESS), validate(calculatePurchaseOrderTaxSchema), purchaseOrderController.calculatePurchaseOrderTax);

router.get('/:id/download', authorize(DOWNLOAD_ROLES), validate(purchaseOrderIdSchema), purchaseOrderController.downloadPurchaseOrderPdf);

router
  .route('/:id')
  .get(authorize(READ_ACCESS), validate(purchaseOrderIdSchema), purchaseOrderController.getPurchaseOrderById)
  .put(authorize(CREATE_ACCESS), validate(updatePurchaseOrderSchema), purchaseOrderController.updatePurchaseOrder)
  .delete(authorize(CREATE_ACCESS), validate(deletePurchaseOrderSchema), purchaseOrderController.deletePurchaseOrder);
>>>>>>> origin/main

export default router;
