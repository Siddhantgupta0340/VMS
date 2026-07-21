import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { ROLES } from "../../config/permissions";

import {
  getInvoices,
  approveInvoice,
  rejectInvoice,
} from "../../services/invoiceService";

import { Download, Eye, FileText, Plus } from "lucide-react";
import DataTable from "../../components/common/DataTable";
import FilterBar from "../../components/common/FilterBar";
import ActionMenu from "../../components/common/ActionMenu";
import StatusBadge from "../../components/common/StatusBadge";
import EmptyState from "../../components/common/EmptyState";
import { Link, useNavigate } from "react-router-dom";

const fmt = (value, code = "INR") =>
  `${code} ${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const InvoiceList = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [activeFilters, setActiveFilters] = useState({});
  const normalizedRole = (user?.role || "").toUpperCase();

  const getRoleFilteredInvoices = (data) => {
    if (!normalizedRole) return data;
    if (normalizedRole === ROLES.CASE_MANAGER) {
      return data.filter((invoice) => invoice.createdById === user.id);
    }
    return data;
  };

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

  const getErrorMessage = (err) =>
    err?.response?.data?.message || err?.response?.data?.error || "Unable to process invoice request";

  useEffect(() => {
    loadInvoices();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilters, user?.role]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const data = await getInvoices(user?.role);
      let filtered = getRoleFilteredInvoices([...data]);
      if (activeFilters.status) {
        filtered = filtered.filter((i) => i.status === activeFilters.status);
      }
      if (activeFilters.paymentStatus) {
        filtered = filtered.filter((i) => i.paymentStatus === activeFilters.paymentStatus);
      }
      setInvoices(filtered);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await approveInvoice(id);
      await loadInvoices();
      alert("Invoice approved successfully");
    } catch (err) {
      console.error(err);
      alert(getErrorMessage(err));
    }
  };

  const handleReject = async (id) => {
    try {
      await rejectInvoice(id, `Rejected by ${user?.role || "approver"}`);
      await loadInvoices();
      alert("Invoice rejected successfully");
    } catch (err) {
      console.error(err);
      alert(getErrorMessage(err));
    }
  };

  const navigate = useNavigate();

  const columns = [
    {
      key: "invoiceNumber",
      label: "Invoice #",
      sortable: true,
      render: (value, row) => (
        <Link to={`/invoices/${row.id}`} className="font-semibold text-blue-600 hover:underline">
          {value}
        </Link>
      ),
    },
    { key: "poNumber", label: "PO #", sortable: true },
    { key: "vendor", label: "Vendor", sortable: true },
    {
      key: "amount",
      label: "Amount",
      sortable: true,
      render: (value, row) => (
        <span className="font-semibold">{fmt(value, row.currency)}</span>
      ),
    },
    {
      key: "invoiceDate",
      render: (value) => (value ? new Date(value).toLocaleDateString("en-IN") : "—"),
      label: "Invoice Date",
      sortable: true,
    },
    {
      key: "status",
      label: "Approval",
      sortable: true,
      render: (value) => <StatusBadge status={value} />,
    },
    {
      key: "paymentStatus",
      label: "Payment",
      sortable: true,
      render: (value) => <StatusBadge status={value} />,
    },
    {
      key: "actions",
      label: "Actions",
      render: (_, row) => (
        <div className="flex gap-2">
          {canActOnInvoice(row, user?.role) && (
            <>
              <button
                onClick={() => handleApprove(row.id)}
                className="rounded-lg bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700"
              >
                Approve
              </button>
              <button
                onClick={() => handleReject(row.id)}
                className="rounded-lg bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700"
              >
                Reject
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  const filters = [
    {
      key: "status",
      label: "Approval Status",
      options: [
        { label: "Approved", value: "APPROVED" },
        { label: "Three Way Match", value: "PENDING_THREE_WAY_MATCH" },
        { label: "Admin Review", value: "PENDING_ADMIN_REVIEW" },
        { label: "Team Lead", value: "PENDING_TEAM_LEAD" },
        { label: "Manager", value: "PENDING_MANAGER" },
        { label: "Finance Head", value: "PENDING_FINANCE_HEAD" },
        { label: "Rejected", value: "REJECTED" },
      ],
    },
    {
      key: "paymentStatus",
      label: "Payment Status",
      options: [
        { label: "Unpaid", value: "UNPAID" },
        { label: "Partially Paid", value: "PARTIALLY_PAID" },
        { label: "Paid", value: "PAID" },
        { label: "Overdue", value: "OVERDUE" },
      ],
    },
  ];

  const rowActions = (row) => [
    <ActionMenu
      key={row.id}
      actions={[
        {
          icon: Eye,
          label: "View Details",
          onClick: () => navigate(`/invoices/${row.id}`),
        },
        {
          icon: Download,
          label: "Download / Print Invoice",
          onClick: () => navigate(`/invoices/${row.id}`),
        },
      ]}
    />,
  ];

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center text-slate-500">
        Loading Invoices...
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Invoices</h1>
            <p className="mt-2 text-slate-500">Track and manage all vendor invoices</p>
          </div>
          {normalizedRole === ROLES.CASE_MANAGER && (
            <Link
              to="/invoices/new"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <Plus size={16} />
              Create Invoice
            </Link>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-600">Total Invoices</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{invoices.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-600">Awaiting Approval</p>
            <p className="mt-2 text-2xl font-bold text-amber-600">
              {invoices.filter((i) => i.status?.toLowerCase().includes("pending")).length}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-600">Total Value</p>
            <p className="mt-1 break-words text-sm font-semibold text-slate-900">
              {fmt(invoices.reduce((sum, i) => sum + Number(i.amount || 0), 0))}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-600">Unpaid</p>
            <p className="mt-2 text-xl font-bold text-red-600">
              {fmt(
                invoices
                  .filter((i) => i.paymentStatus !== "PAID")
                  .reduce((sum, i) => sum + Number(i.amount || 0), 0)
              )}
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <FilterBar filters={filters} onFilterChange={setActiveFilters} />
        </div>

        {/* Data Table */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          {invoices.length > 0 ? (
            <DataTable
              columns={columns}
              data={invoices}
              searchableFields={["invoiceNumber", "poNumber", "vendor"]}
              rowActions={rowActions}
              itemsPerPage={10}
            />
          ) : (
            <EmptyState
              icon={FileText}
              title="No Invoices"
              description="No invoice records are available for the current filters."
            />
          )}
        </div>
      </div>

      {/* Invoice Quick View Modal */}
      {showInvoiceModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Invoice Details</h2>
                <p className="mt-1 font-semibold text-blue-600">{selectedInvoice.invoiceNumber}</p>
              </div>
              <button
                onClick={() => {
                  setShowInvoiceModal(false);
                  setSelectedInvoice(null);
                }}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 hover:text-red-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-8 p-6">
              {/* Invoice Info */}
              <section>
                <h3 className="mb-4 text-base font-bold text-slate-900">Invoice Information</h3>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  <Detail label="Invoice Number" value={selectedInvoice.invoiceNumber} />
                  <Detail label="Purchase Order" value={selectedInvoice.poNumber} />
                  <Detail label="Vendor" value={selectedInvoice.vendor} />
                  <Detail label="Amount" value={fmt(selectedInvoice.amount, selectedInvoice.currency)} />
                  <Detail label="Status" value={selectedInvoice.status} />
                  <Detail label="Payment Status" value={selectedInvoice.paymentStatus} />
                  <Detail
                    label="Invoice Date"
                    value={selectedInvoice.invoiceDate ? new Date(selectedInvoice.invoiceDate).toLocaleDateString("en-IN") : "—"}
                  />
                  <Detail
                    label="Due Date"
                    value={selectedInvoice.dueDate ? new Date(selectedInvoice.dueDate).toLocaleDateString("en-IN") : "—"}
                  />
                  <Detail label="GRN Number" value={selectedInvoice.grnNumber || "—"} />
                </div>
              </section>

              {/* Vendor */}
              <section>
                <h3 className="mb-4 text-base font-bold text-slate-900">Vendor Information</h3>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  <Detail label="Vendor Name" value={selectedInvoice.vendor} />
                  <Detail label="Vendor Code" value={selectedInvoice.vendorCode || "—"} />
                  <Detail label="Vendor GST" value={selectedInvoice.vendorGst || "—"} />
                  <Detail label="Vendor PAN" value={selectedInvoice.vendorPan || "—"} />
                  <Detail label="Email" value={selectedInvoice.vendorEmail || "—"} />
                  <Detail label="Address" value={selectedInvoice.vendorAddress || "—"} />
                </div>
              </section>

              {/* Approval */}
              <section>
                <h3 className="mb-4 text-base font-bold text-slate-900">Approval Status</h3>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  <Detail label="Required Role" value={selectedInvoice.requiredApprovalRole || "—"} />
                  <Detail label="Current Level" value={selectedInvoice.currentApprovalLevel || "—"} />
                  <Detail label="Team Lead Approver" value={selectedInvoice.teamLeadApprover || "—"} />
                  <Detail label="Manager Approver" value={selectedInvoice.managerApprover || "—"} />
                  <Detail label="Finance Head Approver" value={selectedInvoice.financeHeadApprover || "—"} />
                  <Detail label="Created By" value={selectedInvoice.createdBy} />
                </div>
              </section>

              {/* Line Items — All 7 required columns */}
              <section>
                <h3 className="mb-4 text-base font-bold text-slate-900">Line Items</h3>
                {selectedInvoice.items?.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full min-w-215 border-collapse text-sm">
                      <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                        <tr>
                          <th className="p-3 text-left">#</th>
                          <th className="p-3 text-left">Item Name</th>
                          <th className="p-3 text-left">Description</th>
                          <th className="p-3 text-right">Qty</th>
                          <th className="p-3 text-right">Unit Price</th>
                          <th className="p-3 text-right">Taxable Amount</th>
                          <th className="p-3 text-right">GST</th>
                          <th className="p-3 text-right">Line Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedInvoice.items.map((item, index) => (
                          <tr key={index} className="border-t border-slate-100 hover:bg-slate-50/60">
                            <td className="p-3 text-slate-500">{item.lineNumber || index + 1}</td>
                            <td className="p-3 font-semibold text-slate-900">
                              {item.itemName || item.description || (
                                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">Not Available</span>
                              )}
                            </td>
                            <td className="max-w-50 p-3 text-slate-500">
                              {item.description || <span className="text-slate-400">—</span>}
                            </td>
                            <td className="p-3 text-right">{item.quantity ?? "—"}</td>
                            <td className="p-3 text-right">
                              {fmt(item.unitPrice, selectedInvoice.currency)}
                            </td>
                            <td className="p-3 text-right">
                              {fmt(item.taxableAmount, selectedInvoice.currency)}
                            </td>
                            <td className="p-3 text-right">
                              {fmt(item.gstAmount, selectedInvoice.currency)}
                            </td>
                            <td className="p-3 text-right font-bold text-slate-900">
                              {fmt(item.lineTotal, selectedInvoice.currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                    No line items found for this invoice.
                  </div>
                )}
              </section>

              {/* Remarks */}
              <section>
                <h3 className="mb-3 text-base font-bold text-slate-900">Remarks / Description</h3>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  {selectedInvoice.description || <span className="italic text-slate-400">Not provided.</span>}
                </div>
              </section>
            </div>

            {/* Footer actions */}
            <div className="flex justify-end gap-3 border-t border-slate-200 p-4">
              <Link
                to={`/invoices/${selectedInvoice.id}`}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <Eye size={16} /> Full Details & PDF
              </Link>
              <button
                onClick={() => { setShowInvoiceModal(false); setSelectedInvoice(null); }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const Detail = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-2 text-sm font-medium text-slate-900">{value || "—"}</p>
  </div>
);

export default InvoiceList;
