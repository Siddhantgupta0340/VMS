import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

const input = "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-600";

const UserCreate = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "",
    department: "",
    designation: "",
    permissions: [],
  });

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handlePermissionChange = (permission) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Create User:", formData);
    navigate("/users");
  };

  const roles = [
    "Finance Manager",
    "Procurement Officer",
    "Approver",
    "Viewer",
    "Admin",
  ];

  const permissions = [
    { key: "view_all", label: "View All Invoices & POs" },
    { key: "create_po", label: "Create Purchase Orders" },
    { key: "create_invoice", label: "Create Invoices" },
    { key: "approve_po", label: "Approve Purchase Orders" },
    { key: "approve_invoice", label: "Approve Invoices" },
    { key: "manage_payments", label: "Manage Payments" },
    { key: "manage_vendors", label: "Manage Vendors" },
    { key: "manage_users", label: "Manage Users" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/users">
          <button className="rounded-lg p-2 hover:bg-slate-100 transition">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Add New User</h1>
          <p className="mt-1 text-slate-500">Create a new user account and assign permissions</p>
        </div>
      </div>

      {/* Form */}
      <div className="rounded-xl border border-slate-200 bg-white p-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Personal Information */}
          <div>
            <h2 className="mb-6 text-lg font-semibold text-slate-900">
              Personal Information
            </h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="Enter first name"
                  className={input}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Enter last name"
                  className={input}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="user@company.com"
                  className={input}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter phone number"
                  className={input}
                />
              </div>
            </div>
          </div>

          {/* Role & Department */}
          <div>
            <h2 className="mb-6 text-lg font-semibold text-slate-900">Role & Department</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Role *
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className={input}
                  required
                >
                  <option value="">Select a role</option>
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Department *
                </label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className={input}
                  required
                >
                  <option value="">Select department</option>
                  <option value="Finance">Finance</option>
                  <option value="Procurement">Procurement</option>
                  <option value="Management">Management</option>
                  <option value="Operations">Operations</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Designation
                </label>
                <input
                  type="text"
                  name="designation"
                  value={formData.designation}
                  onChange={handleChange}
                  placeholder="e.g., Senior Manager"
                  className={input}
                />
              </div>
            </div>
          </div>

          {/* Permissions */}
          <div>
            <h2 className="mb-6 text-lg font-semibold text-slate-900">Permissions</h2>
            <div className="space-y-3">
              {permissions.map((perm) => (
                <label
                  key={perm.key}
                  className="flex items-center rounded-lg border border-slate-200 p-4 cursor-pointer hover:bg-slate-50 transition"
                >
                  <input
                    type="checkbox"
                    checked={formData.permissions.includes(perm.key)}
                    onChange={() => handlePermissionChange(perm.key)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600"
                  />
                  <span className="ml-3 font-medium text-slate-900">{perm.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-6 border-t border-slate-200">
            <button
              type="submit"
              className="flex-1 rounded-lg bg-blue-600 py-3 text-center font-medium text-white transition hover:bg-blue-700"
            >
              Create User
            </button>
            <button
              type="button"
              onClick={() => navigate("/users")}
              className="flex-1 rounded-lg border border-slate-300 py-3 text-center font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserCreate;
