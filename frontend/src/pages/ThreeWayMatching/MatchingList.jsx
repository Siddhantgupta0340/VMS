import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GitCompare, Eye, Play, ShieldAlert } from "lucide-react";
import DataTable from "../../components/common/DataTable";
import StatusBadge from "../../components/common/StatusBadge";
import { getMatches, startMatching } from "../../services/matchingService";
import { getInvoices } from "../../services/invoiceService";
import { useAuth } from "../../context/AuthContext";
import { toast } from "sonner";

const MatchingList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [pendingInvoices, setPendingInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("reports"); // "reports" or "pending"

  const loadData = async () => {
    try {
      setLoading(true);
      const [matchesData, invoicesData] = await Promise.all([
        getMatches(),
        getInvoices(),
      ]);
      setMatches(matchesData);
      // Filter invoices pending matching calculations
      const pending = invoicesData.filter(
        (inv) => inv.status === "PENDING_THREE_WAY_MATCH"
      );
      setPendingInvoices(pending);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load matching data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRunAudit = async (invoiceId) => {
    try {
      toast.info("Executing 3-Way Match calculation rules...");
      const result = await startMatching(invoiceId);
      toast.success("Match report compiled successfully!");
      navigate(`/three-way-matching/${result.id}`);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Matching process failed.");
    }
  };

  const reportColumns = [
    {
      key: "id",
      label: "Report Ref",
      sortable: true,
      render: (value) => (
        <span className="font-mono text-xs text-blue-600 truncate max-w-[120px] block">
          {value}
        </span>
      ),
    },
    {
      key: "invoiceNumber",
      label: "Invoice #",
      sortable: true,
    },
    {
      key: "poNumber",
      label: "PO #",
      sortable: true,
    },
    {
      key: "matchPercentage",
      label: "Match Score",
      sortable: true,
      render: (value) => (
        <span
          className={`font-bold ${
            value === 100 ? "text-green-600" : "text-amber-600"
          }`}
        >
          {value}%
        </span>
      ),
    },
    {
      key: "status",
      label: "Verdict",
      sortable: true,
      render: (value) => <StatusBadge status={value} />,
    },
    {
      key: "actions",
      label: "Actions",
      render: (_, row) => (
        <button
          onClick={() => navigate(`/three-way-matching/${row.id}`)}
          className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-800"
        >
          <Eye size={16} /> Analyze
        </button>
      ),
    },
  ];

  const pendingColumns = [
    {
      key: "invoiceNumber",
      label: "Invoice #",
      sortable: true,
      render: (value) => <span className="font-semibold">{value}</span>,
    },
    {
      key: "vendor",
      label: "Vendor",
      sortable: true,
    },
    {
      key: "amount",
      label: "Amount",
      sortable: true,
      render: (value) => <span>₹ {Number(value).toLocaleString()}</span>,
    },
    {
      key: "status",
      label: "Workflow Status",
      sortable: true,
      render: (value) => <StatusBadge status={value} />,
    },
    {
      key: "actions",
      label: "Matching Reconciliation",
      render: (_, row) => (
        <button
          onClick={() => handleRunAudit(row.id)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
        >
          <Play size={12} /> Run 3-Way Match
        </button>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        Loading Matching Dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <GitCompare className="text-blue-600" />
            3-Way Match Verification
          </h1>
          <p className="mt-2 text-slate-500">
            Reconcile Invoices against Purchase Orders and Goods Receipt Notes
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab("reports")}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "reports"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            Audit Reports ({matches.length})
          </button>
          <button
            onClick={() => setActiveTab("pending")}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "pending"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            Awaiting Match Calculation ({pendingInvoices.length})
          </button>
        </nav>
      </div>

      {/* Tab Panels */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        {activeTab === "reports" ? (
          <DataTable
            columns={reportColumns}
            data={matches}
            searchableFields={["invoiceNumber", "poNumber", "status"]}
            itemsPerPage={10}
          />
        ) : (
          <DataTable
            columns={pendingColumns}
            data={pendingInvoices}
            searchableFields={["invoiceNumber", "vendor"]}
            itemsPerPage={10}
          />
        )}
      </div>
    </div>
  );
};

export default MatchingList;
export { MatchingList };
