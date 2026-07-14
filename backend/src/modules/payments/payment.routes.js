import express from 'express';
import { protect } from '../../middleware/auth.middleware.js';
import authorize from '../../middleware/authorize.middleware.js';
import validate from '../../middleware/validate.middleware.js';
import paymentController from './payment.controller.js';
import {
  createPaymentSchema,
  updatePaymentSchema,
  paymentActionSchema,
  paymentIdSchema,
  searchPaymentsSchema,
} from './payment.validation.js';
import { ROLES } from '../../zodSchema/index.js';

const router = express.Router();

// Role groups (updated: FINANCE_MANAGER → FINANCE_HEAD)
const READ_ROLES   = [ROLES.SUPER_ADMIN, ROLES.CASE_MANAGER, ROLES.TEAM_LEAD, ROLES.MANAGER, ROLES.FINANCE_HEAD];
const CREATE_ROLES = [ROLES.CASE_MANAGER, ROLES.FINANCE_HEAD];
const REVIEW_ROLES = [ROLES.FINANCE_HEAD];

router.use(protect);

// ─── Static Sub-routes ────────────────────────────────────────────────────────
router.get('/pending',   authorize(REVIEW_ROLES), validate(searchPaymentsSchema), paymentController.getPendingPayments);
router.get('/completed', authorize(READ_ROLES),   validate(searchPaymentsSchema), paymentController.getCompletedPayments);

// ─── Base Collection Routes ───────────────────────────────────────────────────
router
  .route('/')
  .post(authorize(CREATE_ROLES), validate(createPaymentSchema), paymentController.createPayment)
  .get(authorize(READ_ROLES),    validate(searchPaymentsSchema), paymentController.getPayments);

// ─── Dynamic Parameterized Routes ─────────────────────────────────────────────
router
  .route('/:id')
  .get(authorize(READ_ROLES),    validate(paymentIdSchema),    paymentController.getPaymentById)
  .put(authorize(CREATE_ROLES),  validate(updatePaymentSchema), paymentController.updatePayment)
  .delete(authorize(REVIEW_ROLES), validate(paymentIdSchema),  paymentController.deletePayment);

router.get('/:id/history', authorize(READ_ROLES), validate(paymentIdSchema), paymentController.getPaymentHistory);

router.patch('/:id/approve', authorize(REVIEW_ROLES), validate(paymentActionSchema), paymentController.approvePayment);
router.patch('/:id/reject',  authorize(REVIEW_ROLES), validate(paymentActionSchema), paymentController.rejectPayment);
router.patch('/:id/cancel',  authorize(READ_ROLES),   validate(paymentActionSchema), paymentController.cancelPayment);
router.patch('/:id/refund',  authorize(REVIEW_ROLES), validate(paymentActionSchema), paymentController.refundPayment);
router.post('/:id/retry',    authorize(REVIEW_ROLES), validate(paymentIdSchema),     paymentController.retryPayment);

export default router;
