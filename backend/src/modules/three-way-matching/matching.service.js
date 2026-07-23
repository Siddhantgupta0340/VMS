import ApiError from '../../utils/ApiError.js';
import matchingRepository from './matching.repository.js';
import notificationService from '../notifications/notification.service.js';
import { ROLES } from '../../zodSchema/index.js';
import {
  INVOICE_STATUS,
  THREE_WAY_MATCH_STATUS,
  ADMIN_REVIEW_STATUS,
<<<<<<< HEAD
} from '../../utils/approval-helper.js';
import prisma from '../../config/prisma.js';
=======
  getNextApprovalStatus,
  getCurrentApprovalLevel,
  getRequiredInvoiceApprovalRole,
} from '../../utils/approval-helper.js';
import prisma from '../../config/prisma.js';
import { compareThreeWayDocuments } from './matching.utils.js';

let _paymentApprovalService = null;
const getPaymentApprovalService = async () => {
  if (!_paymentApprovalService) {
    const mod = await import('../payment-approvals/payment-approval.service.js');
    _paymentApprovalService = mod.default;
  }
  return _paymentApprovalService;
};

const getRequiredPaymentApprovalRole = (amount, currency = 'INR') => {
  if (String(currency || 'INR').toUpperCase() !== 'INR') {
    return ROLES.FINANCE_HEAD;
  }
  const paymentAmount = Number(amount || 0);
  if (paymentAmount <= 10000) return ROLES.TEAM_LEAD;
  if (paymentAmount < 100000) return ROLES.MANAGER;
  return ROLES.FINANCE_HEAD;
};

