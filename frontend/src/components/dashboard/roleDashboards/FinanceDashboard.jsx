import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Users,
  Wallet,
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
  getFinanceHeadDashboard,
} from "../../../services/dashboardService";

const STATUS_COLORS = ["#2563eb", "#f59e0b", "#16a34a", "#dc2626"];

const safeNumber = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCompact = (value) =>
  new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(safeNumber(value));

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(safeNumber(value));

const normalizeSeries = (source) =>
  Array.isArray(source)
    ? source
        .map((item) => ({
          label: item?.label ?? "",
          value: safeNumber(item?.value),
          count: safeNumber(item?.count),
        }))
        .filter((item) => item.label)
    : [];

const EmptyPanel = ({ message = "No data available." }) => (
  <div className="flex h-full min-h-44 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 text-center text-sm font-medium text-slate-500">
    {message}
  </div>
);

const StatCard = ({ icon: Icon, title, value, subtitle, tone = "blue" }) => {
  const tones = {
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    green: "border-emerald-100 bg-emerald-50 text-emerald-700",
    red: "border-red-100 bg-red-50 text-red-700",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <h2 className="mt-3 truncate text-3xl font-bold leading-none text-slate-950">{value}</h2>
          {subtitle ? <p className="mt-2 text-sm text-slate-500">{subtitle}</p> : null}
        </div>
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${tones[tone]}`}>
          <Icon size={20} />
        </div>
      </div>
    </section>
  );
};

const ChartCard = ({ title, subtitle, hasData, children }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <h2 className="text-base font-semibold text-slate-900">{title}</h2>
    {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
    <div className="mt-5 h-72">{hasData ? children : <EmptyPanel />}</div>
  </section>
);

const ActivityItem = ({ activity }) => {
  const actor = activity?.performed_by;
  const actorName = `${actor?.first_name || ""} ${actor?.last_name || ""}`.trim() || actor?.email || "System";

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold capitalize text-slate-900">
            {(activity?.action || "activity").replaceAll("_", " ")}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {actorName} - {activity?.performed_by?.employee_id || activity?.performed_by?.role || "SYSTEM"}
          </p>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
          {activity?.entity_type || "event"}
        </span>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        {activity?.created_at ? new Date(activity.created_at).toLocaleString("en-IN") : "Timestamp unavailable"}
      </p>
    </div>
  );
};

const FinanceDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    preset: "last30",
    groupBy: "day",
    startDate: "",
    endDate: "",
  });

  const loadDashboard = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setRefreshing(silent);
    setError("");

    try {
      const response = await getFinanceHeadDashboard(filters);
      setData(response);
    } catch {
      setError("Finance Head dashboard data could not be loaded. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const vendorReview = data?.summary?.vendorReview ?? {};
  const payments = data?.summary?.payments ?? {};
  const employees = data?.summary?.employees ?? {};
  const vendorDistribution = Array.isArray(data?.charts?.vendorReviewStatusDistribution)
    ? data.charts.vendorReviewStatusDistribution.filter((item) => safeNumber(item.value) > 0)
    : [];
  const employeeDistribution = Array.isArray(data?.charts?.employeeStatusDistribution)
    ? data.charts.employeeStatusDistribution.filter((item) => safeNumber(item.value) > 0)
    : [];
  const highValuePaymentTrend = normalizeSeries(data?.trends?.highValuePayments);
  const recentActivity = Array.isArray(data?.recentActivity) ? data.recentActivity : [];

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  if (loading) {
    return (
      <div className="grid gap-6">
        <div className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white" />
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
            <p className="text-sm font-medium text-slate-500">Finance Head Workspace</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
              Finance Review Dashboard
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Live vendor-review, high-value payment, managed employee, and scoped audit activity from secured backend queries.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-600">Period</span>
              <select
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500"
                value={filters.preset}
                onChange={(event) => updateFilter("preset", event.target.value)}
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
                    onChange={(event) => updateFilter("startDate", event.target.value)}
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-slate-600">End</span>
                  <input
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500"
                    type="date"
                    value={filters.endDate}
                    onChange={(event) => updateFilter("endDate", event.target.value)}
                  />
                </label>
              </>
            )}

            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-600">Group</span>
              <select
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500"
                value={filters.groupBy}
                onChange={(event) => updateFilter("groupBy", event.target.value)}
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
        <StatCard icon={Clock3} title="Pending Vendor Reviews" value={formatCompact(vendorReview.pending)} subtitle="Awaiting Finance decision" />
        <StatCard icon={AlertTriangle} title="Vendors On Hold" value={formatCompact(vendorReview.onHold)} subtitle="Blocked pending correction" tone="amber" />
        <StatCard icon={CheckCircle2} title="Approved Vendors" value={formatCompact(vendorReview.approved)} subtitle="Approved vendor records" tone="green" />
        <StatCard icon={Wallet} title="High-Value Payments" value={formatCompact(payments.awaitingApproval)} subtitle={`${formatCurrency(payments.awaitingAmount)} awaiting approval`} />
        <StatCard icon={Wallet} title="Payments >= Threshold" value={formatCompact(payments.highValueCount)} subtitle={`Threshold ${formatCurrency(payments.threshold)}`} tone="slate" />
        <StatCard icon={Users} title="Managed Employees" value={formatCompact(employees.total)} subtitle={`${formatCompact(employees.active)} active, ${formatCompact(employees.deactivated)} deactivated`} />
        <StatCard icon={Users} title="New Managed Employees" value={formatCompact(employees.newInPeriod)} subtitle="Lower-level roles only" tone="green" />
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-8">
          <ChartCard title="High-Value Payment Trend" subtitle="INR payments at or above the Finance Head approval threshold." hasData={highValuePaymentTrend.length > 0}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={highValuePaymentTrend}>
                <CartesianGrid stroke="#e5e7eb" strokeDasharray="5 5" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="value" fill="#2563eb" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="Vendor Review Status" subtitle="Distribution from real vendor review statuses." hasData={vendorDistribution.length > 0}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip />
                  <Pie data={vendorDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={58} paddingAngle={2} stroke="none">
                    {vendorDistribution.map((entry, index) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Managed Employee Status" subtitle="Finance Head scope excludes Super Admin and Finance Head users." hasData={employeeDistribution.length > 0}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip />
                  <Pie data={employeeDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={58} paddingAngle={2} stroke="none">
                    {employeeDistribution.map((entry, index) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>

        <aside className="xl:col-span-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Scoped Recent Activity</h2>
            <p className="mt-1 text-sm text-slate-500">Audit events relevant to Finance Head responsibilities.</p>
            <div className="mt-5 space-y-3">
              {recentActivity.length > 0
                ? recentActivity.map((activity) => <ActivityItem key={activity.id} activity={activity} />)
                : <EmptyPanel />}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default FinanceDashboard;
