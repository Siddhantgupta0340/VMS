import asyncHandler from '../../middleware/asyncHandler.middleware.js';
import invoiceService from './invoice.service.js';

class InvoiceController {
  createInvoice = asyncHandler(async (req, res) => {
    const invoice = await invoiceService.createInvoice(req.body, req.user);
    res.status(201).json({ success: true, message: 'Invoice created successfully.', data: invoice });
  });

  getInvoices = asyncHandler(async (req, res) => {
    const result = await invoiceService.listInvoices(req.query, req.user);
    res.status(200).json({ success: true, ...result });
  });

  getInvoiceById = asyncHandler(async (req, res) => {
    const invoice = await invoiceService.getInvoiceById(req.params.id, req.user);
    res.status(200).json({ success: true, data: invoice });
  });

  approveInvoice = asyncHandler(async (req, res) => {
    const { remarks } = req.body;
    const invoice = await invoiceService.approveInvoice(req.params.id, req.user, remarks);
    res.status(200).json({ success: true, message: 'Invoice approved at current level successfully.', data: invoice });
  });

  rejectInvoice = asyncHandler(async (req, res) => {
    const { rejectionReason, remarks } = req.body;
    const reason = (rejectionReason || remarks || '').trim();

    if (process.env.NODE_ENV !== 'production') {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('[Controller] rejectInvoice — Received rejection reason');
      console.log(`  Params ID       : ${req.params.id}`);
      console.log(`  User            : ${JSON.stringify(req.user, null, 2)}`);
      console.log(`  Rejection Reason: "${reason}"`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }

    const invoice = await invoiceService.rejectInvoice(req.params.id, req.user, reason);
    res.status(200).json({ success: true, message: 'Invoice rejected successfully.', data: invoice });
  });

  cancelInvoice = asyncHandler(async (req, res) => {
    const invoice = await invoiceService.cancelInvoice(req.params.id, req.user);
    res.status(200).json({ success: true, message: 'Invoice cancelled successfully.', data: invoice });
  });

  getPendingL1 = asyncHandler(async (req, res) => {
    const result = await invoiceService.getPendingL1(req.query);
    res.status(200).json({ success: true, ...result });
  });

  getPendingL2 = asyncHandler(async (req, res) => {
    const result = await invoiceService.getPendingL2(req.query);
    res.status(200).json({ success: true, ...result });
  });

  getPendingL3 = asyncHandler(async (req, res) => {
    const result = await invoiceService.getPendingL3(req.query);
    res.status(200).json({ success: true, ...result });
  });

  getApprovalHistory = asyncHandler(async (req, res) => {
    const history = await invoiceService.getApprovalHistory(req.params.id);
    res.status(200).json({ success: true, data: history });
  });

  getMyApprovedInvoices = asyncHandler(async (req, res) => {
    const result = await invoiceService.getMyApprovedInvoices(req.query, req.user);
    res.status(200).json({ success: true, ...result });
  });

  getMyPendingInvoices = asyncHandler(async (req, res) => {
    const result = await invoiceService.getMyPendingInvoices(req.query, req.user);
    res.status(200).json({ success: true, ...result });
  });
}

export default new InvoiceController();
