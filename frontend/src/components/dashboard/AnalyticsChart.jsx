import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  Tooltip,
} from "recharts";

const data = [
  { month: "Jan", po: 25 },
  { month: "Feb", po: 40 },
  { month: "Mar", po: 35 },
  { month: "Apr", po: 55 },
  { month: "May", po: 48 },
  { month: "Jun", po: 70 },
  { month: "Jul", po: 82 },
];

const AnalyticsChart = () => {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="po" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
          </linearGradient>
        </defs>

        <CartesianGrid stroke="#e5e7eb" strokeDasharray="4 4" />

        <XAxis dataKey="month" />

        <Tooltip />

        <Area
          type="monotone"
          dataKey="po"
          stroke="#2563eb"
          strokeWidth={3}
          fill="url(#po)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default AnalyticsChart;