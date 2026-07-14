import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, CheckCircle, AlertTriangle, FileText, Printer, ShieldAlert } from "lucide-react";
import { getMatchReport, adminApproveMatch, adminRejectMatch } from "../../services/matchingService";
import { useAuth } from "../../context/AuthContext";
import { ROLES } from "../../config/permissions";
import { toast } from "sonner";
import StatusBadge from "../../components/common/StatusBadge";

const MatchingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [remarks, setRemarks] = useState("");
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    loadReport();
  }, [id]);

  const loadReport = async () => {
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
  };

  const handleOverrideApprove = async () => {
    try {
      await adminApproveMatch(id, remarks);
      toast.success("Match discrepancy override approved successfully!");
      setShowOverrideModal(false);
      setRemarks("");
      loadReport();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Override failed");
    }
  };

  const handleFlagReject = async () => {
    if (!remarks.trim()) {
      toast.error("Remarks/rejection reason is required");
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

  const isSuperAdmin = user?.role === ROLES.SUPER_ADMIN;

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

          {isSuperAdmin && report.status === "UNMATCHED" && (
            <>
              <button
                onClick={() => setShowOverrideModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition"
              >
                <CheckCircle size={16} /> Override Approve
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition"
              >
                <AlertTriangle size={16} /> Flag Discrepancy
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
              Invoice #{report.invoiceNumber} • PO #{report.poNumber} • GRN #{report.grnNumber}
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
          </div>
        </div>
        <div className="self-start md:self-center">
          <StatusBadge status={report.status} />
        </div>
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
                      <th className="p-4 text-right">PO Reference</th>
                      <th className="p-4 text-right">GRN Value</th>
                      <th className="p-4 text-right text-red-600">Invoice Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.unmatchedFields.map((item, index) => (
                      <tr key={index} className="border-b hover:bg-slate-50/50">
                        <td className="p-4 font-semibold text-slate-800 capitalize">
                          {item.field?.replace(/_/g, " ")}
                        </td>
                        <td className="p-4 text-right text-slate-600">
                          {item.poValue !== null && item.poValue !== undefined ? String(item.poValue) : "-"}
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
                  All validation criteria between the Invoice, Purchase Order, and GRN are successfully matched without discrepancies.
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
        <div className="space-y-6">
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
                  : report.approvalRecommendation === "REJECT"
                  ? "Reject and Request Re-issuance"
                  : "Needs Manual Override Review"}
              </p>
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
                    <span className="text-slate-500">Admin Override Status</span>
                    <span className="font-bold text-blue-600">{report.adminReviewStatus}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-slate-500">Admin Reviewer</span>
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

      {/* Override Approve Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-[500px] rounded-2xl bg-white p-6 shadow-2xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="text-green-600" /> Confirm Matching Override
              </h3>
              <p className="text-sm text-slate-500 mt-2">
                Are you sure you want to bypass matching anomalies? This will manually set the matching status to MATCHED and advance the invoice to L1 Team Lead approval.
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">
                Override Justification Remarks
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Provide physical GRN confirmations or override details..."
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-600 text-sm h-24"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowOverrideModal(false);
                  setRemarks("");
                }}
                className="px-4 py-2 border rounded-xl hover:bg-slate-50 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleOverrideApprove}
                className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 text-sm font-semibold"
              >
                Override Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Override Reject Modal */}
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
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-600 text-sm h-24"
                required
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRemarks("");
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
    </div>
  );
};

export default MatchingDetail;
export { MatchingDetail };
