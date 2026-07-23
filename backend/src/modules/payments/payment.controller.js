import asyncHandler from '../../middleware/asyncHandler.middleware.js';
<<<<<<< HEAD
import paymentService, { PAYMENT_STATUS } from './payment.service.js';
=======
import paymentService from './payment.service.js';
>>>>>>> 870185c8e3ae31efe09445248cd7c7dc457a6b52

class PaymentController {
  createPayment = asyncHandler(async (req, res) => {
    const payment = await paymentService.createPayment(req.body, req.user);
    res.status(201).json({ success: true, message: 'Payment request created successfully.', data: payment });
  });

  updatePayment = asyncHandler(async (req, res) => {
    const payment = await paymentService.updatePayment(req.params.id, req.body, req.user);
    res.status(200).json({ success: true, message: 'Payment request updated successfully.', data: payment });
  });

  deletePayment = asyncHandler(async (req, res) => {
    await paymentService.deletePayment(req.params.id, req.user);
    res.status(200).json({ success: true, message: 'Payment request deleted successfully.' });
  });

  getPayments = asyncHandler(async (req, res) => {
    const result = await paymentService.listPayments(req.query, req.user);
    res.status(200).json({ success: true, ...result });
  });

  getPaymentById = asyncHandler(async (req, res) => {
    const payment = await paymentService.getPaymentById(req.params.id, req.user);
    res.status(200).json({ success: true, data: payment });
  });

  approvePayment = asyncHandler(async (req, res) => {
    const payment = await paymentService.approvePayment(req.params.id, req.user, req.body?.remarks);
<<<<<<< HEAD
    res.status(200).json({ success: true, message: 'Payment approved and processing initiated.', data: payment });
=======
    res.status(200).json({ success: true, message: 'Payment approved successfully.', data: payment });
>>>>>>> 870185c8e3ae31efe09445248cd7c7dc457a6b52
  });

  rejectPayment = asyncHandler(async (req, res) => {
    const payment = await paymentService.rejectPayment(req.params.id, req.user, req.body?.remarks);
    res.status(200).json({ success: true, message: 'Payment request rejected.', data: payment });
  });

<<<<<<< HEAD
=======
  returnPayment = asyncHandler(async (req, res) => {
    const payment = await paymentService.returnPaymentForCorrection(req.params.id, req.user, req.body?.remarks);
    res.status(200).json({ success: true, message: 'Payment request returned for correction.', data: payment });
  });

>>>>>>> 870185c8e3ae31efe09445248cd7c7dc457a6b52
  cancelPayment = asyncHandler(async (req, res) => {
    const payment = await paymentService.cancelPayment(req.params.id, req.user, req.body?.remarks);
    res.status(200).json({ success: true, message: 'Payment request cancelled successfully.', data: payment });
  });

  refundPayment = asyncHandler(async (req, res) => {
    const payment = await paymentService.refundPayment(req.params.id, req.user, req.body?.remarks);
    res.status(200).json({ success: true, message: 'Payment refunded successfully.', data: payment });
  });

  retryPayment = asyncHandler(async (req, res) => {
    const payment = await paymentService.retryPayment(req.params.id, req.user);
    res.status(200).json({ success: true, message: 'Payment retry initiated.', data: payment });
  });

  getPaymentHistory = asyncHandler(async (req, res) => {
    const history = await paymentService.getPaymentHistory(req.params.id);
    res.status(200).json({ success: true, data: history });
  });

  getPendingPayments = asyncHandler(async (req, res) => {
<<<<<<< HEAD
    const result = await paymentService.getPendingPayments(req.query);
=======
    const result = await paymentService.getPendingPayments(req.query, req.user);
>>>>>>> 870185c8e3ae31efe09445248cd7c7dc457a6b52
    res.status(200).json({ success: true, ...result });
  });

  getCompletedPayments = asyncHandler(async (req, res) => {
<<<<<<< HEAD
    const result = await paymentService.getCompletedPayments(req.query);
    res.status(200).json({ success: true, ...result });
  });
=======
    const result = await paymentService.getCompletedPayments(req.query, req.user);
    res.status(200).json({ success: true, ...result });
  });

  getPaymentStats = asyncHandler(async (req, res) => {
    const stats = await paymentService.getPaymentStats(req.user);
    res.status(200).json({ success: true, data: stats });
  });

  getPaymentCreationStats = asyncHandler(async (req, res) => {
    const stats = await paymentService.getPaymentCreationStats(req.user);
    res.status(200).json({ success: true, data: stats });
  });

  getEligibleInvoices = asyncHandler(async (req, res) => {
    const invoices = await paymentService.getEligibleInvoices(req.user);
    res.status(200).json({ success: true, data: invoices });
  });
>>>>>>> 870185c8e3ae31efe09445248cd7c7dc457a6b52
}

export default new PaymentController();
