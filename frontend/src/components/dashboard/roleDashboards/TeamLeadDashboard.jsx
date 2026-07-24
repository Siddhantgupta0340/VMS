import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  ClipboardList,
  FileText,
  RefreshCw,
  Wallet,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";

import { getMyDashboard } from "../../../services/dashboardService";

// ─── Formatters ────────────────────────────────────────────────────────────────
const safeNumber = (value) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const formatNumber = (value) =>
  new Intl.NumberFormat("en-IN").format(safeNumber(value));

// ─── Sub-components ────────────────────────────────────────────────────────────
const TONE_CLASSES = {
  blue:  "border-blue-100  bg-blue-50  text-blue-700",
  amber: "border-amber-100 bg-amber-50 text-amber-700",
  green: "border-emerald-100 bg-emerald-50 text-emerald-700",
  red:   "border-red-100   bg-red-50   text-red-700",
  slate: "border-slate-200 bg-slate-50 text-slate-700",
};

function StatCard({ icon: Icon, title, value, subtitle, tone = "blue" }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-slate-500 sm:text-sm">{title}</p>
          <h2 className="mt-2 truncate text-2xl font-bold leading-none text-slate-950 sm:text-3xl">
            {formatNumber(value)}
          </h2>
          {subtitle ? (
            <p className="mt-1.5 truncate text-xs text-slate-500">{subtitle}</p>
          ) : null}
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border sm:h-12 sm:w-12 ${TONE_CLASSES[tone]}`}
        >
          <Icon size={20} />
        </div>
      </div>
    </section>
  );
}

function SkeletonCards({ count = 4 }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white"
        />
      ))}
    </div>
  );
}

function EmptyRow({ colSpan, message }) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-4 py-10 text-center text-xs text-slate-500 sm:text-sm"
      >
        {message}
      </td>
    </tr>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
const TeamLeadDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setRefreshing(silent);
    setError("");
    try {
      const result = await getMyDashboard({ preset: "thisMonth" });
      setData(result);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Team Lead dashboard data could not be loaded."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const id = window.setInterval(() => load({ silent: true }), 60_000);
    return () => window.clearInterval(id);
  }, [load]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const pending   = data?.pendingActions ?? {};
  const summary   = data?.summary       ?? {};
  const invoices  = summary.invoices    ?? {};
  const payments  = summary.payments    ?? {};

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        <SkeletonCards count={4} />
        <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Team Lead Workspace</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Team Lead Dashboard
            </h1>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              Your invoice approval queue and operational overview — live from PostgreSQL.
            </p>
          </div>
          <button
            type="button"
            onClick={() => load({ silent: true })}
            disabled={refreshing}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:h-10 sm:px-4 sm:text-sm disabled:opacity-60"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </section>

      {/* ── Error ──────────────────────────────────────────────────────────── */}
      {error && (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-xs font-semibold text-red-700 sm:text-sm">
          {error}
        </section>
      )}

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-5">
        <StatCard
          icon={ClipboardList}
          title="Pending Invoice Approvals"
          value={pending.pendingInvoiceApprovals}
          subtitle="Invoices awaiting your approval"
          tone="amber"
        />
        <StatCard
          icon={FileText}
          title="Total Invoices"
          value={invoices.total}
          subtitle={`${formatNumber(invoices.approved)} approved`}
          tone="blue"
        />
        <StatCard
          icon={CheckCircle2}
          title="Approved Invoices"
          value={invoices.approved}
          subtitle="Fully approved in system"
          tone="green"
        />
        <StatCard
          icon={XCircle}
          title="Rejected Invoices"
          value={invoices.rejected}
          subtitle="Declined in review"
          tone="red"
        />
        <StatCard
          icon={Wallet}
          title="Total Payments"
          value={payments.total}
          subtitle={`${formatNumber(payments.success ?? payments.completed)} successful`}
          tone="blue"
        />
        <StatCard
          icon={ClipboardList}
          title="Pending Payments"
          value={payments.pending}
          subtitle="Awaiting processing"
          tone="amber"
        />
        <StatCard
          icon={CheckCircle2}
          title="Successful Payments"
          value={payments.success ?? payments.completed}
          subtitle="Completed successfully"
          tone="green"
        />
        <StatCard
          icon={XCircle}
          title="Failed Payments"
          value={payments.failed}
          subtitle="Processing errors"
          tone="red"
        />
      </div>

      {/* ── Pending Invoice Approvals Table ────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Invoice Approval Queue
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
              Invoices routed to Team Lead for approval (
              <code className="rounded bg-slate-100 px-1 text-xs">
                PENDING_TEAM_LEAD
              </code>
              )
            </p>
          </div>
          {/* <Link
            to="/approvals"
            className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 sm:h-9 sm:text-sm"
          >
            Open queue
          </Link> */}
        </div>

        {safeNumber(pending.pendingInvoiceApprovals) === 0 ? (
          <div className="flex min-h-36 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-xs font-medium text-slate-500 sm:text-sm">
            No invoices pending your approval at this time.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                <EmptyRow
                  colSpan={5}
                  message={`${safeNumber(pending.pendingInvoiceApprovals)} invoice(s) awaiting approval — open the queue to review them.`}
                />
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default TeamLeadDashboard;
