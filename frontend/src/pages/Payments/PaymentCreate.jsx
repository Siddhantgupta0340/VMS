import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

const input = "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-600";

const PaymentCreate = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    invoiceNumber: "",
    paymentMethod: "",
    amount: "",
    reference: "",
    paymentDate: new Date().toISOString().split("T")[0],
    bankDetails: "",
    notes: "",
  });

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Create Payment:", formData);
    navigate("/payments");
  };

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
          <p className="mt-1 text-slate-500">Record a new vendor payment</p>
        </div>
      </div>

      {/* Form */}
      <div className="rounded-xl border border-slate-200 bg-white p-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Payment Details */}
          <div>
            <h2 className="mb-6 text-lg font-semibold text-slate-900">Payment Details</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Invoice Number *
                </label>
                <input
                  type="text"
                  name="invoiceNumber"
                  value={formData.invoiceNumber}
                  onChange={handleChange}
                  placeholder="INV-2024-001"
                  className={input}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Amount *
                </label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="0.00"
                  className={input}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Payment Method *
                </label>
                <select name="paymentMethod" onChange={handleChange} className={input} required>
                  <option value="">Select Payment Method</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Payment Date
                </label>
                <input
                  type="date"
                  name="paymentDate"
                  value={formData.paymentDate}
                  onChange={handleChange}
                  className={input}
                />
              </div>
            </div>
          </div>

          {/* Reference Details */}
          <div>
            <h2 className="mb-6 text-lg font-semibold text-slate-900">Reference Details</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Reference/Transaction ID
                </label>
                <input
                  type="text"
                  name="reference"
                  value={formData.reference}
                  onChange={handleChange}
                  placeholder="e.g., REF-001245 or Cheque number"
                  className={input}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Bank/Payment Details
                </label>
                <textarea
                  name="bankDetails"
                  value={formData.bankDetails}
                  onChange={handleChange}
                  placeholder="Add bank account details, cheque information, or payment gateway reference"
                  rows="3"
                  className={`${input} resize-none`}
                />
              </div>
            </div>
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
