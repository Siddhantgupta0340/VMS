import ApiError from '../../utils/ApiError.js';
import matchingRepository from './matching.repository.js';
import notificationService from '../notifications/notification.service.js';
import { ROLES } from '../../zodSchema/index.js';
import {
  INVOICE_STATUS,
  THREE_WAY_MATCH_STATUS,
  ADMIN_REVIEW_STATUS,
} from '../../utils/approval-helper.js';
import prisma from '../../config/prisma.js';

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
  async startMatching(invoiceId, grnId, user, req = null) {
    if (user.role !== ROLES.CASE_MANAGER && user.role !== ROLES.SUPER_ADMIN) {
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
      const match = await tx.threeWayMatch.create({
        data: {
          invoice_id:              invoiceId,
          purchase_order_id:       invoice.purchase_order_id,
          grn_id:                  grnId || null,
          status:                  comparison.overall_status,
          match_percentage:        comparison.match_percentage,
          matched_fields_count:    comparison.matched_fields_count,
          total_fields_count:      comparison.total_fields_count,
          matched_fields:          comparison.matched_fields,
          unmatched_fields:        comparison.unmatched_fields,
          warnings:                comparison.warnings,
          approval_recommendation: comparison.approval_recommendation,
          po_snapshot:             poData,
          grn_snapshot:            grnData,
          invoice_snapshot:        invoiceData,
          completed_by_id:         user.id,
          completed_at:            now,
          admin_review_status:     ADMIN_REVIEW_STATUS.PENDING,
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
          // Move to Admin Review
          status:                      INVOICE_STATUS.PENDING_ADMIN_REVIEW,
          admin_review_status:         ADMIN_REVIEW_STATUS.PENDING,
        },
      });

      // Write audit log
      await tx.auditLog.create({
        data: {
          entity_type:     'invoice',
          entity_id:       invoiceId,
          action:          'three_way_match_completed',
          from_status:     INVOICE_STATUS.PENDING_THREE_WAY_MATCH,
          to_status:       INVOICE_STATUS.PENDING_ADMIN_REVIEW,
          performed_by_id: user.id,
          remarks:         `Three-Way Matching: ${comparison.overall_status}. Match: ${comparison.match_percentage}%. Unmatched fields: ${comparison.unmatched_fields.map(f => f.label).join(', ') || 'None'}`,
          ip_address:      req?.ip || null,
          user_agent:      req?.headers?.['user-agent'] || null,
        },
      });

      // Notify Admin
      notificationService.notifyMatchingCompleted(invoice, comparison.overall_status, comparison.match_percentage).catch(() => {});

      return {
        match,
        comparison,
        message: `Three-Way Matching ${comparison.overall_status}. Match percentage: ${comparison.match_percentage}%`,
      };
    });
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

    const where = {
      ...(query.status     && { status:     query.status }),
      ...(query.invoiceId  && { invoice_id: query.invoiceId }),
    };

    const result = await matchingRepository.findAll({ where, skip: (page - 1) * limit, take: limit });
    return { ...result, page, limit, totalPages: Math.ceil(result.total / limit) };
  }

  // ────────────────────────────────────────────────────────────────────────────
  // ADMIN APPROVE MATCHING
  // Admin reviews the match report and approves it → Invoice moves to PENDING_TEAM_LEAD
  // ────────────────────────────────────────────────────────────────────────────
  async adminApproveMatching(matchId, user, remarks, req = null) {
    if (user.role !== ROLES.SUPER_ADMIN) {
      throw new ApiError(403, 'Only Admins can approve matching reports.');
    }

    const match = await matchingRepository.findById(matchId);
    if (!match) throw new ApiError(404, 'Matching report not found.');

    if (match.admin_review_status !== ADMIN_REVIEW_STATUS.PENDING) {
      throw new ApiError(400, 'This matching report has already been reviewed.');
    }

    const now = new Date();

    return matchingRepository.transaction(async (tx) => {
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

      // Move invoice to Team Lead
      await tx.invoice.update({
        where: { id: match.invoice_id },
        data: {
          status:                INVOICE_STATUS.PENDING_TEAM_LEAD,
          current_approval_level: 'TEAM_LEAD',
          admin_review_status:   ADMIN_REVIEW_STATUS.APPROVED,
          admin_reviewed_by_id:  user.id,
          admin_reviewed_at:     now,
          admin_remarks:         remarks || '',
        },
      });

      // Write audit log
      await tx.auditLog.create({
        data: {
          entity_type:     'invoice',
          entity_id:       match.invoice_id,
          action:          'admin_review_approved_from_match',
          from_status:     INVOICE_STATUS.PENDING_ADMIN_REVIEW,
          to_status:       INVOICE_STATUS.PENDING_TEAM_LEAD,
          performed_by_id: user.id,
          remarks:         `Admin approved matching report. Remarks: ${remarks || 'None'}`,
          ip_address:      req?.ip || null,
          user_agent:      req?.headers?.['user-agent'] || null,
        },
      });

      // Notify Team Lead
      const invoice = await tx.invoice.findUnique({ where: { id: match.invoice_id }, include: { vendor: true } });
      notificationService.notifyInvoiceNextLevel(invoice, 'TEAM_LEAD').catch(() => {});

      return { message: 'Matching report approved. Invoice forwarded to Team Lead.' };
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // ADMIN REJECT MATCHING
  // Admin rejects the match → Invoice returned to REJECTED with mismatch report
  // ────────────────────────────────────────────────────────────────────────────
  async adminRejectMatching(matchId, user, remarks, req = null) {
    if (user.role !== ROLES.SUPER_ADMIN) {
      throw new ApiError(403, 'Only Admins can reject matching reports.');
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
          entity_type:     'invoice',
          entity_id:       match.invoice_id,
          action:          'admin_review_rejected_from_match',
          from_status:     INVOICE_STATUS.PENDING_ADMIN_REVIEW,
          to_status:       INVOICE_STATUS.REJECTED,
          performed_by_id: user.id,
          remarks:         `Admin rejected matching report. Reason: ${remarks}`,
          ip_address:      req?.ip || null,
          user_agent:      req?.headers?.['user-agent'] || null,
        },
      });

      const invoice = await tx.invoice.findUnique({ where: { id: match.invoice_id }, include: { vendor: true } });
      notificationService.notifyInvoiceStatusChange(invoice, INVOICE_STATUS.REJECTED, 'Admin').catch(() => {});

      return {
        message: 'Matching report rejected. Invoice returned with mismatch report.',
        mismatch_report: match.unmatched_fields,
      };
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // GET GRNs for a Purchase Order (for Case Manager to select when starting match)
  // ────────────────────────────────────────────────────────────────────────────
  async getGRNsByPurchaseOrder(purchaseOrderId) {
    return prisma.goodsReceiptNote.findMany({
      where:   { purchase_order_id: purchaseOrderId },
      orderBy: { created_at: 'desc' },
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // CREATE GRN (for when goods are received)
  // ────────────────────────────────────────────────────────────────────────────
  async createGRN(payload, user) {
    if (![ROLES.CASE_MANAGER, ROLES.SUPER_ADMIN].includes(user.role)) {
      throw new ApiError(403, 'Only Case Managers can create GRNs.');
    }

    const po = await prisma.purchaseOrder.findUnique({ where: { id: payload.purchaseOrderId }, include: { vendor: true } });
    if (!po) throw new ApiError(404, 'Purchase order not found.');

    const grnNumber = payload.grnNumber || `GRN-${Date.now()}`;

    return prisma.goodsReceiptNote.create({
      data: {
        grn_number:         grnNumber,
        vendor_id:          po.vendor_id,
        purchase_order_id:  payload.purchaseOrderId,
        created_by_id:      user.id,
        vendor_name:        po.vendor?.name        || '',
        vendor_code:        po.vendor?.vendor_code || '',
        gst_number:         po.vendor?.gst_number  || '',
        delivery_date:      payload.deliveryDate ? new Date(payload.deliveryDate) : null,
        delivery_challan_no: payload.deliveryChallanNo || null,
        delivery_address:   payload.deliveryAddress || po.delivery_address || '',
        billing_address:    payload.billingAddress  || po.billing_address  || '',
        delivery_terms:     payload.deliveryTerms   || po.delivery_terms   || '',
        payment_terms:      payload.paymentTerms    || po.payment_terms    || '',
        currency:           payload.currency        || 'INR',
        subtotal:           payload.subtotal        || 0,
        gst_amount:         payload.gstAmount       || 0,
        discount:           payload.discount        || 0,
        total_amount:       payload.totalAmount     || 0,
        line_items:         payload.lineItems       || null,
        remarks:            payload.remarks         || null,
        status:             'draft',
      },
    });
  }

  async updateGRN(grnId, payload, user) {
    const grn = await prisma.goodsReceiptNote.findUnique({ where: { id: grnId } });
    if (!grn) throw new ApiError(404, 'GRN not found.');

    if (user.role !== ROLES.SUPER_ADMIN && grn.created_by_id !== user.id) {
      throw new ApiError(403, 'You can only update GRNs you created.');
    }

    const updateData = {};
    if (payload.deliveryDate    !== undefined) updateData.delivery_date      = new Date(payload.deliveryDate);
    if (payload.deliveryChallanNo !== undefined) updateData.delivery_challan_no = payload.deliveryChallanNo;
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

    return prisma.goodsReceiptNote.update({ where: { id: grnId }, data: updateData });
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
    return grn;
  }
}

export default new MatchingService();
