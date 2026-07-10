import { TrendingUp } from "lucide-react";

const StatCard = ({
  title,
  value,
  change,
  color = "bg-blue-600",
  icon: Icon,
}) => {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">

      <div className="flex items-center justify-between">

        <div>

          <p className="text-sm text-slate-500">{title}</p>

          <h2 className="mt-3 text-4xl font-bold text-slate-900">
            {value}
          </h2>

          <div className="mt-4 flex items-center gap-2">

            <TrendingUp size={16} className="text-green-600"/>

            <span className="text-sm font-semibold text-green-600">
              {change}
            </span>

          </div>

        </div>

        <div className={`${color} rounded-2xl p-4 text-white`}>

          <Icon size={30}/>

        </div>

      </div>

    </div>
  );
};

export default StatCard;