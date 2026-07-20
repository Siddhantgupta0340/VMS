import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { getInvoices } from "../../services/invoiceService";
import { createPayment } from "../../services/paymentService";
import { toast } from "sonner";
import { RequiredLabel, ValidationSummary } from "../../components/common/FormValidation";
import { fieldErrorClass, focusValidationField, validateRequiredFields } from "../../utils/validationMatrix";

const input = "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-600";

const PaymentCreate = () => {
  const navigate = useNavigate();
  const [approvedInvoices, setApprovedInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [validationErrors, setValidationErrors] = useState([]);
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
      // Only approved invoices can be paid
      const approved = invoices.filter(
        (i) => i.status === "APPROVED" && (i.paymentStatus === "UNPAID" || i.paymentStatus === "PARTIALLY_PAID")
      );
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
    
    // Automatically pre-fill invoice amount if invoice is selected
    if (name === "invoiceId") {
      const selected = approvedInvoices.find((i) => i.id === value);
      setFormData((prev) => ({
        ...prev,
        invoiceId: value,
        amount: selected ? String(prev.amount || selected.amount) : "",
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const bankErrors = selectedInvoice ? [
      ["Bank Name", selectedInvoice.vendorBankName],
      ["Account Holder", selectedInvoice.vendorAccountHolder],
      ["Account Number", selectedInvoice.vendorBankAccountNo],
      ["IFSC Code", selectedInvoice.vendorIfscCode],
      ["Bank Branch", selectedInvoice.vendorBankBranch],
    ]
      .filter(([, value]) => !value)
      .map(([label]) => ({
        field: "invoiceId",
        label,
        message: `${label} missing. Complete vendor bank details in Vendor Master before creating a Payment.`,
      })) : [];
    const errors = [...validateRequiredFields("payment", formData), ...bankErrors];
    setValidationErrors(errors);
    if (errors.length) {
      toast.error("Cannot save Payment. Please complete the highlighted fields.");
      window.setTimeout(() => focusValidationField(errors[0].field), 0);
      return;
    }
    try {
      const payload = {
        invoiceId: formData.invoiceId,
        amount: Number(formData.amount),
        currency: "INR",
        paymentMethod: formData.paymentMethod,
        referenceNo: formData.referenceNo,
        notes: formData.notes,
      };
      await createPayment(payload);
      toast.success("Payment request registered successfully!");
      navigate("/payments");
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to create payment request");
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        Loading Approved Invoices...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/payments">
          <button className="rounded-lg p-2 hover:bg-slate-100 transition">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Create Payment</h1>
          <p className="mt-1 text-slate-500">Record a new vendor payment payout request</p>
        </div>
      </div>

      {/* Form */}
      <div className="rounded-xl border border-slate-200 bg-white p-8">
        <ValidationSummary
          title="Cannot save Payment."
          errors={validationErrors}
          onSelect={(field) => focusValidationField(field)}
        />
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Payment Details */}
          <div>
            <h2 className="mb-6 text-lg font-semibold text-slate-900">Payment Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <RequiredLabel>Invoice Number</RequiredLabel>
                <select
                  name="invoiceId"
                  value={formData.invoiceId}
                  onChange={handleChange}
                  className={`${input} ${fieldErrorClass(errorsByField.invoiceId)}`}
                  required
                >
                  <option value="">Select Approved Invoice</option>
                  {approvedInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} — {inv.vendor} (Max: ₹ {inv.amount.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <RequiredLabel>Amount</RequiredLabel>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="0.00"
                  className={`${input} ${fieldErrorClass(errorsByField.amount)}`}
                  required
                />
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
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Reference / Transaction ID
                </label>
                <input
                  type="text"
                  name="referenceNo"
                  value={formData.referenceNo}
                  onChange={handleChange}
                  placeholder="e.g., UTR code or Cheque reference"
                  className={input}
                />
              </div>
            </div>
            {selectedInvoice && (
              <div className="mt-6 grid gap-4 rounded-xl bg-slate-50 p-4 text-sm md:grid-cols-3">
                <div><span className="block text-xs font-semibold uppercase text-slate-500">Vendor</span><strong>{selectedInvoice.vendor}</strong></div>
                <div><span className="block text-xs font-semibold uppercase text-slate-500">Bank Name</span><strong>{selectedInvoice.vendorBankName || "Bank Name missing. Complete in Vendor Master."}</strong></div>
                <div><span className="block text-xs font-semibold uppercase text-slate-500">Account Holder</span><strong>{selectedInvoice.vendorAccountHolder || "Account Holder missing. Complete in Vendor Master."}</strong></div>
                <div><span className="block text-xs font-semibold uppercase text-slate-500">Account Number</span><strong>{selectedInvoice.vendorBankAccountNo ? `**** ${String(selectedInvoice.vendorBankAccountNo).slice(-4)}` : "Account Number missing. Complete in Vendor Master."}</strong></div>
                <div><span className="block text-xs font-semibold uppercase text-slate-500">IFSC</span><strong>{selectedInvoice.vendorIfscCode || "IFSC Code missing. Complete in Vendor Master."}</strong></div>
                <div><span className="block text-xs font-semibold uppercase text-slate-500">Bank Branch</span><strong>{selectedInvoice.vendorBankBranch || "Bank Branch missing. Complete in Vendor Master."}</strong></div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Additional Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Add any additional notes or comments"
              rows="4"
              className={`${input} resize-none`}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-6 border-t border-slate-200">
            <button
              type="submit"
              className="flex-1 rounded-lg bg-blue-600 py-3 text-center font-medium text-white transition hover:bg-blue-700"
            >
              Record Payment
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
  );
};

export default PaymentCreate;
export { PaymentCreate };
