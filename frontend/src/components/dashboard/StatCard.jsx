import { TrendingUp, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const StatCard = ({
  title,
  value,
  subtitle,
  change,
  actionLink,
  actionText = "View details",
  color = "bg-[#0F2747]",
  icon: Icon,
}) => {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs transition-all duration-200 hover:border-[#2F80ED]/40 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">{title}</p>

          <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#172033] md:text-3xl">
            {value}
          </h2>

          {subtitle && (
            <p className="mt-1 text-xs text-[#64748B]">{subtitle}</p>
          )}

          {change && (
            <div className="mt-3 flex items-center gap-1.5">
              <TrendingUp size={14} className="text-[#10B981]" />
              <span className="text-xs font-semibold text-[#10B981]">
                {change}
              </span>
            </div>
          )}
        </div>

        {Icon && (
          <div className={`${color} shrink-0 rounded-xl p-3 text-white shadow-xs`}>
            <Icon size={22} />
          </div>
        )}
      </div>

      {actionLink && (
        <div className="mt-4 border-t border-[#E2E8F0] pt-3">
          <Link
            to={actionLink}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2F80ED] transition hover:text-[#163A63]"
          >
            <span>{actionText}</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      )}
    </div>
  );
};

export default StatCard;