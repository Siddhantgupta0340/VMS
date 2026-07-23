import { useCallback, useEffect, useState } from "react";
import { CheckCircle, Clock, RefreshCw, Wallet, XCircle } from "lucide-react";
import { Link } from "react-router-dom";

import { getMyDashboard } from "../../../services/dashboardService";

const money = (value) => `Rs. ${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const dateTime = (value) => (value ? new Date(value).toLocaleString("en-IN") : "-");

const Stat = ({ icon: Icon, label, value, hint, tone = "blue" }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-slate-500 sm:text-sm">{label}</p>
        <h2 className="mt-2 truncate text-2xl font-bold leading-none text-slate-950 sm:text-3xl">{value}</h2>
        {hint ? <p className="mt-1.5 truncate text-xs text-slate-500">{hint}</p> : null}
      </div>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border sm:h-12 sm:w-12 ${tone === "green" ? "border-emerald-100 bg-emerald-50 text-emerald-700" : tone === "red" ? "border-red-100 bg-red-50 text-red-700" : tone === "amber" ? "border-amber-100 bg-amber-50 text-amber-700" : "border-blue-100 bg-blue-50 text-blue-700"}`}>
        <Icon size={20} />
      </div>
    </div>
  </section>
);

const ManagerDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setRefreshing(silent);
    setError("");
    try {
      setData(await getMyDashboard({ preset: "thisMonth" }));
    } catch (err) {
      setError(err?.response?.data?.message || "Manager dashboard data could not be loaded.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      </div>
    );
  }
  if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-xs font-semibold text-red-700 sm:text-sm">{error}</div>;

  const summary = data?.summary || {};
  const approvals = data?.paymentApprovals || [];
  const history = data?.approvalHistory || [];
  const limits = data?.approvalLimits || {};

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Manager Dashboard</h1>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              Payment approvals from {money(limits.managerMin)} to {money(limits.managerMax)}
            </p>
          </div>
          <button type="button" onClick={() => load({ silent: true })} disabled={refreshing} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:h-10 sm:px-4 sm:text-sm">
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-5">
        <Stat icon={Clock} label="Pending Payment Approvals" value={summary.pendingPaymentApprovals || 0} hint={money(summary.pendingAmount)} tone="amber" />
        <Stat icon={CheckCircle} label="Approved Payments" value={summary.approvedPayments || 0} tone="green" />
        <Stat icon={XCircle} label="Rejected Payments" value={summary.rejectedPayments || 0} tone="red" />
        <Stat icon={Wallet} label="Today's Requests" value={summary.todaysRequests || 0} hint={`${summary.weeksRequests || 0} this week, ${summary.monthsRequests || 0} this month`} />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-950 sm:text-lg">Assigned Payment Approvals</h2>
          <Link to="/payments" className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 sm:h-9 sm:text-sm">Open queue</Link>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-3 py-3">Payment</th>
                <th className="px-3 py-3">Invoice</th>
                <th className="px-3 py-3">PO</th>
                <th className="px-3 py-3">Vendor</th>
                <th className="px-3 py-3 text-right">Amount</th>
                <th className="px-3 py-3">Requested By</th>
                <th className="px-3 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {approvals.map((item) => (
                <tr key={item.id} className="transition hover:bg-slate-50/50">
                  <td className="px-3 py-3 font-semibold text-blue-700">{item.paymentNumber}</td>
                  <td className="px-3 py-3">{item.invoiceNumber || "-"}</td>
                  <td className="px-3 py-3">{item.purchaseOrderNumber || "-"}</td>
                  <td className="px-3 py-3">{item.vendorName || "-"}<div className="text-xs text-slate-500">{item.vendorCode || "-"}</div></td>
                  <td className="px-3 py-3 text-right font-semibold">{money(item.requestedAmount)}</td>
                  <td className="px-3 py-3">{item.requestedBy || "-"}</td>
                  <td className="px-3 py-3">{item.currentStatus}</td>
                </tr>
              ))}
              {!approvals.length && (
                <tr>
                  <td colSpan="7" className="px-3 py-8 text-center text-xs text-slate-500 sm:text-sm">
                    No approval requests pending at this time.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-4 text-base font-bold text-slate-950 sm:text-lg">Approval History</h2>
        <div className="space-y-3">
          {history.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
              <p className="text-xs font-semibold capitalize text-slate-900 sm:text-sm">{String(item.action || "").replaceAll("_", " ")}</p>
              <p className="mt-1 text-xs text-slate-500">{item.remarks || "No remarks"} - {dateTime(item.created_at)}</p>
            </div>
          ))}
          {!history.length && (
            <div className="flex min-h-24 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-xs font-medium text-slate-500 sm:text-sm">
              No approval history available yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default ManagerDashboard;
