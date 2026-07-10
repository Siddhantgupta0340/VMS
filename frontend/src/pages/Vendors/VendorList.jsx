import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { ROLES } from "../../config/permissions";

import {
  Plus,
  Eye,
  Pencil,
  Trash2,
  Building2,
  CheckCircle2,
  Clock3,
  Ban,
  Check,
  X,
  ShieldBan,
} from "lucide-react";

import DataTable from "../../components/common/DataTable";
import StatusBadge from "../../components/common/StatusBadge";
import VendorDetails from "../../pages/vendors/VendorDetails";
import {
  getVendors,
  getVendorById,
  approveVendor,
  rejectVendor,
  blockVendor,
} from "../../services/vendorService";

const Detail = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200 p-4">
    <p className="text-sm text-slate-500">{label}</p>
    <p className="mt-1 font-semibold text-slate-900">
      {value || "-"}
    </p>
  </div>
);

const VendorList = () => {
  const { user } = useAuth();

  const [selectedVendor, setSelectedVendor] = useState(null);
const [showVendorModal, setShowVendorModal] = useState(false);

  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");

  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    setLoading(true);

    const data = await getVendors();

    console.log("VENDORS =", data);

    setVendors(data);

    setLoading(false);
  };

  const handleApprove = async (id) => {
  try {
    await approveVendor(id);

    alert("Vendor Approved");

    loadVendors();
  } catch (err) {
    console.error(err);
    alert("Approval Failed");
  }
};

const handleReject = async (id) => {
  try {
    await rejectVendor(id);

    alert("Vendor Rejected");

    loadVendors();
  } catch (err) {
    console.error(err);
    alert("Reject Failed");
  }
};

const handleBlock = async (id) => {
  try {
    await blockVendor(id);

    alert("Vendor Blocked");

    loadVendors();
  } catch (err) {
    console.error(err);
    alert("Block Failed");
  }
};

  const filteredVendors = useMemo(() => {
    return vendors.filter((vendor) => {
      const keyword = searchTerm.toLowerCase();

      const matchesSearch =
        vendor.companyName.toLowerCase().includes(keyword) ||
        vendor.contactPerson.toLowerCase().includes(keyword) ||
        vendor.email.toLowerCase().includes(keyword) ||
        vendor.vendorCode.toLowerCase().includes(keyword);

      const matchesStatus =
        statusFilter === "All" ||
        vendor.status?.toLowerCase() === statusFilter.toLowerCase();
      const matchesCategory =
        categoryFilter === "All" ||
        vendor.category === categoryFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesCategory
      );
    });
  }, [
    vendors,
    searchTerm,
    statusFilter,
    categoryFilter,
  ]);

  const totalVendors = vendors.length;

  const approvedVendors = vendors.filter(
  (v) => v.status?.toLowerCase() === "approved"
).length;

const pendingVendors = vendors.filter(
  (v) => v.status?.toLowerCase() === "pending"
).length;

