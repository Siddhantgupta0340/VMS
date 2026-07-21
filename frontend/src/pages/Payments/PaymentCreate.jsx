import { ArrowLeft, Search, AlertCircle, CheckCircle, FileText, User, ShoppingBag, Receipt, Truck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { getInvoices } from "../../services/invoiceService";
import { createPayment } from "../../services/paymentService";
import { toast } from "sonner";
import { RequiredLabel, ValidationSummary } from "../../components/common/FormValidation";
import { fieldErrorClass, focusValidationField, validateRequiredFields } from "../../utils/validationMatrix";

const input = "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

const PaymentCreate = () => {
  const navigate = useNavigate();    
  const [approvedInvoices, setApprovedInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [validationErrors, setValidationErrors] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    invoiceId: "",
    paymentMethod: "",
    amount: "",
    referenceNo: "",
    notes: "",
  });

  const errorsByField = validationErrors.reduce((acc, error) => ({ ...acc, [error.field]: error.message }), {});
  const selectedInvoice = approvedInvoices.find((invoice) => invoice.id === formData.invoiceId);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const invoices = await getInvoices();
      // Filter for approved and unpaid/partially paid invoices (case-insensitive)
      const approved = invoices.filter((i) => {
        const statusUpper = (i.status || "").toUpperCase();
        const payStatusUpper = (i.paymentStatus || "").toUpperCase();
        return statusUpper === "APPROVED" && (payStatusUpper === "UNPAID" || payStatusUpper === "PARTIALLY_PAID");
      });
      setApprovedInvoices(approved);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load approved invoices list");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === "invoiceId") {
      const selected = approvedInvoices.find((i) => i.id === value);
      setFormData((prev) => ({
        ...prev,
        invoiceId: value,
        amount: selected ? String(selected.outstandingAmount || selected.invoiceTotal || selected.amount || "") : "",
      }));
      setValidationErrors([]);
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // Filter approved invoices dynamically by search term
  const filteredInvoices = approvedInvoices.filter((inv) => {
    const query = searchTerm.toLowerCase();
    return (
      (inv.invoiceNumber || "").toLowerCase().includes(query) ||
      (inv.vendor || "").toLowerCase().includes(query) ||
      (inv.vendorCode || "").toLowerCase().includes(query) ||
      (inv.poNumber || "").toLowerCase().includes(query)
    );
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedInvoice) {
      toast.error("Please select a valid invoice first.");
      return;
    }

    // 1. Verify Three-Way Matching Status
    const matchStatus = (selectedInvoice.threeWayMatchStatus || "").toUpperCase();
    if (matchStatus !== "MATCHED") {
      toast.error(`Payment blocked: Three-Way Matching status is ${selectedInvoice.threeWayMatchStatus || "UNMATCHED"}.`);
      return;
    }

    // 2. Verify Vendor Bank Details
    const missingBankFields = [];
    if (!selectedInvoice.vendorBankName) missingBankFields.push("Bank Name");
    if (!selectedInvoice.vendorAccountHolder) missingBankFields.push("Account Holder");
    if (!selectedInvoice.vendorBankAccountNo) missingBankFields.push("Account Number");
    if (!selectedInvoice.vendorIfscCode) missingBankFields.push("IFSC Code");

    if (missingBankFields.length > 0) {
      toast.error("Payment cannot be recorded: Vendor bank information is incomplete. Please complete the Vendor Master before creating payment.");
      setValidationErrors([
        {
          field: "invoiceId",
          message: "Vendor information is incomplete. Please complete the Vendor Master before creating payment.",
        },
      ]);
      return;
    }

    // 3. Amount Validations
    const payAmount = Number(formData.amount);
    const limit = Number(selectedInvoice.outstandingAmount || selectedInvoice.invoiceTotal || selectedInvoice.amount || 0);

    if (isNaN(payAmount) || payAmount <= 0) {
      toast.error("Payment amount must be a positive number greater than zero.");
      return;
    }

    if (payAmount > limit) {
      toast.error(`Payment amount cannot exceed the remaining payable amount of ₹ ${limit.toLocaleString('en-IN')}.`);
      return;
    }

    const errors = validateRequiredFields("payment", formData);
    if (errors.length) {
      setValidationErrors(errors);
      toast.error("Please fill in all required fields.");
      window.setTimeout(() => focusValidationField(errors[0].field), 0);
      return;
    }

    try {
      const payload = {
        invoiceId: formData.invoiceId,
        amount: payAmount,
        currency: "INR",
        paymentMethod: formData.paymentMethod,
        referenceNo: formData.referenceNo,
        notes: formData.notes,
      };
      await createPayment(payload);
      toast.success("Payment request created successfully!");
      navigate("/payments");
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to record payment");
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="text-slate-500 font-medium">Loading Approved Invoices...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/payments">
          <button className="rounded-lg p-2 hover:bg-slate-100 transition">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Create Payment</h1>
          <p className="mt-1 text-slate-500">Record a new vendor payment payout request from approved invoices</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Form Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <ValidationSummary
              title="Cannot record Payment."
              errors={validationErrors}
              onSelect={(field) => focusValidationField(field)}
            />
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h2 className="mb-4 text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <FileText className="text-blue-600" size={20} /> Select Invoice
                </h2>
                
                {/* Search Input */}
                <div className="relative mb-4">
                  <Search size={18} className="absolute left-4 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by Invoice No, Vendor Name/Code, or PO Number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50/50 pl-12 pr-4 py-3 outline-none transition focus:border-blue-600 focus:bg-white"
                  />
                </div>

                <RequiredLabel>Invoice Number</RequiredLabel>
                <select
                  name="invoiceId"
                  value={formData.invoiceId}
                  onChange={handleChange}
                  className={`${input} ${fieldErrorClass(errorsByField.invoiceId)}`}
                  required
                >
                  <option value="">Select Approved Invoice</option>
                  {filteredInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} — {inv.vendor} (Remaining: ₹ {Number(inv.outstandingAmount || inv.invoiceTotal).toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
                {filteredInvoices.length === 0 && searchTerm && (
                  <p className="text-xs text-rose-500 mt-1">No matching approved invoices found.</p>
                )}
              </div>

              {selectedInvoice && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <RequiredLabel>Amount to Pay (INR)</RequiredLabel>
                    <input
                      type="number"
                      name="amount"
                      value={formData.amount}
                      onChange={handleChange}
                      placeholder="0.00"
                      max={selectedInvoice.outstandingAmount || selectedInvoice.invoiceTotal}
                      className={`${input} ${fieldErrorClass(errorsByField.amount)}`}
                      required
                    />
                    <span className="text-xs text-slate-500 mt-1 block">
                      Max Remaining Payable Amount: <strong>₹ {Number(selectedInvoice.outstandingAmount || selectedInvoice.invoiceTotal).toLocaleString('en-IN')}</strong>
                    </span>
                  </div>

                  <div>
                    <RequiredLabel>Payment Method</RequiredLabel>
                    <select
                      name="paymentMethod"
                      value={formData.paymentMethod}
                      onChange={handleChange}
                      className={`${input} ${fieldErrorClass(errorsByField.paymentMethod)}`}
                      required
                    >
                      <option value="">Select Payment Method</option>
                      <option value="NEFT">NEFT</option>
                      <option value="RTGS">RTGS</option>
                      <option value="UPI">UPI</option>
                      <option value="CHEQUE">CHEQUE</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Reference / Transaction ID (Cheque / UTR No.)
                    </label>
                    <input
                      type="text"
                      name="referenceNo"
                      value={formData.referenceNo}
                      onChange={handleChange}
                      placeholder="e.g. UTR123456789 or Cheque reference"
                      className={input}
                    />
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Remarks / Additional Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Record any remarks for this payment payout request"
                  rows="3"
                  className={`${input} resize-none`}
                />
              </div>

              {/* Submit / Action buttons */}
              <div className="flex gap-4 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={!selectedInvoice || (selectedInvoice.threeWayMatchStatus || "").toUpperCase() !== "MATCHED"}
                  className="flex-1 rounded-lg bg-blue-600 py-3 text-center font-medium text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Record Payment Payout
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/payments")}
                  className="flex-1 rounded-lg border border-slate-300 py-3 text-center font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Selected Invoice Details Column */}
        <div className="space-y-6">
          {selectedInvoice ? (
            <>
              {/* Validation Cards */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <h3 className="font-semibold text-slate-900 text-sm uppercase tracking-wider text-slate-500">Validation Checks</h3>
                
                {/* 3-Way Matching Check */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                  {(selectedInvoice.threeWayMatchStatus || "").toUpperCase() === "MATCHED" ? (
                    <CheckCircle className="text-emerald-600 mt-0.5" size={18} />
                  ) : (
                    <AlertCircle className="text-rose-600 mt-0.5" size={18} />
                  )}
                  <div>
                    <span className="block text-sm font-medium text-slate-900">Three-Way Matching Status</span>
                    <strong className={`text-xs uppercase px-2 py-0.5 rounded-full inline-block mt-1 ${
                      (selectedInvoice.threeWayMatchStatus || "").toUpperCase() === "MATCHED" 
                        ? "bg-emerald-100 text-emerald-800" 
                        : "bg-rose-100 text-rose-800"
                    }`}>
                      {selectedInvoice.threeWayMatchStatus || "UNMATCHED"}
                    </strong>
                    {(selectedInvoice.threeWayMatchStatus || "").toUpperCase() !== "MATCHED" && (
                      <p className="text-xs text-rose-600 mt-1.5 font-medium">
                        Payment blocked. Three-Way Matching must be MATCHED.
                      </p>
                    )}
                  </div>
                </div>

                {/* Bank Check */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                  {selectedInvoice.vendorBankAccountNo ? (
                    <CheckCircle className="text-emerald-600 mt-0.5" size={18} />
                  ) : (
                    <AlertCircle className="text-rose-600 mt-0.5" size={18} />
                  )}
                  <div>
                    <span className="block text-sm font-medium text-slate-900">Vendor Bank Details</span>
                    <span className="text-xs text-slate-500 mt-0.5 block">
                      {selectedInvoice.vendorBankAccountNo 
                        ? `Bank Master complete.` 
                        : "Vendor information is incomplete. Please complete the Vendor Master before creating payment."
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <h3 className="font-semibold text-slate-900 text-sm uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Receipt size={16} /> Invoice Summary
                </h3>
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Invoice Number:</span>
                    <strong className="text-slate-800">{selectedInvoice.invoiceNumber}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Invoice Date:</span>
                    <span className="text-slate-800">{selectedInvoice.invoiceDate ? new Date(selectedInvoice.invoiceDate).toLocaleDateString() : "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Due Date:</span>
                    <span className="text-slate-800">{selectedInvoice.dueDate ? new Date(selectedInvoice.dueDate).toLocaleDateString() : "-"}</span>
                  </div>
                  <hr className="border-slate-100" />
                  <div className="flex justify-between">
                    <span className="text-slate-500">Invoice Total:</span>
                    <span className="font-medium text-slate-900">₹ {Number(selectedInvoice.invoiceTotal || selectedInvoice.amount).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Paid Till Date:</span>
                    <span className="text-slate-600">₹ {Number(selectedInvoice.paidAmount || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <hr className="border-slate-100" />
                  <div className="flex justify-between bg-blue-50/50 p-2 rounded-lg">
                    <span className="text-blue-900 font-semibold">Remaining Payable:</span>
                    <span className="font-bold text-blue-900">₹ {Number(selectedInvoice.outstandingAmount || selectedInvoice.invoiceTotal).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Vendor Bank Panel */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <h3 className="font-semibold text-slate-900 text-sm uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <User size={16} /> Vendor & Bank Info
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="block text-xs text-slate-400">Vendor Name & Code:</span>
                    <strong className="text-slate-800">{selectedInvoice.vendor} ({selectedInvoice.vendorCode || "N/A"})</strong>
                  </div>
                  <div>
                    <span className="block text-xs text-slate-400">GST Registration No:</span>
                    <span className="text-slate-700">{selectedInvoice.gstNumber || "N/A"}</span>
                  </div>
                  <hr className="border-slate-100" />
                  <div>
                    <span className="block text-xs text-slate-400">Bank Name:</span>
                    <strong className="text-slate-800">{selectedInvoice.vendorBankName || "-"}</strong>
                  </div>
                  <div>
                    <span className="block text-xs text-slate-400">Account Number:</span>
                    <strong className="text-slate-800">{selectedInvoice.vendorBankAccountNo || "-"}</strong>
                  </div>
                  <div>
                    <span className="block text-xs text-slate-400">IFSC & Branch:</span>
                    <span className="text-slate-700">{selectedInvoice.vendorIfscCode} — {selectedInvoice.vendorBankBranch || "-"}</span>
                  </div>
                </div>
              </div>

              {/* Purchase Order & DC Panel */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <h3 className="font-semibold text-slate-900 text-sm uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <ShoppingBag size={16} /> PO & Receipts
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <div>
                      <span className="block text-xs text-slate-400">PO Number:</span>
                      <strong className="text-slate-800">{selectedInvoice.poNumber || "-"}</strong>
                    </div>
                    <div className="text-right">
                      <span className="block text-xs text-slate-400">PO Total:</span>
                      <strong className="text-slate-800">₹ {Number(selectedInvoice.purchaseOrderAmount || 0).toLocaleString('en-IN')}</strong>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <div>
                      <span className="block text-xs text-slate-400">GRN Receipt No:</span>
                      <strong className="text-slate-800">{selectedInvoice.grnNumber || "Pending"}</strong>
                    </div>
                    <div className="text-right">
                      <span className="block text-xs text-slate-400">Delivery Challan:</span>
                      <strong className="text-slate-800">{selectedInvoice.deliveryChallanNumber || "Pending"}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center text-slate-400">
              Select an approved invoice to view summary, bank details, and validation checks.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentCreate;
export { PaymentCreate };
