import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

const defaultData = [
  { month: "Jan", po: 25 },
  { month: "Feb", po: 40 },
  { month: "Mar", po: 35 },
  { month: "Apr", po: 55 },
  { month: "May", po: 48 },
  { month: "Jun", po: 70 },
  { month: "Jul", po: 82 },
];

const AnalyticsChart = ({ data = defaultData, dataKey = "po", categoryKey = "month", color = "#2F80ED" }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[300px] w-full items-center justify-center rounded-xl border border-dashed border-[#E2E8F0] bg-[#F5F7FA] text-sm font-medium text-[#64748B]">
        No analytics data available
      </div>
    );
  }

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0.01} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />

          <XAxis
            dataKey={categoryKey}
            tickLine={false}
            axisLine={{ stroke: "#E2E8F0" }}
            tick={{ fill: "#64748B", fontSize: 12 }}
          />

          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#64748B", fontSize: 12 }}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: "#0F2747",
              borderColor: "#163A63",
              borderRadius: "12px",
              color: "#FFFFFF",
              fontSize: "12px",
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
            }}
            itemStyle={{ color: "#2F80ED" }}
          />

          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2.5}
            fill="url(#chartGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AnalyticsChart;