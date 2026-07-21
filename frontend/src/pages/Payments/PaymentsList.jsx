import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Download,
  DollarSign,
  Wallet,
  TrendingUp,
  CheckCircle,
  XCircle,
  Eye,
  Clock,
  RefreshCw,
  X,
  FileText,
} from "lucide-react";
import DataTable from "../../components/common/DataTable";
import FilterBar from "../../components/common/FilterBar";
import StatusBadge from "../../components/common/StatusBadge";
import EmptyState from "../../components/common/EmptyState";
import { Link, useSearchParams } from "react-router-dom";
import {
  getPayments,
  getPendingPayments,
  getPaymentById,
  getPaymentHistory,
  getPaymentStats,
  approvePayment,
  rejectPayment,
  returnPayment,
  cancelPayment,
} from "../../services/paymentService";
import { useAuth } from "../../context/AuthContext";
import { ROLES } from "../../config/permissions";
import { toast } from "sonner";
import { ValidationSummary } from "../../components/common/FormValidation";
import { fieldErrorClass, focusValidationField, validateRequiredFields } from "../../utils/validationMatrix";

const money = (val, cur = "INR") =>
  `${cur} ${Number(val || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const historyEventMeta = (action = "") => {
  const a = action.toLowerCase();
  if (a.includes("created")) return { color: "bg-blue-500", label: "Created" };
  if (a.includes("approved")) return { color: "bg-emerald-500", label: "Approved" };
  if (a.includes("rejected") || a.includes("reject")) return { color: "bg-red-500", label: "Rejected" };
  if (a.includes("returned") || a.includes("return")) return { color: "bg-orange-500", label: "Returned for Correction" };
  if (a.includes("cancelled") || a.includes("cancel")) return { color: "bg-amber-500", label: "Cancelled" };
  if (a.includes("refund")) return { color: "bg-teal-500", label: "Refunded" };
  return { color: "bg-slate-400", label: action };
};

const PaymentsList = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const paymentIdParam = searchParams.get("id");

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState({});
  const [showActionModal, setShowActionModal] = useState(null); // "approve" | "reject" | "cancel" | "return"
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [viewPaymentModal, setViewPaymentModal] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [stats, setStats] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [txnRef, setTxnRef] = useState("");
  const [validationErrors, setValidationErrors] = useState([]);
  const errorsByField = validationErrors.reduce((acc, error) => ({ ...acc, [error.field]: error.message }), {});

  const isPaymentApprover = [ROLES.TEAM_LEAD, ROLES.MANAGER, ROLES.FINANCE_HEAD].includes(user?.role);

  // Auto-open modal if payment ID query param is present on mount or updates
  useEffect(() => {
    if (paymentIdParam) {
      getPaymentById(paymentIdParam)
        .then((p) => {
          if (p) {
            setViewPaymentModal(p);
            setLoadingHistory(true);
            getPaymentHistory(p.id)
              .then((hist) => setPaymentHistory(hist))
              .catch((err) => console.error(err))
              .finally(() => setLoadingHistory(false));
          }
        })
        .catch((err) => console.error("Error auto-opening payment:", err));
    }
  }, [paymentIdParam]);

  const loadPayments = useCallback(async () => {
    try {
      setLoading(true);
      const [data, liveStats] = await Promise.all([
        getPayments(),
        getPaymentStats().catch(() => null),
      ]);
      let filtered = [...data];

      if (activeFilters.method) {
        filtered = filtered.filter((p) => p.paymentMethod === activeFilters.method);
      }
      if (activeFilters.status) {
        filtered = filtered.filter(
          (p) => String(p.status).toLowerCase() === String(activeFilters.status).toLowerCase()
        );
      }

      setPayments(filtered);
      if (liveStats) setStats(liveStats);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load payments ledger");
    } finally {
      setLoading(false);
    }
  }, [activeFilters, isPaymentApprover]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const openViewModal = async (payment) => {
    setViewPaymentModal(payment);
    setLoadingHistory(true);
    try {
      const history = await getPaymentHistory(payment.id);
      setPaymentHistory(history);
    } catch (err) {
      console.error(err);
      toast.error("Could not load approval history timeline");
    } finally {
      setLoadingHistory(false);
    }
  };

  const handlePaymentAction = async () => {
    try {
      const values = { remarks, referenceNo: txnRef };
      const errors = [
        ...(showActionModal === "approve" ? validateRequiredFields("paymentApprove", values) : []),
        ...(["reject", "cancel", "return"].includes(showActionModal)
          ? validateRequiredFields("approvalReject", values)
          : []),
      ];
      setValidationErrors(errors);
      if (errors.length) {
        toast.error(`Cannot ${showActionModal} Payment. Please complete the highlighted fields.`);
        window.setTimeout(() => focusValidationField(errors[0].field), 0);
        return;
      }
      if (showActionModal === "approve") {
        await approvePayment(selectedPayment.id, remarks, txnRef);
        toast.success("Payment request approved successfully!");
      } else if (showActionModal === "reject") {
        await rejectPayment(selectedPayment.id, remarks);
        toast.success("Payment request rejected");
      } else if (showActionModal === "return") {
        await returnPayment(selectedPayment.id, remarks);
        toast.success("Payment request returned for correction");
      } else if (showActionModal === "cancel") {
        await cancelPayment(selectedPayment.id, remarks);
        toast.success("Payment request cancelled");
      }
      setShowActionModal(null);
      setSelectedPayment(null);
      setRemarks("");
      setTxnRef("");
      setValidationErrors([]);
      loadPayments();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Payment operation failed");
    }
  };

  const columns = [
    {
      key: "paymentNumber",
      label: "Payment #",
      sortable: true,
      render: (value, row) => (
        <button
          type="button"
          onClick={() => openViewModal(row)}
          className="font-semibold text-blue-600 hover:underline text-left"
        >
          {value}
        </button>
      ),
    },
    { key: "invoiceNumber", label: "Invoice #", sortable: true },
    { key: "poNumber", label: "PO Number", sortable: true },
    {
      key: "vendor",
      label: "Vendor",
      sortable: true,
      render: (value, row) => (
        <div>
          <p className="font-semibold text-slate-900">{value}</p>
          <p className="text-xs text-slate-500">{row.vendorCode}</p>
        </div>
      ),
    },
    {
      key: "amount",
      label: "Amount",
      sortable: true,
      render: (value, row) => (
        <span className="font-semibold">{money(value, row.currency)}</span>
      ),
    },
    { key: "paymentMethod", label: "Method", sortable: true },
    { key: "createdBy", label: "Requested By", sortable: true },
    {
      key: "createdAt",
      label: "Request Date",
      render: (value) => (value ? new Date(value).toLocaleDateString("en-IN") : "—"),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (value) => <StatusBadge status={value} />,
    },
    {
      key: "priority",
      label: "Priority",
      render: (value) => (
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            value === "High" ? "bg-red-50 text-red-700 border border-red-200" : "bg-slate-100 text-slate-700"
          }`}
        >
          {value}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (_, row) => {
        const isPending = row.status === "PENDING" || row.status === "pending";
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => openViewModal(row)}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
              title="View Details & Timeline"
            >
              <Eye size={15} />
            </button>
            {isPending && isPaymentApprover && (
              <>
                <button
                  onClick={() => {
                    setSelectedPayment(row);
                    setShowActionModal("approve");
                  }}
                  className="rounded-lg bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700 font-semibold"
                >
                  Approve
                </button>
                <button
                  onClick={() => {
                    setSelectedPayment(row);
                    setShowActionModal("reject");
                  }}
                  className="rounded-lg bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700 font-semibold"
                >
                  Reject
                </button>
                <button
                  onClick={() => {
                    setSelectedPayment(row);
                    setShowActionModal("return");
                  }}
                  className="rounded-lg bg-amber-600 px-3 py-1 text-xs text-white hover:bg-amber-700 font-semibold"
                >
                  Return
                </button>
              </>
            )}
            {isPending && user?.role === ROLES.CASE_MANAGER && (
              <button
                onClick={() => {
                  setSelectedPayment(row);
                  setShowActionModal("cancel");
                }}
                className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-1 text-xs text-slate-700 hover:bg-slate-200 font-semibold"
              >
                Cancel
              </button>
            )}
          </div>
        );
      },
    },
  ];

  const filters = [
    {
      key: "method",
      label: "Payment Method",
      options: [
        { label: "Bank Transfer", value: "Bank Transfer" },
        { label: "Cheque", value: "Cheque" },
        { label: "NEFT", value: "NEFT" },
        { label: "RTGS", value: "RTGS" },
        { label: "UPI", value: "UPI" },
      ],
    },
    {
      key: "status",
      label: "Status",
      options: [
        { label: "Pending", value: "PENDING" },
        { label: "Under Review", value: "INITIATED" },
        { label: "Approved", value: "APPROVED" },
        { label: "Rejected", value: "FAILED" },
        { label: "Returned for Correction", value: "RETURNED" },
        { label: "Paid", value: "SUCCESS" },
        { label: "Cancelled", value: "CANCELLED" },
      ],
    },
  ];

  const totalPaid = payments
    .filter((p) => ["initiated", "processing", "success", "approved", "completed"].includes(p.status?.toLowerCase()))
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const totalPending = payments
    .filter((p) => p.status?.toLowerCase() === "pending")
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  if (loading) {
    return <div className="flex h-96 items-center justify-center text-slate-500">Loading Payments Ledger...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {isPaymentApprover ? "Payment Approvals" : "Payments"}
          </h1>
          <p className="mt-2 text-slate-500">
            {isPaymentApprover
              ? "Review payment approval requests assigned to your approval limit"
              : "Track and manage all vendor disbursements and payout requests"}
          </p>
        </div>

        {user?.role === ROLES.CASE_MANAGER && (
          <Link
            to="/payments/new"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700"
          >
            <Plus size={18} /> New Payment Request
          </Link>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending Approvals</p>
              <p className="mt-2 text-2xl font-bold text-amber-600">
                {stats?.pending ?? payments.filter((p) => p.status === "PENDING").length}
              </p>
              <p className="mt-1 text-xs text-slate-500">{money(stats?.pendingAmount || totalPending)}</p>
            </div>
            <Wallet className="h-8 w-8 text-amber-200" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Approved Payouts</p>
              <p className="mt-2 text-2xl font-bold text-emerald-600">{stats?.approved ?? 0}</p>
              <p className="mt-1 text-xs text-slate-500">{money(stats?.totalAmount || totalPaid)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-emerald-200" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Today's Requests</p>
              <p className="mt-2 text-2xl font-bold text-blue-600">{stats?.todayRequests ?? 0}</p>
            </div>
            <Clock className="h-8 w-8 text-blue-200" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Monthly Requests</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{stats?.monthlyRequests ?? payments.length}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-slate-300" />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <FilterBar filters={filters} onFilterChange={setActiveFilters} />
      </div>

      {/* Data Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {payments.length > 0 ? (
          <DataTable
            columns={columns}
            data={payments}
            searchableFields={["paymentNumber", "invoiceNumber", "vendor", "poNumber"]}
            itemsPerPage={10}
          />
        ) : (
          <EmptyState
            icon={Plus}
            title="No Payments"
            description="Create your first payment request to get started"
            action={
              user?.role === ROLES.CASE_MANAGER && (
                <Link
                  to="/payments/new"
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition hover:bg-blue-700"
                >
                  <Plus size={16} /> New Payment Request
                </Link>
              )
            }
          />
        )}
      </div>

      {/* Payment Details & Approval Timeline Modal (Task 3) */}
      {viewPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Payment Details & Timeline</h2>
                <p className="mt-1 font-semibold text-blue-600">{viewPaymentModal.paymentNumber}</p>
              </div>
              <button
                onClick={() => setViewPaymentModal(null)}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 hover:text-red-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6 p-6">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <Detail label="Payment Number" value={viewPaymentModal.paymentNumber} />
                <Detail label="Invoice Number" value={viewPaymentModal.invoiceNumber} />
                <Detail label="PO Number" value={viewPaymentModal.poNumber} />
                <Detail label="Vendor Name" value={viewPaymentModal.vendor} />
                <Detail label="Vendor Code" value={viewPaymentModal.vendorCode} />
                <Detail label="Requested Amount" value={money(viewPaymentModal.amount, viewPaymentModal.currency)} />
                <Detail label="Current Status" value={<StatusBadge status={viewPaymentModal.status} />} />
                <Detail label="Priority" value={viewPaymentModal.priority} />
                <Detail label="Required Approver Role" value={viewPaymentModal.requiredApprovalRole || "—"} />
                <Detail label="Approval Band" value={viewPaymentModal.approvalBand || "—"} />
                <Detail label="Requested By" value={viewPaymentModal.createdBy || viewPaymentModal.requestedBy} />
                <Detail
                  label="Request Date"
                  value={viewPaymentModal.createdAt ? new Date(viewPaymentModal.createdAt).toLocaleString("en-IN") : "—"}
                />
              </div>

              {/* Complete Approval Timeline */}
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="border-b border-slate-100 pb-3 text-base font-bold text-slate-950">
                  <Clock size={16} className="mr-2 inline" /> Complete Approval Timeline
                </h3>
                {loadingHistory ? (
                  <div className="p-8 text-center text-sm text-slate-500">Loading timeline history...</div>
                ) : paymentHistory.length > 0 ? (
                  <div className="mt-5 space-y-0">
                    {paymentHistory.map((entry, idx) => {
                      const { color, label } = historyEventMeta(entry.action);
                      return (
                        <div key={entry.id || idx} className="relative flex gap-4 pb-6">
                          {idx < paymentHistory.length - 1 && (
                            <div className="absolute left-2.75 top-6 h-full w-0.5 bg-slate-200" />
                          )}
                          <div className={`mt-1 h-6 w-6 shrink-0 rounded-full ${color} flex items-center justify-center shadow-sm`}>
                            <div className="h-2 w-2 rounded-full bg-white" />
                          </div>
                          <div className="min-w-0 flex-1 rounded-xl border border-slate-100 bg-slate-50 p-3">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold text-white ${color}`}>
                                  {label}
                                </span>
                                {entry.fromStatus && entry.toStatus && (
                                  <span className="ml-2 text-xs text-slate-500">
                                    {entry.fromStatus} → {entry.toStatus}
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-slate-400">
                                {entry.createdAt ? new Date(entry.createdAt).toLocaleString("en-IN") : ""}
                              </span>
                            </div>
                            <p className="mt-1.5 text-sm font-semibold text-slate-800">
                              {entry.performedBy}
                              {entry.role && (
                                <span className="ml-2 rounded-md bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                                  {entry.role}
                                </span>
                              )}
                            </p>
                            {entry.remarks && (
                              <p className="mt-1 text-xs text-slate-600 italic">"{entry.remarks}"</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-5 rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                    No approval timeline recorded yet.
                  </div>
                )}
              </section>
            </div>

            <div className="flex justify-end border-t border-slate-200 p-4">
              <button
                onClick={() => setViewPaymentModal(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Prompt Dialog */}
      {showActionModal && selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-125 max-w-full space-y-6 rounded-2xl bg-white p-6 shadow-2xl">
            <ValidationSummary
              title={`Cannot ${showActionModal} Payment.`}
              errors={validationErrors}
              onSelect={(field) => focusValidationField(field)}
            />
            <div>
              <h3 className="flex items-center gap-2 text-lg font-bold capitalize text-slate-900">
                {showActionModal === "approve" ? (
                  <CheckCircle className="text-green-600" />
                ) : (
                  <XCircle className="text-red-600" />
                )}
                {showActionModal} Payment Request
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Confirm {showActionModal === "return" ? "return for correction" : showActionModal} for payment #
                {selectedPayment.paymentNumber}.
              </p>
            </div>

            {showActionModal === "approve" && (
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase text-slate-700">
                  Transaction Reference Number / UTR
                </label>
                <input
                  type="text"
                  value={txnRef}
                  onChange={(e) => setTxnRef(e.target.value)}
                  placeholder="UTR-2026-9988-11"
                  name="referenceNo"
                  className={`w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600 ${fieldErrorClass(errorsByField.referenceNo)}`}
                />
              </div>
            )}

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase text-slate-700">
                Audit Trail Remarks *
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Include confirmation, return, or rejection comments..."
                name="remarks"
                className={`h-24 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600 ${fieldErrorClass(errorsByField.remarks)}`}
                required
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowActionModal(null);
                  setSelectedPayment(null);
                  setRemarks("");
                  setTxnRef("");
                  setValidationErrors([]);
                }}
                className="rounded-xl border px-4 py-2 text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePaymentAction}
                className={`rounded-xl px-4 py-2 text-sm font-semibold capitalize text-white ${
                  showActionModal === "reject"
                    ? "bg-red-600 hover:bg-red-700"
                    : showActionModal === "return"
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                Confirm {showActionModal}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Detail = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    <div className="mt-1.5 text-sm font-semibold text-slate-900">{value || "—"}</div>
  </div>
);

export default PaymentsList;
