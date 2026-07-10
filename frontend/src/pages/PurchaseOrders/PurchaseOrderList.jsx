import { useState, useEffect } from "react";
import { Plus, Download, Eye, Edit2, Trash2 } from "lucide-react";
import DataTable from "../../components/common/DataTable";
import FilterBar from "../../components/common/FilterBar";
import ActionMenu from "../../components/common/ActionMenu";
import StatusBadge from "../../components/common/StatusBadge";
import EmptyState from "../../components/common/EmptyState";
import { Link } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { ROLES } from "../../config/permissions";

import {
  getPurchaseOrders,
  updatePOStatus,
  getPurchaseOrderById,
} from "../../services/purchaseOrderServices";

const Detail = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200 p-4">
    <p className="text-sm text-slate-500">{label}</p>

    <p className="mt-1 font-semibold text-slate-900">
      {value || "-"}
    </p>
  </div>
);

const PurchaseOrderList = () => {
  const { user } = useAuth();
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterValues, setFilterValues] = useState({});
  const [selectedPO, setSelectedPO] = useState(null);
  const [showPOModal, setShowPOModal] = useState(false);
  useEffect(() => {
  loadPOs();
}, []);

const loadPOs = async () => {
  try {
    setLoading(true);

    const data = await getPurchaseOrders();

    console.log("POs =", data);

    setPurchaseOrders(data);
  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
};

  const handleStatus = async (id, status) => {
  try {
    await updatePOStatus(id, status);

    alert("Purchase Order Updated Successfully");

    loadPOs();
  } catch (err) {
    console.error(err);
    alert("Unable to update Purchase Order");
  }
};  

  const columns = [
    {
      key: "id",
      label: "PO Number",
      sortable: true,
      render: (value) => <span className="font-semibold text-blue-600">{value}</span>,
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
      render: (value) => <span className="font-semibold">{value}</span>,
    },
    {
  key: "itemCount",
  label: "Items",
  sortable: true,

  render: (value) => (
    <span className="font-semibold">
      {value}
    </span>
  ),
},
    {
  key: "orderDate",
  label: "Order Date",
  sortable: true,
  render: (value) =>
    value
      ? new Date(value).toLocaleDateString()
      : "-",
},
{
  key: "paymentTerms",
  label: "Payment Terms",

  render: (value) => (
    <span>
      {value || "-"}
    </span>
  ),
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
      key: "status",
      label: "Status",
      options:[
{
label:"Pending",
value:"Pending"
},
{
label:"Approved",
value:"Approved"
},
{
label:"Rejected",
value:"Rejected"
},
{
label:"Closed",
value:"Closed"
}
],
    },
    {
  key: "vendor",

  label: "Vendor",

  options: [
    ...new Set(
      purchaseOrders.map(po => po.vendor)
    ),
  ].map(v => ({
    label: v,
    value: v,
  })),
},
  ];

  const totalPO = purchaseOrders.length;

const pendingPO = purchaseOrders.filter(
  (po) => po.status?.toLowerCase() === "pending"
).length;

const totalValue = purchaseOrders.reduce(
  (sum, po) => sum + Number(po.amount || 0),
  0
);

const avgValue =
  purchaseOrders.length > 0
    ? Math.round(totalValue / purchaseOrders.length)
    : 0;

    const filteredPOs = purchaseOrders.filter((po) => {

  const statusMatch =
    !filterValues.status ||
    po.status === filterValues.status;

  const vendorMatch =
    !filterValues.vendor ||
    po.vendor === filterValues.vendor;

  return statusMatch && vendorMatch;

});

const exportCSV = () => {

  if (purchaseOrders.length === 0) return;

  const rows = purchaseOrders.map((po) => ({
    "PO Number": po.poNumber,
    Vendor: po.vendor,
    Amount: po.amount,
    Status: po.status,
    "Order Date": po.orderDate,
  }));

  const csv = [
    Object.keys(rows[0]).join(","),
    ...rows.map((row) => Object.values(row).join(",")),
  ].join("\n");

  const blob = new Blob([csv], {
    type: "text/csv",
  });

  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");

  a.href = url;

  a.download = "PurchaseOrders.csv";

  a.click();

  window.URL.revokeObjectURL(url);
};

const rowActions = (po) => (
  <div className="flex items-center gap-2">

    <button
  className="rounded-lg p-2 hover:bg-blue-100"
  title="View"
  onClick={async () => {
    try {
      const fullPO = await getPurchaseOrderById(po.id);

      console.log("FULL PO =", fullPO);

      setSelectedPO(fullPO);

      setShowPOModal(true);

    } catch (err) {
      console.error(err);

      alert("Unable to load Purchase Order");
    }
  }}
>
  <Eye size={18}/>
</button>

    {user?.role === ROLES.FINANCE_HEAD &&
      po.status?.toLowerCase() === "pending" && (
      <>
        <button
          onClick={() => handleStatus(po.id, "open")}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          Approve
        </button>

        <button
          onClick={() => handleStatus(po.id, "cancelled")}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Reject
        </button>
      </>
    )}

  </div>
);
  if (loading) {
  return (
    <div className="flex h-96 items-center justify-center">
      Loading Purchase Orders...
    </div>
  );
}

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Purchase Orders</h1>
          <p className="mt-2 text-slate-500">Manage and track all purchase orders</p>
        </div>

        <Link
          to="/purchase-orders/new"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-white font-medium transition hover:bg-blue-700"
        >
          <Plus size={18} />
          New Purchase Order
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="mt-2 text-2xl font-bold text-slate-900">
  {totalPO}
</p>
          <p className="text-xs font-medium text-slate-600">Total POs</p>
          
          <p className="mt-1 text-xs text-green-600">Live Records</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-600">Awaiting Approval</p>
          <p className="mt-2 text-2xl font-bold text-amber-600">{pendingPO}</p>
          <p className="mt-1 text-xs text-slate-600">Pending Approval</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-600">Total Value</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">₹ {totalValue.toLocaleString()}</p>
          <p className="mt-1 text-xs text-blue-600">Current Value</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-600">Avg. Value</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">₹ {avgValue.toLocaleString()}</p>
          <p className="mt-1 text-xs text-slate-600">Average Value</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <FilterBar
    filters={filters}
    onFilterChange={setFilterValues}
/>
        <button 
        onClick={exportCSV}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
          <Download size={16} />
          Export
        </button>
      </div>

      {/* Data Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        {purchaseOrders.length > 0 ? (
          <DataTable
            columns={columns}
            data={filteredPOs}
searchableFields={[
"poNumber",
"vendor",
"description",
"status",
]}            rowActions={rowActions}
            itemsPerPage={10}
          />
        ) : (
          <EmptyState
            icon={Plus}
            title="No Purchase Orders"
            description="Create your first purchase order to get started"
            action={
              <Link
                to="/purchase-orders/new"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition hover:bg-blue-700"
              >
                <Plus size={16} />
                Create Purchase Order
              </Link>
            }
          />
        )}
      </div>
    </div>
    
    {showPOModal && selectedPO && (

<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">

<div className="max-h-[90vh] w-[900px] overflow-y-auto rounded-2xl bg-white shadow-2xl">

<div className="flex items-center justify-between border-b p-6">

<div>

<h2 className="text-2xl font-bold">
Purchase Order Details
</h2>

<p className="mt-1 text-slate-500">
{selectedPO.poNumber}
</p>

</div>

<button
onClick={()=>{
setShowPOModal(false);
setSelectedPO(null);
}}
className="text-3xl leading-none text-slate-500 hover:text-red-600"
>
×
</button>

</div>

<div className="space-y-8 p-6">

{/* PO Information */}

<section>

<h3 className="mb-4 text-lg font-semibold">
Purchase Order Information
</h3>

<div className="grid grid-cols-2 gap-4">

<Detail
label="PO Number"
value={selectedPO.poNumber}
/>

<Detail
label="Vendor"
value={selectedPO.vendor}
/>

<Detail
label="Status"
value={selectedPO.status}
/>

<Detail
label="Amount"
value={`₹ ${Number(selectedPO.amount).toLocaleString()}`}
/>

<Detail
label="Currency"
value={selectedPO.currency}
/>

<Detail
label="Order Date"
value={
selectedPO.orderDate
? new Date(selectedPO.orderDate).toLocaleDateString()
: "-"
}
/>

<Detail
label="Expected Delivery"
value={
selectedPO.expectedDelivery
? new Date(selectedPO.expectedDelivery).toLocaleDateString()
: "-"
}
/>

<Detail
label="Payment Terms"
value={selectedPO.paymentTerms}
/>

</div>

</section>

{/* Description */}

<section>

<h3 className="mb-4 text-lg font-semibold">
Description
</h3>

<div className="rounded-xl border border-slate-200 p-5">

<p>

{selectedPO.description || "-"}

</p>

</div>

</section>

{/* Line Items */}

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

{selectedPO.items?.length > 0 ? (

selectedPO.items.map((item,index)=>(

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

):(


<tr>

<td
colSpan={4}
className="p-5 text-center text-slate-500"
>

No Line Items

</td>

</tr>

)}

</tbody>

</table>

</div>

</section>

{/* Audit */}

<section>

<h3 className="mb-4 text-lg font-semibold">

Audit Information

</h3>

<div className="grid grid-cols-2 gap-4">

<Detail

label="Created By"

value={`${selectedPO.createdByRole || ""} ${selectedPO.createdBy}`}

/>

<Detail

label="Created At"

value={

selectedPO.createdAt

? new Date(selectedPO.createdAt).toLocaleString()

: "-"

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

export default PurchaseOrderList;
