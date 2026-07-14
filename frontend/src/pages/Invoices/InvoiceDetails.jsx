import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, CheckCircle, XCircle, Ban, Trash2, MessageSquare, Clock, FileText } from "lucide-react";
import {
  getInvoiceById,
  approveInvoice,
  rejectInvoice,
  cancelInvoice,
  addRemark,
  softDeleteInvoice,
} from "../../services/invoiceService";
import { getMatchReportByInvoice } from "../../services/matchingService";
import { useAuth } from "../../context/AuthContext";
import { ROLES } from "../../config/permissions";
import { toast } from "sonner";
import StatusBadge from "../../components/common/StatusBadge";

const Detail = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200 p-4">
    <p className="text-sm text-slate-500">{label}</p>
    <p className="mt-1 font-semibold text-slate-900">{value || "-"}</p>
  </div>
);

const InvoiceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [invoice, setInvoice] = useState(null);
  const [matchReports, setMatchReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dialog & Remarks State
  const [activeModal, setActiveModal] = useState(null); // "approve" | "reject" | "cancel" | "remark" | "delete"
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    loadInvoiceData();
  }, [id]);

  const loadInvoiceData = async () => {
    try {
      setLoading(true);
      const data = await getInvoiceById(id);
      setInvoice(data);

      try {
        const matches = await getMatchReportByInvoice(id);
        setMatchReports(matches);
      } catch {
        // Match report might not exist yet
        setMatchReports([]);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load invoice details");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    try {
      if (activeModal === "approve") {
        await approveInvoice(id, remarks);
        toast.success("Invoice approved successfully!");
      } else if (activeModal === "reject") {
        if (!remarks.trim()) {
          toast.error("Remarks / Rejection reason is required");
          return;
        }
        await rejectInvoice(id, remarks);
        toast.success("Invoice rejected successfully!");
      } else if (activeModal === "cancel") {
        await cancelInvoice(id, remarks);
        toast.success("Invoice cancelled successfully!");
      } else if (activeModal === "remark") {
        if (!remarks.trim()) {
          toast.error("Remark is required");
          return;
        }
        await addRemark(id, remarks);
        toast.success("Observation remark added successfully!");
      } else if (activeModal === "delete") {
        if (!remarks.trim()) {
          toast.error("Delete reason is required");
          return;
        }
        await softDeleteInvoice(id, remarks);
        toast.success("Invoice ticket soft deleted/archived successfully");
        navigate("/invoices");
        return;
      }
      setActiveModal(null);
      setRemarks("");
      loadInvoiceData();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Operation failed");
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        Loading Invoice Details...
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center p-12 space-y-4">
        <h3 className="text-lg font-bold text-slate-700">Invoice Not Found</h3>
        <Link to="/invoices" className="text-blue-600 hover:underline">
          Back to invoices list
        </Link>
      </div>
    );
  }

  const normalizedInvoiceStatus = (invoice.status || "").toUpperCase();
  const normalizedUserRole = (user?.role || "").toUpperCase();

  // Role permissions checks
  const isApprover = [ROLES.TEAM_LEAD, ROLES.MANAGER, ROLES.FINANCE_HEAD].includes(normalizedUserRole);
  
  const canApprove =
    isApprover &&
    invoice.requiredApprovalRole === normalizedUserRole &&
    normalizedInvoiceStatus.startsWith("PENDING_") &&
    normalizedInvoiceStatus !== "PENDING_THREE_WAY_MATCH" &&
    normalizedInvoiceStatus !== "PENDING_ADMIN_REVIEW";

  const canCancel =
    normalizedUserRole === ROLES.CASE_MANAGER &&
    invoice.createdById === user.id &&
    normalizedInvoiceStatus !== "APPROVED" &&
    normalizedInvoiceStatus !== "CANCELLED";

  const canDelete =
    [ROLES.SUPER_ADMIN, ROLES.CASE_MANAGER].includes(normalizedUserRole) &&
    (normalizedUserRole !== ROLES.CASE_MANAGER || invoice.createdById === user.id);

  const canAddRemark = [ROLES.SUPER_ADMIN, ROLES.FINANCE_HEAD].includes(normalizedUserRole);

  return (
    <div className="space-y-6">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <Link
          to="/invoices"
          className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={16} className="mr-2" /> Back to Invoices
        </Link>

        {/* Workflow Actions */}
        <div className="flex gap-2">
          {canApprove && (
            <>
              <button
                onClick={() => setActiveModal("approve")}
                className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition"
              >
                <CheckCircle size={16} /> Approve
              </button>
              <button
                onClick={() => setActiveModal("reject")}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition"
              >
                <XCircle size={16} /> Reject
              </button>
            </>
          )}

          {canCancel && (
            <button
              onClick={() => setActiveModal("cancel")}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 transition"
            >
              <Ban size={16} /> Cancel Draft
            </button>
          )}

          {canAddRemark && (
            <button
              onClick={() => setActiveModal("remark")}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              <MessageSquare size={16} /> Add observation
            </button>
          )}

          {canDelete && (
            <button
              onClick={() => setActiveModal("delete")}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-800 px-4 py-2 text-sm font-medium text-rose-500 hover:bg-slate-900/80 transition"
            >
              <Trash2 size={16} /> Archive Ticket
            </button>
          )}
        </div>
      </div>

      {/* Invoice Overview */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl text-blue-600">
            <FileText size={32} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Invoice details: {invoice.invoiceNumber}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Vendor: <span className="font-semibold text-slate-800">{invoice.vendor}</span> • PO Ref:{" "}
              <span className="font-semibold text-slate-800">{invoice.poNumber}</span>
            </p>
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-600">
              <span>
                Total Amount:{" "}
                <span className="font-bold text-slate-800">
                  ₹ {Number(invoice.amount || 0).toLocaleString()}
                </span>
              </span>
              <span>•</span>
              <span>
                Remaining Balance:{" "}
                <span className="font-semibold text-red-600">
                  ₹ {Number(invoice.remaining_amount ?? invoice.amount).toLocaleString()}
                </span>
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 items-start md:items-end">
          <StatusBadge status={invoice.status} />
          <span className="text-xs text-slate-500">
            Required Role: <span className="font-bold uppercase text-slate-700">{invoice.requiredApprovalRole}</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Snapshots & Fields */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-slate-900 border-b pb-3">
              Accounts Payable Metadata
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Detail label="Invoice Number" value={invoice.invoiceNumber} />
              <Detail label="Linked Purchase Order" value={invoice.poNumber} />
              <Detail label="Vendor Name" value={invoice.vendor} />
              <Detail label="Vendor Code" value={invoice.vendorCode} />
              <Detail label="Vendor Email" value={invoice.vendorEmail} />
              <Detail label="Currency Code" value={invoice.currency} />
              <Detail
                label="Invoice Date"
                value={invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString() : "-"}
              />
              <Detail
                label="Due Date"
                value={invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "-"}
              />
            </div>
            {invoice.description && (
              <div className="rounded-xl border p-4 bg-slate-50/50">
                <p className="text-xs text-slate-500 font-semibold mb-1">INVOICE NOTES / DESCRIPTION</p>
                <p className="text-sm text-slate-800 leading-relaxed">{invoice.description}</p>
              </div>
            )}
          </div>

          {/* Line Items */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b pb-3">
              PO Associated Line Items
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="bg-slate-50 font-semibold text-slate-600 border-b">
                  <tr>
                    <th className="p-4">SKU / Item Description</th>
                    <th className="p-4 text-center">Quantity</th>
                    <th className="p-4 text-right">Unit Rate</th>
                    <th className="p-4 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items && invoice.items.length > 0 ? (
                    invoice.items.map((item, index) => (
                      <tr key={index} className="border-b hover:bg-slate-50/30">
                        <td className="p-4 text-slate-800 font-medium">{item.description}</td>
                        <td className="p-4 text-center text-slate-600">{item.quantity}</td>
                        <td className="p-4 text-right text-slate-600">₹ {Number(item.rate).toLocaleString()}</td>
                        <td className="p-4 text-right font-semibold text-slate-800">
                          ₹ {Number(item.amount || item.quantity * item.rate).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-slate-500 italic">
                        No line items found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          {/* 3-Way Match Summary Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              3-Way Match Verification
            </h3>
            {matchReports.length > 0 ? (
              <div className="space-y-4">
                {matchReports.map((report) => (
                  <div key={report.id} className="rounded-xl border p-4 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-500">SCORE: {report.matchPercentage}%</span>
                      <StatusBadge status={report.status} />
                    </div>
                    <Link
                      to={`/three-way-matching/${report.id}`}
                      className="block text-center rounded-xl bg-blue-50 border border-blue-100 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-100 transition"
                    >
                      View Match Analysis
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center">
                <p className="text-xs text-slate-500 leading-relaxed mb-3">
                  Match reconciliation has not been executed for this invoice.
                </p>
                {normalizedUserRole === ROLES.CASE_MANAGER && normalizedInvoiceStatus === "PENDING_THREE_WAY_MATCH" && (
                  <Link
                    to="/three-way-matching?invoiceId="
                    className="inline-block text-xs font-bold text-blue-600 hover:underline"
                  >
                    Go to matching portal
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Workflow Timeline */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b pb-3">
              Approval Sign-off Audit Trail
            </h3>
            <div className="space-y-6">
              {/* Submission */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="h-7 w-7 rounded-full bg-green-50 border border-green-200 flex items-center justify-center text-green-700">
                    ✓
                  </div>
                  <div className="h-8 w-px bg-slate-200 my-1" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Invoice Draft Submitted</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">By {invoice.createdBy}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {invoice.createdAt ? new Date(invoice.createdAt).toLocaleString() : "-"}
                  </p>
                </div>
              </div>

              {/* L1 Approval */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center text-xs border ${
                      invoice.teamLeadApprover !== "-"
                        ? "bg-green-50 border-green-200 text-green-700"
                        : "bg-slate-50 border-slate-200 text-slate-400"
                    }`}
                  >
                    {invoice.teamLeadApprover !== "-" ? "✓" : "1"}
                  </div>
                  <div className="h-8 w-px bg-slate-200 my-1" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">L1 Team Lead Review</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {invoice.teamLeadApprover !== "-" ? `Approved by ${invoice.teamLeadApprover}` : "Pending Review"}
                  </p>
                </div>
              </div>

              {/* L2 Approval */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center text-xs border ${
                      invoice.managerApprover !== "-"
                        ? "bg-green-50 border-green-200 text-green-700"
                        : "bg-slate-50 border-slate-200 text-slate-400"
                    }`}
                  >
                    {invoice.managerApprover !== "-" ? "✓" : "2"}
                  </div>
                  <div className="h-8 w-px bg-slate-200 my-1" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">L2 Manager Review</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {invoice.managerApprover !== "-" ? `Approved by ${invoice.managerApprover}` : "Pending Review"}
                  </p>
                </div>
              </div>

              {/* L3 Approval */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center text-xs border ${
                      invoice.financeHeadApprover !== "-"
                        ? "bg-green-50 border-green-200 text-green-700"
                        : "bg-slate-50 border-slate-200 text-slate-400"
                    }`}
                  >
                    {invoice.financeHeadApprover !== "-" ? "✓" : "3"}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">L3 Finance Head Sign-off</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {invoice.financeHeadApprover !== "-" ? `Approved by ${invoice.financeHeadApprover}` : "Pending Final Sign-off"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation & Remarks Modal dialog */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-[500px] rounded-2xl bg-white p-6 shadow-2xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 capitalize flex items-center gap-2">
                {activeModal === "delete" ? "Confirm Archive Ticket" : `${activeModal} Invoice Verification`}
              </h3>
              <p className="text-sm text-slate-500 mt-2">
                {activeModal === "delete"
                  ? "Are you sure you want to soft delete this invoice ticket? Remarks detailing the reason for deletion are required for administrative log compliance."
                  : `Are you sure you want to perform this workflow status action? Please write down audit comments below.`}
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">
                Remarks / Audit Comments {["reject", "remark", "delete"].includes(activeModal) ? "*" : ""}
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Include confirmation remarks or reason details..."
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-600 text-sm h-24"
                required={["reject", "remark", "delete"].includes(activeModal)}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setActiveModal(null);
                  setRemarks("");
                }}
                className="px-4 py-2 border rounded-xl hover:bg-slate-50 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                className={`px-4 py-2 text-white rounded-xl text-sm font-semibold capitalize ${
                  activeModal === "reject" || activeModal === "delete"
                    ? "bg-red-600 hover:bg-red-700"
                    : activeModal === "cancel"
                    ? "bg-amber-500 hover:bg-amber-600"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                Confirm {activeModal}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceDetails;
export { InvoiceDetails };