const rejectedVendors = vendors.filter(
  (v) => v.status?.toLowerCase() === "rejected"
).length;

  const categories = [
    "All",
    ...new Set(vendors.map((v) => v.category)),
  ];

  const columns = [
    {
      key: "vendorCode",
      label: "Vendor Code",
      sortable: true,
    },

    {
      key: "companyName",
      label: "Company",
      sortable: true,
    },

    {
      key: "contactPerson",
      label: "Contact",
      sortable: true,
    },

    {
      key: "category",
      label: "Category",
      sortable: true,
    },

    {
      key: "city",
      label: "City",
      sortable: true,
    },

    {
      key: "email",
      label: "Email",
    },

    {
      key: "status",
      label: "Status",
      sortable: true,

      render: (value) => (
        <StatusBadge status={value} />
      ),
    },
  ];

 const rowActions = (vendor) => (
    console.log("Vendor Row =", vendor),

  <div className="flex items-center gap-2">
    <button
  onClick={async () => {
    try {
      const fullVendor = await getVendorById(vendor.id);

      console.log("FULL VENDOR =", fullVendor);

      setSelectedVendor(fullVendor);
      setShowVendorModal(true);
    } catch (err) {
      console.error(err);
      alert("Unable to load vendor details");
    }
  }}
  className="rounded-lg p-2 transition hover:bg-blue-100"
  title="View"
>
  <Eye size={18} />
</button>

    {user?.role === ROLES.FINANCE_HEAD &&
 vendor.status.toLowerCase() === "pending" && (

<div className="flex gap-2">

<button
onClick={()=>handleApprove(vendor.id)}
className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
>
Approve
</button>

<button
onClick={()=>handleReject(vendor.id)}
className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
>
Reject
</button>

</div>

)}

    {user?.role === ROLES.FINANCE_HEAD &&
 vendor.status.toLowerCase() === "approved" && (

<button
onClick={()=>handleBlock(vendor.id)}
className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
>
Block
</button>

)}
  </div>
);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        Loading vendors...
      </div>
    );
  }
    return (

      

    <div className="space-y-8">

      {/* Header */}

      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

        <div>

          <h1 className="text-3xl font-bold text-slate-900">
            Vendor Management
          </h1>

          <p className="mt-2 text-slate-500">
            Manage all registered vendors across the organization.
          </p>

        </div>

        <Link
          to="/vendors/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700"
        >
          <Plus size={18} />

          Add Vendor

        </Link>

      </div>

      {/* Statistics */}

      <div className="grid gap-6 xl:grid-cols-4 md:grid-cols-2">

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm text-slate-500">
                Total Vendors
              </p>

              <h2 className="mt-2 text-3xl font-bold">
                {totalVendors}
              </h2>

            </div>

            <div className="rounded-xl bg-blue-100 p-3">

              <Building2 className="text-blue-600" />

            </div>

          </div>

        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm text-slate-500">
  Approved
</p>

<h2 className="mt-2 text-3xl font-bold text-green-600">
  {approvedVendors}
</h2>

            </div>

            <div className="rounded-xl bg-green-100 p-3">

              <CheckCircle2 className="text-green-600" />

            </div>

          </div>

        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm text-slate-500">
                Pending
              </p>

              <h2 className="mt-2 text-3xl font-bold text-yellow-600">
                {pendingVendors}
              </h2>

            </div>

            <div className="rounded-xl bg-yellow-100 p-3">

              <Clock3 className="text-yellow-600" />

            </div>

          </div>

        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm text-slate-500">
  Rejected
</p>

<h2 className="mt-2 text-3xl font-bold text-red-600">
  {rejectedVendors}
</h2>

            </div>

            <div className="rounded-xl bg-red-100 p-3">

              <Ban className="text-red-600" />

            </div>

          </div>

        </div>

      </div>

      {/* Filters */}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="grid gap-4 lg:grid-cols-3">

          <input
            type="text"
            placeholder="Search company, contact, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-3"
          >
            <option value="All">All Status</option>
            <option value="All">All Status</option>
<option value="pending">Pending</option>
<option value="approved">Approved</option>
<option value="rejected">Rejected</option>
<option value="blocked">Blocked</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-3"
          >
            {categories.map((category) => (
              <option
                key={category}
                value={category}
              >
                {category}
              </option>
            ))}
          </select>

        </div>

      </div>

      {/* Vendor Table */}

      <DataTable
        columns={columns}
        data={filteredVendors}
        rowActions={rowActions}
        searchableFields={[
          "companyName",
          "contactPerson",
          "vendorCode",
          "email",
        ]}
      />

{showVendorModal && (
  <VendorDetails
    vendor={selectedVendor}
    onClose={() => {
      setShowVendorModal(false);
      setSelectedVendor(null);
    }}
  />
)}


    </div>
  );
  };

export default VendorList;