const actorName = (user) => `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.email || user?.role || 'System';
const currentYear = () => new Date().getFullYear();
const nextNumber = async (tx, sequenceName, prefix) => {
  const rows = await tx.$queryRawUnsafe(`SELECT nextval('${sequenceName}')::int AS value`);
  const value = Number(rows?.[0]?.value || 1);
  return `${prefix}-${currentYear()}-${String(value).padStart(6, '0')}`;
};

const assertEditableByCreator = (record, user, label) => {
  if (!record) throw new ApiError(404, `${label} not found.`);
  if (record.deleted_at) throw new ApiError(400, `${label} has already been deleted.`);
  if (user.role !== ROLES.SUPER_ADMIN && record.created_by_id !== user.id) {
    throw new ApiError(403, `You can only update ${label}s you created.`);
  }
};

const assertNotMatched = async (tx, where, label) => {
  const match = await tx.threeWayMatch.findFirst({ where, select: { id: true, invoice: { select: { invoice_number: true } } } });
  if (match) {
    throw new ApiError(400, `${label} cannot be changed because it is already linked to matching report ${match.id}${match.invoice?.invoice_number ? ` for invoice ${match.invoice.invoice_number}` : ''}.`);
  }
};

const resolvePurchaseOrderLineItems = (po, payloadLineItems, documentLabel) => {
  const lineItems = Array.isArray(payloadLineItems) && payloadLineItems.length
    ? payloadLineItems
    : Array.isArray(po?.line_items) && po.line_items.length
      ? po.line_items
      : [];

  if (!lineItems.length) {
    throw new ApiError(400, `Purchase Order items missing. Complete Purchase Order item details before creating a ${documentLabel}.`);
  }

  return lineItems;
};

const sumLineItems = (lineItems) => lineItems.reduce((totals, item) => {
  const quantity = Number(item.quantity || 0);
  const unitPrice = Number(item.unitPrice ?? item.rate ?? 0);
  const taxable = Number(item.taxableAmount ?? item.taxable_amount ?? quantity * unitPrice);
  const gst = Number(item.gstAmount ?? item.gst_amount ?? item.taxAmount ?? 0);
  const total = Number(item.lineTotal ?? item.line_total ?? taxable + gst);

  return {
    subtotal: totals.subtotal + taxable,
    gstAmount: totals.gstAmount + gst,
    totalAmount: totals.totalAmount + total,
  };
}, { subtotal: 0, gstAmount: 0, totalAmount: 0 });

const normalizeReceiptItem = (item, quantityKey) => {
  const orderedQuantity = Number(item.quantity || item.orderedQuantity || 0);
  const movementQuantity = Number(item[quantityKey] ?? item.receivedQuantity ?? item.deliveredQuantity ?? orderedQuantity);
  const unitPrice = Number(item.unitPrice ?? item.rate ?? 0);
  const gstAmount = Number(item.gstAmount ?? item.gst_amount ?? 0);
  const lineTotal = Number(item.lineTotal ?? item.line_total ?? movementQuantity * unitPrice + gstAmount);

  return {
    item_name: item.itemName || item.item_name || item.name || 'Item',
    description: item.description || null,
    ordered_quantity: orderedQuantity,
    unit_price: unitPrice,
    gst_amount: gstAmount,
    line_total: lineTotal,
  };
};
>>>>>>> origin/main

// ─── Field Comparison Engine ───────────────────────────────────────────────────

/**
 * All fields compared in Three-Way Matching.
 * Format: { key, label, mandatory, tolerance? }
 *
 * mandatory: true  → mismatch causes UNMATCHED
 * mandatory: false → mismatch causes WARNING only
 * tolerance: numeric percentage tolerance (for amounts)
 */
const MATCHING_FIELDS = [
  // Vendor Identity
  { key: 'vendor_name',       label: 'Vendor Name',       mandatory: true  },
  { key: 'vendor_code',       label: 'Vendor Code',       mandatory: true  },
  { key: 'gst_number',        label: 'GST Number',        mandatory: true  },

  // Document References
  { key: 'invoice_number',    label: 'Invoice Number',    mandatory: true  },
  { key: 'po_number',         label: 'PO Number',         mandatory: true  },
  { key: 'grn_number',        label: 'GRN Number',        mandatory: false },

  // Item-Level (from line items totals)
  { key: 'currency',          label: 'Currency',          mandatory: true  },
  { key: 'total_amount',      label: 'Total Amount',      mandatory: true,  tolerance: 0.01 },
  { key: 'gst_amount',        label: 'GST Amount',        mandatory: true,  tolerance: 0.01 },
  { key: 'discount',          label: 'Discount',          mandatory: false, tolerance: 0.01 },

  // Addresses
  { key: 'delivery_address',  label: 'Delivery Address',  mandatory: false },
  { key: 'billing_address',   label: 'Billing Address',   mandatory: false },

  // Terms
  { key: 'delivery_terms',    label: 'Delivery Terms',    mandatory: false },
  { key: 'payment_terms',     label: 'Payment Terms',     mandatory: false },

  // Dates
  { key: 'invoice_date',      label: 'Invoice Date',      mandatory: false },
  { key: 'po_date',           label: 'PO Date',           mandatory: false },
  { key: 'grn_date',          label: 'GRN / Delivery Date', mandatory: false },
];

// ─── Data Extractors ──────────────────────────────────────────────────────────

/**
 * Extract comparable fields from a Purchase Order.
 */
const extractPOData = (po, vendor) => ({
  vendor_name:      vendor?.name             || '',
  vendor_code:      vendor?.vendor_code      || '',
  gst_number:       vendor?.gst_number       || '',
  invoice_number:   '',   // Not on PO
  po_number:        po.po_number             || '',
  grn_number:       '',
  currency:         po.currency              || 'INR',
  total_amount:     Number(po.amount         || 0),
  gst_amount:       0,   // Not always on PO
  discount:         0,
  delivery_address: po.delivery_address      || '',
  billing_address:  po.billing_address       || '',
  delivery_terms:   po.delivery_terms        || '',
  payment_terms:    po.payment_terms         || '',
  invoice_date:     '',
  po_date:          po.order_date ? new Date(po.order_date).toISOString().split('T')[0] : '',
  grn_date:         '',
});

/**
 * Extract comparable fields from a GRN.
 */
const extractGRNData = (grn) => ({
  vendor_name:      grn?.vendor_name         || '',
  vendor_code:      grn?.vendor_code         || '',
  gst_number:       grn?.gst_number          || '',
  invoice_number:   '',
  po_number:        '',
  grn_number:       grn?.grn_number          || '',
  currency:         grn?.currency            || 'INR',
  total_amount:     Number(grn?.total_amount || 0),
  gst_amount:       Number(grn?.gst_amount   || 0),
  discount:         Number(grn?.discount     || 0),
  delivery_address: grn?.delivery_address    || '',
  billing_address:  grn?.billing_address     || '',
  delivery_terms:   grn?.delivery_terms      || '',
  payment_terms:    grn?.payment_terms       || '',
  invoice_date:     '',
  po_date:          '',
  grn_date:         grn?.delivery_date ? new Date(grn.delivery_date).toISOString().split('T')[0] : '',
});

/**
 * Extract comparable fields from an Invoice.
 */
const extractInvoiceData = (invoice, vendor) => ({
  vendor_name:      vendor?.name             || '',
  vendor_code:      vendor?.vendor_code      || '',
  gst_number:       vendor?.gst_number       || '',
  invoice_number:   invoice.invoice_number   || '',
  po_number:        invoice.purchase_order?.po_number || '',
  grn_number:       '',
  currency:         invoice.currency         || 'INR',
  total_amount:     Number(invoice.invoice_total || invoice.amount || 0),
  gst_amount:       0,
  discount:         0,
  delivery_address: vendor?.address          || '',
  billing_address:  vendor?.address          || '',
  delivery_terms:   '',
  payment_terms:    vendor?.payment_terms    || '',
  invoice_date:     invoice.invoice_date ? new Date(invoice.invoice_date).toISOString().split('T')[0] : '',
  po_date:          '',
  grn_date:         '',
});

// ─── Comparison Engine ────────────────────────────────────────────────────────

/**
 * Compare a single field across PO, GRN, and Invoice.
 * Returns: { field, label, poValue, grnValue, invoiceValue, status, mandatory }
 */
const compareField = (fieldDef, poData, grnData, invoiceData) => {
  const { key, label, mandatory, tolerance } = fieldDef;
  const poVal      = poData[key];
  const grnVal     = grnData[key];
  const invoiceVal = invoiceData[key];

  // Determine if values match
  let matched = false;

  if (tolerance != null) {
    // Numeric comparison with tolerance
    const poNum      = Number(poVal      || 0);
    const grnNum     = Number(grnVal     || 0);
    const invoiceNum = Number(invoiceVal || 0);

    // Skip GRN if it's 0 (not provided)
    const hasGrn = grnNum !== 0;
    if (hasGrn) {
      matched = Math.abs(poNum - grnNum) <= tolerance && Math.abs(poNum - invoiceNum) <= tolerance;
    } else {
      matched = Math.abs(poNum - invoiceNum) <= tolerance;
    }
  } else {
    // String comparison — normalize and trim
    const norm = (v) => String(v || '').trim().toLowerCase();
    const hasGrn = norm(grnVal) !== '';
    if (hasGrn) {
      matched = norm(poVal) === norm(grnVal) && norm(poVal) === norm(invoiceVal);
    } else {
      // If GRN doesn't have this field, compare PO vs Invoice only
      matched = norm(poVal) === norm(invoiceVal) || norm(invoiceVal) === '' || norm(poVal) === '';
    }
  }

  let status = 'MATCHED';
  if (!matched) {
    status = mandatory ? 'UNMATCHED' : 'WARNING';
  }

  return {
    field:        key,
    label,
    po_value:     poVal,
    grn_value:    grnVal,
    invoice_value: invoiceVal,
    status,
    mandatory,
  };
};

/**
 * Run full Three-Way Matching comparison.
 * Returns: { results, matchedCount, totalCount, matchPercentage, overallStatus, warnings }
 */
const runComparison = (poData, grnData, invoiceData) => {
  const results      = [];
  let matchedCount   = 0;
  let mandatoryFailed = 0;
  const warnings     = [];

  for (const fieldDef of MATCHING_FIELDS) {
    const result = compareField(fieldDef, poData, grnData, invoiceData);
    results.push(result);

    if (result.status === 'MATCHED') {
      matchedCount++;
    } else if (result.status === 'UNMATCHED') {
      mandatoryFailed++;
    } else if (result.status === 'WARNING') {
      warnings.push(`Partial mismatch on "${result.label}": PO=${result.po_value}, Invoice=${result.invoice_value}`);
    }
  }

  const totalCount       = MATCHING_FIELDS.length;
  const matchPercentage  = Math.round((matchedCount / totalCount) * 100 * 100) / 100; // 2dp
  const overallStatus    = mandatoryFailed === 0 ? THREE_WAY_MATCH_STATUS.MATCHED : THREE_WAY_MATCH_STATUS.UNMATCHED;

  const unmatchedFields  = results.filter(r => r.status === 'UNMATCHED');
  const matchedFields    = results.filter(r => r.status === 'MATCHED').map(r => r.field);

  const recommendation   = overallStatus === THREE_WAY_MATCH_STATUS.MATCHED
    ? (warnings.length > 0 ? 'REVIEW' : 'APPROVE')
    : 'REJECT';

  return {
    results,
    matched_fields:        matchedFields,
    unmatched_fields:      unmatchedFields,
    warnings,
    matched_fields_count:  matchedCount,
    total_fields_count:    totalCount,
    match_percentage:      matchPercentage,
    overall_status:        overallStatus,
    approval_recommendation: recommendation,
  };
};

// ─── MatchingService ──────────────────────────────────────────────────────────

class MatchingService {
  // ────────────────────────────────────────────────────────────────────────────
  // START MATCHING — Case Manager triggers
  // ────────────────────────────────────────────────────────────────────────────
<<<<<<< HEAD
  async startMatching(invoiceId, grnId, user, req = null) {
    if (user.role !== ROLES.CASE_MANAGER) {
=======
  async startMatching(invoiceId, grnId, user, req = null, deliveryChallanId = null) {
    if (user.role !== ROLES.CASE_MANAGER && user.role !== ROLES.SUPER_ADMIN) {
>>>>>>> origin/main
      throw new ApiError(403, 'Only Case Managers can initiate Three-Way Matching.');
    }

    // Load invoice with relations
    const invoice = await prisma.invoice.findUnique({
      where:   { id: invoiceId },
      include: {
        vendor:        true,
        purchase_order: true,
      },
    });

    if (!invoice) throw new ApiError(404, 'Invoice not found.');
    if (invoice.deleted_at) throw new ApiError(400, 'Cannot run matching on a deleted invoice.');

    if (invoice.status !== INVOICE_STATUS.PENDING_THREE_WAY_MATCH &&
        invoice.status !== INVOICE_STATUS.SUBMITTED) {
      throw new ApiError(400, `Invoice must be in PENDING_THREE_WAY_MATCH status. Current: ${invoice.status}`);
    }

<<<<<<< HEAD
    // Load GRN if provided
    let grn = null;
    if (grnId) {
      grn = await prisma.goodsReceiptNote.findUnique({
        where: { id: grnId },
      });
      if (!grn) throw new ApiError(404, 'GRN not found.');
      if (grn.purchase_order_id !== invoice.purchase_order_id) {
        throw new ApiError(400, 'GRN does not belong to the same Purchase Order as this Invoice.');
      }
    }

    // Extract data
    const po      = invoice.purchase_order;
    const vendor  = invoice.vendor;
    const poData  = extractPOData(po, vendor);
    const grnData = grn ? extractGRNData(grn) : extractGRNData(null);
    const invoiceData = extractInvoiceData(invoice, vendor);

    // Run comparison
    const comparison = runComparison(poData, grnData, invoiceData);

    const now = new Date();

    return matchingRepository.transaction(async (tx) => {
      // Create ThreeWayMatch record
=======
    let grn = null;
    if (grnId) {
      grn = await prisma.goodsReceiptNote.findUnique({ where: { id: grnId } });
      if (!grn) throw new ApiError(404, 'GRN not found.');
      if (grn.deleted_at) throw new ApiError(400, 'Cannot use a deleted GRN for matching.');
      if (grn.purchase_order_id !== invoice.purchase_order_id) {
        throw new ApiError(400, 'GRN does not belong to the same Purchase Order as this Invoice.');
      }
    } else {
      grn = await prisma.goodsReceiptNote.findFirst({
        where:   { purchase_order_id: invoice.purchase_order_id, deleted_at: null, status: { not: 'rejected' } },
        orderBy: [{ status: 'desc' }, { created_at: 'desc' }],
      });
    }

    let deliveryChallan = null;
    if (deliveryChallanId) {
      deliveryChallan = await prisma.deliveryChallan.findUnique({ where: { id: deliveryChallanId } });
      if (!deliveryChallan) throw new ApiError(404, 'Delivery Challan not found.');
      if (deliveryChallan.deleted_at) throw new ApiError(400, 'Cannot use a deleted Delivery Challan for matching.');
      if (deliveryChallan.purchase_order_id !== invoice.purchase_order_id) {
        throw new ApiError(400, 'Delivery Challan does not belong to the same Purchase Order as this Invoice.');
      }
    } else {
      deliveryChallan = await prisma.deliveryChallan.findFirst({
        where: { purchase_order_id: invoice.purchase_order_id, deleted_at: null, status: { not: 'cancelled' } },
        orderBy: { created_at: 'desc' },
      });
    }

    const comparison = compareThreeWayDocuments({
      invoice,
      purchaseOrder: invoice.purchase_order,
      grn,
      deliveryChallan,
    });

    const now = new Date();

    const txResult = await matchingRepository.transaction(async (tx) => {
      const previousMatch = await tx.threeWayMatch.findFirst({
        where: { invoice_id: invoiceId },
        orderBy: { created_at: 'desc' },
      });

>>>>>>> origin/main
      const match = await tx.threeWayMatch.create({
        data: {
          invoice_id:              invoiceId,
          purchase_order_id:       invoice.purchase_order_id,
<<<<<<< HEAD
          grn_id:                  grnId || null,
          status:                  comparison.overall_status,
=======
          grn_id:                  grn?.id || null,
          delivery_challan_id:     deliveryChallan?.id || null,
          status:                  comparison.status,
>>>>>>> origin/main
          match_percentage:        comparison.match_percentage,
          matched_fields_count:    comparison.matched_fields_count,
          total_fields_count:      comparison.total_fields_count,
          matched_fields:          comparison.matched_fields,
          unmatched_fields:        comparison.unmatched_fields,
          warnings:                comparison.warnings,
          approval_recommendation: comparison.approval_recommendation,
<<<<<<< HEAD
          po_snapshot:             poData,
          grn_snapshot:            grnData,
          invoice_snapshot:        invoiceData,
          completed_by_id:         user.id,
          completed_at:            now,
          admin_review_status:     ADMIN_REVIEW_STATUS.APPROVED, // Auto-approve since admin review is removed
        },
      });

      // Update invoice with match result
      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          three_way_match_status:      comparison.overall_status,
          three_way_match_percentage:  comparison.match_percentage,
          matching_completed_by_id:    user.id,
          matching_completed_at:       now,
          matching_remarks:            comparison.overall_status === THREE_WAY_MATCH_STATUS.MATCHED
            ? `Matched ${comparison.matched_fields_count}/${comparison.total_fields_count} fields.`
            : `${comparison.unmatched_fields.length} field(s) failed. Match: ${comparison.match_percentage}%`,
          // Move to Team Lead
          status:                      INVOICE_STATUS.PENDING_TEAM_LEAD,
          current_approval_level:      'TEAM_LEAD',
          admin_review_status:         ADMIN_REVIEW_STATUS.APPROVED,
        },
      });

      // Write audit log
      await tx.auditLog.create({
        data: {
          entity_type:     'invoice',
          entity_id:       invoiceId,
          action:          'three_way_match_completed',
          from_status:     INVOICE_STATUS.PENDING_THREE_WAY_MATCH,
          to_status:       INVOICE_STATUS.PENDING_TEAM_LEAD,
          performed_by_id: user.id,
          remarks:         `Three-Way Matching: ${comparison.overall_status}. Match: ${comparison.match_percentage}%. Forwarded to Team Lead.`,
=======
          po_snapshot:             comparison.snapshots.purchaseOrder,
          grn_snapshot:            comparison.snapshots.goodsReceiptNote,
          delivery_challan_snapshot: comparison.snapshots.deliveryChallan,
          invoice_snapshot:        {
            ...comparison.snapshots.invoice,
            summary: comparison.summary,
          },
          completed_by_id:         user.id,
          completed_at:            now,
          admin_review_status:     comparison.status === THREE_WAY_MATCH_STATUS.MATCHED ? ADMIN_REVIEW_STATUS.PENDING : null,
        },
      });

      const invoiceAmount = Number(invoice.amount || invoice.invoice_total || 0);
      const requiredApprovalRole = getRequiredInvoiceApprovalRole(invoiceAmount);
      const nextInvoiceStatus = comparison.status === THREE_WAY_MATCH_STATUS.MATCHED
        ? getNextApprovalStatus(invoiceAmount, INVOICE_STATUS.PENDING_THREE_WAY_MATCH)
        : INVOICE_STATUS.PENDING_THREE_WAY_MATCH;
      const nextApprovalLevel = comparison.status === THREE_WAY_MATCH_STATUS.MATCHED
        ? getCurrentApprovalLevel(nextInvoiceStatus)
        : null;

      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          three_way_match_status:      comparison.status,
          three_way_match_percentage:  comparison.match_percentage,
          matching_completed_by_id:    user.id,
          matching_completed_at:       now,
          matching_remarks:            comparison.status === THREE_WAY_MATCH_STATUS.MATCHED
            ? `Matched ${comparison.matched_fields_count}/${comparison.total_fields_count} fields.`
            : comparison.unmatched_fields.map((field) => field.reason).join(' '),
          status:                      nextInvoiceStatus,
          required_approval_role:      requiredApprovalRole,
          current_approval_level:      nextApprovalLevel,
          admin_review_status:         comparison.status === THREE_WAY_MATCH_STATUS.MATCHED ? ADMIN_REVIEW_STATUS.PENDING : null,
        },
        include: {
          vendor: true,
          purchase_order: true,
          created_by: { select: { id: true, first_name: true, last_name: true, email: true, role: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          entity_type:     'three_way_match',
          entity_id:       invoiceId,
          action:          comparison.status === THREE_WAY_MATCH_STATUS.MATCHED ? 'matching_completed' : 'mismatch_detected',
          from_status:     INVOICE_STATUS.PENDING_THREE_WAY_MATCH,
          to_status:       nextInvoiceStatus,
          performed_by_id: user.id,
          remarks:         `Three-Way Matching: ${comparison.status}. Match: ${comparison.match_percentage}%. ${comparison.unmatched_fields.map(f => f.reason).join(' ') || 'No mismatches.'}`,
          old_value:       previousMatch ? { status: previousMatch.status, unmatched_fields: previousMatch.unmatched_fields } : null,
          new_value:       { status: comparison.status, summary: comparison.summary, unmatched_fields: comparison.unmatched_fields },
>>>>>>> origin/main
          ip_address:      req?.ip || null,
          user_agent:      req?.headers?.['user-agent'] || null,
        },
      });

<<<<<<< HEAD
      // Notify Team Lead
      notificationService.notifyInvoiceNextLevel(invoice, 'TEAM_LEAD').catch(() => {});

      return {
        match,
        comparison,
        message: `Three-Way Matching ${comparison.overall_status}. Match percentage: ${comparison.match_percentage}%`,
      };
    });
=======
      // ── Payment Approval Auto-Creation on MATCHED ──────────────────────────
      // When Three-Way Matching is MATCHED, automatically create a PaymentApproval
      // record INSIDE this transaction. This is the authoritative creation point.
      // The idempotency guard in createPaymentApprovalForInvoice ensures no duplicate
      // is ever created even if this function is called multiple times.
      let createdApproval = null;
      let assignedApprover = null;

      if (comparison.status === THREE_WAY_MATCH_STATUS.MATCHED) {
        const paService = await getPaymentApprovalService();
        const approvalResult = await paService.createPaymentApprovalForInvoice(
          updatedInvoice,
          user,
          tx,
          match.id, // Pass the freshly-created match ID directly — no extra DB lookup needed
        );
        createdApproval  = approvalResult.approval;
        assignedApprover = approvalResult.approver;

        // Write a supplementary audit log entry for the approval creation
        await tx.auditLog.create({
          data: {
            entity_type:     'payment_approval',
            entity_id:       createdApproval.id,
            action:          approvalResult.alreadyExisted ? 'payment_approval_already_existed' : 'payment_approval_created',
            from_status:     null,
            to_status:       'PENDING',
            performed_by_id: user.id,
            remarks:         approvalResult.alreadyExisted
              ? `Idempotency: existing PENDING approval ${createdApproval.id} reused for invoice ${invoiceId}.`
              : `Payment approval created for invoice ${invoiceId}. Amount: ${updatedInvoice.currency} ${Number(updatedInvoice.invoice_total || updatedInvoice.amount)}. Assigned to: ${assignedApprover?.email} (${createdApproval.required_role}).`,
            ip_address:      req?.ip || null,
            user_agent:      req?.headers?.['user-agent'] || null,
          },
        });
      }

      // Send notifications inside the transaction!
      await notificationService.notifyMatchingCompleted(
        { ...updatedInvoice, created_by_id: updatedInvoice.created_by_id },
        comparison.status,
        comparison.match_percentage,
        tx
      );

      if (comparison.status === THREE_WAY_MATCH_STATUS.MATCHED && nextApprovalLevel) {
        // Prevent next level notification unless PaymentApproval was successfully created! (Step 5)
        if (createdApproval) {
          await notificationService.notifyInvoiceNextLevel(updatedInvoice, nextApprovalLevel, {
            requestedBy: actorName(user),
            matchingResult: comparison.status,
            paymentApprovalId: createdApproval.id,
            assignedUserId: createdApproval.approver_id,
          }, tx);

          if (assignedApprover) {
            const paService = await getPaymentApprovalService();
            await paService.sendApprovalNotification(createdApproval, assignedApprover, tx);
          }
        }
      }

      // Stash for post-transaction use
      return {
        match,
        comparison,
        updatedInvoice,
        nextApprovalLevel,
        createdApproval,
        assignedApprover,
        message: `Three-Way Matching ${comparison.status}. Match percentage: ${comparison.match_percentage}%`,
      };
    });

    return {
      match:      txResult.match,
      comparison: txResult.comparison,
      message:    txResult.message,
      paymentApproval: txResult.createdApproval
        ? {
            id:           txResult.createdApproval.id,
            approverId:   txResult.createdApproval.approver_id,
            approverEmail: txResult.assignedApprover?.email || null,
            requiredRole: txResult.createdApproval.required_role,
            amount:       Number(txResult.createdApproval.amount),
            status:       txResult.createdApproval.status,
          }
        : null,
    };
>>>>>>> origin/main
  }

  // ────────────────────────────────────────────────────────────────────────────
  // GET MATCHING REPORT
  // ────────────────────────────────────────────────────────────────────────────
  async getMatchingReport(matchId) {
    const match = await matchingRepository.findById(matchId);
    if (!match) throw new ApiError(404, 'Matching report not found.');
    return match;
  }

  async getMatchingReportByInvoice(invoiceId) {
    const matches = await matchingRepository.findByInvoiceId(invoiceId);
    return matches;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // LIST ALL MATCHES (Admin / Finance Head)
  // ────────────────────────────────────────────────────────────────────────────
  async listMatches(query, user) {
    const page  = Number(query.page  || 1);
    const limit = Number(query.limit || 20);
<<<<<<< HEAD

    const where = {
      ...(query.status     && { status:     query.status }),
      ...(query.invoiceId  && { invoice_id: query.invoiceId }),
=======
    const status = query.status === THREE_WAY_MATCH_STATUS.MISMATCH
      ? { in: [THREE_WAY_MATCH_STATUS.MISMATCH, THREE_WAY_MATCH_STATUS.UNMATCHED] }
      : query.status;

    const where = {
      ...(query.status     && { status }),
      ...(query.invoiceId  && { invoice_id: query.invoiceId }),
      ...(user.role === ROLES.CASE_MANAGER && { invoice: { created_by_id: user.id } }),
>>>>>>> origin/main
    };

    const result = await matchingRepository.findAll({ where, skip: (page - 1) * limit, take: limit });
    return { ...result, page, limit, totalPages: Math.ceil(result.total / limit) };
  }

  // ────────────────────────────────────────────────────────────────────────────
  // ADMIN APPROVE MATCHING
  // Admin reviews the match report and approves it → Invoice moves to PENDING_TEAM_LEAD
  // ────────────────────────────────────────────────────────────────────────────
  async adminApproveMatching(matchId, user, remarks, req = null) {
<<<<<<< HEAD
    if (user.role !== ROLES.SUPER_ADMIN) {
      throw new ApiError(403, 'Only Admins can approve matching reports.');
=======
    if (![ROLES.FINANCE_HEAD, ROLES.SUPER_ADMIN].includes(user.role)) {
      throw new ApiError(403, 'Only Finance Head can approve matching reports.');
>>>>>>> origin/main
    }

    const match = await matchingRepository.findById(matchId);
    if (!match) throw new ApiError(404, 'Matching report not found.');

    if (match.admin_review_status !== ADMIN_REVIEW_STATUS.PENDING) {
      throw new ApiError(400, 'This matching report has already been reviewed.');
    }
<<<<<<< HEAD

    const now = new Date();

    return matchingRepository.transaction(async (tx) => {
=======
    if (match.status !== THREE_WAY_MATCH_STATUS.MATCHED) {
      throw new ApiError(400, 'Finance approval is blocked until three-way matching is fully matched.');
    }

    const now = new Date();

    let createdApproval = null;
    let assignedApprover = null;
    let approvalAlreadyExisted = false;

    const result = await matchingRepository.transaction(async (tx) => {
>>>>>>> origin/main
      // Update match record
      await tx.threeWayMatch.update({
        where: { id: matchId },
        data: {
          admin_review_status:  ADMIN_REVIEW_STATUS.APPROVED,
          admin_reviewed_by_id: user.id,
          admin_reviewed_at:    now,
          admin_remarks:        remarks || '',
        },
      });

<<<<<<< HEAD
      // Move invoice to Team Lead
      await tx.invoice.update({
        where: { id: match.invoice_id },
        data: {
          status:                INVOICE_STATUS.PENDING_TEAM_LEAD,
          current_approval_level: 'TEAM_LEAD',
=======
      const updatedInvoice = await tx.invoice.update({
        where: { id: match.invoice_id },
        data: {
          status:                INVOICE_STATUS.APPROVED,
          current_approval_level: null,
>>>>>>> origin/main
          admin_review_status:   ADMIN_REVIEW_STATUS.APPROVED,
          admin_reviewed_by_id:  user.id,
          admin_reviewed_at:     now,
          admin_remarks:         remarks || '',
<<<<<<< HEAD
        },
=======
          finance_head_approver_id: user.id,
          finance_head_approved_at: now,
          final_approved_at: now,
        },
        include: { vendor: true },
>>>>>>> origin/main
      });

      // Write audit log
      await tx.auditLog.create({
        data: {
<<<<<<< HEAD
          entity_type:     'invoice',
          entity_id:       match.invoice_id,
          action:          'admin_review_approved_from_match',
          from_status:     INVOICE_STATUS.PENDING_ADMIN_REVIEW,
          to_status:       INVOICE_STATUS.PENDING_TEAM_LEAD,
          performed_by_id: user.id,
          remarks:         `Admin approved matching report. Remarks: ${remarks || 'None'}`,
=======
          entity_type:     'three_way_match',
          entity_id:       match.invoice_id,
          action:          'finance_head_match_approved',
          from_status:     INVOICE_STATUS.PENDING_FINANCE_HEAD,
          to_status:       INVOICE_STATUS.APPROVED,
          performed_by_id: user.id,
          remarks:         `Finance Head approved three-way matching. Remarks: ${remarks || 'None'}`,
          old_value:       { match_status: match.status, invoice_status: match.invoice?.status },
          new_value:       { match_review_status: ADMIN_REVIEW_STATUS.APPROVED, invoice_status: INVOICE_STATUS.APPROVED },
>>>>>>> origin/main
          ip_address:      req?.ip || null,
          user_agent:      req?.headers?.['user-agent'] || null,
        },
      });

<<<<<<< HEAD
      // Notify Team Lead
      const invoice = await tx.invoice.findUnique({ where: { id: match.invoice_id }, include: { vendor: true } });
      notificationService.notifyInvoiceNextLevel(invoice, 'TEAM_LEAD').catch(() => {});

      return { message: 'Matching report approved. Invoice forwarded to Team Lead.' };
    });
  }

=======
      // createPaymentApprovalForInvoice is idempotent:
      // If startMatching already created a PENDING approval for this invoice,
      // the idempotency guard returns the existing one without creating a duplicate.
      const paService = await getPaymentApprovalService();
      const approvalResult = await paService.createPaymentApprovalForInvoice(
        updatedInvoice,
        user,
        tx,
        match.id, // link to the match record
      );
      createdApproval      = approvalResult.approval;
      assignedApprover     = approvalResult.approver;
      approvalAlreadyExisted = approvalResult.alreadyExisted;

      notificationService.notifyInvoiceStatusChange(updatedInvoice, INVOICE_STATUS.APPROVED, user.role).catch(() => {});

      return { message: 'Matching report approved. Invoice is approved for payment.' };
    });

    // Only send the approval assignment notification if this is a NEW approval
    // (not one that was already created by startMatching).
    if (createdApproval && assignedApprover && !approvalAlreadyExisted) {
      const paService = await getPaymentApprovalService();
      paService.sendApprovalNotification(createdApproval, assignedApprover).catch(() => {});
    }

    return result;
  }


>>>>>>> origin/main
  // ────────────────────────────────────────────────────────────────────────────
  // ADMIN REJECT MATCHING
  // Admin rejects the match → Invoice returned to REJECTED with mismatch report
  // ────────────────────────────────────────────────────────────────────────────
  async adminRejectMatching(matchId, user, remarks, req = null) {
<<<<<<< HEAD
    if (user.role !== ROLES.SUPER_ADMIN) {
      throw new ApiError(403, 'Only Admins can reject matching reports.');
=======
    if (![ROLES.FINANCE_HEAD, ROLES.SUPER_ADMIN].includes(user.role)) {
      throw new ApiError(403, 'Only Finance Head can reject matching reports.');
>>>>>>> origin/main
    }

    if (!remarks?.trim()) {
      throw new ApiError(400, 'Remarks are required when rejecting a match.');
    }

    const match = await matchingRepository.findById(matchId);
    if (!match) throw new ApiError(404, 'Matching report not found.');

    if (match.admin_review_status !== ADMIN_REVIEW_STATUS.PENDING) {
      throw new ApiError(400, 'This matching report has already been reviewed.');
    }

    const now = new Date();

    return matchingRepository.transaction(async (tx) => {
      await tx.threeWayMatch.update({
        where: { id: matchId },
        data: {
          admin_review_status:  ADMIN_REVIEW_STATUS.REJECTED,
          admin_reviewed_by_id: user.id,
          admin_reviewed_at:    now,
          admin_remarks:        remarks,
        },
      });

      await tx.invoice.update({
        where: { id: match.invoice_id },
        data: {
          status:                INVOICE_STATUS.REJECTED,
          current_approval_level: null,
          admin_review_status:   ADMIN_REVIEW_STATUS.REJECTED,
          admin_reviewed_by_id:  user.id,
          admin_reviewed_at:     now,
          admin_remarks:         remarks,
          rejected_by_id:        user.id,
          rejected_at:           now,
          rejection_reason:      `Matching report rejected by Admin. ${remarks}`,
        },
      });

      await tx.auditLog.create({
        data: {
<<<<<<< HEAD
          entity_type:     'invoice',
          entity_id:       match.invoice_id,
          action:          'admin_review_rejected_from_match',
          from_status:     INVOICE_STATUS.PENDING_ADMIN_REVIEW,
          to_status:       INVOICE_STATUS.REJECTED,
          performed_by_id: user.id,
          remarks:         `Admin rejected matching report. Reason: ${remarks}`,
=======
          entity_type:     'three_way_match',
          entity_id:       match.invoice_id,
          action:          'finance_head_match_rejected',
          from_status:     INVOICE_STATUS.PENDING_FINANCE_HEAD,
          to_status:       INVOICE_STATUS.REJECTED,
          performed_by_id: user.id,
          remarks:         `Finance Head rejected matching report. Reason: ${remarks}`,
          old_value:       { match_status: match.status, invoice_status: match.invoice?.status },
          new_value:       { match_review_status: ADMIN_REVIEW_STATUS.REJECTED, invoice_status: INVOICE_STATUS.REJECTED, reason: remarks },
>>>>>>> origin/main
          ip_address:      req?.ip || null,
          user_agent:      req?.headers?.['user-agent'] || null,
        },
      });

      const invoice = await tx.invoice.findUnique({ where: { id: match.invoice_id }, include: { vendor: true } });
<<<<<<< HEAD
      notificationService.notifyInvoiceStatusChange(invoice, INVOICE_STATUS.REJECTED, 'Admin').catch(() => {});
=======
      notificationService.notifyInvoiceStatusChange(invoice, INVOICE_STATUS.REJECTED, user.role).catch(() => {});
>>>>>>> origin/main

      return {
        message: 'Matching report rejected. Invoice returned with mismatch report.',
        mismatch_report: match.unmatched_fields,
      };
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // GET GRNs for a Purchase Order (for Case Manager to select when starting match)
  // ────────────────────────────────────────────────────────────────────────────
<<<<<<< HEAD
  async getGRNsByPurchaseOrder(purchaseOrderId) {
    return prisma.goodsReceiptNote.findMany({
      where:   { purchase_order_id: purchaseOrderId },
      orderBy: { created_at: 'desc' },
=======
  async returnMatchingForCorrection(matchId, user, remarks, req = null) {
    if (![ROLES.FINANCE_HEAD, ROLES.SUPER_ADMIN].includes(user.role)) {
      throw new ApiError(403, 'Only Finance Head can return matching reports for correction.');
    }
    if (!remarks?.trim()) {
      throw new ApiError(400, 'Remarks are required when returning a match for correction.');
    }

    const match = await matchingRepository.findById(matchId);
    if (!match) throw new ApiError(404, 'Matching report not found.');
    if (match.admin_review_status !== ADMIN_REVIEW_STATUS.PENDING) {
      throw new ApiError(400, 'This matching report has already been reviewed.');
    }

    const now = new Date();
    return matchingRepository.transaction(async (tx) => {
      await tx.threeWayMatch.update({
        where: { id: matchId },
        data: {
          admin_review_status:  ADMIN_REVIEW_STATUS.RETURNED,
          admin_reviewed_by_id: user.id,
          admin_reviewed_at:    now,
          admin_remarks:        remarks,
        },
      });

      await tx.invoice.update({
        where: { id: match.invoice_id },
        data: {
          status:                 INVOICE_STATUS.PENDING_THREE_WAY_MATCH,
          current_approval_level: null,
          admin_review_status:    ADMIN_REVIEW_STATUS.RETURNED,
          admin_reviewed_by_id:   user.id,
          admin_reviewed_at:      now,
          admin_remarks:          remarks,
          matching_remarks:       remarks,
          updated_by_id:          user.id,
        },
      });

      await tx.auditLog.create({
        data: {
          entity_type:     'three_way_match',
          entity_id:       match.invoice_id,
          action:          'finance_head_match_returned',
          from_status:     INVOICE_STATUS.PENDING_FINANCE_HEAD,
          to_status:       INVOICE_STATUS.PENDING_THREE_WAY_MATCH,
          performed_by_id: user.id,
          remarks:         `Finance Head returned three-way matching for correction. Reason: ${remarks}`,
          old_value:       { match_status: match.status, invoice_status: match.invoice?.status },
          new_value:       { match_review_status: ADMIN_REVIEW_STATUS.RETURNED, invoice_status: INVOICE_STATUS.PENDING_THREE_WAY_MATCH, reason: remarks },
          ip_address:      req?.ip || null,
          user_agent:      req?.headers?.['user-agent'] || null,
        },
      });

      const invoice = await tx.invoice.findUnique({ where: { id: match.invoice_id }, include: { vendor: true } });
      notificationService.notifyInvoiceStatusChange(invoice, INVOICE_STATUS.PENDING_THREE_WAY_MATCH, user.role).catch(() => {});

      return { message: 'Matching report returned for correction.' };
    });
  }

  async getGRNsByPurchaseOrder(purchaseOrderId) {
    return prisma.goodsReceiptNote.findMany({
      where:   { purchase_order_id: purchaseOrderId, deleted_at: null },
      orderBy: { created_at: 'desc' },
      include: { items: true, delivery_challan: { select: { id: true, delivery_challan_number: true } } },
>>>>>>> origin/main
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // CREATE GRN (for when goods are received)
  // ────────────────────────────────────────────────────────────────────────────
  async createGRN(payload, user) {
<<<<<<< HEAD
    if (user.role !== ROLES.CASE_MANAGER) {
=======
    if (![ROLES.CASE_MANAGER, ROLES.SUPER_ADMIN].includes(user.role)) {
>>>>>>> origin/main
      throw new ApiError(403, 'Only Case Managers can create GRNs.');
    }

    const po = await prisma.purchaseOrder.findUnique({ where: { id: payload.purchaseOrderId }, include: { vendor: true } });
    if (!po) throw new ApiError(404, 'Purchase order not found.');
<<<<<<< HEAD

    const grnNumber = payload.grnNumber || `GRN-${Date.now()}`;

    return prisma.goodsReceiptNote.create({
=======
    const lineItems = resolvePurchaseOrderLineItems(po, payload.lineItems, 'GRN');
    const itemTotals = sumLineItems(lineItems);

    return prisma.$transaction(async (tx) => {
      const grnNumber = await nextNumber(tx, 'grn_number_seq', 'GRN');
      return tx.goodsReceiptNote.create({
>>>>>>> origin/main
      data: {
        grn_number:         grnNumber,
        vendor_id:          po.vendor_id,
        purchase_order_id:  payload.purchaseOrderId,
<<<<<<< HEAD
=======
        delivery_challan_id: payload.deliveryChallanId || null,
>>>>>>> origin/main
        created_by_id:      user.id,
        vendor_name:        po.vendor?.name        || '',
        vendor_code:        po.vendor?.vendor_code || '',
        gst_number:         po.vendor?.gst_number  || '',
        delivery_date:      payload.deliveryDate ? new Date(payload.deliveryDate) : null,
<<<<<<< HEAD
        delivery_challan_no: payload.deliveryChallanNo || null,
=======
        receipt_date:       payload.receiptDate ? new Date(payload.receiptDate) : payload.deliveryDate ? new Date(payload.deliveryDate) : null,
        delivery_challan_no: payload.deliveryChallanNo || null,
        receiver_name:      payload.receiverName || null,
        received_by:        payload.receivedBy || payload.receiverName || null,
        attachment_url:     payload.attachmentUrl || null,
        attachment_name:    payload.attachmentName || null,
>>>>>>> origin/main
        delivery_address:   payload.deliveryAddress || po.delivery_address || '',
        billing_address:    payload.billingAddress  || po.billing_address  || '',
        delivery_terms:     payload.deliveryTerms   || po.delivery_terms   || '',
        payment_terms:      payload.paymentTerms    || po.payment_terms    || '',
        currency:           payload.currency        || 'INR',
<<<<<<< HEAD
        subtotal:           payload.subtotal        || 0,
        gst_amount:         payload.gstAmount       || 0,
        discount:           payload.discount        || 0,
        total_amount:       payload.totalAmount     || 0,
        line_items:         payload.lineItems       || null,
=======
        subtotal:           payload.subtotal        || itemTotals.subtotal,
        gst_amount:         payload.gstAmount       || itemTotals.gstAmount,
        discount:           payload.discount        || 0,
        total_amount:       payload.totalAmount     || itemTotals.totalAmount,
        line_items:         lineItems,
        items: {
          create: lineItems.map((item) => {
            const normalized = normalizeReceiptItem(item, 'receivedQuantity');
            const receivedQuantity = Number(item.receivedQuantity ?? item.quantity ?? 0);
            const acceptedQuantity = Number(item.acceptedQuantity ?? receivedQuantity);
            const rejectedQuantity = Number(item.rejectedQuantity ?? Math.max(0, receivedQuantity - acceptedQuantity));
            return {
              ...normalized,
              purchase_order_id: payload.purchaseOrderId,
              received_quantity: receivedQuantity,
              accepted_quantity: acceptedQuantity,
              rejected_quantity: rejectedQuantity,
              remarks: item.remarks || null,
            };
          }),
        },
>>>>>>> origin/main
        remarks:            payload.remarks         || null,
        status:             'draft',
      },
    });
<<<<<<< HEAD
=======
    });
>>>>>>> origin/main
  }

  async updateGRN(grnId, payload, user) {
    const grn = await prisma.goodsReceiptNote.findUnique({ where: { id: grnId } });
<<<<<<< HEAD
    if (!grn) throw new ApiError(404, 'GRN not found.');

    if (grn.created_by_id !== user.id) {
      throw new ApiError(403, 'You can only update GRNs you created.');
    }
=======
    assertEditableByCreator(grn, user, 'GRN');
>>>>>>> origin/main

    const updateData = {};
    if (payload.deliveryDate    !== undefined) updateData.delivery_date      = new Date(payload.deliveryDate);
    if (payload.deliveryChallanNo !== undefined) updateData.delivery_challan_no = payload.deliveryChallanNo;
<<<<<<< HEAD
=======
    if (payload.deliveryChallanId !== undefined) updateData.delivery_challan_id = payload.deliveryChallanId || null;
    if (payload.receiverName    !== undefined) updateData.receiver_name      = payload.receiverName;
    if (payload.receivedBy       !== undefined) updateData.received_by        = payload.receivedBy;
    if (payload.receiptDate      !== undefined) updateData.receipt_date       = new Date(payload.receiptDate);
    if (payload.attachmentUrl    !== undefined) updateData.attachment_url     = payload.attachmentUrl;
    if (payload.attachmentName   !== undefined) updateData.attachment_name    = payload.attachmentName;
>>>>>>> origin/main
    if (payload.deliveryAddress !== undefined) updateData.delivery_address   = payload.deliveryAddress;
    if (payload.billingAddress  !== undefined) updateData.billing_address    = payload.billingAddress;
    if (payload.deliveryTerms   !== undefined) updateData.delivery_terms     = payload.deliveryTerms;
    if (payload.paymentTerms    !== undefined) updateData.payment_terms      = payload.paymentTerms;
    if (payload.subtotal        !== undefined) updateData.subtotal           = payload.subtotal;
    if (payload.gstAmount       !== undefined) updateData.gst_amount         = payload.gstAmount;
    if (payload.discount        !== undefined) updateData.discount           = payload.discount;
    if (payload.totalAmount     !== undefined) updateData.total_amount       = payload.totalAmount;
    if (payload.lineItems       !== undefined) updateData.line_items         = payload.lineItems;
    if (payload.remarks         !== undefined) updateData.remarks            = payload.remarks;
    if (payload.status          !== undefined) updateData.status             = payload.status;

<<<<<<< HEAD
    return prisma.goodsReceiptNote.update({ where: { id: grnId }, data: updateData });
=======
    return prisma.$transaction(async (tx) => {
      await assertNotMatched(tx, { grn_id: grnId }, 'GRN');
      if (payload.lineItems !== undefined) {
        await tx.goodsReceiptItem.deleteMany({ where: { goods_receipt_note_id: grnId } });
        updateData.items = {
          create: payload.lineItems.map((item) => {
            const normalized = normalizeReceiptItem(item, 'receivedQuantity');
            const receivedQuantity = Number(item.receivedQuantity ?? item.quantity ?? 0);
            const acceptedQuantity = Number(item.acceptedQuantity ?? receivedQuantity);
            const rejectedQuantity = Number(item.rejectedQuantity ?? Math.max(0, receivedQuantity - acceptedQuantity));
            return {
              ...normalized,
              purchase_order_id: grn.purchase_order_id,
              received_quantity: receivedQuantity,
              accepted_quantity: acceptedQuantity,
              rejected_quantity: rejectedQuantity,
              remarks: item.remarks || null,
            };
          }),
        };
      }
      return tx.goodsReceiptNote.update({ where: { id: grnId }, data: updateData, include: { items: true, vendor: true, purchase_order: true, delivery_challan: true } });
    });
  }

  async deleteGRN(grnId, user, reason = null) {
    const grn = await prisma.goodsReceiptNote.findUnique({ where: { id: grnId } });
    assertEditableByCreator(grn, user, 'GRN');
    return prisma.$transaction(async (tx) => {
      await assertNotMatched(tx, { grn_id: grnId }, 'GRN');
      return tx.goodsReceiptNote.update({
        where: { id: grnId },
        data: {
          status: 'rejected',
          deleted_at: new Date(),
          deleted_by_id: user.id,
          delete_reason: reason || 'Deleted before matching.',
        },
      });
    });
>>>>>>> origin/main
  }

  async getGRNById(grnId) {
    const grn = await prisma.goodsReceiptNote.findUnique({
      where:   { id: grnId },
      include: {
        vendor:        { select: { id: true, name: true, vendor_code: true } },
        purchase_order: { select: { id: true, po_number: true } },
        created_by:    { select: { id: true, first_name: true, last_name: true } },
      },
    });
    if (!grn) throw new ApiError(404, 'GRN not found.');
<<<<<<< HEAD
    return grn;
  }
=======
    if (grn.deleted_at) throw new ApiError(404, 'GRN not found.');
    return grn;
  }

  async getDeliveryChallansByPurchaseOrder(purchaseOrderId) {
    return prisma.deliveryChallan.findMany({
      where: { purchase_order_id: purchaseOrderId, deleted_at: null },
      orderBy: { created_at: 'desc' },
      include: { items: true },
    });
  }

  async createDeliveryChallan(payload, user) {
    if (![ROLES.CASE_MANAGER, ROLES.SUPER_ADMIN].includes(user.role)) {
      throw new ApiError(403, 'Only Case Managers can create Delivery Challans.');
    }

    const po = await prisma.purchaseOrder.findUnique({ where: { id: payload.purchaseOrderId }, include: { vendor: true } });
    if (!po) throw new ApiError(404, 'Purchase order not found.');
    if (po.deleted_at) throw new ApiError(400, 'Cannot create a Delivery Challan for a deleted Purchase Order.');
    if (po.status === 'cancelled') throw new ApiError(400, 'Cannot create a Delivery Challan for a cancelled Purchase Order.');
    const lineItems = resolvePurchaseOrderLineItems(po, payload.lineItems, 'Delivery Challan');
    const itemTotals = sumLineItems(lineItems);

    return prisma.$transaction(async (tx) => {
      const challanNumber = await nextNumber(tx, 'delivery_challan_number_seq', 'DC');
      return tx.deliveryChallan.create({
        data: {
          delivery_challan_number: challanNumber,
          vendor_id: po.vendor_id,
          purchase_order_id: payload.purchaseOrderId,
          created_by_id: user.id,
          vendor_name: po.vendor?.name || '',
          vendor_code: po.vendor?.vendor_code || '',
          gst_number: po.vendor?.gst_number || '',
          delivery_date: payload.deliveryDate ? new Date(payload.deliveryDate) : null,
          delivery_address: payload.deliveryAddress || po.delivery_address || null,
          transporter: payload.transporter || null,
          vehicle_number: payload.vehicleNumber || null,
          driver_name: payload.driverName || null,
          driver_contact: payload.driverContact || null,
          delivery_status: payload.deliveryStatus || 'CREATED',
          document_url: payload.documentUrl || null,
          document_name: payload.documentName || null,
          vehicle_details: payload.vehicleDetails || null,
          currency: payload.currency || po.currency || 'INR',
          subtotal: payload.subtotal || itemTotals.subtotal,
          gst_amount: payload.gstAmount || itemTotals.gstAmount,
          total_amount: payload.totalAmount || itemTotals.totalAmount,
          line_items: lineItems,
          items: {
            create: lineItems.map((item) => ({
              ...normalizeReceiptItem(item, 'deliveredQuantity'),
              purchase_order_id: payload.purchaseOrderId,
              delivered_quantity: Number(item.deliveredQuantity ?? item.quantity ?? 0),
              remarks: item.remarks || null,
            })),
          },
          remarks: payload.remarks || null,
          status: 'created',
        },
      });
    });
  }

  async updateDeliveryChallan(challanId, payload, user) {
    const challan = await prisma.deliveryChallan.findUnique({ where: { id: challanId } });
    assertEditableByCreator(challan, user, 'Delivery Challan');

    const updateData = {};
    if (payload.deliveryDate !== undefined) updateData.delivery_date = new Date(payload.deliveryDate);
    if (payload.deliveryAddress !== undefined) updateData.delivery_address = payload.deliveryAddress;
    if (payload.transporter !== undefined) updateData.transporter = payload.transporter;
    if (payload.vehicleNumber !== undefined) updateData.vehicle_number = payload.vehicleNumber;
    if (payload.driverName !== undefined) updateData.driver_name = payload.driverName;
    if (payload.driverContact !== undefined) updateData.driver_contact = payload.driverContact;
    if (payload.deliveryStatus !== undefined) updateData.delivery_status = payload.deliveryStatus;
    if (payload.documentUrl !== undefined) updateData.document_url = payload.documentUrl;
    if (payload.documentName !== undefined) updateData.document_name = payload.documentName;
    if (payload.vehicleDetails !== undefined) updateData.vehicle_details = payload.vehicleDetails;
    if (payload.subtotal !== undefined) updateData.subtotal = payload.subtotal;
    if (payload.gstAmount !== undefined) updateData.gst_amount = payload.gstAmount;
    if (payload.totalAmount !== undefined) updateData.total_amount = payload.totalAmount;
    if (payload.lineItems !== undefined) updateData.line_items = payload.lineItems;
    if (payload.remarks !== undefined) updateData.remarks = payload.remarks;
    if (payload.status !== undefined) updateData.status = payload.status;

    return prisma.$transaction(async (tx) => {
      await assertNotMatched(tx, { delivery_challan_id: challanId }, 'Delivery Challan');
      if (payload.lineItems !== undefined) {
        await tx.deliveryChallanItem.deleteMany({ where: { delivery_challan_id: challanId } });
        updateData.items = {
          create: payload.lineItems.map((item) => ({
            ...normalizeReceiptItem(item, 'deliveredQuantity'),
            purchase_order_id: challan.purchase_order_id,
            delivered_quantity: Number(item.deliveredQuantity ?? item.quantity ?? 0),
            remarks: item.remarks || null,
          })),
        };
      }
      return tx.deliveryChallan.update({ where: { id: challanId }, data: updateData, include: { items: true, vendor: true, purchase_order: true } });
    });
  }

  async deleteDeliveryChallan(challanId, user, reason = null) {
    const challan = await prisma.deliveryChallan.findUnique({ where: { id: challanId } });
    assertEditableByCreator(challan, user, 'Delivery Challan');
    return prisma.$transaction(async (tx) => {
      await assertNotMatched(tx, { delivery_challan_id: challanId }, 'Delivery Challan');
      return tx.deliveryChallan.update({
        where: { id: challanId },
        data: {
          status: 'cancelled',
          deleted_at: new Date(),
          deleted_by_id: user.id,
          delete_reason: reason || 'Deleted before matching.',
        },
      });
    });
  }

  async getDeliveryChallanById(challanId) {
    const challan = await prisma.deliveryChallan.findUnique({
      where: { id: challanId },
      include: {
        vendor: { select: { id: true, name: true, vendor_code: true } },
        purchase_order: { select: { id: true, po_number: true } },
        items: true,
        created_by: { select: { id: true, first_name: true, last_name: true } },
      },
    });
    if (!challan || challan.deleted_at) throw new ApiError(404, 'Delivery Challan not found.');
    return challan;
  }
>>>>>>> origin/main
}

export default new MatchingService();
