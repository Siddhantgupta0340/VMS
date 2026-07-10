import {
  FileBarChart,
  Download,
  FileSpreadsheet,
  Users,
  ShoppingCart,
  Receipt,
  IndianRupee,
} from "lucide-react";

const stats = [
  {
    title: "Total Vendors",
    value: "248",
    icon: Users,
  },
  {
    title: "Purchase Orders",
    value: "124",
    icon: ShoppingCart,
  },
  {
    title: "Invoices",
    value: "96",
    icon: Receipt,
  },
  {
    title: "Revenue",
    value: "₹12.8L",
    icon: IndianRupee,
  },
];

const Reports = () => {
  return (
    <div className="space-y-6">

      {/* Header */}

      <div className="flex items-center justify-between">

        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Reports
          </h1>

          <p className="mt-1 text-slate-500">
            Analyze vendor performance and business insights.
          </p>
        </div>

        <div className="flex gap-3">

          <button className="flex items-center gap-2 rounded-xl border px-4 py-2 hover:bg-slate-100">
            <Download size={18} />
            Export PDF
          </button>

          <button className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
            <FileSpreadsheet size={18} />
            Export Excel
          </button>

        </div>

      </div>

      {/* Stats */}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">

        {stats.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.title}
              className="rounded-2xl border bg-white p-6 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between">
                <Icon className="text-blue-600" />
                <FileBarChart className="text-slate-300" />
              </div>

              <h3 className="text-sm text-slate-500">
                {item.title}
              </h3>

              <p className="mt-2 text-3xl font-bold">
                {item.value}
              </p>
            </div>
          );
        })}

      </div>

      {/* Report Generator */}

      <div className="rounded-2xl border bg-white p-6 shadow-sm">

        <h2 className="mb-6 text-xl font-semibold">
          Generate Report
        </h2>

        <div className="grid gap-4 md:grid-cols-3">

          <select className="rounded-xl border p-3">
            <option>Vendor Report</option>
            <option>Invoice Report</option>
            <option>Purchase Order Report</option>
            <option>Payment Report</option>
          </select>

          <input
            type="date"
            className="rounded-xl border p-3"
          />

          <button className="rounded-xl bg-blue-600 text-white hover:bg-blue-700">
            Generate Report
          </button>

        </div>

      </div>

      {/* Recent Reports */}

      <div className="rounded-2xl border bg-white p-6 shadow-sm">

        <h2 className="mb-5 text-xl font-semibold">
          Recent Reports
        </h2>

        <table className="w-full">

          <thead>

            <tr className="border-b">

              <th className="py-3 text-left">
                Report Name
              </th>

              <th className="text-left">
                Date
              </th>

              <th className="text-left">
                Status
              </th>

            </tr>

          </thead>

          <tbody>

            <tr className="border-b">

              <td className="py-4">
                Vendor Performance Report
              </td>

              <td>30 Jun 2026</td>

              <td className="text-green-600">
                Generated
              </td>

            </tr>

            <tr className="border-b">

              <td className="py-4">
                Invoice Summary
              </td>

              <td>29 Jun 2026</td>

              <td className="text-green-600">
                Generated
              </td>

            </tr>

          </tbody>

        </table>

      </div>

    </div>
  );
};

export default Reports;