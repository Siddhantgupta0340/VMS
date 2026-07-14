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

  invoiceDeleteSchema,
  invoiceRestoreSchema,
  financeHeadRemarkSchema,
  invoiceIdSchema,
  searchInvoicesSchema,
  financeHeadObservationSchema,
} from './invoice.validation.js';
import { ROLES } from '../../zodSchema/index.js';

const router = express.Router();

// ─── Role groups ─────────────────────────────────────────────────────────────
const ALL_ROLES     = Object.values(ROLES);
const READ_ROLES    = [ROLES.SUPER_ADMIN, ROLES.CASE_MANAGER, ROLES.TEAM_LEAD, ROLES.MANAGER, ROLES.FINANCE_HEAD];
const APPROVER_ROLES = [ROLES.TEAM_LEAD, ROLES.MANAGER, ROLES.FINANCE_HEAD];

router.use(protect);

// ─── Finance Head Observation Dashboard ──────────────────────────────────────
router.get('/observation',
  authorize([ROLES.FINANCE_HEAD]),
  validate(financeHeadObservationSchema),
  invoiceController.getFinanceHeadObservation,
);

// ─── My Invoices ──────────────────────────────────────────────────────────────
router.get('/my/approved',
  authorize(READ_ROLES),
  validate(searchInvoicesSchema),
  invoiceController.getMyApprovedInvoices,
);
router.get('/my/pending',
  authorize(READ_ROLES),
  validate(searchInvoicesSchema),
  invoiceController.getMyPendingInvoices,
);

// ─── Workflow-Stage Queues ────────────────────────────────────────────────────
// Three-Way Matching queue (Case Manager)
router.get('/pending/three-way-match',
  authorize([ROLES.CASE_MANAGER]),
  validate(searchInvoicesSchema),
  invoiceController.getPendingThreeWayMatch,
);

// Admin Review queue removed.

// Team Lead queue (formerly L1)
router.get('/pending/team-lead',
  authorize([ROLES.TEAM_LEAD]),
  validate(searchInvoicesSchema),
  invoiceController.getPendingTeamLead,
);

// Manager queue (formerly L2)
router.get('/pending/manager',
  authorize([ROLES.MANAGER]),
  validate(searchInvoicesSchema),
  invoiceController.getPendingManager,
);

// Finance Head queue (formerly L3)
router.get('/pending/finance-head',
  authorize([ROLES.FINANCE_HEAD]),
  validate(searchInvoicesSchema),
  invoiceController.getPendingFinanceHead,
);


// ─── Base Collection Routes ───────────────────────────────────────────────────
router
  .route('/')
  .post(authorize([ROLES.CASE_MANAGER]), validate(createInvoiceSchema), invoiceController.createInvoice)
  .get(authorize(READ_ROLES), validate(searchInvoicesSchema), invoiceController.getInvoices);

// ─── Dynamic Parameterized Routes ─────────────────────────────────────────────
router.get('/:id',
  authorize(READ_ROLES),
  validate(invoiceIdSchema),
  invoiceController.getInvoiceById,
);
router.get('/:id/history',
  authorize(READ_ROLES),
  validate(invoiceIdSchema),
  invoiceController.getApprovalHistory,
);

// ─── Role-Level Approval Actions ──────────────────────────────────────────────
router.patch('/:id/approve',
  authorize(APPROVER_ROLES),
  validate(invoiceApproveSchema),
  invoiceController.approveInvoice,
);
router.patch('/:id/reject',
  authorize(APPROVER_ROLES),
  validate(invoiceRejectSchema),
  invoiceController.rejectInvoice,
);
router.patch('/:id/cancel',
  authorize([ROLES.CASE_MANAGER]),
  validate(invoiceCancelSchema),
  invoiceController.cancelInvoice,
);

// Admin Review Actions removed.

// ─── Soft Delete & Restore ────────────────────────────────────────────────────
router.delete('/:id',
  authorize([ROLES.SUPER_ADMIN, ROLES.FINANCE_HEAD, ROLES.CASE_MANAGER, ROLES.TEAM_LEAD, ROLES.MANAGER]),
  validate(invoiceDeleteSchema),
  invoiceController.softDeleteInvoice,
);
router.post('/:id/restore',
  authorize([ROLES.SUPER_ADMIN, ROLES.FINANCE_HEAD]),
  validate(invoiceRestoreSchema),
  invoiceController.restoreInvoice,
);

// ─── Finance Head Observation Remarks ─────────────────────────────────────────
router.post('/:id/remark',
  authorize([ROLES.FINANCE_HEAD]),
  validate(financeHeadRemarkSchema),
  invoiceController.addFinanceHeadRemark,
);

export default router;
