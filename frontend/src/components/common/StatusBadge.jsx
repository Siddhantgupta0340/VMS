import { X, CheckCircle, AlertCircle, Clock, RefreshCw, Ban } from "lucide-react";

const normalizeStatus = (status = "") => {
  const s = String(status || "").toLowerCase().trim();
  const map = {
    pending: "Pending",
    initiated: "Under Review",
    processing: "Under Review",
    under_review: "Under Review",
    approved: "Approved",
    rejected: "Rejected",
    failed: "Rejected",
    returned: "Returned for Correction",
    returned_for_correction: "Returned for Correction",
    paid: "Paid",
    completed: "Paid",
    success: "Paid",
    cancelled: "Cancelled",
    created: "Created",
    blocked: "Inactive",
    active: "Active",
    inactive: "Deactivated",
  };

  return map[s] || status;
};

const statusConfig = {
  Active: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", icon: CheckCircle },
  Pending: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", icon: Clock },
  "Under Review": { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200", icon: RefreshCw },
  Approved: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", icon: CheckCircle },
  Rejected: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", icon: X },
  "Returned for Correction": { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", icon: AlertCircle },
  Paid: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", icon: CheckCircle },
  Cancelled: { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-300", icon: Ban },
  Inactive: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", icon: X },
  Deactivated: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", icon: X },
  Created: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", icon: CheckCircle },
  "Awaiting Approval": { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", icon: AlertCircle },
  Draft: { bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200", icon: AlertCircle },
  "Partially Paid": { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", icon: Clock },
  Overdue: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", icon: AlertCircle },
};

const StatusBadge = ({ status, className = "" }) => {
  const normalized = normalizeStatus(status);
  const config = statusConfig[normalized] || statusConfig.Pending;
  const Icon = config.icon;

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      <Icon size={14} />
      <span>{normalized}</span>
    </div>
  );
};

export default StatusBadge;
