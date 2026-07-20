import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  Building2,
  DollarSign,
  FileSearch,
  Package,
  Receipt,
  RefreshCw,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
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
  getDashboardAnalytics,
} from "../../../services/dashboardService";

const COMPANY_NAME = "VMS Enterprise";
const STATUS_PALETTE = ["#2563eb", "#0ea5e9", "#f43f5e", "#64748b"];

function safeNumber(value, fallback = 0) {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function formatCompact(value) {
  return new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(safeNumber(value, 0));
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(safeNumber(value, 0));
}

function formatDateTime(value) {
  if (!value) return "Timestamp unavailable";
  return new Date(value).toLocaleString();
}

function normalizeSeries(source) {
  if (!Array.isArray(source)) return [];

  return source
    .map((item) => ({
      label: item?.label ?? item?.period ?? "",
      value: safeNumber(item?.value, 0),
      count: safeNumber(item?.count, 0),
    }))
    .filter((item) => item.label);
}

function EmptyPanel({ message = "No data available." }) {
  return (
    <div className="flex h-full min-h-48 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 text-center text-sm font-medium text-slate-500">
      {message}
    </div>
  );
}

function ChartShell({ title, children, hasData, subtitle }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600">
            <Activity size={18} />
          </div>
        </div>
        <div className="mt-5 h-80">
          {hasData ? children : <EmptyPanel />}
        </div>
      </div>
    </section>
  );
}

