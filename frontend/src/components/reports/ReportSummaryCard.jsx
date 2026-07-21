import { TrendingUp } from "lucide-react";

/**
 * Summary stat card used in all report pages.
 *
 * Props:
 *   title      - Card label
 *   value      - Displayed value (number or string)
 *   icon       - Lucide icon component
 *   colorClass - Tailwind bg + text color classes (e.g. "bg-blue-50 text-blue-600")
 *   prefix     - Optional prefix symbol (e.g. "₹")
 *   loading    - Show skeleton when true
 */
const ReportSummaryCard = ({
  title,
  value,
  icon: Icon = TrendingUp,
  colorClass = "bg-blue-50 text-blue-600",
  prefix = "",
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 w-24 rounded bg-slate-200" />
          <div className="h-9 w-9 rounded-xl bg-slate-200" />
        </div>
        <div className="h-7 w-16 rounded bg-slate-200 mt-2" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${colorClass}`}>
          <Icon size={18} />
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-900">
        {prefix}{typeof value === "number" ? value.toLocaleString("en-IN") : (value ?? "—")}
      </p>
    </div>
  );
};

export default ReportSummaryCard;
