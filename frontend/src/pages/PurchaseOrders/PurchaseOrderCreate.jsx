import { ArrowLeft, ChevronDown, Copy, Plus, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { COMPANY_CONFIG } from "../../config/company";

import { calculatePurchaseOrderTax, createPurchaseOrder, getPurchaseOrderById, updatePurchaseOrder } from "../../services/purchaseOrderServices";
import { RequiredLabel, ValidationSummary } from "../../components/common/FormValidation";
import DateInput from "../../components/common/DateInput";
import { getVendorsLookup } from "../../services/lookupService";
import { getVendorById } from "../../services/vendorService";
import { getErrorMessage, notify } from "../../utils/feedback";
import { fieldErrorClass, focusValidationField, validateRequiredFields } from "../../utils/validationMatrix";

const input = "h-11 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20";
const readOnly = "h-11 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 text-sm font-medium text-slate-700 dark:text-slate-300";
const emptyItem = { itemCode: "", itemName: "", description: "", quantity: "", rate: "", gstRate: "", unit: "" };

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

const Field = ({ label, value, isHighlight = false }) => {
  const hasVal = value !== undefined && value !== null && value !== "" && value !== "[object Object]" && value !== "N/A" && value !== "Not Provided";
  const isDocId = isHighlight || (typeof value === "string" && /^(DC-|PO-|GRN-|ITM-|INV-)/i.test(value));
  return (
    <div className="min-w-0 rounded-xl border border-slate-200/60 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 p-3 shadow-2xs transition">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1.5 min-h-5 text-sm ${hasVal ? (isDocId ? "font-bold text-blue-600 dark:text-blue-400 break-all sm:break-words" : "font-semibold text-slate-900 dark:text-slate-100 break-all sm:break-words") : "font-medium text-slate-400 dark:text-slate-500 italic font-sans"}`}>
        {hasVal ? value : "Not Available"}
      </p>
    </div>
  );
};

const ItemSection = ({ title, children }) => (
  <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-4">
    <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">{title}</h3>
    <div className="grid gap-4 sm:grid-cols-2">{children}</div>
  </div>
);

const FormField = ({ label, children }) => (
  <label className="block">
    <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
    {children}
  </label>
);

const ReadOnlyMetric = ({ label, value, strong = false }) => (
  <div>
    <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{label}</p>
    <p className={`mt-1 text-sm ${strong ? "font-bold text-blue-700 dark:text-blue-400" : "font-semibold text-slate-900 dark:text-slate-100"}`}>
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
    poType: "STANDARD",
    purchaseRequisitionNumber: "",
    department: "",
    costCenter: "",
    requester: "",
    buyer: "",
    quotationDate: "",
  });
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const [loadingPO, setLoadingPO] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let isSubscribed = true;
    const fetchVendors = async () => {
      try {
        setLoadingVendors(true);
        const data = await getVendorsLookup(vendorQuery);
        if (isSubscribed) setVendors(data);
      } catch (error) {
        if (isSubscribed) notify.error(getErrorMessage(error, "Failed to load vendors lookup"));
      } finally {
        if (isSubscribed) setLoadingVendors(false);
      }
    };

    const timer = setTimeout(fetchVendors, 250);
    return () => {
      isSubscribed = false;
      clearTimeout(timer);
    };
  }, [vendorQuery]);

  useEffect(() => {
    if (!id) return;
    const fetchPOForEdit = async () => {
      try {
        setLoadingPO(true);
        const poData = await getPurchaseOrderById(id);
        if (poData) {
          setFormData({
            vendorId: poData.vendorId || "",
            orderDate: poData.orderDate ? poData.orderDate.split("T")[0] : new Date().toISOString().split("T")[0],
            expectedDelivery: poData.expectedDelivery ? poData.expectedDelivery.split("T")[0] : "",
            deliveryAddress: poData.deliveryAddress || "",
            billingAddress: poData.billingAddress || "",
            items: poData.items?.length
              ? poData.items.map((it) => ({
                itemCode: it.itemCode || "",
                itemName: it.itemName || "",
                description: it.description || "",
                quantity: it.quantity ?? "",
                rate: it.unitPrice ?? it.rate ?? "",
                gstRate: it.gstRate ?? "",
                unit: it.unit || "",
              }))
              : [{ ...emptyItem }],
            otherCharges: String(poData.otherCharges ?? 0),
            terms: poData.paymentTerms || "",
            notes: poData.notes || "",
            poType: poData.poType || "STANDARD",
            purchaseRequisitionNumber: poData.purchaseRequisitionNumber || "",
            department: poData.department || "",
            costCenter: poData.costCenter || "",
            requester: poData.requester || "",
            buyer: poData.buyer || "",
            quotationDate: poData.quotationDate ? poData.quotationDate.split("T")[0] : "",
          });
          if (poData.vendor) {
            setVendorQuery(`${poData.vendor.vendorCode || ""} - ${poData.vendor.vendorName || poData.vendor.name || ""}`);
          }
        }
      } catch (error) {
        notify.error(getErrorMessage(error, "Failed to load purchase order details for editing"));
      } finally {
        setLoadingPO(false);
      }
    };
    fetchPOForEdit();
  }, [id]);

  useEffect(() => {
    if (!formData.vendorId) {
      setVendorMasterDetails(null);
      return;
    }
    let isSubscribed = true;
    const fetchVendorDetails = async () => {
      try {
        const fullVendor = await getVendorById(formData.vendorId);
        if (!isSubscribed) return;
        setVendorMasterDetails(fullVendor);

        setFormData((prev) => ({
          ...prev,
          deliveryAddress: prev.deliveryAddress || COMPANY_CONFIG.address,
          billingAddress: prev.billingAddress || COMPANY_CONFIG.address,
          terms: prev.terms || fullVendor?.paymentTerms || "Net 30",
        }));
      } catch (error) {
        if (isSubscribed) {
          notify.error(getErrorMessage(error, "Unable to load vendor detail profile"));
          setVendorMasterDetails(null);
        }
      }
    };

    fetchVendorDetails();
    return () => {
      isSubscribed = false;
    };
  }, [formData.vendorId]);

  useEffect(() => {
    let isSubscribed = true;
    const timer = setTimeout(async () => {
      try {
        setTaxLoading(true);
        const payload = {
          vendorId: formData.vendorId,
          otherCharges: Number(formData.otherCharges || 0),
          items: formData.items.map((item) => ({
            quantity: Number(item.quantity || 0),
            rate: Number(item.rate || 0),
            gstRate: Number(item.gstRate || 0),
          })),
        };
        const calculation = await calculatePurchaseOrderTax(payload);
        if (isSubscribed && calculation) {
          setTaxPreview(calculation);
        }
      } catch {
        if (isSubscribed) {
          setTaxPreview(emptyPreview);
        }
      } finally {
        if (isSubscribed) setTaxLoading(false);
      }
    }, 300);

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
    };
  }, [formData.vendorId, formData.items, formData.otherCharges]);

  const selectVendor = (vendor) => {
    setFormData((prev) => ({
      ...prev,
      vendorId: vendor.id,
      deliveryAddress: prev.deliveryAddress || COMPANY_CONFIG.address,
      billingAddress: prev.billingAddress || COMPANY_CONFIG.address,
      terms: prev.terms || vendor.paymentTerms || "Net 30",
    }));
    setVendorQuery(`${vendor.vendorCode} - ${vendor.vendorName}`);
    setDropdownOpen(false);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, field, value) => {
    setFormData((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  };

  const handleAddItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { ...emptyItem }],
    }));
  };

  const handleDuplicateItem = (index) => {
    setFormData((prev) => {
      const targetItem = prev.items[index];
      const duplicatedItem = {
        ...targetItem,
        itemName: targetItem.itemName ? `${targetItem.itemName} (Copy)` : "",
      };
      const newItems = [...prev.items];
      newItems.splice(index + 1, 0, duplicatedItem);
      return { ...prev, items: newItems };
    });
    notify.success(`Duplicated item #${index + 1}`);
  };

  const handleRemoveItem = (index) => {
    if (formData.items.length === 1) return;
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const errorsByField = validationErrors.reduce((acc, err) => {
    acc[err.field] = err.message;
    return acc;
  }, {});

  const handleSubmit = async (event) => {
    event.preventDefault();
    const errors = validateRequiredFields("purchaseOrderCreate", formData);
    setValidationErrors(errors);

    if (errors.length) {
      notify.error("Form validation failed. Please correct all highlighted fields.");
      window.setTimeout(() => focusValidationField(errors[0].field), 0);
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        vendorId: formData.vendorId,
        orderDate: formData.orderDate,
        expectedDelivery: formData.expectedDelivery,
        deliveryAddress: formData.deliveryAddress,
        billingAddress: formData.billingAddress,
        items: formData.items.map((item) => ({
          itemCode: item.itemCode,
          itemName: item.itemName,
          description: item.description,
          quantity: Number(item.quantity),
          rate: Number(item.rate),
          gstRate: Number(item.gstRate || 0),
          unit: item.unit || undefined,
        })),
        otherCharges: Number(formData.otherCharges || 0),
        terms: formData.terms,
        notes: formData.notes,
        poType: formData.poType,
        purchaseRequisitionNumber: formData.purchaseRequisitionNumber || undefined,
        department: formData.department || undefined,
        costCenter: formData.costCenter || undefined,
        requester: formData.requester || undefined,
        buyer: formData.buyer || undefined,
        quotationDate: formData.quotationDate || undefined,
      };

      if (isEditMode) {
        await updatePurchaseOrder(id, payload);
        notify.success("Purchase order updated successfully.");
        navigate(`/purchase-orders/${id}`);
      } else {
        const createdPO = await createPurchaseOrder(payload);
        notify.success("Purchase order created successfully.");
        navigate(`/purchase-orders/${createdPO.id}`);
      }
    } catch (error) {
      notify.error(getErrorMessage(error, "Failed to save purchase order"));
    } finally {
      setSubmitting(false);
    }
  };

  const activeVendor = vendorMasterDetails || vendors.find((v) => v.id === formData.vendorId);
  const preview = taxPreview || emptyPreview;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <Link to="/purchase-orders" className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-slate-600 dark:text-slate-300 shadow-sm transition hover:bg-slate-50 dark:hover:bg-slate-800">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 font-heading sm:text-3xl">
              {isEditMode ? "Edit Purchase Order" : "Create Purchase Order"}
            </h1>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
              {isEditMode ? "Modify existing purchase order line items and terms." : "Draft a legally binding purchase order from approved vendor master records."}
            </p>
          </div>
        </div>
      </div>

      <ValidationSummary
        title="Form submission prevented"
        errors={validationErrors}
        onSelect={(field) => focusValidationField(field)}
      />

      {loadingPO ? (
        <div className="flex h-64 items-center justify-center">
          <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Loading purchase order details...</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm dark:shadow-slate-950/40">
            <div className="mb-5 border-b border-slate-100 dark:border-slate-800 pb-4">
              <h2 className="text-base font-bold text-slate-950 dark:text-slate-100">Purchase Order Information</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">Vendor and commercial details are sourced from approved database records.</p>
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">PO Number</label>
                <input value="Generated after creation" disabled className={readOnly} />
              </div>
              <div>
                <RequiredLabel helper="Used in invoice and matching documents.">PO Date</RequiredLabel>
                <DateInput name="orderDate" value={formData.orderDate} onChange={(nextValue) => handleChange({ target: { name: "orderDate", value: nextValue } })} invalid={!!errorsByField.orderDate} ariaLabel="PO date" />
              </div>
              <div>
                <RequiredLabel>Expected Delivery Date</RequiredLabel>
                <DateInput name="expectedDelivery" value={formData.expectedDelivery} onChange={(nextValue) => handleChange({ target: { name: "expectedDelivery", value: nextValue } })} invalid={!!errorsByField.expectedDelivery} required ariaLabel="Expected delivery date" />
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
                  <div className="absolute z-30 mt-2 max-h-72 w-full overflow-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
                    {loadingVendors ? (
                      <div className="p-4 text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 dark:border-slate-700 border-t-blue-600 shrink-0" />
                        Loading approved vendors...
                      </div>
                    ) : vendors.length ? (
                      vendors.map((vendor) => (
                        <button
                          type="button"
                          key={vendor.id}
                          onClick={() => selectVendor(vendor)}
                          className="block w-full border-b border-slate-100 dark:border-slate-800 px-4 py-3 text-left transition last:border-0 hover:bg-blue-50 dark:hover:bg-slate-800/80"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-bold text-slate-950 dark:text-slate-100">{vendor.vendorCode} - {vendor.vendorName}</p>
                            <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300">{vendor.category || "-"}</span>
                          </div>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">GST: {vendor.gstNumber || "-"} | {vendor.address || "Address not available"}</p>
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-sm text-slate-500 dark:text-slate-400">No approved vendors found.</div>
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

            <div className="mt-6 grid gap-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-5 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Vendor GST Number" value={activeVendor?.gstNumber || activeVendor?.gst || activeVendor?.vendorGst} isRequired />
              <Field label="Vendor Category" value={activeVendor?.category || activeVendor?.vendorCategory} isRequired />
              <Field label="Vendor Contact Person" value={activeVendor?.contactPerson || activeVendor?.vendorContactPerson} isRequired />
              <Field label="Vendor Email" value={activeVendor?.email || activeVendor?.vendorEmail} isRequired />
              <Field label="Vendor Phone" value={activeVendor?.phone || activeVendor?.vendorPhone} isRequired />
              <Field label="Vendor State" value={activeVendor?.state || activeVendor?.vendorState} isRequired />
              <Field label="Tax Type" value={activeVendor?.taxType || activeVendor?.vendorTaxType} isRequired />
              <Field label="Company GST" value={COMPANY_CONFIG.gstin} />
              <Field label="Bank Name" value={activeVendor?.bankName || activeVendor?.vendorBankName} isRequired />
              <Field label="Account Holder" value={activeVendor?.accountHolder || activeVendor?.vendorAccountHolder} isRequired />
              <Field label="Account Number" value={activeVendor?.bankAccountNo ? (String(activeVendor.bankAccountNo).startsWith("****") ? activeVendor.bankAccountNo : `**** ${String(activeVendor.bankAccountNo).slice(-4)}`) : (activeVendor?.vendorBankAccountNo ? `**** ${String(activeVendor.vendorBankAccountNo).slice(-4)}` : null)} isRequired />
              <Field label="IFSC Code" value={activeVendor?.ifscCode || activeVendor?.vendorIfscCode} isRequired />
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Vendor Address</label>
                <textarea value={activeVendor?.address || activeVendor?.vendorAddress || ""} disabled rows={3} className={`${readOnly} h-auto py-3`} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Company Name</label>
                <input value={COMPANY_CONFIG.name} disabled className={readOnly} />
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

            <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-6">
              <h3 className="mb-4 text-base font-bold text-slate-950 dark:text-slate-100">Procurement &amp; Reference Information</h3>
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                <FormField label="PO Type">
                  <select name="poType" value={formData.poType} onChange={handleChange} className={input}>
                    <option value="STANDARD">Standard</option>
                    <option value="URGENT">Urgent</option>
                    <option value="DIRECT">Direct</option>
                    <option value="BLANKET">Blanket</option>
                  </select>
                </FormField>
                <FormField label="Purchase Requisition Number">
                  <input type="text" name="purchaseRequisitionNumber" value={formData.purchaseRequisitionNumber} onChange={handleChange} className={input} placeholder="e.g. PR-2026-001" />
                </FormField>
                <FormField label="Department">
                  <input type="text" name="department" value={formData.department} onChange={handleChange} className={input} placeholder="e.g. Procurement" />
                </FormField>
                <FormField label="Cost Center">
                  <input type="text" name="costCenter" value={formData.costCenter} onChange={handleChange} className={input} placeholder="e.g. CC-101" />
                </FormField>
                <FormField label="Requester">
                  <input type="text" name="requester" value={formData.requester} onChange={handleChange} className={input} placeholder="e.g. Alice Smith" />
                </FormField>
                <FormField label="Buyer">
                  <input type="text" name="buyer" value={formData.buyer} onChange={handleChange} className={input} placeholder="e.g. Bob Johnson" />
                </FormField>
                <FormField label="Quotation Date">
                  <DateInput name="quotationDate" value={formData.quotationDate} onChange={(nextValue) => handleChange({ target: { name: "quotationDate", value: nextValue } })} ariaLabel="Quotation date" />
                </FormField>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm dark:shadow-slate-950/40 sm:p-6">
            <div className="mb-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-950 dark:text-slate-100">Item Details</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">Each item is structured by product, pricing, tax, and final line value. Totals still come from the backend.</p>
              </div>
              <button type="button" onClick={handleAddItem} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/50 px-3 py-2 text-sm font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 transition">
                <Plus size={16} />
                Add Item
              </button>
            </div>

            <div className="space-y-4">
              {formData.items.map((item, index) => {
                const calculated = preview.items[index] || {};
                return (
                  <article key={index} className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm dark:shadow-slate-950/40 transition hover:border-blue-200 dark:hover:border-blue-800">
                    <div className="flex flex-col gap-3 border-b border-slate-100 dark:border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">Item {index + 1}</p>
                        <h3 className="mt-1 text-base font-bold text-slate-950 dark:text-slate-100">{item.itemName || "New purchase item"}</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleDuplicateItem(index)}
                          className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          <Copy size={15} />
                          Duplicate Item
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          disabled={formData.items.length === 1}
                          className="inline-flex h-10 items-center gap-2 rounded-xl border border-red-200 dark:border-red-900/60 bg-white dark:bg-slate-950 px-3 text-sm font-semibold text-red-700 dark:text-red-400 transition hover:bg-red-50 dark:hover:bg-red-950/30 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Trash2 size={15} />
                          Delete Item
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-4 p-5 xl:grid-cols-2">
                      <ItemSection title="Item Information">
                        <FormField label="Item Code">
                          <input value={item.itemCode || ""} onChange={(event) => handleItemChange(index, "itemCode", event.target.value)} className={input} placeholder="e.g. ITM-001" />
                        </FormField>
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
                        <FormField label="Unit / UOM">
                          <select value={item.unit || ""} onChange={(event) => handleItemChange(index, "unit", event.target.value)} className={input}>
                            <option value="">Select Unit</option>
                            <option value="NOS">NOS (Numbers)</option>
                            <option value="PCS">PCS (Pieces)</option>
                            <option value="SET">SET (Set)</option>
                            <option value="BOX">BOX (Box)</option>
                            <option value="KG">KG (Kilograms)</option>
                            <option value="LTR">LTR (Liters)</option>
                            <option value="MTR">MTR (Meters)</option>
                          </select>
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
          <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm dark:shadow-slate-950/40">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-bold text-slate-950 dark:text-slate-100">Tax Summary</h2>
              {taxLoading && <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">Calculating...</span>}
            </div>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Subtotal</span><strong className="text-slate-900 dark:text-slate-100">{currency(preview.summary.subtotal)}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Taxable Amount</span><strong className="text-slate-900 dark:text-slate-100">{currency(preview.summary.taxableAmount)}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">CGST Total</span><strong className="text-slate-900 dark:text-slate-100">{currency(preview.summary.cgstTotal)}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">SGST Total</span><strong className="text-slate-900 dark:text-slate-100">{currency(preview.summary.sgstTotal)}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">IGST Total</span><strong className="text-slate-900 dark:text-slate-100">{currency(preview.summary.igstTotal)}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Total GST</span><strong className="text-slate-900 dark:text-slate-100">{currency(preview.summary.totalGst)}</strong></div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Other Charges</label>
                <input type="number" min="0" step="0.01" name="otherCharges" value={formData.otherCharges} onChange={handleChange} className={input} />
              </div>
              <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Round Off</span><strong className="text-slate-900 dark:text-slate-100">{currency(preview.summary.roundOff)}</strong></div>
              <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
                <div className="flex justify-between text-lg">
                  <span className="font-bold text-slate-950 dark:text-slate-100">Grand Total</span>
                  <strong className="text-blue-700 dark:text-blue-400">{currency(preview.summary.grandTotal)}</strong>
                </div>
              </div>
            </div>
            <label className="mt-6 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Notes
              <textarea name="notes" value={formData.notes} onChange={handleChange} rows={4} className={`${input} mt-2 h-auto py-3`} />
            </label>
            <div className="mt-6 grid gap-3">
              <button type="submit" disabled={submitting || !formData.vendorId} className="rounded-xl bg-blue-600 py-3 text-center font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60">
                {submitting ? (isEditMode ? "Saving..." : "Creating...") : (isEditMode ? "Save Changes" : "Create Purchase Order")}
              </button>
              <button type="button" onClick={() => navigate("/purchase-orders")} className="rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 py-3 text-center font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-800">
                Cancel
              </button>
            </div>
          </section>
        </aside>
      </form>
      )}
    </div>
  );
};

export default PurchaseOrderCreate;