function StatCard({ title, value, subtitle, index, icon: Icon }) {
  const accent =
    index % 4 === 0
      ? "bg-blue-50 border-blue-100 text-blue-700"
      : index % 4 === 1
        ? "bg-slate-50 border-slate-200 text-slate-700"
        : index % 4 === 2
          ? "bg-emerald-50 border-emerald-100 text-emerald-700"
          : "bg-amber-50 border-amber-100 text-amber-700";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <h2 className="mt-3 truncate text-3xl font-bold leading-none text-slate-950">{value}</h2>
          {subtitle ? <p className="mt-2 text-sm text-slate-500">{subtitle}</p> : null}
        </div>
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${accent}`}>
          <Icon size={20} />
        </div>
      </div>
    </section>
  );
}

function TimelineItem({ activity }) {
  const actor = activity?.performed_by;
  const actorName = `${actor?.first_name ?? ""} ${actor?.last_name ?? ""}`.trim() || actor?.email || "System";
  const title = activity?.action ?? activity?.entity_type ?? "Activity";

  return (
    <div className="flex gap-4">
      <div className="relative">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700">
          <div className="h-2 w-2 rounded-full bg-blue-600" />
        </div>
        <div className="absolute left-1/2 top-10 h-6 w-px -translate-x-1/2 bg-slate-200" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold capitalize text-slate-900">{title.replaceAll("_", " ")}</p>
        <p className="mt-1 text-sm text-slate-500">
          {actorName} - {formatDateTime(activity?.created_at)}
        </p>
      </div>
    </div>
  );
}

function TopVendorTable({ vendors }) {
  if (!vendors.length) return <EmptyPanel />;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Vendor</th>
            <th className="px-4 py-3 text-right">Revenue</th>
            <th className="px-4 py-3 text-right">Payments</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {vendors.map((vendor) => (
            <tr key={vendor.id}>
              <td className="px-4 py-3">
                <p className="font-semibold text-slate-900">{vendor.name}</p>
                <p className="text-xs text-slate-500">{vendor.vendorCode}</p>
              </td>
              <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatCurrency(vendor.revenue)}</td>
              <td className="px-4 py-3 text-right text-slate-600">{formatCompact(vendor.paymentCount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const DashboardOverview = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    preset: "last30",
    groupBy: "day",
    startDate: "",
    endDate: "",
  });

  const loadDashboard = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setRefreshing(silent);
    setError(null);

    try {
      const analytics = await getDashboardAnalytics(filters);
      setData(analytics);
    } catch {
      setError("Dashboard data could not be loaded. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const summary = data?.summary ?? {};
  const users = summary.users ?? {};
  const vendors = summary.vendors ?? {};
  const purchaseOrders = summary.purchaseOrders ?? {};
  const invoices = summary.invoices ?? {};
  const payments = summary.payments ?? {};
  const revenue = summary.revenue ?? {};
  const threeWayMatching = summary.threeWayMatching ?? {};
  const revenueTrend = normalizeSeries(data?.trends?.revenue);
  const vendorGrowth = normalizeSeries(data?.trends?.vendorGrowth);
  const purchaseOrderTrend = normalizeSeries(data?.trends?.purchaseOrders);
  const invoiceStatus = Array.isArray(data?.charts?.invoiceStatusDistribution)
    ? data.charts.invoiceStatusDistribution.filter((item) => safeNumber(item.value) > 0)
    : [];
  const paymentStatus = Array.isArray(data?.charts?.paymentStatusDistribution)
    ? data.charts.paymentStatusDistribution.filter((item) => safeNumber(item.value) > 0)
    : [];
  const recentActivity = Array.isArray(data?.recentActivity) ? data.recentActivity : [];
  const topVendors = Array.isArray(data?.topVendors) ? data.topVendors : [];

  const kpiCards = [
    {
      title: "Recognized Revenue",
      value: formatCurrency(revenue.recognized),
      subtitle: "Successful payments only",
      Icon: DollarSign,
    },
    {
      title: "Total Users",
      value: formatCompact(users.total),
      subtitle: `${formatCompact(users.active)} active, ${formatCompact(users.deactivated)} deactivated`,
      Icon: Users,
    },
    {
      title: "Approved Vendors",
      value: formatCompact(vendors.approved),
      subtitle: `${formatCompact(vendors.total)} total vendor records`,
      Icon: Building2,
    },
    {
      title: "Purchase Orders",
      value: formatCompact(purchaseOrders.total),
      subtitle: formatCurrency(purchaseOrders.totalValue),
      Icon: Package,
    },
    {
      title: "Invoices",
      value: formatCompact(invoices.total),
      subtitle: `${formatCompact(invoices.approved)} approved, ${formatCompact(invoices.pending)} pending`,
      Icon: Receipt,
    },
    {
      title: "Outstanding Amount",
      value: formatCurrency(invoices.outstandingAmount),
      subtitle: `${formatCurrency(invoices.overdueAmount)} overdue`,
      Icon: Wallet,
    },
    {
      title: "Payment Success",
      value: formatCompact(payments.success),
      subtitle: `${formatCompact(payments.pending)} pending, ${formatCompact(payments.failed)} failed`,
      Icon: ShieldCheck,
    },
    {
      title: "Three-Way Matches",
      value: formatCompact(threeWayMatching.total),
      subtitle: `${formatCompact(threeWayMatching.matched)} matched`,
      Icon: FileSearch,
    },
  ];

  const metadataRange = data?.filters
    ? `${new Date(data.filters.startDate).toLocaleDateString()} - ${new Date(data.filters.endDate).toLocaleDateString()}`
    : "";

  const handleFilterChange = (key, value) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  };

  if (loading) {
    return (
      <div className="grid gap-6">
        <div className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">{COMPANY_NAME}</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
              Analytics Dashboard
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Live metrics from secured backend analytics queries across users, vendors, purchase orders, invoices, payments, and audit activity.
            </p>
            {metadataRange ? (
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Reporting period: {metadataRange}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-600">Period</span>
              <select
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500"
                value={filters.preset}
                onChange={(event) => handleFilterChange("preset", event.target.value)}
              >
                {DATE_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>{preset.label}</option>
                ))}
              </select>
            </label>

            {filters.preset === "custom" && (
              <>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-slate-600">Start</span>
                  <input
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500"
                    type="date"
                    value={filters.startDate}
                    onChange={(event) => handleFilterChange("startDate", event.target.value)}
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-slate-600">End</span>
                  <input
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500"
                    type="date"
                    value={filters.endDate}
                    onChange={(event) => handleFilterChange("endDate", event.target.value)}
                  />
                </label>
              </>
            )}

            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-600">Group</span>
              <select
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500"
                value={filters.groupBy}
                onChange={(event) => handleFilterChange("groupBy", event.target.value)}
              >
                {GROUP_OPTIONS.map((group) => (
                  <option key={group.value} value={group.value}>{group.label}</option>
                ))}
              </select>
            </label>

            <button
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              disabled={refreshing}
              onClick={() => loadDashboard({ silent: true })}
              type="button"
            >
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>
      </section>

      {error ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
          <h2 className="text-base font-semibold">Dashboard unavailable</h2>
          <p className="mt-1 text-sm">{error}</p>
        </section>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card, index) => (
          <StatCard
            key={card.title}
            title={card.title}
            value={card.value}
            subtitle={card.subtitle}
            index={index}
            icon={card.Icon}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-8">
          <ChartShell title="Recognized Revenue Trend" subtitle="Successful payments grouped by the selected period." hasData={revenueTrend.length > 0}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrend}>
                <defs>
                  <linearGradient id="revenueTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e5e7eb" strokeDasharray="5 5" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Area type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2.5} fill="url(#revenueTrend)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartShell>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ChartShell title="Vendor Growth" subtitle="New vendor records in the selected period." hasData={vendorGrowth.length > 0}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={vendorGrowth}>
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="5 5" />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0ea5e9" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartShell>

            <ChartShell title="Purchase Order Value" subtitle="PO value grouped by the selected period." hasData={purchaseOrderTrend.length > 0}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={purchaseOrderTrend}>
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="5 5" />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Bar dataKey="value" fill="#2563eb" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartShell>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ChartShell title="Invoice Status Distribution" subtitle="Only statuses present in database records are shown." hasData={invoiceStatus.length > 0}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip />
                  <Pie data={invoiceStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={105} innerRadius={62} paddingAngle={2} stroke="none">
                    {invoiceStatus.map((entry, index) => (
                      <Cell key={entry.name} fill={STATUS_PALETTE[index % STATUS_PALETTE.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </ChartShell>

            <ChartShell title="Payment Status Summary" subtitle="Counts by real payment status." hasData={paymentStatus.length > 0}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip />
                  <Pie data={paymentStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={105} innerRadius={62} paddingAngle={2} stroke="none">
                    {paymentStatus.map((entry, index) => (
                      <Cell key={entry.name} fill={STATUS_PALETTE[index % STATUS_PALETTE.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </ChartShell>
          </div>
        </div>

        <aside className="space-y-6 xl:col-span-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Top Vendors by Revenue</h2>
            <p className="mt-1 text-sm text-slate-500">Successful payment value only.</p>
            <div className="mt-5">
              <TopVendorTable vendors={topVendors} />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Recent Activity</h2>
            <p className="mt-1 text-sm text-slate-500">Latest safe audit events in the selected period.</p>

            <div className="mt-6 space-y-6">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <TimelineItem key={activity.id ?? `${activity.action}-${activity.created_at}`} activity={activity} />
                ))
              ) : (
                <EmptyPanel />
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default DashboardOverview;
