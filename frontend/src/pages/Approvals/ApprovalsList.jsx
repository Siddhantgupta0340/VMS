import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";

import { getApprovals } from "../../services/approvalService";
import ApprovalTable from "../../components/approvals/ApprovalTable";
import { useAuth } from "../../context/AuthContext";
import { ROLES } from "../../config/permissions";

const ApprovalsList = () => {
  const { user } = useAuth();

  const [approvalData, setApprovalData] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");

  useEffect(() => {
    loadApprovals();
  }, []);

  const loadApprovals = async () => {
    const data = await getApprovals();
    setApprovalData(data);
  };

  const filteredApprovals = useMemo(() => {
    return approvalData.filter((approval) => {
      // Role Based Filtering
      if (user.role !== ROLES.ADMIN) {
        if (approval.assignedTo !== user.role) {
          return false;
        }
      }

      // Status Filter
      if (status !== "All" && approval.status !== status) {
        return false;
      }

      // Search Filter
      const keyword = search.toLowerCase();

      return (
        approval.invoiceNo.toLowerCase().includes(keyword) ||
        approval.vendor.toLowerCase().includes(keyword)
      );
    });
  }, [approvalData, search, status, user]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">
          Approval Queue
        </h1>

        <p className="mt-2 text-slate-500">
          Review and process invoice approvals.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice..."
            className="w-80 rounded-xl border border-slate-200 py-3 pl-10 pr-4 outline-none focus:border-blue-500"
          />
        </div>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-slate-200 px-4 py-3"
        >
          <option>All</option>
          <option>Pending</option>
          <option>Approved</option>
          <option>Hold</option>
          <option>Rejected</option>
        </select>
      </div>

      {/* Table */}
      <ApprovalTable approvals={filteredApprovals} />
    </div>
  );
};

export default ApprovalsList;