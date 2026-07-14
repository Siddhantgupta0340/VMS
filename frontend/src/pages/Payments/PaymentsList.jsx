import { useState, useEffect } from "react";
import { Plus, Download, DollarSign, Wallet, TrendingUp, CheckCircle, XCircle, ShieldAlert } from "lucide-react";
import DataTable from "../../components/common/DataTable";
import FilterBar from "../../components/common/FilterBar";
import ActionMenu from "../../components/common/ActionMenu";
import StatusBadge from "../../components/common/StatusBadge";
import EmptyState from "../../components/common/EmptyState";
import { Link } from "react-router-dom";
import { getPayments, approvePayment, rejectPayment, cancelPayment } from "../../services/paymentService";
import { useAuth } from "../../context/AuthContext";
import { ROLES } from "../../config/permissions";
import { toast } from "sonner";

const PaymentsList = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState({});
  const [showActionModal, setShowActionModal] = useState(null); // "approve" | "reject" | "cancel"
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [txnRef, setTxnRef] = useState("");

  useEffect(() => {
    loadPayments();
  }, [activeFilters]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const data = await getPayments();
      let filtered = [...data];

      if (activeFilters.method) {
        filtered = filtered.filter((p) => p.paymentMethod === activeFilters.method);
      }
      if (activeFilters.status) {
        filtered = filtered.filter((p) => p.status === activeFilters.status);
      }

      setPayments(filtered);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentAction = async () => {
    try {
      if (showActionModal === "approve") {
        await approvePayment(selectedPayment.id, remarks, txnRef);
        toast.success("Payment request approved successfully!");
      } else if (showActionModal === "reject") {
        if (!remarks.trim()) {
          toast.error("Remarks are required to reject payment");
          return;
        }
        await rejectPayment(selectedPayment.id, remarks);
        toast.success("Payment request rejected");
      } else if (showActionModal === "cancel") {
        await cancelPayment(selectedPayment.id, remarks);
        toast.success("Payment request cancelled");
      }
      setShowActionModal(null);
      setSelectedPayment(null);
      setRemarks("");
      setTxnRef("");
      loadPayments();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Payment operation failed");
    }
  };

  const isFinanceHead = user?.role === ROLES.FINANCE_HEAD;

  const columns = [
    {
      key: "paymentNumber",
      label: "Payment ID",
      sortable: true,
      render: (value) => <span className="font-semibold text-blue-600">{value}</span>,
    },
    {
      key: "invoiceNumber",
      label: "Invoice #",
      sortable: true,
    },
    {
      key: "vendor",
      label: "Vendor",
      sortable: true,
    },
    {
      key: "amount",
      label: "Amount",
      sortable: true,
      render: (value, row) => (
        <span className="font-semibold">
          ₹ {Number(value).toLocaleString()} {row.currency}
        </span>
      ),
    },
    {
      key: "paymentMethod",
      label: "Method",
      sortable: true,
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (value) => <StatusBadge status={value} />,
    },
    {
      key: "actions",
      label: "Reconciliation Logs",
      render: (_, row) => {
        const isPending = row.status === "PENDING" || row.status === "pending";
        return (
          <div className="flex gap-2">
            {isPending && isFinanceHead && (
              <>
                <button
                  onClick={() => {
                    setSelectedPayment(row);
                    setShowActionModal("approve");
                  }}
                  className="rounded-lg bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700"
                >
                  Approve
                </button>
                <button
                  onClick={() => {
                    setSelectedPayment(row);
                    setShowActionModal("reject");
                  }}
                  className="rounded-lg bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700"
                >
                  Reject
                </button>
              </>
            )}
            {isPending && user?.role === ROLES.CASE_MANAGER && (
              <button
                onClick={() => {
                  setSelectedPayment(row);
                  setShowActionModal("cancel");
                }}
                className="rounded-lg bg-slate-900 border border-slate-800 px-3 py-1 text-xs text-amber-500 hover:bg-slate-900/80"
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
        { label: "Approved / Paid", value: "approved" },
        { label: "Pending", value: "pending" },
        { label: "Rejected", value: "rejected" },
        { label: "Blocked", value: "blocked" },
      ],
    },
  ];

  const rowActions = (row) => [
    <ActionMenu
      key={row.id}
      actions={[
        {
          icon: Download,
          label: "Download Receipt",
          onClick: () => console.log("Download", row.id),
        },
      ]}
    />,
  ];

  // Aggregates
  const totalPaid = payments
    .filter((p) => p.status?.toLowerCase() === "approved")
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPending = payments
    .filter((p) => p.status?.toLowerCase() === "pending")
    .reduce((sum, p) => sum + p.amount, 0);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        Loading Payments Ledger...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Payments</h1>
          <p className="mt-2 text-slate-500">Track and manage all vendor disbursements and payout requests</p>
        </div>

        {user?.role === ROLES.CASE_MANAGER && (
          <Link
            to="/payments/new"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-white font-medium transition hover:bg-blue-700"
          >
            <Plus size={18} />
            New Payment Request
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Disbursed (Paid)</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                ₹ {totalPaid.toLocaleString()}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-200" />
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Awaiting Payout (Pending)</p>
              <p className="mt-2 text-2xl font-bold text-amber-600">
                ₹ {totalPending.toLocaleString()}
              </p>
            </div>
            <Wallet className="h-8 w-8 text-amber-200" />
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Disbursement Count</p>
              <p className="mt-2 text-2xl font-bold text-slate-950">
                {payments.length}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-200" />
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
            searchableFields={["paymentNumber", "invoiceNumber", "vendor"]}
            rowActions={rowActions}
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
                  <Plus size={16} />
                  New Payment Request
                </Link>
              )
            }
          />
        )}
      </div>

      {/* Action Prompt Dialog */}
      {showActionModal && selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-[500px] rounded-2xl bg-white p-6 shadow-2xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 capitalize flex items-center gap-2">
                {showActionModal === "approve" ? <CheckCircle className="text-green-600" /> : <XCircle className="text-red-600" />}
                {showActionModal} Payment Request
              </h3>
              <p className="text-sm text-slate-500 mt-2">
                Confirm execution of payout audit actions for Ref #{selectedPayment.paymentNumber}.
              </p>
            </div>
            
            {showActionModal === "approve" && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">
                  Transaction reference Number / UTR
                </label>
                <input
                  type="text"
                  value={txnRef}
                  onChange={(e) => setTxnRef(e.target.value)}
                  placeholder="UTR-2026-9988-11"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-600 text-sm mb-4"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">
                Audit Trail Remarks {showActionModal === "reject" ? "*" : ""}
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Include confirmation or rejection comments..."
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-600 text-sm h-24"
                required={showActionModal === "reject"}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowActionModal(null);
                  setSelectedPayment(null);
                  setRemarks("");
                  setTxnRef("");
                }}
                className="px-4 py-2 border rounded-xl hover:bg-slate-50 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handlePaymentAction}
                className={`px-4 py-2 text-white rounded-xl text-sm font-semibold capitalize ${
                  showActionModal === "reject" ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
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

export default PaymentsList;
