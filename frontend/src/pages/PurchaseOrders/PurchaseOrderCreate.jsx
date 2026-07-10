import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useEffect } from "react";

import { getVendors } from "../../services/vendorService";
import { createPurchaseOrder } from "../../services/purchaseOrderServices";

const input = "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-600";

const PurchaseOrderCreate = () => {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState([]);

  const [formData, setFormData] = useState({
    poNumber: "PO-2024-" + Math.floor(Math.random() * 10000),
    vendor: "",
    orderDate: new Date().toISOString().split("T")[0],
    expectedDelivery: "",
    items: [{ description: "", quantity: "", rate: "", amount: "" }],
    total: "",
    terms: "",
    notes: "",
  });

  useEffect(() => {
  loadVendors();
}, []);

const loadVendors = async () => {
  const data = await getVendors();

  setVendors(
    data.filter(
      (vendor) =>
        vendor.status?.toLowerCase() === "approved"
    )
  );
};

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleAddItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { description: "", quantity: "", rate: "", amount: "" }],
    }));
  };

  const handleItemChange = (idx, field, value) => {
  const items = [...formData.items];

  items[idx][field] = value;

  const qty = Number(items[idx].quantity || 0);
  const rate = Number(items[idx].rate || 0);

  items[idx].amount = qty * rate;

  const total = items.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  setFormData((prev) => ({
    ...prev,
    items,
    total,
  }));
};

  const handleSubmit = async (e) => {

  e.preventDefault();

  try {

    await createPurchaseOrder(formData);

    alert("Purchase Order Created Successfully");

    navigate("/purchase-orders");

  } catch (err) {

    console.error(err);

    alert(
      err.response?.data?.message ||
      "Unable to create Purchase Order"
    );

  }

};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/purchase-orders">
          <button className="rounded-lg p-2 hover:bg-slate-100 transition">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Create Purchase Order</h1>
          <p className="mt-1 text-slate-500">Create a new purchase order and send to vendor</p>
        </div>
      </div>

      {/* Form */}
      <div className="rounded-xl border border-slate-200 bg-white p-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* PO Details */}
          <div>
            <h2 className="mb-6 text-lg font-semibold text-slate-900">PO Details</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  PO Number
                </label>
                <input
                  type="text"
                  value={formData.poNumber}
                  disabled
                  className={`${input} bg-slate-50 text-slate-600 cursor-not-allowed`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Vendor *
                </label>
                <select
name="vendorId"
value={formData.vendorId}
onChange={handleChange}
className={input}
required
>
                  <option value="">Select Vendor</option>

{vendors.map((vendor) => (

  <option
    key={vendor.id}
    value={vendor.id}
  >
    {vendor.companyName}
  </option>

))}

                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Order Date
                </label>
                <input
                  type="date"
                  name="orderDate"
                  value={formData.orderDate}
                  onChange={handleChange}
                  className={input}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Expected Delivery *
                </label>
                <input
                  type="date"
                  name="expectedDelivery"
                  value={formData.expectedDelivery}
                  onChange={handleChange}
                  className={input}
                  required
                />
              </div>
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Line Items</h2>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium transition"
              >
                + Add Item
              </button>
            </div>

            <div className="space-y-4">
              {formData.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg">
                  <input
                    type="text"
                    placeholder="Item Description"
                    value={item.description}
                    onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                    className={input}
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                    className={input}
                  />
                  <input
                    type="number"
                    placeholder="Rate"
                    value={item.rate}
                    onChange={(e) => handleItemChange(idx, "rate", e.target.value)}
                    className={input}
                  />
                  <input
                    type="text"
                    placeholder="Amount"
                    value={item.amount}
                    disabled
                    className={`${input} bg-slate-100 font-semibold text-blue-700`}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">

  <div className="flex items-center justify-between">

    <div>

      <p className="text-sm text-slate-600">
        Total Purchase Order Value
      </p>

      <h2 className="mt-2 text-3xl font-bold text-blue-700">
        ₹ {Number(formData.total || 0).toLocaleString()}
      </h2>

    </div>

  </div>

</div>

          {/* Terms & Conditions */}
          <div>
            <h2 className="mb-6 text-lg font-semibold text-slate-900">Terms</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Payment Terms
                </label>
                <select name="terms" onChange={handleChange} className={input}>
                  <option value="">Select Terms</option>
                  <option value="Net 30">Net 30</option>
                  <option value="Net 60">Net 60</option>
                  <option value="Due on Receipt">Due on Receipt</option>
                  <option value="2/10 Net 30">2/10 Net 30</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Notes & Special Instructions
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Add any special instructions, delivery notes, etc."
                  rows="4"
                  className={`${input} resize-none`}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-6 border-t border-slate-200">
            <button
              type="submit"
              className="flex-1 rounded-lg bg-blue-600 py-3 text-center font-medium text-white transition hover:bg-blue-700"
            >
              Create Purchase Order
            </button>
            <button
              type="button"
              onClick={() => navigate("/purchase-orders")}
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

export default PurchaseOrderCreate;
