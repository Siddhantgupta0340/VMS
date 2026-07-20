import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCircle, Clock, RefreshCw, Wallet, XCircle } from "lucide-react";
import { Link } from "react-router-dom";

import { getMyDashboard } from "../../../services/dashboardService";

const money = (value) => `Rs. ${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const dateTime = (value) => (value ? new Date(value).toLocaleString("en-IN") : "-");

const Stat = ({ icon: Icon, label, value, hint, tone = "blue" }) => (
  <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-950">{value}</h2>
        {hint ? <p className="mt-1 text-sm text-slate-500">{hint}</p> : null}
      </div>
      <div className={`rounded-xl p-3 ${tone === "green" ? "bg-emerald-50 text-emerald-700" : tone === "red" ? "bg-red-50 text-red-700" : tone === "amber" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>
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

  if (loading) return <div className="flex h-96 items-center justify-center">Loading Manager Dashboard...</div>;
  if (error) return <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">{error}</div>;

  const summary = data?.summary || {};
  const approvals = data?.paymentApprovals || [];
  const history = data?.approvalHistory || [];
  const notifications = data?.notifications || [];
  const limits = data?.approvalLimits || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">Manager Dashboard</h1>
          <p className="mt-1 text-slate-500">
            Payment approvals from {money(limits.managerMin)} to {money(limits.managerMax)}
          </p>
        </div>
        <button type="button" onClick={() => load({ silent: true })} disabled={refreshing} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700">
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Clock} label="Pending Payment Approvals" value={summary.pendingPaymentApprovals || 0} hint={money(summary.pendingAmount)} tone="amber" />
        <Stat icon={CheckCircle} label="Approved Payments" value={summary.approvedPayments || 0} tone="green" />
        <Stat icon={XCircle} label="Rejected Payments" value={summary.rejectedPayments || 0} tone="red" />
        <Stat icon={Wallet} label="Today's Requests" value={summary.todaysRequests || 0} hint={`${summary.weeksRequests || 0} this week, ${summary.monthsRequests || 0} this month`} />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-950">Assigned Payment Approvals</h2>
          <Link to="/payments" className="text-sm font-semibold text-blue-700">Open queue</Link>
        </div>
        <div className="overflow-x-auto">
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
            <tbody className="divide-y divide-slate-100">
              {approvals.map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-3 font-semibold text-blue-700">{item.paymentNumber}</td>
                  <td className="px-3 py-3">{item.invoiceNumber || "-"}</td>
                  <td className="px-3 py-3">{item.purchaseOrderNumber || "-"}</td>
                  <td className="px-3 py-3">{item.vendorName || "-"}<div className="text-xs text-slate-500">{item.vendorCode || "-"}</div></td>
                  <td className="px-3 py-3 text-right font-semibold">{money(item.requestedAmount)}</td>
                  <td className="px-3 py-3">{item.requestedBy || "-"}</td>
                  <td className="px-3 py-3">{item.currentStatus}</td>
                </tr>
              ))}
              {!approvals.length && <tr><td colSpan="7" className="px-3 py-8 text-center text-slate-500">No approval request found.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-950">Approval History</h2>
          <div className="space-y-3">
            {history.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-100 p-3">
                <p className="font-semibold capitalize text-slate-900">{String(item.action || "").replaceAll("_", " ")}</p>
                <p className="text-sm text-slate-500">{item.remarks || "No remarks"} - {dateTime(item.created_at)}</p>
              </div>
            ))}
            {!history.length && <p className="text-sm text-slate-500">No approval history yet.</p>}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-950"><Bell size={18} /> Notifications</h2>
          <div className="space-y-3">
            {notifications.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-100 p-3">
                <p className="font-semibold text-slate-900">{item.title}</p>
                <p className="text-sm text-slate-500">{item.message}</p>
              </div>
            ))}
            {!notifications.length && <p className="text-sm text-slate-500">No notifications.</p>}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ManagerDashboard;
