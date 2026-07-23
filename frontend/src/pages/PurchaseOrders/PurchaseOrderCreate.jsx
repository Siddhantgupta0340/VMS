import { ArrowLeft, ChevronDown, Copy, Plus, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

import { calculatePurchaseOrderTax, createPurchaseOrder } from "../../services/purchaseOrderServices";
import { RequiredLabel, ValidationSummary } from "../../components/common/FormValidation";
import { getVendorsLookup } from "../../services/lookupService";
import { getVendorById } from "../../services/vendorService";
import { getErrorMessage, notify } from "../../utils/feedback";
import { fieldErrorClass, focusValidationField, validateRequiredFields } from "../../utils/validationMatrix";

const input = "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100";
const readOnly = "h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700";
const emptyItem = { itemName: "", description: "", quantity: "", rate: "", gstRate: "" };
const companyName = import.meta.env.VITE_COMPANY_NAME || "";
const companyGst = import.meta.env.VITE_COMPANY_GST || "";
const companyAddress = import.meta.env.VITE_COMPANY_ADDRESS || "";

const currency = (value) => `Rs. ${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const emptyPreview = {
  items: [],
  summary: {
    subtotal: 0,
    taxableAmount: 0,
    cgstTotal: 0,
    sgstTotal: 0,
    igstTotal: 0,
    totalGst: 0,
    otherCharges: 0,
    roundOff: 0,
    grandTotal: 0,
    taxType: "-",
  },
};

const Field = ({ label, value, isRequired = false }) => (
  <div>
    <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
    <p className="mt-1 min-h-5 text-sm font-semibold text-slate-900">
      {value || (isRequired ? <span className="rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-700">{label} missing. Complete in Vendor Master.</span> : <span className="text-slate-400 font-normal">Not Provided</span>)}
    </p>
  </div>
);

const MissingField = ({ field, source = "Vendor Master" }) => (
  <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
    {field} missing. Complete it in {source}.
  </span>
);

const ItemSection = ({ title, children }) => (
  <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
    <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">{title}</h3>
    <div className="grid gap-4 sm:grid-cols-2">{children}</div>
  </div>
);

const FormField = ({ label, children }) => (
  <label className="block">
    <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
    {children}
  </label>
);

const ReadOnlyMetric = ({ label, value, strong = false }) => (
  <div>
    <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
    <p className={`mt-1 text-sm ${strong ? "font-bold text-blue-700" : "font-semibold text-slate-900"}`}>
      {value}
    </p>
  </div>
);

const PurchaseOrderCreate = () => {
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const [vendors, setVendors] = useState([]);
  const [vendorMasterDetails, setVendorMasterDetails] = useState(null);
  const [vendorQuery, setVendorQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [taxPreview, setTaxPreview] = useState(emptyPreview);
  const [taxLoading, setTaxLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [formData, setFormData] = useState({
    vendorId: "",
    orderDate: new Date().toISOString().split("T")[0],
    expectedDelivery: "",
    deliveryAddress: "",
    billingAddress: "",
    items: [{ ...emptyItem }],
    otherCharges: "0",
    terms: "",
    notes: "",
  });

  useEffect(() => {
    let active = true;
    const loadVendors = async () => {
      setLoadingVendors(true);
      try {
        const data = await getVendorsLookup(vendorQuery);
        if (active) setVendors(data);
      } catch (error) {
        notify.error(getErrorMessage(error, "Approved vendors could not be loaded."));
      } finally {
        if (active) setLoadingVendors(false);
      }
    };

    const timer = window.setTimeout(loadVendors, 200);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [vendorQuery]);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const selectedVendor = vendors.find((vendor) => vendor.id === formData.vendorId);
  const activeVendor = vendorMasterDetails || selectedVendor;
  const preview = taxPreview;
  const errorsByField = validationErrors.reduce((acc, error) => ({ ...acc, [error.field]: error.message }), {});

  useEffect(() => {
    const canCalculate =
      formData.vendorId &&
      formData.items.length > 0 &&
      formData.items.every((item) => (
        item.itemName.trim() &&
        item.description.trim() &&
        Number(item.quantity) > 0 &&
        Number(item.rate) >= 0
      ));

    if (!canCalculate) {
      setTaxPreview(emptyPreview);
      return undefined;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      setTaxLoading(true);
      try {
        const data = await calculatePurchaseOrderTax(formData);
        if (active) setTaxPreview(data);
      } catch (error) {
        if (active) {
          setTaxPreview(emptyPreview);
          notify.error(getErrorMessage(error, "Tax summary could not be calculated."));
        }
      } finally {
        if (active) setTaxLoading(false);
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [formData]);

  const handleChange = (event) => {
    setFormData((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  };

  const selectVendor = async (vendor) => {
    let full = vendor;
    try {
      full = await getVendorById(vendor.id);
    } catch {
      full = vendor;
    }
    setVendorMasterDetails(full);
    setFormData((prev) => ({
      ...prev,
      vendorId: vendor.id,
      deliveryAddress: prev.deliveryAddress || full.address || full.vendorAddress || vendor.address || "",
      billingAddress: prev.billingAddress || companyAddress || full.address || vendor.address || "",
    }));
    setVendorQuery(`${full.vendorCode || vendor.vendorCode} - ${full.vendorName || vendor.vendorName || vendor.name}`);
    setDropdownOpen(false);
  };

  const handleAddItem = () => {
    setFormData((prev) => ({ ...prev, items: [...prev.items, { ...emptyItem }] }));
  };

  const handleRemoveItem = (index) => {
    setFormData((prev) => ({ ...prev, items: prev.items.filter((_, itemIndex) => itemIndex !== index) }));
  };

  const handleDuplicateItem = (index) => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items.slice(0, index + 1),
        { ...prev.items[index] },
        ...prev.items.slice(index + 1),
      ],
    }));
  };

  const handleItemChange = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const vendorMasterErrors = activeVendor ? [
      ["Vendor GST Number", activeVendor.gstNumber || activeVendor.vendorGst || activeVendor.gst_number || activeVendor.tax_id],
      ["Vendor Contact Person", activeVendor.contactPerson || activeVendor.vendorContactPerson || activeVendor.contact_person || activeVendor.name || activeVendor.vendorName],
      ["Vendor Email", activeVendor.email || activeVendor.vendorEmail],
      ["Vendor Phone", activeVendor.phone || activeVendor.vendorPhone],
      ["Vendor State", activeVendor.state || activeVendor.vendorState],
    ]
      .filter(([, value]) => !value)
      .map(([label]) => ({
        field: "vendorId",
        label,
        message: `${label} missing. Complete it in Vendor Master before creating a Purchase Order.`,
      })) : [];
    const errors = [...validateRequiredFields("purchaseOrder", formData), ...vendorMasterErrors];
    setValidationErrors(errors);
    if (errors.length) {
      notify.error("Cannot save Purchase Order. Please complete the highlighted fields.");
      window.setTimeout(() => focusValidationField(errors[0].field), 0);
      return;
    }
    setSubmitting(true);

    try {
      const created = await createPurchaseOrder(formData);
      notify.success(`Purchase order ${created.poNumber || ""} created successfully.`);
      navigate("/purchase-orders");
    } catch (error) {
      notify.error(getErrorMessage(error, "Unable to create purchase order."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <ValidationSummary
        title="Cannot save Purchase Order."
        errors={validationErrors}
        onSelect={(field) => focusValidationField(field)}
      />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link to="/purchase-orders" className="rounded-lg p-2 transition hover:bg-slate-100">
            <ArrowLeft size={20} className="text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-950">Create Purchase Order</h1>
            <p className="mt-1 text-sm text-slate-500">Backend generates the PO number and final tax totals.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="mb-5 border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-950">Purchase Order Information</h2>
              <p className="mt-1 text-sm text-slate-500">Vendor and commercial details are sourced from approved database records.</p>
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">PO Number</label>
                <input value="Generated after creation" disabled className={readOnly} />
              </div>
              <div>
                <RequiredLabel helper="Used in invoice and matching documents.">PO Date</RequiredLabel>
                <input type="date" name="orderDate" value={formData.orderDate} onChange={handleChange} className={`${input} ${fieldErrorClass(errorsByField.orderDate)}`} />
              </div>
              <div>
                <RequiredLabel>Expected Delivery Date</RequiredLabel>
                <input type="date" name="expectedDelivery" value={formData.expectedDelivery} onChange={handleChange} className={`${input} ${fieldErrorClass(errorsByField.expectedDelivery)}`} required />
              </div>

              <div className="relative lg:col-span-2" ref={dropdownRef}>
                <RequiredLabel helper="Only approved vendors with complete master data should be selected.">Vendor</RequiredLabel>
                <div className="relative">
                  <input
                    type="text"
                    value={vendorQuery}
                    onFocus={() => setDropdownOpen(true)}
                    onChange={(event) => {
                      setVendorQuery(event.target.value);
                      setDropdownOpen(true);
                      setFormData((prev) => ({ ...prev, vendorId: "" }));
                    }}
                    placeholder="Search vendor code, vendor name, or GST"
                    name="vendorId"
                    className={`${input} pr-10 ${fieldErrorClass(errorsByField.vendorId)}`}
                    required={!formData.vendorId}
                  />
                  <ChevronDown className="pointer-events-none absolute right-3 top-3 text-slate-400" size={18} />
                </div>
                {dropdownOpen && (
                  <div className="absolute z-30 mt-2 max-h-72 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                    {loadingVendors ? (
                      <div className="p-4 text-sm text-slate-500">Loading approved vendors...</div>
                    ) : vendors.length ? (
                      vendors.map((vendor) => (
                        <button
                          type="button"
                          key={vendor.id}
                          onClick={() => selectVendor(vendor)}
                          className="block w-full border-b border-slate-100 px-4 py-3 text-left transition last:border-0 hover:bg-blue-50"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-bold text-slate-950">{vendor.vendorCode} - {vendor.vendorName}</p>
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{vendor.category || "-"}</span>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">GST: {vendor.gstNumber || "-"} | {vendor.address || "Address not available"}</p>
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-sm text-slate-500">No approved vendors found.</div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <RequiredLabel>Payment Terms</RequiredLabel>
                <select name="terms" value={formData.terms} onChange={handleChange} className={`${input} ${fieldErrorClass(errorsByField.terms)}`}>
                  <option value="">Select Terms</option>
                  <option value="Net 30">Net 30</option>
                  <option value="Net 60">Net 60</option>
                  <option value="Due on Receipt">Due on Receipt</option>
                  <option value="2/10 Net 30">2/10 Net 30</option>
                </select>
              </div>
            </div>

            <div className="mt-6 grid gap-5 rounded-xl bg-slate-50 p-5 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Vendor GST Number" value={activeVendor?.gstNumber || activeVendor?.gst || activeVendor?.vendorGst} isRequired />
              <Field label="Vendor Category" value={activeVendor?.category || activeVendor?.vendorCategory} isRequired />
              <Field label="Vendor Contact Person" value={activeVendor?.contactPerson || activeVendor?.vendorContactPerson} isRequired />
              <Field label="Vendor Email" value={activeVendor?.email || activeVendor?.vendorEmail} isRequired />
              <Field label="Vendor Phone" value={activeVendor?.phone || activeVendor?.vendorPhone} isRequired />
              <Field label="Vendor State" value={activeVendor?.state || activeVendor?.vendorState} isRequired />
              <Field label="Tax Type" value={activeVendor?.taxType || activeVendor?.vendorTaxType} isRequired />
              <Field label="Company GST" value={companyGst} />
              <Field label="Bank Name" value={activeVendor?.bankName || activeVendor?.vendorBankName} isRequired />
              <Field label="Account Holder" value={activeVendor?.accountHolder || activeVendor?.vendorAccountHolder} isRequired />
              <Field label="Account Number" value={activeVendor?.bankAccountNo ? (String(activeVendor.bankAccountNo).startsWith("****") ? activeVendor.bankAccountNo : `**** ${String(activeVendor.bankAccountNo).slice(-4)}`) : (activeVendor?.vendorBankAccountNo ? `**** ${String(activeVendor.vendorBankAccountNo).slice(-4)}` : null)} isRequired />
              <Field label="IFSC Code" value={activeVendor?.ifscCode || activeVendor?.vendorIfscCode} isRequired />
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Vendor Address</label>
                <textarea value={activeVendor?.address || activeVendor?.vendorAddress || ""} disabled rows={3} className={`${readOnly} h-auto py-3`} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Company Name</label>
                <input value={companyName} disabled className={readOnly} />
              </div>
              <div>
                <RequiredLabel>Delivery Address</RequiredLabel>
                <textarea name="deliveryAddress" value={formData.deliveryAddress} onChange={handleChange} rows={3} className={`${input} h-auto py-3 ${fieldErrorClass(errorsByField.deliveryAddress)}`} />
              </div>
              <div>
                <RequiredLabel>Billing Address</RequiredLabel>
                <textarea name="billingAddress" value={formData.billingAddress} onChange={handleChange} rows={3} className={`${input} h-auto py-3 ${fieldErrorClass(errorsByField.billingAddress)}`} />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-950">Item Details</h2>
                <p className="mt-1 text-sm text-slate-500">Each item is structured by product, pricing, tax, and final line value. Totals still come from the backend.</p>
              </div>
              <button type="button" onClick={handleAddItem} className="inline-flex items-center gap-2 rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">
                <Plus size={16} />
                Add Item
              </button>
            </div>

            <div className="space-y-4">
              {formData.items.map((item, index) => {
                const calculated = preview.items[index] || {};
                return (
                  <article key={index} className="rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-blue-200 hover:shadow-md">
                    <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-blue-600">Item {index + 1}</p>
                        <h3 className="mt-1 text-base font-bold text-slate-950">{item.itemName || "New purchase item"}</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleDuplicateItem(index)}
                          className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          <Copy size={15} />
                          Duplicate Item
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          disabled={formData.items.length === 1}
                          className="inline-flex h-10 items-center gap-2 rounded-lg border border-red-200 px-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Trash2 size={15} />
                          Delete Item
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-4 p-5 xl:grid-cols-2">
                      <ItemSection title="Item Information">
                        <FormField label="Item Name *">
                          <input value={item.itemName} onChange={(event) => handleItemChange(index, "itemName", event.target.value)} className={`${input} ${fieldErrorClass(errorsByField.items)}`} required />
                        </FormField>
                        <FormField label="Description *">
                          <textarea value={item.description} onChange={(event) => handleItemChange(index, "description", event.target.value)} rows={3} className={`${input} h-auto py-3`} required />
                        </FormField>
                      </ItemSection>

                      <ItemSection title="Pricing">
                        <FormField label="Quantity *">
                          <input type="number" min="0" step="0.01" value={item.quantity} onChange={(event) => handleItemChange(index, "quantity", event.target.value)} className={input} required />
                        </FormField>
                        <FormField label="Unit Price *">
                          <input type="number" min="0" step="0.01" value={item.rate} onChange={(event) => handleItemChange(index, "rate", event.target.value)} className={input} required />
                        </FormField>
                        <ReadOnlyMetric label="Taxable Amount" value={currency(calculated.taxableAmount)} />
                      </ItemSection>

                      <ItemSection title="Tax Details">
                        <FormField label="GST %">
                          <input type="number" min="0" max="100" step="0.01" value={item.gstRate} onChange={(event) => handleItemChange(index, "gstRate", event.target.value)} className={input} />
                        </FormField>
                        <ReadOnlyMetric label="CGST %" value={`${calculated.cgstRate ?? 0}%`} />
                        <ReadOnlyMetric label="SGST %" value={`${calculated.sgstRate ?? 0}%`} />
                        <ReadOnlyMetric label="IGST %" value={`${calculated.igstRate ?? 0}%`} />
                        <ReadOnlyMetric label="GST Amount" value={currency(calculated.gstAmount)} />
                      </ItemSection>

                      <ItemSection title="Summary">
                        <ReadOnlyMetric label="Line Total" value={currency(calculated.lineTotal)} strong />
                        <ReadOnlyMetric label="Tax Type" value={preview.summary.taxType || "-"} />
                      </ItemSection>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="xl:sticky xl:top-0 xl:self-start">
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-bold text-slate-950">Tax Summary</h2>
              {taxLoading && <span className="text-xs font-semibold text-blue-600">Calculating...</span>}
            </div>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><strong>{currency(preview.summary.subtotal)}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">Taxable Amount</span><strong>{currency(preview.summary.taxableAmount)}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">CGST Total</span><strong>{currency(preview.summary.cgstTotal)}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">SGST Total</span><strong>{currency(preview.summary.sgstTotal)}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">IGST Total</span><strong>{currency(preview.summary.igstTotal)}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">Total GST</span><strong>{currency(preview.summary.totalGst)}</strong></div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Other Charges</label>
                <input type="number" min="0" step="0.01" name="otherCharges" value={formData.otherCharges} onChange={handleChange} className={input} />
              </div>
              <div className="flex justify-between"><span className="text-slate-500">Round Off</span><strong>{currency(preview.summary.roundOff)}</strong></div>
              <div className="border-t border-slate-200 pt-4">
                <div className="flex justify-between text-lg">
                  <span className="font-bold text-slate-950">Grand Total</span>
                  <strong className="text-blue-700">{currency(preview.summary.grandTotal)}</strong>
                </div>
              </div>
            </div>
            <label className="mt-6 block text-sm font-semibold text-slate-700">
              Notes
              <textarea name="notes" value={formData.notes} onChange={handleChange} rows={4} className={`${input} mt-2 h-auto py-3`} />
            </label>
            <div className="mt-6 grid gap-3">
              <button type="submit" disabled={submitting || !formData.vendorId} className="rounded-lg bg-blue-600 py-3 text-center font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60">
                {submitting ? "Creating..." : "Create Purchase Order"}
              </button>
              <button type="button" onClick={() => navigate("/purchase-orders")} className="rounded-lg border border-slate-300 py-3 text-center font-semibold text-slate-700 transition hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </section>
        </aside>
      </form>
    </div>
  );
};

export default PurchaseOrderCreate;
