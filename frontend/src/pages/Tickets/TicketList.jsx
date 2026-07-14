import { useState, useEffect } from "react";
import { LifeBuoy, RotateCcw, AlertTriangle, Eye } from "lucide-react";
import { getMatches } from "../../services/matchingService";
import { restoreInvoice } from "../../services/invoiceService";
import DataTable from "../../components/common/DataTable";
import StatusBadge from "../../components/common/StatusBadge";
import { useAuth } from "../../context/AuthContext";
import { ROLES } from "../../config/permissions";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const TicketList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const matches = await getMatches();
      // Filter out unmatched matches as unresolved support tickets
      const unmatched = matches.filter((m) => m.status === "UNMATCHED");
      setTickets(unmatched);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load tickets list");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id) => {
    try {
      await restoreInvoice(id);
      toast.success("Invoice Ticket restored successfully!");
      loadTickets();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to restore ticket.");
    }
  };

  const columns = [
    {
      key: "id",
      label: "Ticket ID",
      sortable: true,
      render: (value) => (
        <span className="font-mono text-xs truncate max-w-[100px] block text-amber-500">
          {value}
        </span>
      ),
    },
    {
      key: "invoiceNumber",
      label: "Invoice Code",
      sortable: true,
      render: (value) => <span className="font-mono font-bold text-slate-800">{value}</span>,
    },
    {
      key: "grnNumber",
      label: "GRN Reference",
      sortable: true,
    },
    {
      key: "matchPercentage",
      label: "Discrepancy Rate",
      sortable: true,
      render: (value) => (
        <span className="text-xs text-red-600 font-semibold">
          {100 - value}% Discrepancy Rate
        </span>
      ),
    },
    {
      key: "status",
      label: "Support Verdict",
      render: () => (
        <span className="px-2.5 py-0.5 rounded text-[10px] uppercase font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
          UNRESOLVED DISCREPANCY
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (_, row) => {
        const canRestore = [ROLES.SUPER_ADMIN, ROLES.FINANCE_HEAD].includes(user?.role);
        return (
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/three-way-matching/${row.id}`)}
              className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-800"
            >
              <Eye size={16} /> Analyze
            </button>
            {canRestore && (
              <button
                onClick={() => handleRestore(row.invoiceId)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 transition"
              >
                <RotateCcw size={12} /> Restore Invoice
              </button>
            )}
          </div>
        );
      },
    },
  ];

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        Loading Support Tickets...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <LifeBuoy className="text-amber-500" />
            Support Ticket Center
          </h1>
          <p className="mt-2 text-slate-500">
            Resolve match discrepancies and restore flagged invoice tickets back to active operations
          </p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-xl border border-slate-200 bg-white p-5 flex items-start gap-4">
          <div className="p-3 bg-amber-50 border border-amber-100 rounded-2xl text-amber-500">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Unresolved Discrepancies</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{tickets.length}</p>
          </div>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <DataTable
          columns={columns}
          data={tickets}
          searchableFields={["invoiceNumber", "grnNumber", "id"]}
          itemsPerPage={10}
        />
      </div>
    </div>
  );
};

export default TicketList;
export { TicketList };
