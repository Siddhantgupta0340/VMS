import asyncHandler from '../../middleware/asyncHandler.middleware.js';
import invoiceService from './invoice.service.js';
import { generateInvoicePdf } from './invoice.pdf.js';
import { COMPANY_CONFIG } from '../../config/company.js';
import ApiError from '../../utils/ApiError.js';


class InvoiceController {
  // ─── Create ────────────────────────────────────────────────────────────────
  createInvoice = asyncHandler(async (req, res) => {
    const invoice = await invoiceService.createInvoice(req.body, req.user, req);
    res.status(201).json({ success: true, message: 'Invoice created successfully.', data: invoice });
  });

  // ─── List & Get ────────────────────────────────────────────────────────────
  getApprovedPurchaseOrdersForInvoice = asyncHandler(async (req, res) => {
    console.debug("[InvoiceController] getApprovedPurchaseOrdersForInvoice request received", {
      jwtUser: req.user ? { id: req.user.id, role: req.user.role } : null,
      requestParameters: req.query
    });
    const purchaseOrders = await invoiceService.getApprovedPurchaseOrdersForInvoice(req.query, req.user);
    console.debug("[InvoiceController] purchaseOrders returned count", { count: purchaseOrders.length });
    res.status(200).json({ success: true, purchaseOrders });
  });

  getInvoices = asyncHandler(async (req, res) => {
    const result = await invoiceService.listInvoices(req.query, req.user);
    res.status(200).json({ success: true, ...result });
  });

  getInvoiceById = asyncHandler(async (req, res) => {
    const invoice = await invoiceService.getInvoiceById(req.params.id, req.user);
    res.status(200).json({ success: true, data: invoice });
  });

  // ─── Role-Level Approval ───────────────────────────────────────────────────
  approveInvoice = asyncHandler(async (req, res) => {
    const { remarks } = req.body || {};
    const invoice = await invoiceService.approveInvoice(req.params.id, req.user, remarks, req);
    res.status(200).json({ success: true, message: 'Invoice approved at current level.', data: invoice });
  });

  rejectInvoice = asyncHandler(async (req, res) => {
    const { rejectionReason, remarks } = req.body || {};
    const reason = (rejectionReason || remarks || '').trim();
    const invoice = await invoiceService.rejectInvoice(req.params.id, req.user, reason, req);
    res.status(200).json({ success: true, message: 'Invoice rejected.', data: invoice });
  });

  cancelInvoice = asyncHandler(async (req, res) => {
    const invoice = await invoiceService.cancelInvoice(req.params.id, req.user, req);
    res.status(200).json({ success: true, message: 'Invoice cancelled.', data: invoice });
  });

  // ─── Admin Review ──────────────────────────────────────────────────────────
  adminApproveInvoice = asyncHandler(async (req, res) => {
    const { remarks } = req.body || {};
    const invoice = await invoiceService.adminApproveInvoice(req.params.id, req.user, remarks, req);
    res.status(200).json({ success: true, message: 'Admin Review approved. Invoice forwarded to Team Lead.', data: invoice });
  });

  adminRejectInvoice = asyncHandler(async (req, res) => {
    const { remarks } = req.body || {};
    const invoice = await invoiceService.adminRejectInvoice(req.params.id, req.user, remarks, req);
    res.status(200).json({ success: true, message: 'Admin Review rejected. Invoice returned.', data: invoice });
  });

  // ─── Soft Delete & Restore ─────────────────────────────────────────────────
  softDeleteInvoice = asyncHandler(async (req, res) => {
    const { deleteReason } = req.body || {};
    const result = await invoiceService.softDeleteInvoice(req.params.id, req.user, deleteReason, req);
    res.status(200).json({ success: true, ...result });
  });

  restoreInvoice = asyncHandler(async (req, res) => {
    const result = await invoiceService.restoreInvoice(req.params.id, req.user, req);
    res.status(200).json({ success: true, ...result });
  });

  // ─── Pending Queues ────────────────────────────────────────────────────────
  getPendingThreeWayMatch = asyncHandler(async (req, res) => {
    const result = await invoiceService.getPendingThreeWayMatch(req.query);
    res.status(200).json({ success: true, ...result });
  });

  getPendingAdminReview = asyncHandler(async (req, res) => {
    const result = await invoiceService.getPendingAdminReview(req.query);
    res.status(200).json({ success: true, ...result });
  });

  getPendingTeamLead = asyncHandler(async (req, res) => {
    const result = await invoiceService.getPendingTeamLead(req.query);
    res.status(200).json({ success: true, ...result });
  });

  getPendingManager = asyncHandler(async (req, res) => {
    const result = await invoiceService.getPendingManager(req.query);
    res.status(200).json({ success: true, ...result });
  });

  getPendingFinanceHead = asyncHandler(async (req, res) => {
    const result = await invoiceService.getPendingFinanceHead(req.query);
    res.status(200).json({ success: true, ...result });
  });

  // ─── History ───────────────────────────────────────────────────────────────
  getApprovalHistory = asyncHandler(async (req, res) => {
    const history = await invoiceService.getApprovalHistory(req.params.id);
    res.status(200).json({ success: true, data: history });
  });

  // ─── My Invoices ───────────────────────────────────────────────────────────
  getMyApprovedInvoices = asyncHandler(async (req, res) => {
    const result = await invoiceService.getMyApprovedInvoices(req.query, req.user);
    res.status(200).json({ success: true, ...result });
  });

  getMyPendingInvoices = asyncHandler(async (req, res) => {
    const result = await invoiceService.getMyPendingInvoices(req.query, req.user);
    res.status(200).json({ success: true, ...result });
  });

  // ─── Finance Head Observation ─────────────────────────────────────────────
  getFinanceHeadObservation = asyncHandler(async (req, res) => {
    const result = await invoiceService.getFinanceHeadObservationDashboard(req.query);
    res.status(200).json({ success: true, ...result });
  });

  addFinanceHeadRemark = asyncHandler(async (req, res) => {
    const { remark } = req.body || {};
    const result = await invoiceService.addFinanceHeadRemark(req.params.id, req.user, remark, req);
    res.status(200).json({ success: true, ...result });
  });

  downloadInvoicePdf = asyncHandler(async (req, res) => {
    const invoice = await invoiceService.downloadInvoicePdf(req.params.id, req.user, req);

    if (!invoice) {
      throw new ApiError(404, 'Invoice not found.');
    }

    let pdfBuffer;
    try {
      pdfBuffer = await generateInvoicePdf(invoice, COMPANY_CONFIG);
    } catch (pdfError) {
      console.error('[Invoice PDF] Generation failed:', pdfError);
      throw new ApiError(500, 'PDF generation failed. Please try again.');
    }

    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new ApiError(500, 'PDF generation produced an empty document. Please contact support.');
    }

    const safeNumber = String(invoice.invoice_number || invoice.invoiceNumber || 'INV-2026-000001').replace(/[/\\?%*:|"<>]/g, '_');
    const filename = `${safeNumber}.pdf`;

    res.set({
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length':      pdfBuffer.length,
      'Cache-Control':       'no-cache, no-store, must-revalidate',
      'Pragma':              'no-cache',
      'Expires':             '0',
    });

    res.end(pdfBuffer);
  });
}

export default new InvoiceController();

