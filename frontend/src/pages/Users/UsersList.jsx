import { useState, useEffect } from "react";
import { Plus, Eye, Lock, Unlock, Trash2, ShieldAlert } from "lucide-react";
import DataTable from "../../components/common/DataTable";
import FilterBar from "../../components/common/FilterBar";
import ActionMenu from "../../components/common/ActionMenu";
import StatusBadge from "../../components/common/StatusBadge";
import EmptyState from "../../components/common/EmptyState";
import { Link } from "react-router-dom";
import { getUsers, toggleUserStatus, deleteUser } from "../../services/userService";
import { toast } from "sonner";

const UsersList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState({});

  useEffect(() => {
    loadUsers();
  }, [activeFilters]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await getUsers();
      let filtered = [...data];

      if (activeFilters.role) {
        filtered = filtered.filter((u) => u.role === activeFilters.role);
      }
      if (activeFilters.status) {
        filtered = filtered.filter((u) => u.status === activeFilters.status);
      }

      setUsers(filtered);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load users list");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const nextActive = currentStatus !== "ACTIVE";
    try {
      await toggleUserStatus(id, nextActive);
      toast.success("User status toggled successfully!");
      loadUsers();
    } catch (err) {
      console.error(err);
      toast.error("Failed to toggle status");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await deleteUser(id);
      toast.success("User account deleted successfully");
      loadUsers();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete user");
    }
  };

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
      key: "createdAt",
      label: "Registered Date",
      sortable: true,
      render: (value) => (value ? new Date(value).toLocaleDateString() : "-"),
    },
    {
      key: "lastLoginAt",
      label: "Last Login",
      sortable: true,
      render: (value) => (value ? new Date(value).toLocaleString() : "Never"),
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
      label: "System Role",
      options: [
        { label: "Super Admin", value: "SUPER_ADMIN" },
        { label: "Case Manager", value: "CASE_MANAGER" },
        { label: "Team Lead", value: "TEAM_LEAD" },
        { label: "Manager", value: "MANAGER" },
        { label: "Finance Head", value: "FINANCE_HEAD" },
      ],
    },
    {
      key: "status",
      label: "Status",
      options: [
        { label: "Active", value: "ACTIVE" },
        { label: "Inactive", value: "INACTIVE" },
      ],
    },
  ];

  const rowActions = (row) => [
    <ActionMenu
      key={row.id}
      actions={[
        {
          icon: row.status === "ACTIVE" ? Lock : Unlock,
          label: row.status === "ACTIVE" ? "Deactivate" : "Activate",
          onClick: () => handleToggleStatus(row.id, row.status),
        },
        {
          icon: Trash2,
          label: "Delete User",
          destructive: true,
          onClick: () => handleDelete(row.id),
        },
      ]}
    />,
  ];

  const activeUsersCount = users.filter((u) => u.status === "ACTIVE").length;

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        Loading User Directory...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Users</h1>
          <p className="mt-2 text-slate-500">Manage internal team members and role-based permissions</p>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Registers</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{users.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Credentials</p>
          <p className="mt-2 text-2xl font-bold text-green-600">{activeUsersCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Suspended / Deactivated</p>
          <p className="mt-2 text-2xl font-bold text-slate-500">{users.length - activeUsersCount}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <FilterBar filters={filters} onFilterChange={setActiveFilters} />
      </div>

      {/* Data Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {users.length > 0 ? (
          <DataTable
            columns={columns}
            data={users}
            searchableFields={["name", "email", "role"]}
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
export { UsersList };
