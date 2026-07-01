import express from 'express';
import { protect } from '../../middleware/auth.middleware.js';
import authorize from '../../middleware/authorize.middleware.js';
import validate from '../../middleware/validate.middleware.js';
import invoiceController from './invoice.controller.js';
import {
  createInvoiceSchema,
  invoiceApproveSchema,
  invoiceRejectSchema,
  invoiceCancelSchema,
  invoiceIdSchema,
  searchInvoicesSchema,
} from './invoice.validation.js';
import { ROLES } from '../../zodSchema/index.js';

const router = express.Router();

const READ_ROLES = [ROLES.SUPER_ADMIN, ROLES.CASE_MANAGER, ROLES.FINANCE_MANAGER, ROLES.L1, ROLES.L2, ROLES.L3];
const APPROVER_ROLES = [ROLES.L1, ROLES.L2, ROLES.L3];

router.use(protect);

// ─── Static Sub-routes (MUST be defined before dynamic parameterized routes) ───
router.get('/my/approved', authorize(READ_ROLES), validate(searchInvoicesSchema), invoiceController.getMyApprovedInvoices);
router.get('/my/pending', authorize(READ_ROLES), validate(searchInvoicesSchema), invoiceController.getMyPendingInvoices);

router.get('/pending/l1', authorize([ROLES.L1, ROLES.SUPER_ADMIN]), validate(searchInvoicesSchema), invoiceController.getPendingL1);
router.get('/pending/l2', authorize([ROLES.L2, ROLES.SUPER_ADMIN]), validate(searchInvoicesSchema), invoiceController.getPendingL2);
router.get('/pending/l3', authorize([ROLES.L3, ROLES.SUPER_ADMIN]), validate(searchInvoicesSchema), invoiceController.getPendingL3);

// ─── Base Collection Routes ──────────────────────────────────────────────────
router
  .route('/')
  .post(authorize([ROLES.CASE_MANAGER]), validate(createInvoiceSchema), invoiceController.createInvoice)
  .get(authorize(READ_ROLES), validate(searchInvoicesSchema), invoiceController.getInvoices);

// ─── Dynamic Parameterized Routes ─────────────────────────────────────────────
router.get('/:id', authorize(READ_ROLES), validate(invoiceIdSchema), invoiceController.getInvoiceById);
router.get('/:id/history', authorize(READ_ROLES), validate(invoiceIdSchema), invoiceController.getApprovalHistory);

router.patch('/:id/approve', authorize(APPROVER_ROLES), validate(invoiceApproveSchema), invoiceController.approveInvoice);
router.patch('/:id/reject', authorize(APPROVER_ROLES), validate(invoiceRejectSchema), invoiceController.rejectInvoice);
router.patch('/:id/cancel', authorize([ROLES.CASE_MANAGER, ROLES.SUPER_ADMIN]), validate(invoiceCancelSchema), invoiceController.cancelInvoice);

export default router;
