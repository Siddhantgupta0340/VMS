import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { ROLES } from "../../config/permissions";

import {
  getInvoices,
  getInvoiceById,
  approveInvoice,
  rejectInvoice,
} from "../../services/invoiceService";

import { Plus, Download, Eye, Edit2, Trash2 } from "lucide-react";
import DataTable from "../../components/common/DataTable";
import FilterBar from "../../components/common/FilterBar";
import ActionMenu from "../../components/common/ActionMenu";
import StatusBadge from "../../components/common/StatusBadge";
import EmptyState from "../../components/common/EmptyState";
import { Link } from "react-router-dom";

const Detail = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200 p-4">
    <p className="text-sm text-slate-500">{label}</p>

    <p className="mt-1 font-semibold text-slate-900">
      {value || "-"}
    </p>
  </div>
);

const InvoiceList = () => {
  const { user } = useAuth();

  const [invoices, setInvoices] = useState([]);

  const [loading, setLoading] = useState(true);

  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const [activeFilters, setActiveFilters] = useState({});

  const normalizedRole = (user?.role || "").toUpperCase();

  const getRoleFilteredInvoices = (data) => {
    if (!normalizedRole) return data;

    if (normalizedRole === ROLES.CASE_MANAGER) {
      return data.filter((invoice) => invoice.createdById === user.id);
    }

    return data;
  };

  const canActOnInvoice = (invoice, role) => {
    if (!invoice || !role) return false;

    const normalizedInvoiceStatus = (invoice?.status || "").toUpperCase();
    const normalizedRoleValue = (role || "").toUpperCase();

    if (normalizedRoleValue === ROLES.TEAM_LEAD) {
      return ["PENDING_TEAM_LEAD", "PENDING_L1", "PENDING"].includes(normalizedInvoiceStatus);
    }
    if (normalizedRoleValue === ROLES.MANAGER) {
      return ["PENDING_MANAGER", "PENDING_L2"].includes(normalizedInvoiceStatus);
    }
    if (normalizedRoleValue === ROLES.FINANCE_HEAD) {
      return ["PENDING_FINANCE_HEAD", "PENDING_L3"].includes(normalizedInvoiceStatus);
    }

    return false;
  };

  const getErrorMessage = (err) => {
    return err?.response?.data?.message || err?.response?.data?.error || "Unable to process invoice request";
  };

  useEffect(() => {
    loadInvoices();
  }, [activeFilters, user?.role]);

  const loadInvoices = async () => {
    try {
      setLoading(true);

      const data = await getInvoices(user?.role);
      let filtered = getRoleFilteredInvoices([...data]);

      if (activeFilters.status) {
        filtered = filtered.filter((i) => i.status === activeFilters.status);
      }

      if (activeFilters.paymentStatus) {
        filtered = filtered.filter((i) => i.paymentStatus === activeFilters.paymentStatus);
      }

      setInvoices(filtered);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await approveInvoice(id);
      await loadInvoices();
      alert("Invoice approved successfully");
    } catch (err) {
      console.error(err);
      alert(getErrorMessage(err));
    }
  };

  const handleReject = async (id) => {
    try {
      await rejectInvoice(id, `Rejected by ${user?.role || "approver"}`);
      await loadInvoices();
      alert("Invoice rejected successfully");
    } catch (err) {
      console.error(err);
      alert(getErrorMessage(err));
    }
  };

  const columns = [
    {
      key: "invoiceNumber",
      label: "Invoice #",
      sortable: true,
      render: (value) => <span className="font-semibold text-blue-600">{value}</span>,
    },
    {
      key: "poNumber",
      label: "PO #",
      sortable: true,
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
      render: (value) => (
  <span className="font-semibold">
    ₹ {Number(value).toLocaleString()}
  </span>
),
    },
    {
      key: "invoiceDate",

       render: (value) =>
       value
       ? new Date(value).toLocaleDateString()
       : "-",
      label: "Invoice Date",
      sortable: true,
    },
    {
      key: "status",
      label: "Approval",
      sortable: true,
      render: (value) => <StatusBadge status={value} />,
    },
    {
      key: "paymentStatus",
      label: "Payment",
      sortable: true,
      render: (value) => <StatusBadge status={value} />,
    },
    {
  key: "actions",
  label: "Actions",
  render: (_, row) => (
    <div className="flex gap-2">
      {canActOnInvoice(row, user?.role) && (
        <>
          <button
            onClick={() => handleApprove(row.id)}
            className="rounded-lg bg-green-600 px-3 py-1 text-white hover:bg-green-700"
          >
            Approve
          </button>

          <button
            onClick={() => handleReject(row.id)}
            className="rounded-lg bg-red-600 px-3 py-1 text-white hover:bg-red-700"
          >
            Reject
          </button>
        </>
      )}
    </div>
  ),
},
  ];

  const filters = [
    {
      key: "status",
      label: "Approval Status",
      options: [

{ label:"Approved", value:"APPROVED" },

{ label:"Three Way Match", value:"PENDING_THREE_WAY_MATCH" },

{ label:"Admin Review", value:"PENDING_ADMIN_REVIEW" },

{ label:"Team Lead", value:"PENDING_TEAM_LEAD" },

{ label:"Manager", value:"PENDING_MANAGER" },

{ label:"Finance Head", value:"PENDING_FINANCE_HEAD" },

{ label:"Rejected", value:"REJECTED" },

],
    },
    {
  key: "paymentStatus",
  label: "Payment Status",
  options: [
    { label: "Unpaid", value: "UNPAID" },
    { label: "Partially Paid", value: "PARTIALLY_PAID" },
    { label: "Paid", value: "PAID" },
    { label: "Overdue", value: "OVERDUE" },
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
        onClick: async () => {
          try {
            const invoice = await getInvoiceById(row.id);
            setSelectedInvoice(invoice);
            setShowInvoiceModal(true);
          } catch (err) {
            console.error(err);
            alert("Unable to load invoice");
          }
        },
      },
      {
        icon: Download,
        label: "Download PDF",
        onClick: () => console.log("Download", row.id),
      },
    ]}
  />,
];

  if (loading) {
  return (
    <div className="flex h-96 items-center justify-center">
      Loading Invoices...
    </div>
  );
}

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Invoices</h1>
          <p className="mt-2 text-slate-500">Track and manage all vendor invoices</p>
        </div>

        <Link
          to="/invoices/new"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-white font-medium transition hover:bg-blue-700"
        >
          <Plus size={18} />
          New Invoice
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-600">Total Invoices</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{invoices.length}</p>
          <p className="mt-1 text-xs text-green-600">↑ 45 this month</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-600">Awaiting Approval</p>
          <p className="mt-2 text-2xl font-bold text-amber-600">{
  invoices.filter(i => i.status?.toLowerCase().includes("pending")).length
}</p>
          <p className="mt-1 text-xs text-slate-600">₹24.5L pending</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-600">Total Receivable</p>
          <p className="mt-2 text-2xl font-bold text-red-600">₹ {
  invoices
    .reduce((sum, i) => sum + Number(i.amount || 0), 0)
    .toLocaleString()
}</p>
          <p className="mt-1 text-xs text-slate-600">Not yet paid</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-600">Overdue Amount</p>
          <p className="mt-2 text-2xl font-bold text-red-600">₹ {
  invoices
    .filter(i => i.paymentStatus !== "PAID")
    .reduce((sum, i) => sum + Number(i.amount || 0), 0)
    .toLocaleString()
}</p>
          <p className="mt-1 text-xs text-red-600">12 invoices overdue</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <FilterBar
