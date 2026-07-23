import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { ROLES } from "../../config/permissions";

import {
  getInvoices,
  approveInvoice,
  rejectInvoice,
} from "../../services/invoiceService";

import {
  Download,
  Eye,
  FileText,
  Plus,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import ActionMenu from "../../components/common/ActionMenu";
import StatusBadge from "../../components/common/StatusBadge";
import EmptyState from "../../components/common/EmptyState";
import { Link, useNavigate } from "react-router-dom";

const formatCurrency = (value, code = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: code || "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const InvoiceList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const normalizedRole = (user?.role || "").toUpperCase();

  const [invoices, setInvoices] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");

  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const loadInvoices = useCallback(
    async (pageToLoad = pagination.page) => {
      try {
        setLoading(true);
        setError(null);

        const params = {
          page: pageToLoad,
          limit: pagination.limit,
        };

        if (search.trim()) params.search = search.trim();
        if (statusFilter) params.status = statusFilter;
        if (paymentStatusFilter) params.paymentStatus = paymentStatusFilter;

        const response = await getInvoices(params);

        setInvoices(response.invoices || []);
        setPagination({
          page: response.page || pageToLoad,
          limit: response.limit || 10,
          total: response.total || 0,
          totalPages: response.totalPages || 1,
        });
      } catch (err) {
        console.error("[InvoiceList] Error loading invoices:", err);
        setError(
          err?.response?.data?.message ||
            err?.response?.data?.error ||
            "Unable to load invoice history. Please try again."
        );
      } finally {
        setLoading(false);
      }
    },
    [pagination.limit, search, statusFilter, paymentStatusFilter, pagination.page]
  );

  useEffect(() => {
    loadInvoices(1);
  }, [search, statusFilter, paymentStatusFilter]);

  const canActOnInvoice = (invoice, role) => {
    if (!invoice || !role) return false;
    const normalizedInvoiceStatus = (invoice?.status || "").toUpperCase();
    const normalizedRoleValue = (role || "").toUpperCase();
    if (normalizedRoleValue === ROLES.TEAM_LEAD) {
      return ["PENDING_TEAM_LEAD", "PENDING_L1", "PENDING"].includes(normalizedInvoiceStatus);
    }
    if (normalizedRoleValue === ROLES.MANAGER) {
      return ["PENDING_MANAGER", "PENDING_L2"].includes(normalizedInvoiceStatus);
    }
    return false;
  };

  const handleApprove = async (id) => {
    try {
      await approveInvoice(id);
      await loadInvoices(pagination.page);
      alert("Invoice approved successfully");
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Unable to approve invoice");
    }
  };

  const handleReject = async (id) => {
    try {
      await rejectInvoice(id, `Rejected by ${user?.role || "approver"}`);
      await loadInvoices(pagination.page);
      alert("Invoice rejected successfully");
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Unable to reject invoice");
    }
  };

  const rowActions = (row) => [
    <ActionMenu
      key={row.id}
      actions={[
        {
          icon: Eye,
          label: "Quick Preview",
          onClick: () => {
            setSelectedInvoice(row);
            setShowInvoiceModal(true);
          },
        },
        {
          icon: Eye,
          label: "View Full Details",
          onClick: () => navigate(`/invoices/${row.id}`),
        },
        {
          icon: Download,
          label: "Download / Print PDF",
          onClick: () => navigate(`/invoices/${row.id}`),
        },
      ]}
    />,
  ];

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Invoice History
          </h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Track and manage all historical vendor invoices from PostgreSQL.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => loadInvoices(pagination.page)}
            disabled={loading}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 sm:h-10 sm:px-4 sm:text-sm"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          {normalizedRole === ROLES.CASE_MANAGER && (
            <Link
              to="/invoices/new"
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white transition hover:bg-blue-700 sm:h-10 sm:text-sm"
            >
              <Plus size={16} />
              Create Invoice
            </Link>
          )}
        </div>
      </div>

      {/* ── Search & Filters Bar ───────────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              type="text"
              placeholder="Search by Invoice #, PO #, or Vendor Name/Code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-500 sm:text-sm"
            >
              <option value="">All Approval Statuses</option>
              <option value="APPROVED">Approved</option>
              <option value="PENDING_THREE_WAY_MATCH">3-Way Match Pending</option>
              <option value="PENDING_ADMIN_REVIEW">Admin Review Pending</option>
              <option value="PENDING_TEAM_LEAD">Team Lead Pending</option>
              <option value="PENDING_MANAGER">Manager Pending</option>
              <option value="PENDING_FINANCE_HEAD">Finance Head Pending</option>
              <option value="REJECTED">Rejected</option>
            </select>

            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-500 sm:text-sm"
            >
              <option value="">All Payment Statuses</option>
              <option value="UNPAID">Unpaid</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="PAID">Paid</option>
              <option value="OVERDUE">Overdue</option>
            </select>
          </div>
        </div>
      </section>

      {/* ── Error Banner ───────────────────────────────────────────────────── */}
      {error && (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-red-600" size={20} />
            <div>
              <p className="text-sm font-semibold">Unable to load invoice history</p>
              <p className="mt-0.5 text-xs text-red-600">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => loadInvoices(pagination.page)}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-red-300 bg-white px-3 text-xs font-semibold text-red-700 transition hover:bg-red-50"
          >
            <RefreshCw size={14} /> Retry
          </button>
        </section>
      )}

      {/* ── Main Data Table / Skeleton ────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="space-y-4 p-6">
            <div className="h-6 w-48 animate-pulse rounded bg-slate-200" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 w-full animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          </div>
        ) : invoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3.5">Invoice #</th>
                  <th className="px-4 py-3.5">PO #</th>
                  <th className="px-4 py-3.5">Vendor</th>
                  <th className="px-4 py-3.5">Invoice Date</th>
                  <th className="px-4 py-3.5 text-right">Amount</th>
                  <th className="px-4 py-3.5 text-center">3-Way Match</th>
                  <th className="px-4 py-3.5 text-center">Approval Status</th>
                  <th className="px-4 py-3.5 text-center">Payment Status</th>
                  <th className="px-4 py-3.5">Created Date</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {invoices.map((row) => (
                  <tr key={row.id} className="transition hover:bg-slate-50/60">
                    <td className="px-4 py-3.5 font-semibold">
                      <Link to={`/invoices/${row.id}`} className="text-blue-600 hover:underline">
                        {row.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 font-mono text-xs">
                      {row.poNumber || "N/A"}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-slate-900">{row.vendorName || row.vendor || "N/A"}</p>
                      {row.vendorCode && <p className="text-xs font-mono text-slate-500">{row.vendorCode}</p>}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                      {formatDate(row.invoiceDate)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-slate-900 whitespace-nowrap">
                      {formatCurrency(row.amount, row.currency)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <StatusBadge status={row.threeWayMatchStatus || "PENDING"} />
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <StatusBadge status={row.paymentStatus} />
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 text-xs whitespace-nowrap">
                      {formatDate(row.createdAt)}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canActOnInvoice(row, user?.role) && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApprove(row.id)}
                              className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReject(row.id)}
                              className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {rowActions(row)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : !error ? (
          <div className="p-8">
            <EmptyState
              icon={FileText}
              title="No invoices found"
              description="No invoice records exist for the specified search or filter criteria."
            />
          </div>
        ) : null}

        {/* ── Server-Side Pagination Bar ───────────────────────────────────── */}
        {!loading && !error && pagination.total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-slate-50 px-6 py-3 text-xs text-slate-600 sm:text-sm">
            <p>
              Showing <span className="font-semibold">{invoices.length}</span> of{" "}
              <span className="font-semibold">{pagination.total}</span> records
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => loadInvoices(pagination.page - 1)}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <span className="px-2 text-xs font-medium text-slate-700">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => loadInvoices(pagination.page + 1)}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── Quick Preview Modal ────────────────────────────────────────────── */}
      {showInvoiceModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-5 sm:p-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Invoice Details</h2>
                <p className="mt-1 font-semibold text-blue-600">{selectedInvoice.invoiceNumber}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowInvoiceModal(false);
                  setSelectedInvoice(null);
                }}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 hover:text-red-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6 p-5 sm:p-6">
              <section>
                <h3 className="mb-3 text-sm font-bold text-slate-900">Invoice Information</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Detail label="Invoice Number" value={selectedInvoice.invoiceNumber} />
                  <Detail label="Purchase Order" value={selectedInvoice.poNumber} />
                  <Detail label="Vendor" value={selectedInvoice.vendor} />
                  <Detail label="Amount" value={formatCurrency(selectedInvoice.amount, selectedInvoice.currency)} />
                  <Detail label="Status" value={selectedInvoice.status} />
                  <Detail label="Payment Status" value={selectedInvoice.paymentStatus} />
                  <Detail label="Invoice Date" value={formatDate(selectedInvoice.invoiceDate)} />
                  <Detail label="Due Date" value={formatDate(selectedInvoice.dueDate)} />
                  <Detail label="GRN Number" value={selectedInvoice.grnNumber || "N/A"} />
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-sm font-bold text-slate-900">Vendor Information</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Detail label="Vendor Name" value={selectedInvoice.vendor} />
                  <Detail label="Vendor Code" value={selectedInvoice.vendorCode || "N/A"} />
                  <Detail label="Vendor GST" value={selectedInvoice.vendorGst || "N/A"} />
                  <Detail label="Email" value={selectedInvoice.vendorEmail || "N/A"} />
                  <Detail label="Address" value={selectedInvoice.vendorAddress || "N/A"} />
                </div>
              </section>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 p-4">
              <Link
                to={`/invoices/${selectedInvoice.id}`}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 sm:text-sm"
              >
                <Eye size={15} /> Full Details Page
              </Link>
              <button
                type="button"
                onClick={() => { setShowInvoiceModal(false); setSelectedInvoice(null); }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Detail = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-1 text-xs font-medium text-slate-900 sm:text-sm">{value || "—"}</p>
  </div>
);

export default InvoiceList;
