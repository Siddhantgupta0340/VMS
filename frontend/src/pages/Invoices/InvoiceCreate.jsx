import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

import { useEffect } from "react";

import {
  getPurchaseOrders,
  getPurchaseOrderById,
} from "../../services/purchaseOrderServices";

import {
  createInvoice,
} from "../../services/invoiceService";

const input = "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-600";

const InvoiceCreate = () => {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    invoiceNumber: "INV-2024-" + Math.floor(Math.random() * 10000),
    purchaseOrderId: "",
    vendorId: "",
    invoiceDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    vendor: "",
    lineItems: [{ description: "", quantity: "", rate: "", amount: "" }],
    subtotal: "",
    tax: "",
    total: "",
    notes: "",
  });

  useEffect(() => {
  loadPurchaseOrders();
}, []);

const loadPurchaseOrders = async () => {
  try {
    const data = await getPurchaseOrders();

    console.log("Purchase Orders =", data);

    setPurchaseOrders(
  data.filter(
    (po) => po.status === "Approved"
  )
);

  } catch (err) {
    console.error(err);
  }
};

  const loadPurchaseOrder = async (id) => {

  try {

    const po = await getPurchaseOrderById(id);

    setFormData((prev) => ({

      ...prev,

      purchaseOrderId: id,

      vendor: po.vendor,

      vendorId: po.vendorId,

      lineItems: po.items || [],

      subtotal: po.amount,

      total: po.amount,

      notes: po.description || "",

      paymentTerms: po.paymentTerms || "",

    }));

  } catch (err) {

    console.error(err);

  }

};

  const handleChange = (e) => {
  const { name, value } = e.target;

  if (name === "purchaseOrderId") {

    const po = purchaseOrders.find((p) => p.id === value);

    console.log("Selected PO =", po);

    if (po) {

      setFormData((prev) => ({
        ...prev,

        purchaseOrderId: po.id,

        vendor: po.vendor,

        vendorId: po.vendorId,

        lineItems: po.items.map(item => ({ ...item })),

        subtotal: po.amount,

        total: po.amount,
      }));

      console.log(formData.lineItems);

      return;
    }
  }

  setFormData((prev) => ({
    ...prev,
    [name]: value,
  }));

  setTimeout(() => {
  console.log("FORM DATA ITEMS", po.items);
}, 100);

};
  const handleAddItem = () => {
    setFormData((prev) => ({
      ...prev,
      lineItems: [...prev.lineItems, { description: "", quantity: "", rate: "", amount: "" }],
    }));
  };

  const handleItemChange = (idx, field, value) => {
    const newItems = [...formData.lineItems];
    newItems[idx][field] = value;
    setFormData((prev) => ({
      ...prev,
      lineItems: newItems,
    }));
  };

  const handleSubmit = async (e) => {

  e.preventDefault();

  try {

    await createInvoice(formData);

    alert("Invoice Created Successfully");

    navigate("/invoices");

  } catch (err) {

    console.error(err);

    alert(
      err.response?.data?.message ||
      "Unable to create Invoice"
    );

  }

};

  console.log("FORM DATA =", formData);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/invoices">
          <button className="rounded-lg p-2 hover:bg-slate-100 transition">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Create Invoice</h1>
          <p className="mt-1 text-slate-500">Create a new vendor invoice for approval</p>
        </div>
      </div>

      {/* Form */}
      <div className="rounded-xl border border-slate-200 bg-white p-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Invoice Details */}
          <div>
            <h2 className="mb-6 text-lg font-semibold text-slate-900">Invoice Details</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Invoice Number
                </label>
                <input
                  type="text"
                  value={formData.invoiceNumber}
                  disabled
                  className={`${input} bg-slate-50 text-slate-600 cursor-not-allowed`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Purchase Order *
                </label>
                <select
name="purchaseOrderId"
value={formData.purchaseOrderId || ""}
onChange={handleChange}
className={input}
required
>

<option value="">
Select Purchase Order
</option>

{purchaseOrders.map((po)=>(

<option
key={po.id}
value={po.id}
>

{po.poNumber}

</option>

))}

</select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Vendor *
                </label>
                <input
                name="vendor"
                value={formData.vendor || ""}
                readOnly
                className={`${input} bg-slate-100`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Invoice Date
                </label>
                <input
                  type="date"
                  name="invoiceDate"
                  value={formData.invoiceDate}
                  onChange={handleChange}
                  className={input}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Due Date *
                </label>
                <input
                  type="date"
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleChange}
                  className={input}
                  required
                />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Line Items</h2>
              
            </div>

            <div className="space-y-4">
              {formData.lineItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg">
                  <input
                    value={item.description}
                    readOnly
                    className={`${input} bg-slate-100`}
                  />
                  <input
                    value={item.quantity}
                    readOnly
                    className={`${input} bg-slate-100`}
                    />
                  <input
                    value={item.rate}
                    readOnly
                    className={`${input} bg-slate-100`}
                    />
                  <input
                    value={item.amount}
                    readOnly
                    className={`${input} bg-slate-100`}
                    />
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="grid grid-cols-3 gap-6 rounded-lg bg-slate-50 p-6">
            <div>
              <p className="text-xs font-medium text-slate-600">Subtotal</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">₹ {Number(formData.subtotal || 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-600">Tax (18%)</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">₹0.00</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-600">Total Amount</p>
              <p className="mt-2 text-2xl font-bold text-blue-600">₹ {Number(formData.total || 0).toLocaleString()}</p>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Notes & Special Instructions
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Add any additional notes or comments"
              rows="4"
              className={`${input} resize-none`}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-6 border-t border-slate-200">
            <button
              type="submit"
              className="flex-1 rounded-lg bg-blue-600 py-3 text-center font-medium text-white transition hover:bg-blue-700"
            >
              Create Invoice
            </button>
            <button
              type="button"
              onClick={() => navigate("/invoices")}
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

export default InvoiceCreate;
