import { useState } from "react";
import { Plus, Download, DollarSign, Wallet, TrendingUp } from "lucide-react";
import DataTable from "../../components/common/DataTable";
import FilterBar from "../../components/common/FilterBar";
import ActionMenu from "../../components/common/ActionMenu";
import StatusBadge from "../../components/common/StatusBadge";
import EmptyState from "../../components/common/EmptyState";
import { Link } from "react-router-dom";

const PaymentsList = () => {
  const [payments] = useState([
    {
      id: "PAY-2024-001",
      invoiceNumber: "INV-2024-001",
      vendor: "Acme Corporation",
      amount: "₹45,000",
      paymentDate: "2024-01-25",
      dueDate: "2024-02-15",
      method: "Bank Transfer",
      status: "Paid",
      reference: "REF-001245",
    },
    {
      id: "PAY-2024-002",
      invoiceNumber: "INV-2024-003",
      vendor: "Tech Solutions",
      amount: "₹75,200",
      paymentDate: "2024-01-24",
      dueDate: "2024-02-17",
      method: "Cheque",
      status: "Partially Paid",
      reference: "CHQ-5847",
    },
    {
      id: "PAY-2024-003",
      invoiceNumber: "INV-2024-002",
      vendor: "Global Supplies",
      amount: "₹128,500",
      paymentDate: "—",
      dueDate: "2024-02-16",
      method: "—",
      status: "Pending",
      reference: "—",
    },
  ]);

  const columns = [
    {
      key: "id",
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
      render: (value) => <span className="font-semibold">{value}</span>,
    },
    {
      key: "paymentDate",
      label: "Payment Date",
      sortable: true,
    },
    {
      key: "method",
      label: "Method",
      sortable: true,
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (value) => <StatusBadge status={value} />,
    },
  ];

  const filters = [
    {
      key: "method",
      label: "Payment Method",
      options: [
        { label: "Bank Transfer", value: "Bank Transfer" },
        { label: "Cheque", value: "Cheque" },
        { label: "Credit Card", value: "Credit Card" },
        { label: "Cash", value: "Cash" },
      ],
    },
    {
      key: "status",
      label: "Status",
      options: [
        { label: "Paid", value: "Paid" },
        { label: "Partially Paid", value: "Partially Paid" },
        { label: "Pending", value: "Pending" },
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
        {
          icon: DollarSign,
          label: "View Details",
          onClick: () => console.log("View", row.id),
        },
      ]}
    />,
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Payments</h1>
          <p className="mt-2 text-slate-500">Track and manage all vendor payments</p>
        </div>

        <Link
          to="/payments/new"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-white font-medium transition hover:bg-blue-700"
        >
          <Plus size={18} />
          New Payment
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-600">Total Paid</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">₹324.5L</p>
              <p className="mt-1 text-xs text-green-600">↑ 8.5% vs month</p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-100" />
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-600">Pending Payments</p>
              <p className="mt-2 text-2xl font-bold text-orange-600">₹128.5L</p>
              <p className="mt-1 text-xs text-slate-600">18 invoices</p>
            </div>
            <Wallet className="h-8 w-8 text-orange-100" />
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-600">Overdue Amount</p>
              <p className="mt-2 text-2xl font-bold text-red-600">₹24.8L</p>
              <p className="mt-1 text-xs text-red-600">6 days overdue avg</p>
            </div>
            <TrendingUp className="h-8 w-8 text-red-100" />
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-600">Payment Success Rate</p>
          <p className="mt-2 text-2xl font-bold text-green-600">98.5%</p>
          <p className="mt-1 text-xs text-green-600">→ Excellent</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <FilterBar filters={filters} onFilterChange={(f) => console.log(f)} />
        <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
          <Download size={16} />
          Export
        </button>
      </div>

      {/* Data Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        {payments.length > 0 ? (
          <DataTable
            columns={columns}
            data={payments}
            searchableFields={["id", "invoiceNumber", "vendor"]}
            rowActions={rowActions}
            itemsPerPage={10}
          />
        ) : (
          <EmptyState
            icon={Plus}
            title="No Payments"
            description="Create your first payment to get started"
            action={
              <Link
                to="/payments/new"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition hover:bg-blue-700"
              >
                <Plus size={16} />
                Create Payment
              </Link>
            }
          />
        )}
      </div>
    </div>
  );
};

export default PaymentsList;
