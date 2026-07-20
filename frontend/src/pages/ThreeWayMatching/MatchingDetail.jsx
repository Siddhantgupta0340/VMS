import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, CheckCircle, AlertTriangle, GitCompare, Printer, ShieldAlert } from "lucide-react";
import { getMatchReport, adminApproveMatch, adminRejectMatch, returnMatchForCorrection } from "../../services/matchingService";
import { useAuth } from "../../context/AuthContext";
import { ROLES } from "../../config/permissions";
import { toast } from "sonner";
import StatusBadge from "../../components/common/StatusBadge";
import { ValidationSummary } from "../../components/common/FormValidation";
import { fieldErrorClass, focusValidationField, validateRequiredFields } from "../../utils/validationMatrix";

const formatCurrency = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;

const resultLabel = (item) => {
  if (item.status === "MISSING_DATA") return "Missing Data";
  if (item.status === "PARTIAL_MATCH") return "Partial Match";
  return "Mismatch";
};

const resultClass = (item) => {
  if (item.status === "MISSING_DATA") return "bg-amber-50 text-amber-700 border-amber-200";
  if (item.status === "PARTIAL_MATCH") return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-red-50 text-red-700 border-red-200";
};

const MatchingDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [remarks, setRemarks] = useState("");
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const errorsByField = validationErrors.reduce((acc, error) => ({ ...acc, [error.field]: error.message }), {});

  const loadReport = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMatchReport(id);
      setReport(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load matching report");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleApprove = async () => {
    try {
      await adminApproveMatch(id, remarks);
      toast.success("Three-way match approved for payment");
      setShowApproveModal(false);
      setRemarks("");
      loadReport();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Approval failed");
    }
  };

  const handleFlagReject = async () => {
    const errors = validateRequiredFields("approvalReject", { remarks });
    setValidationErrors(errors);
    if (errors.length) {
      toast.error("Cannot reject match. Please complete the highlighted fields.");
      window.setTimeout(() => focusValidationField(errors[0].field), 0);
      return;
    }
    try {
      await adminRejectMatch(id, remarks);
      toast.success("Discrepancy flagged and report rejected");
      setShowRejectModal(false);
      setRemarks("");
      loadReport();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Rejection failed");
    }
  };

  const handleReturnForCorrection = async () => {
    const errors = validateRequiredFields("approvalReject", { remarks });
    setValidationErrors(errors);
    if (errors.length) {
      toast.error("Cannot return match. Please complete the highlighted fields.");
      window.setTimeout(() => focusValidationField(errors[0].field), 0);
      return;
    }
    try {
      await returnMatchForCorrection(id, remarks);
      toast.success("Report returned for correction");
      setShowReturnModal(false);
      setRemarks("");
      loadReport();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Return for correction failed");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        Analyzing Match Discrepancy Report...
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center p-12 space-y-4">
        <h3 className="text-lg font-bold text-slate-700">Matching Report Not Found</h3>
        <Link to="/three-way-matching" className="text-blue-600 hover:underline">
          Back to matching dashboard
        </Link>
      </div>
    );
  }

  const canReview = [ROLES.FINANCE_HEAD, ROLES.SUPER_ADMIN].includes(user?.role);
  const isPendingReview = report.adminReviewStatus === "PENDING";
  const summary = report.summary || {};

  return (
    <div className="space-y-6">
      {/* Header Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/three-way-matching"
          className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={16} className="mr-2" /> Back to Verification List
        </Link>

        <div className="flex gap-3">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            <Printer size={16} /> Print Report
          </button>

          {canReview && isPendingReview && (
            <>
              <button
                onClick={() => setShowApproveModal(true)}
                disabled={report.status !== "MATCHED"}
                className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <CheckCircle size={16} /> Approve
              </button>
              <button
                onClick={() => setShowReturnModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition"
              >
                <AlertTriangle size={16} /> Return
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition"
              >
                <AlertTriangle size={16} /> Reject
              </button>
            </>
          )}
        </div>
      </div>

      {/* Audit report summary */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl text-blue-600">
            <GitCompare size={32} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Match Reconciliation Audit
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Invoice #{report.invoiceNumber} | PO #{report.poNumber} | DC #{report.deliveryChallanNumber} | GRN #{report.grnNumber}
            </p>
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-600">
              <span>
                Reconciliation Score:{" "}
                <span className="font-bold text-blue-600">
                  {report.matchPercentage}%
                </span>
              </span>
              <span>•</span>
              <span>
                Passed Checks:{" "}
                <span className="font-semibold text-slate-800">
                  {report.matchedFieldsCount} of {report.totalFieldsCount} fields
                </span>
              </span>
            </div>
            <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-3">
              <span>
                Variance Amount: <strong className="text-slate-900">{formatCurrency(summary.varianceAmount)}</strong>
              </span>
              <span>
                Variance %: <strong className="text-slate-900">{Number(summary.variancePercentage || 0)}%</strong>
              </span>
              <span>
                Result: <strong className="text-slate-900">{report.status}</strong>
              </span>
            </div>
          </div>
        </div>
        <div className="self-start md:self-center">
          <StatusBadge status={report.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        {[
          ["Purchase Order", report.poSnapshot, report.poSnapshot?.poNumber, report.poSnapshot?.grandTotal],
          ["Delivery Challan", report.deliveryChallanSnapshot, report.deliveryChallanSnapshot?.deliveryChallanNumber, report.deliveryChallanSnapshot?.grandTotal],
          ["Goods Receipt Note", report.grnSnapshot, report.grnSnapshot?.grnNumber, report.grnSnapshot?.grandTotal],
          ["Invoice", report.invoiceSnapshot, report.invoiceSnapshot?.invoiceNumber, report.invoiceSnapshot?.grandTotal],
        ].map(([title, snapshot, number, total]) => (
          <section key={title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wide text-slate-800">{title}</h3>
                <p className="mt-1 font-mono text-xs text-slate-500">{number || "Not available"}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {formatCurrency(total)}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Vendor</span>
                <span className="text-right font-medium text-slate-800">{snapshot?.vendorName || snapshot?.vendorCode || "-"}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Date</span>
                <span className="font-medium text-slate-800">
                  {snapshot?.poDate || snapshot?.deliveryDate || snapshot?.receivedDate || snapshot?.invoiceDate
                    ? new Date(snapshot.poDate || snapshot.deliveryDate || snapshot.receivedDate || snapshot.invoiceDate).toLocaleDateString()
                    : "-"}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">GST</span>
                <span className="font-medium text-slate-800">{formatCurrency(snapshot?.gstAmount)}</span>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {(snapshot?.items || []).slice(0, 4).map((item, index) => (
                <div key={`${title}-${index}`} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs">
                  <div className="font-semibold text-slate-800">{item.itemName || item.item_name || item.name || item.description || "Item"}</div>
                  <div className="mt-1 grid grid-cols-2 gap-2 text-slate-600 sm:grid-cols-3">
                    <span>Qty: {item.quantity || item.qty || item.deliveredQuantity || item.delivered_quantity || item.receivedQuantity || item.received_quantity || 0}</span>
                    <span>Rate: {item.unitPrice || item.unit_price || item.rate || 0}</span>
                    <span>GST: {item.gstAmount || item.gst_amount || item.taxAmount || item.tax_amount || 0}</span>
                  </div>
                </div>
              ))}
              {(!snapshot?.items || snapshot.items.length === 0) && (
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs text-slate-500">
                  No item details available.
                </div>
              )}
            </div>
          </section>
        ))}
      </div>

      {/* Discrepancies Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Mismatched Fields */}
          {report.unmatchedFields.length > 0 ? (
            <div className="rounded-2xl border border-red-200 overflow-hidden shadow-sm">
              <div className="bg-red-50/50 p-4 border-b border-red-200 flex items-center text-red-700 gap-2">
                <AlertTriangle size={18} />
                <h3 className="text-sm font-bold uppercase tracking-wider">
                  Flagged Discrepancy Points
                </h3>
              </div>
              <div className="overflow-x-auto bg-white">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b text-slate-600 font-semibold">
                      <th className="p-4">Audited Field</th>
                      <th className="p-4">Result</th>
                      <th className="p-4">Reason</th>
                      <th className="p-4 text-right">PO Reference</th>
                      <th className="p-4 text-right">Delivery Challan</th>
                      <th className="p-4 text-right">GRN Value</th>
                      <th className="p-4 text-right text-red-600">Invoice Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.unmatchedFields.map((item, index) => (
                      <tr key={index} className="border-b hover:bg-slate-50/50">
                        <td className="p-4 font-semibold text-slate-800 capitalize">
                          {item.field?.replace(/_/g, " ")}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${resultClass(item)}`}>
                            {resultLabel(item)}
                          </span>
                        </td>
                        <td className="p-4 text-slate-600">
                          {item.reason || "-"}
                        </td>
                        <td className="p-4 text-right text-slate-600">
                          {item.poValue !== null && item.poValue !== undefined ? String(item.poValue) : "-"}
                        </td>
                        <td className="p-4 text-right text-slate-600">
                          {item.deliveryChallanValue !== null && item.deliveryChallanValue !== undefined ? String(item.deliveryChallanValue) : "-"}
                        </td>
                        <td className="p-4 text-right text-slate-600">
                          {item.grnValue !== null && item.grnValue !== undefined ? String(item.grnValue) : "-"}
                        </td>
                        <td className="p-4 text-right text-red-600 font-bold">
                          {item.invoiceValue !== null && item.invoiceValue !== undefined ? String(item.invoiceValue) : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-green-200 bg-green-50/20 p-6 flex items-start gap-3">
              <CheckCircle className="text-green-600 shrink-0" size={24} />
              <div>
                <h4 className="font-bold text-green-800">100% Matching Reconciled</h4>
                <p className="text-sm text-green-700 mt-1">
                  All validation criteria between the Invoice, Purchase Order, Delivery Challan, and GRN are successfully matched without discrepancies.
                </p>
              </div>
            </div>
          )}

          {/* Matched Fields */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b pb-3 flex items-center gap-2">
              <CheckCircle className="text-green-600" size={18} /> Reconciled & Matched Criteria
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              {report.matchedFields.length === 0 ? (
                <p className="text-slate-500 italic">No matching checks passed.</p>
              ) : (
                report.matchedFields.map((f, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-slate-700 font-medium capitalize"
                  >
                    ✓ {f.replace(/_/g, " ")}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Info Sidebar */}
        <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          {/* Verdict Recommendation */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              System Recommendation
            </h3>
            <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 space-y-2">
              <p className="text-xs text-slate-500 font-semibold">RECOMMENDED VERDICT</p>
              <p className="text-base font-bold text-slate-800">
                {report.approvalRecommendation === "APPROVE"
                  ? "Auto-Approve Match Stage"
                  : "Approval blocked until mismatches are corrected"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-slate-100 bg-white p-3">
                <span className="block font-semibold text-slate-500">PO Amount</span>
                <span className="mt-1 block font-bold text-slate-900">{formatCurrency(summary.poAmount)}</span>
              </div>
              <div className="rounded-xl border border-slate-100 bg-white p-3">
                <span className="block font-semibold text-slate-500">GRN Amount</span>
                <span className="mt-1 block font-bold text-slate-900">{formatCurrency(summary.grnAmount)}</span>
              </div>
              <div className="rounded-xl border border-slate-100 bg-white p-3">
                <span className="block font-semibold text-slate-500">Delivery Challan Amount</span>
                <span className="mt-1 block font-bold text-slate-900">{formatCurrency(summary.deliveryChallanAmount)}</span>
              </div>
              <div className="rounded-xl border border-slate-100 bg-white p-3">
                <span className="block font-semibold text-slate-500">Invoice Amount</span>
                <span className="mt-1 block font-bold text-slate-900">{formatCurrency(summary.invoiceAmount)}</span>
              </div>
              <div className="rounded-xl border border-slate-100 bg-white p-3">
                <span className="block font-semibold text-slate-500">Matched Amount</span>
                <span className="mt-1 block font-bold text-slate-900">{formatCurrency(summary.matchedAmount)}</span>
              </div>
            </div>
            {report.remarks && (
              <div className="rounded-xl border border-slate-100 bg-amber-50/10 p-4 text-xs text-slate-700">
                <span className="font-bold block mb-1">Remarks Log:</span>
                {report.remarks}
              </div>
            )}
          </div>

          {/* Audit snapshots details */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Audit Data Trail
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">Calculated By</span>
                <span className="font-semibold">{report.completedBy}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">Calculated At</span>
                <span className="font-semibold">
                  {report.completedAt ? new Date(report.completedAt).toLocaleString() : "-"}
                </span>
              </div>
              {report.adminReviewStatus && (
                <>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-slate-500">Finance Review Status</span>
                    <span className="font-bold text-blue-600">{report.adminReviewStatus}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-slate-500">Reviewer</span>
                    <span className="font-semibold">{report.adminReviewedBy}</span>
                  </div>
                  {report.adminRemarks && (
                    <div className="bg-slate-50 p-3 rounded-lg text-[11px] text-slate-600 leading-relaxed">
                      <span className="font-bold block text-slate-700">Admin Remarks:</span>
                      {report.adminRemarks}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-[500px] rounded-2xl bg-white p-6 shadow-2xl space-y-6">
            <ValidationSummary
              title="Cannot reject match."
              errors={validationErrors}
              onSelect={(field) => focusValidationField(field)}
            />
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="text-green-600" /> Approve Three-Way Match
              </h3>
              <p className="text-sm text-slate-500 mt-2">
                Approving a fully matched report will mark the invoice approved for payment processing.
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">
                Approval Remarks
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Optional approval remarks..."
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-600 text-sm h-24"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  setRemarks("");
                }}
                className="px-4 py-2 border rounded-xl hover:bg-slate-50 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 text-sm font-semibold"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-[500px] rounded-2xl bg-white p-6 shadow-2xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="text-red-600" /> Flag Reconciliation Discrepancies
              </h3>
              <p className="text-sm text-slate-500 mt-2">
                Are you sure you want to reject this match audit? The invoice will be flagged for corrections and returned to draft/verification stages.
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">
                Rejection Remarks *
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="List unmatched SKU items, quantity discrepancies or price variances..."
                name="remarks"
                className={`w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-600 text-sm h-24 ${fieldErrorClass(errorsByField.remarks)}`}
                required
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRemarks("");
                  setValidationErrors([]);
                }}
                className="px-4 py-2 border rounded-xl hover:bg-slate-50 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleFlagReject}
                className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 text-sm font-semibold"
              >
                Flag Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {showReturnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-[500px] max-w-[calc(100vw-2rem)] rounded-2xl bg-white p-6 shadow-2xl space-y-6">
            <ValidationSummary
              title="Cannot return match."
              errors={validationErrors}
              onSelect={(field) => focusValidationField(field)}
            />
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="text-amber-600" /> Return for Correction
              </h3>
              <p className="text-sm text-slate-500 mt-2">
                Return this invoice to the matching queue with clear correction remarks.
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">
                Correction Remarks *
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Describe the quantity, GST, vendor, or amount correction required..."
                name="remarks"
                className={`w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm h-24 ${fieldErrorClass(errorsByField.remarks)}`}
                required
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowReturnModal(false);
                  setRemarks("");
                  setValidationErrors([]);
                }}
                className="px-4 py-2 border rounded-xl hover:bg-slate-50 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleReturnForCorrection}
                className="px-4 py-2 bg-amber-600 text-white rounded-xl hover:bg-amber-700 text-sm font-semibold"
              >
                Return
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchingDetail;
export { MatchingDetail };
