import { X, CheckCircle, AlertCircle, Clock } from "lucide-react";

const normalizeStatus = (status = "") => {
  const map = {
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    blocked: "Inactive",
    active: "Active",
    inactive: "Inactive",
  };

  return map[status.toLowerCase()] || status;
};

const statusConfig = {
  Active: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", icon: CheckCircle },
  Pending: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200", icon: Clock },
  Inactive: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", icon: X },
  Approved: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", icon: CheckCircle },
  Rejected: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", icon: X },
  "Awaiting Approval": { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", icon: AlertCircle },
  Draft: { bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200", icon: AlertCircle },
  Paid: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", icon: CheckCircle },
  "Partially Paid": { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", icon: Clock },
  Overdue: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", icon: AlertCircle },
};

const StatusBadge = ({ status, className = "" }) => {
  const normalized = normalizeStatus(status);

  const config = statusConfig[normalized] || statusConfig.Pending;

  const Icon = config.icon;

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      <Icon size={14} />
      <span className="text-xs font-semibold">{normalized}</span>
    </div>
  );
};

export default StatusBadge;
