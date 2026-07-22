import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  FileText,
  RefreshCw,
  ShoppingCart,
  XCircle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  DATE_PRESETS,
  GROUP_OPTIONS,
  getMyDashboard,
} from "../../../services/dashboardService";

const COLORS = ["#2563eb", "#0f766e", "#f59e0b", "#dc2626", "#64748b", "#7c3aed"];

const numberFormat = new Intl.NumberFormat("en-IN");
const currencyFormat = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const safeNumber = (value) => {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric : 0;
};

const formatNumber = (value) => numberFormat.format(safeNumber(value));
const formatCurrency = (value, currency = "INR") =>
  currency === "INR" ? currencyFormat.format(safeNumber(value)) : `${currency} ${formatNumber(value)}`;

const normalizeChart = (items = []) =>
  Array.isArray(items)
    ? items.filter((item) => safeNumber(item.value) > 0)
    : [];

const EmptyState = ({ message = "No data available yet" }) => (
  <div className="flex min-h-36 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 text-center text-xs font-medium text-slate-500 sm:text-sm">
    {message}
  </div>
);

const StatCard = ({ icon: Icon, title, value, tone = "blue" }) => {
  const tones = {
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    green: "border-emerald-100 bg-emerald-50 text-emerald-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    red: "border-red-100 bg-red-50 text-red-700",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-slate-500 sm:text-sm">{title}</p>
          <p className="mt-2 truncate text-2xl font-bold text-slate-950 sm:text-3xl">{formatNumber(value)}</p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border sm:h-11 sm:w-11 ${tones[tone]}`}>
          <Icon size={19} />
        </div>
      </div>
    </section>
  );
};

const ChartCard = ({ children, title, hasData }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <h2 className="truncate text-base font-bold text-slate-950">{title}</h2>
    <div className="mt-4 h-64 min-w-0 w-full overflow-hidden sm:h-72">
      {hasData ? children : <EmptyState />}
    </div>
  </section>
);

const DataTable = ({ columns, rows, emptyMessage = "No data available yet" }) => (
  <div className="overflow-x-auto rounded-xl border border-slate-200">
    {rows?.length ? (
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-4 py-3">{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row) => (
            <tr key={row.id} className="transition hover:bg-slate-50/50">
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-3 text-slate-700">
                  {column.render ? column.render(row) : row[column.key] || "-"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    ) : (
      <EmptyState message={emptyMessage} />
    )}
  </div>
);

const PieStatusChart = ({ data }) => (
  <ResponsiveContainer width="100%" height="100%">
    <PieChart>
      <Tooltip />
      <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={48} stroke="none">
        {data.map((entry, index) => (
          <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
        ))}
      </Pie>
    </PieChart>
  </ResponsiveContainer>
);

const BarCountChart = ({ data }) => (
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data}>
      <CartesianGrid stroke="#e5e7eb" strokeDasharray="5 5" />
      <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} />
      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} />
      <Tooltip />
      <Bar dataKey="value" fill="#2563eb" radius={[8, 8, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>
);

const CaseManagerDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ preset: "last30", groupBy: "day", startDate: "", endDate: "" });

  const loadDashboard = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setRefreshing(silent);
    setError("");
    try {
      const result = await getMyDashboard(filters);
      setData(result);
    } catch {
      setError("Case Manager dashboard data could not be loaded.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const intervalId = window.setInterval(() => loadDashboard({ silent: true }), 60000);
    return () => window.clearInterval(intervalId);
  }, [loadDashboard]);

  const cards = data?.cards || {};
  const charts = data?.charts || {};
  const tables = data?.tables || {};

  const statCards = [
    ["Total Vendors", cards.totalVendors, Building2, "blue"],
    ["Active Vendors", cards.activeVendors, CheckCircle2, "green"],
    ["Inactive Vendors", cards.inactiveVendors, XCircle, "red"],
    ["Pending Vendors", cards.pendingVendors, ClipboardList, "amber"],
    ["Total Purchase Orders", cards.totalPurchaseOrders, ShoppingCart, "blue"],
    ["Pending Purchase Orders", cards.pendingPurchaseOrders, ClipboardList, "amber"],
    ["Approved Purchase Orders", cards.approvedPurchaseOrders, CheckCircle2, "green"],
    ["Total Invoices", cards.totalInvoices, FileText, "blue"],
    ["Draft Invoices", cards.draftInvoices, FileText, "slate"],
    ["Submitted Invoices", cards.submittedInvoices, FileText, "blue"],
    ["Pending Invoices", cards.pendingInvoices, ClipboardList, "amber"],
    ["Approved Invoices", cards.approvedInvoices, CheckCircle2, "green"],
    ["Rejected Invoices", cards.rejectedInvoices, XCircle, "red"],
    ["Total Payments", cards.totalPayments, CreditCard, "blue"],
    ["Pending Payments", cards.pendingPayments, ClipboardList, "amber"],
    ["Completed Payments", cards.completedPayments, CheckCircle2, "green"],
  ];

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-5">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Case Manager Dashboard</h1>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">Live operational data from your vendors, purchase orders, invoices, and payments.</p>
          </div>
          <div className="flex flex-wrap items-end gap-2.5">
            <label className="grid gap-1 text-xs sm:text-sm">
              <span className="font-medium text-slate-600">Period</span>
              <select className="h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs text-slate-700 sm:h-10 sm:px-3 sm:text-sm" value={filters.preset} onChange={(event) => setFilters((current) => ({ ...current, preset: event.target.value }))}>
                {DATE_PRESETS.map((preset) => <option key={preset.value} value={preset.value}>{preset.label}</option>)}
              </select>
            </label>
            {filters.preset === "custom" && (
              <>
                <input className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-xs text-slate-700 sm:h-10 sm:px-3 sm:text-sm" type="date" value={filters.startDate} onChange={(event) => setFilters((current) => ({ ...current, startDate: event.target.value }))} />
                <input className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-xs text-slate-700 sm:h-10 sm:px-3 sm:text-sm" type="date" value={filters.endDate} onChange={(event) => setFilters((current) => ({ ...current, endDate: event.target.value }))} />
              </>
            )}
            <label className="grid gap-1 text-xs sm:text-sm">
              <span className="font-medium text-slate-600">Group</span>
              <select className="h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs text-slate-700 sm:h-10 sm:px-3 sm:text-sm" value={filters.groupBy} onChange={(event) => setFilters((current) => ({ ...current, groupBy: event.target.value }))}>
                {GROUP_OPTIONS.map((group) => <option key={group.value} value={group.value}>{group.label}</option>)}
              </select>
            </label>
            <button className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 sm:h-10 sm:px-4 sm:text-sm" disabled={refreshing} onClick={() => loadDashboard({ silent: true })} type="button">
              <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>
      </section>

      {error && <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-xs font-semibold text-red-700 sm:text-sm">{error}</section>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-5">
        {statCards.map(([title, value, Icon, tone]) => (
          <StatCard key={title} title={title} value={value} icon={Icon} tone={tone} />
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <ChartCard title="Vendor Status" hasData={normalizeChart(charts.vendorStatus).length > 0}><PieStatusChart data={normalizeChart(charts.vendorStatus)} /></ChartCard>
        <ChartCard title="Invoice Status" hasData={normalizeChart(charts.invoiceStatus).length > 0}><PieStatusChart data={normalizeChart(charts.invoiceStatus)} /></ChartCard>
        <ChartCard title="Payment Status" hasData={normalizeChart(charts.paymentStatus).length > 0}><PieStatusChart data={normalizeChart(charts.paymentStatus)} /></ChartCard>
        <ChartCard title="Monthly Vendor Registration" hasData={normalizeChart(charts.monthlyVendorRegistration).length > 0}><BarCountChart data={normalizeChart(charts.monthlyVendorRegistration)} /></ChartCard>
        <ChartCard title="Monthly Invoice Count" hasData={normalizeChart(charts.monthlyInvoiceCount).length > 0}><BarCountChart data={normalizeChart(charts.monthlyInvoiceCount)} /></ChartCard>
        <ChartCard title="Monthly Payment Count" hasData={normalizeChart(charts.monthlyPaymentCount).length > 0}><BarCountChart data={normalizeChart(charts.monthlyPaymentCount)} /></ChartCard>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-950">Top Vendors by Payment Value</h2>
            <p className="mt-0.5 text-xs text-slate-500">Ranked by total payment value in selected period</p>
          </div>
        </div>
        <DataTable
          emptyMessage="No vendor data available yet"
          rows={charts.topVendors || []}
          columns={[
            { key: "name", label: "Vendor", render: (row) => <div><p className="font-semibold text-slate-900">{row.name}</p><p className="text-xs text-slate-500">{row.vendorCode}</p></div> },
            { key: "value", label: "Total Payment Value", render: (row) => formatCurrency(row.value) },
            { key: "count", label: "Payments Count" },
          ]}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-base font-bold text-slate-950">Latest Vendors</h2>
          <div className="mt-4">
            <DataTable
              emptyMessage="No vendor data available yet"
              rows={tables.latestVendors || []}
              columns={[
                { key: "name", label: "Vendor" },
                { key: "vendor_code", label: "Code" },
                { key: "status", label: "Status" }
              ]}
            />
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-base font-bold text-slate-950">Latest Purchase Orders</h2>
          <div className="mt-4">
            <DataTable
              emptyMessage="No purchase orders available yet"
              rows={tables.latestPurchaseOrders || []}
              columns={[
                { key: "po_number", label: "PO Number" },
                { key: "vendor", label: "Vendor", render: (row) => row.vendor?.name || "-" },
                { key: "amount", label: "Amount", render: (row) => formatCurrency(row.amount, row.currency) },
                { key: "status", label: "Status" }
              ]}
            />
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-base font-bold text-slate-950">Latest Invoices</h2>
          <div className="mt-4">
            <DataTable
              emptyMessage="No invoices available yet"
              rows={tables.latestInvoices || []}
              columns={[
                { key: "invoice_number", label: "Invoice Number" },
                { key: "vendor", label: "Vendor", render: (row) => row.vendor?.name || "-" },
                { key: "amount", label: "Amount", render: (row) => formatCurrency(row.amount, row.currency) },
                { key: "status", label: "Status" }
              ]}
            />
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-base font-bold text-slate-950">Latest Payments</h2>
          <div className="mt-4">
            <DataTable
              emptyMessage="No payments available yet"
              rows={tables.latestPayments || []}
              columns={[
                { key: "payment_number", label: "Payment Number" },
                { key: "vendor", label: "Vendor", render: (row) => row.vendor?.name || "-" },
                { key: "amount", label: "Amount", render: (row) => formatCurrency(row.amount, row.currency) },
                { key: "status", label: "Status" }
              ]}
            />
          </div>
        </section>
      </div>
    </div>
  );
};

export default CaseManagerDashboard;