filters={filters}
onFilterChange={setActiveFilters}
/>
        <button
        
        onClick={() => {

const csv = invoices.map((i)=>({

Invoice:i.invoiceNumber,

PO:i.poNumber,

Vendor:i.vendor,

Amount:i.amount,

Status:i.status,

Payment:i.paymentStatus,

}));

console.table(csv);

alert("CSV exported in browser console.");

}}

        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
          <Download size={16} />
          Export
        </button>
      </div>

      {/* Data Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        {invoices.length > 0 ? (
          <DataTable
            columns={columns}
            data={invoices}
            searchableFields={[
            "invoiceNumber",
            "poNumber",
            "vendor",
            ]}         
            rowActions={rowActions}
            itemsPerPage={10}
          />
        ) : (
          <EmptyState
            icon={Plus}
            title="No Invoices"
            description="Create your first invoice to get started"
            action={
              <Link
                to="/invoices/new"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition hover:bg-blue-700"
              >
                <Plus size={16} />
                Create Invoice
              </Link>
            }
          />
        )}
      </div>
    </div>
    {showInvoiceModal && selectedInvoice && (

<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">

<div className="max-h-[90vh] w-[900px] overflow-y-auto rounded-2xl bg-white shadow-2xl">

<div className="flex items-center justify-between border-b p-6">

<div>

<h2 className="text-2xl font-bold">

Invoice Details

</h2>

<p className="mt-1 text-slate-500">

{selectedInvoice.invoiceNumber}

</p>

</div>

<button

onClick={()=>{
setShowInvoiceModal(false);
setSelectedInvoice(null);
}}

className="text-3xl leading-none text-slate-500 hover:text-red-600"

>

×

</button>

</div>

<div className="space-y-8 p-6">

<section>

<h3 className="mb-4 text-lg font-semibold">

Invoice Information

</h3>

<div className="grid grid-cols-2 gap-4">

<Detail
label="Invoice Number"
value={selectedInvoice.invoiceNumber}
/>

<Detail
label="Purchase Order"
value={selectedInvoice.poNumber}
/>

<Detail
label="Vendor"
value={selectedInvoice.vendor}
/>

<Detail
label="Amount"
value={`₹ ${Number(selectedInvoice.amount).toLocaleString()}`}
/>

<Detail
label="Status"
value={selectedInvoice.status}
/>

<Detail
label="Payment Status"
value={selectedInvoice.paymentStatus}
/>

<Detail
label="Invoice Date"
value={
selectedInvoice.invoiceDate
?
new Date(selectedInvoice.invoiceDate).toLocaleDateString()
:
"-"
}
/>

<Detail
label="Due Date"
value={
selectedInvoice.dueDate
?
new Date(selectedInvoice.dueDate).toLocaleDateString()
:
"-"
}
/>

</div>

</section>

<section>

<h3 className="mb-4 text-lg font-semibold">

Vendor

</h3>

<div className="grid grid-cols-2 gap-4">

<Detail
label="Vendor Name"
value={selectedInvoice.vendor}
/>

<Detail
label="Vendor Email"
value={selectedInvoice.vendorEmail || "-"}
/>

<Detail
label="Vendor Code"
value={selectedInvoice.vendorCode || "-"}
/>

<Detail
label="Purchase Order"
value={selectedInvoice.poNumber || "-"}
/>

</div>

</section>

<section>

<h3 className="mb-4 text-lg font-semibold">

Purchase Order

</h3>

<div className="grid grid-cols-2 gap-4">

<Detail
label="PO Number"
value={selectedInvoice.poNumber || "-"}
/>

<Detail
label="PO Amount"
value={`₹ ${Number(selectedInvoice.purchaseOrderAmount || 0).toLocaleString()}`}
/>

<Detail
label="PO Status"
value={selectedInvoice.purchaseOrderStatus || "-"}
/>

</div>

</section>

<section>

<h3 className="mb-4 text-lg font-semibold">

Description

</h3>

<div className="rounded-xl border border-slate-200 p-5">

<p>

{selectedInvoice.description || "-"}

</p>

</div>

</section>

<section>

<h3 className="mb-4 text-lg font-semibold">

Approval Status

</h3>

<div className="grid grid-cols-2 gap-4">

<Detail
label="Required Approval Role"
value={selectedInvoice.requiredApprovalRole || "-"}
/>

<Detail
label="Current Approval Level"
value={selectedInvoice.currentApprovalLevel || "-"}
/>

<Detail
label="Team Lead Approver"
value={selectedInvoice.teamLeadApprover || "-"}
/>

<Detail
label="Manager Approver"
value={selectedInvoice.managerApprover || "-"}
/>

<Detail
label="Finance Head Approver"
value={selectedInvoice.financeHeadApprover || "-"}
/>

</div>

</section>

<section>

<h3 className="mb-4 text-lg font-semibold">

Line Items

</h3>

<div className="overflow-hidden rounded-xl border">

<table className="w-full">

<thead className="bg-slate-100">

<tr>

<th className="p-3 text-left">

Description

</th>

<th className="p-3">

Qty

</th>

<th className="p-3">

Rate

</th>

<th className="p-3">

Amount

</th>

</tr>

</thead>

<tbody>

{selectedInvoice.items?.length > 0 ?

selectedInvoice.items.map((item,index)=>(

<tr
key={index}
className="border-t"
>

<td className="p-3">

{item.description}

</td>

<td className="p-3 text-center">

{item.quantity}

</td>

<td className="p-3 text-center">

₹ {item.rate}

</td>

<td className="p-3 text-center font-semibold">

₹ {item.amount}

</td>

</tr>

))

:

<tr>

<td
colSpan={4}
className="p-5 text-center text-slate-500"
>

No Line Items

</td>

</tr>

}

</tbody>

</table>

</div>

</section>

<section>

<h3 className="mb-4 text-lg font-semibold">

Audit Information

</h3>

<div className="grid grid-cols-2 gap-4">

<Detail
label="Created By"
value={selectedInvoice.createdBy}
/>

<Detail
label="Created At"
value={
selectedInvoice.createdAt
?
new Date(selectedInvoice.createdAt).toLocaleString()
:
"-"
}
/>

</div>

</section>

</div>

</div>

</div>

)}
</>
  );
};

export default InvoiceList;
