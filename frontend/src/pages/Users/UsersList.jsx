import { useState } from "react";
import { Plus, Download, Eye, Edit2, Trash2, Lock, Unlock } from "lucide-react";
import DataTable from "../../components/common/DataTable";
import FilterBar from "../../components/common/FilterBar";
import ActionMenu from "../../components/common/ActionMenu";
import StatusBadge from "../../components/common/StatusBadge";
import EmptyState from "../../components/common/EmptyState";
import { Link } from "react-router-dom";

const UsersList = () => {
  const [users] = useState([
    {
      id: "USR-001",
      name: "Raj Kumar",
      email: "raj.kumar@company.com",
      role: "Finance Manager",
      department: "Finance",
      status: "Active",
      joinDate: "2023-06-15",
      lastLogin: "2024-01-25",
    },
    {
      id: "USR-002",
      name: "Priya Singh",
      email: "priya.singh@company.com",
      role: "Procurement Officer",
      department: "Procurement",
      status: "Active",
      joinDate: "2023-08-20",
      lastLogin: "2024-01-24",
    },
    {
      id: "USR-003",
      name: "Amit Patel",
      email: "amit.patel@company.com",
      role: "Approver",
      department: "Management",
      status: "Active",
      joinDate: "2023-05-10",
      lastLogin: "2024-01-23",
    },
    {
      id: "USR-004",
      name: "Neha Verma",
      email: "neha.verma@company.com",
      role: "Viewer",
      department: "Finance",
      status: "Inactive",
      joinDate: "2023-09-01",
      lastLogin: "2024-01-10",
    },
  ]);

  const columns = [
    {
      key: "name",
      label: "Name",
      sortable: true,
      render: (value, row) => (
        <div>
          <p className="font-semibold text-slate-900">{value}</p>
          <p className="text-xs text-slate-500">{row.email}</p>
        </div>
      ),
    },
    {
      key: "role",
      label: "Role",
      sortable: true,
      render: (value) => (
        <span className="inline-block rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
          {value}
        </span>
      ),
    },
    {
      key: "department",
      label: "Department",
      sortable: true,
    },
    {
      key: "joinDate",
      label: "Join Date",
      sortable: true,
    },
    {
      key: "lastLogin",
      label: "Last Login",
      sortable: true,
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (value) => <StatusBadge status={value} />,
    },
  ];

  const filters = [
    {
      key: "role",
      label: "Role",
      options: [
        { label: "Finance Manager", value: "Finance Manager" },
        { label: "Procurement Officer", value: "Procurement Officer" },
        { label: "Approver", value: "Approver" },
        { label: "Viewer", value: "Viewer" },
      ],
    },
    {
      key: "department",
      label: "Department",
      options: [
        { label: "Finance", value: "Finance" },
        { label: "Procurement", value: "Procurement" },
        { label: "Management", value: "Management" },
      ],
    },
    {
      key: "status",
      label: "Status",
      options: [
        { label: "Active", value: "Active" },
        { label: "Inactive", value: "Inactive" },
      ],
    },
  ];

  const rowActions = (row) => [
    <ActionMenu
      key={row.id}
      actions={[
        {
          icon: Eye,
          label: "View Details",
          onClick: () => console.log("View", row.id),
        },
        {
          icon: Edit2,
          label: "Edit",
          onClick: () => console.log("Edit", row.id),
        },
        {
          icon: row.status === "Active" ? Lock : Unlock,
          label: row.status === "Active" ? "Deactivate" : "Activate",
          onClick: () => console.log("Toggle", row.id),
        },
        {
          icon: Trash2,
          label: "Delete",
          destructive: true,
          onClick: () => console.log("Delete", row.id),
        },
      ]}
    />,
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Users</h1>
          <p className="mt-2 text-slate-500">Manage team members and access permissions</p>
        </div>

        <Link
          to="/users/new"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-white font-medium transition hover:bg-blue-700"
        >
          <Plus size={18} />
          Add User
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-600">Total Users</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">28</p>
          <p className="mt-1 text-xs text-green-600">↑ 3 new this month</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-600">Active Users</p>
          <p className="mt-2 text-2xl font-bold text-green-600">24</p>
          <p className="mt-1 text-xs text-slate-600">85.7% active</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-600">Inactive Users</p>
          <p className="mt-2 text-2xl font-bold text-slate-600">4</p>
          <p className="mt-1 text-xs text-slate-600">14.3% inactive</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-600">Departments</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">6</p>
          <p className="mt-1 text-xs text-slate-600">Covered</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <FilterBar filters={filters} onFilterChange={(f) => console.log(f)} />
        <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
          <Download size={16} />
          Export
        </button>
      </div>

      {/* Data Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        {users.length > 0 ? (
          <DataTable
            columns={columns}
            data={users}
            searchableFields={["name", "email", "department"]}
            rowActions={rowActions}
            itemsPerPage={10}
          />
        ) : (
          <EmptyState
            icon={Plus}
            title="No Users"
            description="Add your first user to get started"
            action={
              <Link
                to="/users/new"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition hover:bg-blue-700"
              >
                <Plus size={16} />
                Add User
              </Link>
            }
          />
        )}
      </div>
    </div>
  );
};

export default UsersList;
