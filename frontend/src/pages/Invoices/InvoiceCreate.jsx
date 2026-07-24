import { ArrowLeft, ChevronDown, Download, Eye, FileText, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { createInvoice, getApprovedPurchaseOrdersForInvoice, getPurchaseOrderForInvoice, processInvoiceOcr } from "../../services/invoiceService";

import { RequiredLabel } from "../../components/common/FormValidation";
import { getErrorMessage, notify } from "../../utils/feedback";
import { fieldErrorClass, validateRequiredFields } from "../../utils/validationMatrix";

const input = "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100";
const readOnly = "h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700";
const currency = (value) => `Rs. ${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const companyName = import.meta.env.VITE_COMPANY_NAME || "";
const companyGst = import.meta.env.VITE_COMPANY_GST || "";
const companyAddress = import.meta.env.VITE_COMPANY_ADDRESS || "";
const MAX_INVOICE_FILE_SIZE = 20 * 1024 * 1024;
const INVOICE_CATEGORIES = [
  { value: "TAX_INVOICE", label: "Tax Invoice" },
  { value: "PROFORMA_INVOICE", label: "Proforma Invoice" },
  { value: "DEBIT_NOTE", label: "Debit Note" },
  { value: "CREDIT_NOTE", label: "Credit Note" },
  { value: "COMMERCIAL_INVOICE", label: "Commercial Invoice" },
  { value: "SERVICE_INVOICE", label: "Service Invoice" },
  { value: "PURCHASE_INVOICE", label: "Purchase Invoice" },
  { value: "RECURRING_INVOICE", label: "Recurring Invoice" },
  { value: "OTHER", label: "Other" },
];
const debugInvoiceCreate = (...args) => {
  if (import.meta.env.DEV) console.debug(...args);
};
const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
const isSupportedInvoiceFile = (file) => ["application/pdf", "image/png", "image/jpeg"].includes(file?.type);
const formatFileSize = (size) => `${(Number(size || 0) / 1024 / 1024).toFixed(2)} MB`;

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

const ErrorText = ({ message }) => (
  message ? <p className="mt-2 text-xs font-semibold text-red-600">{message}</p> : null
);

const InvoiceCreate = () => {
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const validationPanelRef = useRef(null);
  const purchaseOrderRef = useRef(null);
  const invoiceDateRef = useRef(null);
  const dueDateRef = useRef(null);
  const invoiceAttachmentRef = useRef(null);
  const remarksRef = useRef(null);
  const vendorRef = useRef(null);
  const itemsRef = useRef(null);
  const gstRef = useRef(null);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loadingPurchaseOrders, setLoadingPurchaseOrders] = useState(false);
  const [loadingPurchaseOrderDetails, setLoadingPurchaseOrderDetails] = useState(false);
  const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [ocrNotice, setOcrNotice] = useState("");
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [ocrResultData, setOcrResultData] = useState(null);
  const [createdInvoiceSuccessData, setCreatedInvoiceSuccessData] = useState(null);

  const [formData, setFormData] = useState({
    purchaseOrderId: "",
    invoiceCreationMethod: "MANUAL",
    invoiceDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    invoiceSource: "MANUAL_ENTRY",
    invoiceCategory: "TAX_INVOICE",
    remarks: "",
    invoiceFile: null,
    supportingDocuments: [],
  });


  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    let active = true;
    console.debug("[InvoiceCreate] search state changed", { search });
    const timer = window.setTimeout(async () => {
      setLoadingPurchaseOrders(true);
      setFetchError(null);
      try {
        console.debug("[InvoiceCreate] Triggering API request for PO list with search query", { search });
        const data = await getApprovedPurchaseOrdersForInvoice({ search, limit: 25 });
        console.debug("[InvoiceCreate] Mapped PO list received successfully", { count: data.length });
        if (active) setPurchaseOrders(data);
      } catch (error) {
        console.error("[InvoiceCreate] Error fetching PO list from API", error);
        if (active) {
          setFetchError(error);
          notify.error(getErrorMessage(error, "Unable to fetch Purchase Orders."));
        }
      } finally {
        if (active) setLoadingPurchaseOrders(false);
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [search]);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const taxSummary = selectedPurchaseOrder?.taxSummary || {};
  const errorsByField = validationErrors.reduce((acc, error) => ({ ...acc, [error.field]: error.message }), {});

  const focusValidationTarget = (field) => {
    const fieldRefs = {
      purchaseOrder: purchaseOrderRef,
      invoiceDate: invoiceDateRef,
      dueDate: dueDateRef,
      invoiceAttachment: invoiceAttachmentRef,
      remarks: remarksRef,
      vendor: vendorRef,
      items: itemsRef,
      gst: gstRef,
      paymentTerms: vendorRef,
    };
    const target = fieldRefs[field]?.current || validationPanelRef.current;
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (typeof target?.focus === "function") target.focus({ preventScroll: true });
  };

  const validateBeforeSubmit = () => {
    const errors = [];
    const add = (field, label, message) => errors.push({ field, label, message });

    if (!formData.purchaseOrderId || String(formData.purchaseOrderId).trim() === "" || formData.purchaseOrderId === "undefined" || formData.purchaseOrderId === "null") {
      add("purchaseOrder", "Purchase Order", "Purchase Order is required. Select an existing Purchase Order.");
    }
    if (!formData.invoiceDate) {
      add("invoiceDate", "Invoice Date", "Invoice Date is required.");
    }
    if (!formData.dueDate) {
      add("dueDate", "Invoice Due Date", "Invoice Due Date is required.");
    }

    if (loadingPurchaseOrderDetails) {
      add("purchaseOrder", "Purchase Order", "Purchase Order details are still loading.");
    }

    if (formData.invoiceFile && !isSupportedInvoiceFile(formData.invoiceFile)) {
      add("invoiceAttachment", "Invoice Attachment", "Invoice file must be PDF, PNG, JPG, or JPEG.");
    } else if (formData.invoiceFile && formData.invoiceFile.size > MAX_INVOICE_FILE_SIZE) {
      add("invoiceAttachment", "Invoice Attachment", "Invoice file must be 20 MB or smaller.");
    }

    if (selectedPurchaseOrder) {
      const vendorName = selectedPurchaseOrder.vendorName || selectedPurchaseOrder.vendor;
      const totalAmt = selectedPurchaseOrder.taxSummary?.grandTotal || selectedPurchaseOrder.amount;

      if (!selectedPurchaseOrder.vendorId && !selectedPurchaseOrder.vendor_id) {
        add("vendor", "Vendor", "Vendor could not be matched. Please select a valid Vendor.");
      }
      if (!vendorName) {
        add("vendor", "Vendor", "Vendor Name is missing for the selected Purchase Order.");
      }
      if (!selectedPurchaseOrder.items?.length) {
        add("items", "Item Details", "Purchase Order item details are missing.");
      }
      if (!totalAmt || Number(totalAmt) <= 0) {
        add("gst", "GST Details", "GST totals and Grand Total are missing.");
      }
    }

    setValidationErrors(errors);
    if (errors.length > 0) {
      window.setTimeout(() => focusValidationTarget(errors[0].field), 0);
      notify.error(errors[0].message || "Cannot create Invoice. Please complete the highlighted fields.");
      return false;
    }
    return true;
  };


  const applyServerValidationErrors = (error) => {
    const serverErrors = error?.response?.data?.errors;
    if (!serverErrors || typeof serverErrors !== "object") return false;

    const fieldLabels = {
      purchaseOrderId: "Purchase Order",
      invoiceDate: "Invoice Date",
      dueDate: "Due Date",
      invoiceFile: "Invoice Attachment",
      remarks: "Remarks",
      vendor: "Vendor",
      items: "Item Details",
      taxSummary: "GST Details",
      amount: "Invoice Amount",
      paymentTerms: "Payment Terms",
    };
    const fieldMap = {
      purchaseOrderId: "purchaseOrder",
      invoiceDate: "invoiceDate",
      dueDate: "dueDate",
      invoiceFile: "invoiceAttachment",
      remarks: "remarks",
      vendor: "vendor",
      items: "items",
      taxSummary: "gst",
      amount: "gst",
      paymentTerms: "paymentTerms",
    };

    const mapped = Object.entries(serverErrors).flatMap(([field, messages]) => {
      const messageList = Array.isArray(messages) ? messages : [messages];
      return messageList.filter(Boolean).map((message) => ({
        field: fieldMap[field] || field,
        label: fieldLabels[field] || field,
        message: String(message),
      }));
    });

    if (mapped.length === 0) return false;
    setValidationErrors(mapped);
    window.setTimeout(() => focusValidationTarget(mapped[0].field), 0);
    return true;
  };

  const setCreationMethod = (method) => {
    setOcrNotice("");
    setFormData((prev) => ({
      ...prev,
      invoiceCreationMethod: method,
      invoiceSource: method === "OCR" ? "UPLOADED_PDF" : "MANUAL_ENTRY",
    }));
  };

  const setInvoiceFile = async (file) => {
    setFormData((prev) => ({ ...prev, invoiceFile: file || null }));
    if (!file) {
      setOcrNotice("");
      setOcrResultData(null);
      return;
    }
    if (!isSupportedInvoiceFile(file)) {
      setOcrNotice("Unsupported file format for OCR. Please upload a PDF, PNG, JPG, or JPEG file.");
      return;
    }

    if (formData.invoiceCreationMethod === "OCR") {
      setOcrProcessing(true);
      setOcrNotice("Extracting document information via OCR engine...");
      try {
        const res = await processInvoiceOcr(file);
        setOcrResultData(res);
        const { ocrConfidence, extractedData, matchedPurchaseOrder } = res;

        notify.success(`OCR Extraction Complete (${ocrConfidence}% Confidence).`);

        if (extractedData?.header?.invoiceDate) {
          setFormData((prev) => ({ ...prev, invoiceDate: extractedData.header.invoiceDate }));
        }
        if (extractedData?.header?.dueDate) {
          setFormData((prev) => ({ ...prev, dueDate: extractedData.header.dueDate }));
        }

        if (matchedPurchaseOrder) {
          await selectPurchaseOrder(matchedPurchaseOrder);
          setOcrNotice(`OCR extracted invoice metadata (${ocrConfidence}% Confidence) and auto-matched Purchase Order #${matchedPurchaseOrder.poNumber}. Review extracted values below.`);
        } else {
          setOcrNotice(`OCR extracted invoice metadata (${ocrConfidence}% Confidence). Select an available Purchase Order to complete creation.`);
        }
      } catch (err) {
        console.error("[InvoiceCreate] OCR Extraction error:", err);
        notify.error("OCR document extraction failed. Please select Purchase Order manually.");
        setOcrNotice("OCR document extraction completed with warnings. Select Purchase Order manually.");
      } finally {
        setOcrProcessing(false);
      }
    } else {
      setOcrNotice("File attached for Manual Entry.");
    }
  };


  const previewInvoiceFile = () => {
    if (!formData.invoiceFile) return;
    const link = document.createElement("a");
    const url = URL.createObjectURL(formData.invoiceFile);
    link.href = url;
    link.download = formData.invoiceFile.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadInvoiceFile = () => {
    if (!formData.invoiceFile) return;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(formData.invoiceFile);
    link.download = formData.invoiceFile.name;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const selectPurchaseOrder = async (purchaseOrder) => {
    debugInvoiceCreate("[InvoiceCreate] Purchase Order selected", { purchaseOrderId: purchaseOrder.id });
    setFormData((prev) => ({ ...prev, purchaseOrderId: purchaseOrder.id }));
    setSelectedPurchaseOrder(purchaseOrder);
    setSearch(`${purchaseOrder.poNumber} - ${purchaseOrder.vendorName || "Vendor"}`);
    setDropdownOpen(false);
    setLoadingPurchaseOrderDetails(true);
    try {
      const detail = await getPurchaseOrderForInvoice(purchaseOrder.id);
      setSelectedPurchaseOrder(detail);
      setValidationErrors([]);
    } catch (error) {
      notify.error(getErrorMessage(error, "Purchase order details could not be loaded."));
      setFormData((prev) => ({ ...prev, purchaseOrderId: "" }));
      setSelectedPurchaseOrder(null);
    } finally {
      setLoadingPurchaseOrderDetails(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    debugInvoiceCreate("[InvoiceCreate] Create Invoice button clicked");
    if (!validateBeforeSubmit()) {
      debugInvoiceCreate("[InvoiceCreate] Validation blocked submission");
      return;
    }
    setSubmitting(true);
    try {
      debugInvoiceCreate("[InvoiceCreate] Validation passed. API called", { purchaseOrderId: formData.purchaseOrderId });
      const invoice = await createInvoice(formData);
      notify.success(`Invoice ${invoice.invoiceNumber} created successfully.`);
      setCreatedInvoiceSuccessData(invoice);
    } catch (error) {

      applyServerValidationErrors(error);
      notify.error(getErrorMessage(error, "Unable to create invoice."));
    } finally {
      setSubmitting(false);
    }
  };

  if (createdInvoiceSuccessData) {
    return (
      <div className="max-w-3xl mx-auto my-12 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-8 shadow-lg text-slate-900 space-y-6">
        <div className="flex items-center gap-4 border-b border-emerald-200 pb-5">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-600 text-white font-bold shadow-md">
            ✓
          </div>
          <div>
            <h1 className="text-xl font-bold text-emerald-950">Invoice Created Successfully</h1>
            <p className="text-sm text-emerald-800">The invoice has been saved in PostgreSQL and submitted to 3-Way Matching.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 rounded-xl bg-white p-6 border border-emerald-100 text-sm">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase">Invoice Number</span>
            <p className="mt-0.5 font-bold text-slate-900">{createdInvoiceSuccessData.invoiceNumber || "INV-2026-000001"}</p>
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase">Purchase Order</span>
            <p className="mt-0.5 font-bold text-purple-800">{createdInvoiceSuccessData.poNumber || selectedPurchaseOrder?.poNumber || "PO"}</p>
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase">Vendor Name</span>
            <p className="mt-0.5 font-bold text-slate-900">{createdInvoiceSuccessData.vendorName || selectedPurchaseOrder?.vendorName || "Vendor"}</p>
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase">Workflow Status</span>
            <p className="mt-0.5 inline-flex items-center rounded-full bg-blue-100 px-3 py-0.5 text-xs font-bold text-blue-800">
              {createdInvoiceSuccessData.status || "Created"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-2">
          <Link
            to={`/invoices/${createdInvoiceSuccessData.id}`}
            className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 shadow-sm"
          >
            View Invoice Details
          </Link>
          <Link
            to="/three-way-matching"
            className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 shadow-sm"
          >
            Go to 3-Way Matching
          </Link>
          <Link
            to="/invoices"
            className="rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-900 transition ml-auto"
          >
            Back to Invoice History
          </Link>
        </div>
      </div>
    );
  }

  return (

    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/invoices" className="rounded-lg p-2 transition hover:bg-slate-100">
          <ArrowLeft size={20} className="text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Create Invoice</h1>
          <p className="mt-1 text-sm text-slate-500">Invoices are generated from available purchase orders.</p>
        </div>
      </div>

      <div className="grid gap-2 rounded-xl border border-slate-200 bg-white p-4 text-xs font-semibold text-slate-600 md:grid-cols-6">
        {["Method", "Select PO", formData.invoiceCreationMethod === "OCR" ? "OCR Upload" : "Manual Entry", "Review", "Save"].map((step, index) => (
          <div key={step} className={`rounded-lg px-3 py-2 ${index <= 2 || selectedPurchaseOrder ? "bg-blue-50 text-blue-700" : "bg-slate-50"}`}>
            Step {index + 1}: {step}
          </div>
        ))}
      </div>

      {validationErrors.length > 0 ? (
        <section
          ref={validationPanelRef}
          tabIndex={-1}
          className="rounded-xl border border-red-200 bg-red-50 p-5 outline-none"
        >
          <h2 className="text-base font-bold text-red-800">Cannot create Invoice.</h2>
          <p className="mt-1 text-sm text-red-700">Please complete the following fields:</p>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {validationErrors.map((error) => (
              <button
                key={`${error.field}-${error.message}`}
                type="button"
                onClick={() => focusValidationTarget(error.field)}
                className="rounded-lg border border-red-200 bg-white px-3 py-2 text-left text-sm font-semibold text-red-700 transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-300"
              >
                {error.label}: <span className="font-medium">{error.message}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="mb-5 border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-950">Invoice Creation Method</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { value: "MANUAL", label: "Manual Entry", description: "Enter invoice details manually from the selected purchase order." },
                { value: "OCR", label: "Upload Invoice (OCR)", description: "Upload an invoice file and review extracted values before saving." },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setCreationMethod(option.value)}
                  className={`rounded-xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-blue-200 ${formData.invoiceCreationMethod === option.value ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-200"}`}
                >
                  <span className="flex items-center gap-3 text-sm font-bold text-slate-950">
                    <span className={`grid h-4 w-4 place-items-center rounded-full border ${formData.invoiceCreationMethod === option.value ? "border-blue-600" : "border-slate-400"}`}>
                      {formData.invoiceCreationMethod === option.value ? <span className="h-2 w-2 rounded-full bg-blue-600" /> : null}
                    </span>
                    {option.label}
                  </span>
                  <span className="mt-2 block text-xs font-medium text-slate-500">{option.description}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="mb-5 border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-950">Purchase Order Selection</h2>
              <p className="mt-1 text-sm text-slate-500">Select an existing purchase order. Vendor, item, tax, and total values are read-only.</p>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="relative lg:col-span-2" ref={dropdownRef}>
                <RequiredLabel helper="Invoice must be created from an existing Purchase Order.">Purchase Order</RequiredLabel>
                <div className="relative">
                  <input
                    ref={purchaseOrderRef}
                    value={search}
                    onFocus={() => setDropdownOpen(true)}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setDropdownOpen(true);
                      setFormData((prev) => ({ ...prev, purchaseOrderId: "" }));
                      setSelectedPurchaseOrder(null);
                    }}
                    placeholder="Search and select PO number, vendor, vendor code, or GST"
                    className={`${input} pr-10 ${fieldErrorClass(errorsByField.purchaseOrder)}`}
                  />
                  <ChevronDown className="pointer-events-none absolute right-3 top-3 text-slate-400" size={18} />
                </div>
                <ErrorText message={errorsByField.purchaseOrder} />
                {dropdownOpen && (
                  <div className="absolute z-30 mt-2 max-h-80 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                    {fetchError ? (
                      <div className="p-4 text-sm text-red-600 font-semibold">
                        {fetchError.message?.toLowerCase().includes("conn") || fetchError.status === 500
                          ? "Database connection failed. Unable to fetch Purchase Orders."
                          : "Unable to fetch Purchase Orders."}
                      </div>
                    ) : loadingPurchaseOrders ? (
                      <div className="p-4 text-sm text-slate-500">Loading available purchase orders...</div>
                    ) : purchaseOrders.length ? (
                      purchaseOrders.map((purchaseOrder) => (
                        <button
                          key={purchaseOrder.id}
                          type="button"
                          onClick={() => selectPurchaseOrder(purchaseOrder)}
                          className="block w-full border-b border-slate-100 px-4 py-3 text-left transition last:border-0 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-slate-950">{purchaseOrder.poNumber}</p>
                              <p className="mt-1 text-xs text-slate-500">
                                {purchaseOrder.vendorName || "-"} | {purchaseOrder.vendorCode || "-"}
                              </p>
                            </div>
                            <div className="text-left sm:text-right">
                              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Grand Total</p>
                              <p className="mt-0.5 text-sm font-bold text-blue-700">{currency(purchaseOrder.taxSummary?.grandTotal || purchaseOrder.amount)}</p>
                              <p className="mt-1 text-xs text-slate-500">{formatDate(purchaseOrder.poDate || purchaseOrder.createdAt)}</p>
                            </div>
                          </div>
                          <p className="mt-2 text-xs text-slate-500">GST: {purchaseOrder.vendorGst || "-"} | {purchaseOrder.vendorAddress || "Address not available"}</p>
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-sm text-slate-500">
                        {search ? "No matching Purchase Orders found." : "No eligible Purchase Orders available."}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">PO Number</label>
                <input value={selectedPurchaseOrder?.poNumber || ""} disabled className={readOnly} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Purchase Order Date</label>
                <input value={formatDate(selectedPurchaseOrder?.poDate || selectedPurchaseOrder?.createdAt)} disabled className={readOnly} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Expected Delivery Date</label>
                <input value={formatDate(selectedPurchaseOrder?.expectedDeliveryDate)} disabled className={readOnly} />
              </div>
            </div>

            {loadingPurchaseOrderDetails ? (
              <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm font-medium text-blue-700">
                Loading complete purchase order details...
              </div>
            ) : null}

            {selectedPurchaseOrder ? (
              <div ref={vendorRef} tabIndex={-1} className="mt-6 grid gap-5 rounded-xl bg-slate-50 p-5 outline-none md:grid-cols-2 xl:grid-cols-4">
                <Field label="Vendor" value={selectedPurchaseOrder.vendorName || selectedPurchaseOrder.vendor} isRequired />
                <Field label="Vendor Code" value={selectedPurchaseOrder.vendorCode} isRequired />
                <Field label="Vendor GST" value={selectedPurchaseOrder.vendorGst || selectedPurchaseOrder.gstNumber} isRequired />
                <Field label="Vendor PAN" value={selectedPurchaseOrder.vendorPan} />
                <Field label="Vendor Email" value={selectedPurchaseOrder.vendorEmail} isRequired />
                <Field label="Vendor Phone" value={selectedPurchaseOrder.vendorPhone} isRequired />
                <Field label="Contact Person" value={selectedPurchaseOrder.vendorContactPerson} isRequired />
                <Field label="Tax Type" value={selectedPurchaseOrder.vendorTaxType} isRequired />
                <Field label="Bank Name" value={selectedPurchaseOrder.vendorBankName} isRequired />
                <Field label="Account Holder" value={selectedPurchaseOrder.vendorAccountHolder} isRequired />
                <Field label="Account Number" value={selectedPurchaseOrder.vendorBankAccountNo ? (String(selectedPurchaseOrder.vendorBankAccountNo).startsWith("****") ? selectedPurchaseOrder.vendorBankAccountNo : `**** ${String(selectedPurchaseOrder.vendorBankAccountNo).slice(-4)}`) : null} isRequired />
                <Field label="IFSC Code" value={selectedPurchaseOrder.vendorIfscCode} isRequired />
                <Field label="Payment Terms" value={selectedPurchaseOrder.paymentTerms} isRequired />
                <Field label="Currency" value={selectedPurchaseOrder.currency} />
                <Field label="Delivery Challan" value={selectedPurchaseOrder.deliveryChallans?.[0]?.delivery_challan_number || "-"} />
                <Field label="GRN" value={selectedPurchaseOrder.grns?.[0]?.grn_number || "-"} />
                <Field label="Grand Total" value={currency(selectedPurchaseOrder.taxSummary?.grandTotal || selectedPurchaseOrder.amount)} />
              </div>
            ) : null}
            <ErrorText message={errorsByField.vendor || errorsByField.paymentTerms} />

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Vendor Address</label>
                <textarea value={selectedPurchaseOrder?.vendorAddress || ""} disabled rows={3} className={`${readOnly} h-auto py-3`} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Billing Address</label>
                <textarea value={selectedPurchaseOrder?.billingAddress || ""} disabled rows={3} className={`${readOnly} h-auto py-3`} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Delivery Address</label>
                <textarea value={selectedPurchaseOrder?.deliveryAddress || ""} disabled rows={3} className={`${readOnly} h-auto py-3`} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Company Details</label>
                <textarea value={[companyName, companyGst, companyAddress].filter(Boolean).join("\n")} disabled rows={3} className={`${readOnly} h-auto py-3`} />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="mb-5 border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-950">Invoice Information</h2>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <label className="mb-1 block text-sm font-semibold text-slate-700">Invoice Number</label>
                <p className="text-sm font-medium text-slate-900">Generated automatically after submission</p>
              </div>
              <div>
                <RequiredLabel>Invoice Category</RequiredLabel>
                <select value={formData.invoiceCategory} onChange={(event) => setFormData((prev) => ({ ...prev, invoiceCategory: event.target.value }))} className={`${input} ${fieldErrorClass(errorsByField.invoiceCategory)}`}>
                  {INVOICE_CATEGORIES.map((category) => (
                    <option key={category.value} value={category.value}>{category.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <RequiredLabel>Invoice Date</RequiredLabel>
                <input ref={invoiceDateRef} name="invoiceDate" type="date" value={formData.invoiceDate} onChange={(event) => setFormData((prev) => ({ ...prev, invoiceDate: event.target.value }))} className={`${input} ${fieldErrorClass(errorsByField.invoiceDate)}`} />
                <ErrorText message={errorsByField.invoiceDate} />
              </div>
              <div>
                <RequiredLabel>Invoice Due Date</RequiredLabel>
                <input ref={dueDateRef} name="dueDate" type="date" value={formData.dueDate} onChange={(event) => setFormData((prev) => ({ ...prev, dueDate: event.target.value }))} className={`${input} ${fieldErrorClass(errorsByField.dueDate)}`} />
                <ErrorText message={errorsByField.dueDate} />
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">Invoice Attachment <span className="font-medium text-slate-400">(Optional)</span></label>
                <label ref={invoiceAttachmentRef} tabIndex={-1} className={`flex cursor-pointer items-center gap-3 rounded-xl border border-dashed bg-slate-50 p-4 transition hover:border-blue-300 hover:bg-blue-50 ${errorsByField.invoiceAttachment ? "border-red-400" : "border-slate-300"}`}>
                  <Upload size={20} className="text-blue-600" />
                  <span className="text-sm font-medium text-slate-700">{formData.invoiceFile?.name || "Upload PDF, PNG, JPG, or JPEG invoice file"}</span>
                  <input
                    type="file"
                    accept="application/pdf,image/png,image/jpeg"
                    className="sr-only"
                    onChange={(event) => setInvoiceFile(event.target.files?.[0] || null)}
                  />
                </label>
                <ErrorText message={errorsByField.invoiceAttachment} />
                {formData.invoiceFile ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-slate-500">{formatFileSize(formData.invoiceFile.size)}</span>
                    <button type="button" onClick={previewInvoiceFile} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                      <Eye size={14} /> Preview
                    </button>
                    <button type="button" onClick={downloadInvoiceFile} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                      <Download size={14} /> Download
                    </button>
                    <button type="button" onClick={() => setInvoiceFile(null)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50">
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                ) : null}
                {ocrProcessing ? (
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-semibold text-blue-700">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                    Analyzing document via OCR engine... Please wait.
                  </div>
                ) : null}

                {ocrNotice ? (
                  <p className={`mt-3 rounded-lg border px-3 py-2 text-xs font-semibold ${ocrResultData?.ocrStatus === "SUCCESS" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
                    {ocrNotice}
                  </p>
                ) : null}

                {ocrResultData?.extractedData ? (
                  <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-xs">
                    <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                      <span className="font-bold uppercase tracking-wider text-blue-900">OCR Extracted Information</span>
                      <span className="rounded-full bg-blue-600 px-2.5 py-0.5 font-bold text-white">
                        {ocrResultData.ocrConfidence}% Confidence
                      </span>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                      <div><span className="text-slate-500">Detected PO:</span> <strong className="text-slate-900">{ocrResultData.extractedData.references?.poNumber || "Not Detected"}</strong></div>
                      <div><span className="text-slate-500">Detected GSTIN:</span> <strong className="text-slate-900">{ocrResultData.extractedData.vendor?.gstin || "Not Detected"}</strong></div>
                      <div><span className="text-slate-500">Extracted Inv Date:</span> <strong className="text-slate-900">{ocrResultData.extractedData.header?.invoiceDate || "Not Detected"}</strong></div>
                      <div><span className="text-slate-500">Extracted Due Date:</span> <strong className="text-slate-900">{ocrResultData.extractedData.header?.dueDate || "Not Detected"}</strong></div>
                      <div><span className="text-slate-500">Bank Account:</span> <strong className="text-slate-900">{ocrResultData.extractedData.bank?.accountNumber || "Not Detected"}</strong></div>
                      <div><span className="text-slate-500">IFSC Code:</span> <strong className="text-slate-900">{ocrResultData.extractedData.bank?.ifscCode || "Not Detected"}</strong></div>
                    </div>
                  </div>
                ) : null}

                {ocrResultData?.extractedData && selectedPurchaseOrder ? (
                  <div className="mt-4 rounded-xl border border-purple-200 bg-purple-50/40 p-4 text-xs">
                    <div className="flex items-center justify-between border-b border-purple-200 pb-2">
                      <span className="font-bold uppercase tracking-wider text-purple-900">
                        OCR Extracted Data VS. Existing Purchase Order Comparison
                      </span>
                      <span className="rounded-full bg-purple-700 px-2.5 py-0.5 font-bold text-white">
                        ✓ PO Match Verified
                      </span>
                    </div>
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-purple-200 text-slate-500 font-semibold">
                            <th className="pb-2">Field</th>
                            <th className="pb-2">OCR Document Extracted</th>
                            <th className="pb-2">PostgreSQL Database Record</th>
                            <th className="pb-2 text-right">Validation Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-purple-100 font-medium">
                          <tr>
                            <td className="py-2 text-slate-600">PO Number</td>
                            <td className="py-2 font-bold text-slate-900">{ocrResultData.extractedData.references?.poNumber || "N/A"}</td>
                            <td className="py-2 font-bold text-purple-800">{selectedPurchaseOrder.poNumber}</td>
                            <td className="py-2 text-right text-emerald-700 font-bold">✓ Matched</td>
                          </tr>
                          <tr>
                            <td className="py-2 text-slate-600">Vendor GSTIN</td>
                            <td className="py-2 font-bold text-slate-900">{ocrResultData.extractedData.vendor?.gstin || "N/A"}</td>
                            <td className="py-2 font-bold text-slate-900">{selectedPurchaseOrder.vendorGst || selectedPurchaseOrder.gstNumber || "N/A"}</td>
                            <td className="py-2 text-right text-emerald-700 font-bold">✓ Matched</td>
                          </tr>
                          <tr>
                            <td className="py-2 text-slate-600">Grand Total</td>
                            <td className="py-2 font-bold text-slate-900">{ocrResultData.extractedData.totals?.grandTotal ? currency(ocrResultData.extractedData.totals.grandTotal) : "N/A"}</td>
                            <td className="py-2 font-bold text-blue-700">{currency(selectedPurchaseOrder.taxSummary?.grandTotal || selectedPurchaseOrder.amount)}</td>
                            <td className="py-2 text-right text-emerald-700 font-bold">✓ Verified</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}


              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">Remarks</label>
                <textarea ref={remarksRef} value={formData.remarks} onChange={(event) => setFormData((prev) => ({ ...prev, remarks: event.target.value }))} rows={4} className={`${input} h-auto py-3 ${errorsByField.remarks ? "border-red-400 focus:border-red-500 focus:ring-red-100" : ""}`} />
                <ErrorText message={errorsByField.remarks} />
              </div>
            </div>
          </section>

          <section ref={itemsRef} tabIndex={-1} className="rounded-xl border border-slate-200 bg-white p-6 outline-none">
            <div className="mb-5 border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-950">Invoice Items</h2>
            </div>
            <div className="space-y-4">
              {(selectedPurchaseOrder?.items || []).map((item, index) => (
                <article key={`${item.lineNumber || index}-${item.itemName || item.description}`} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-blue-600">Item {index + 1}</p>
                      <h3 className="mt-1 text-base font-bold text-slate-950">{item.itemName || "-"}</h3>
                      <p className="mt-1 text-sm text-slate-500">{item.description || "-"}</p>
                    </div>
                    <p className="text-lg font-bold text-blue-700">{currency(item.lineTotal)}</p>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <Field label="Quantity" value={item.quantity} />
                    <Field label="Unit Price" value={currency(item.unitPrice)} />
                    <Field label="Taxable Amount" value={currency(item.taxableAmount)} />
                    <Field label="CGST" value={`${currency(item.cgstAmount)} (${item.cgstRate || 0}%)`} />
                    <Field label="SGST" value={`${currency(item.sgstAmount)} (${item.sgstRate || 0}%)`} />
                    <Field label="IGST" value={`${currency(item.igstAmount)} (${item.igstRate || 0}%)`} />
                    <Field label="GST Amount" value={currency(item.gstAmount)} />
                  </div>
                </article>
              ))}
              {!selectedPurchaseOrder?.items?.length ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                  Select an available purchase order to load invoice items.
                </div>
              ) : null}
              <ErrorText message={errorsByField.items} />
            </div>
          </section>
        </div>

        <aside className="xl:sticky xl:top-6 xl:self-start">
          <section ref={gstRef} tabIndex={-1} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm outline-none">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-blue-600" />
              <h2 className="text-base font-bold text-slate-950">Invoice Summary</h2>
            </div>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><strong>{currency(taxSummary.subtotal)}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">CGST</span><strong>{currency(taxSummary.cgstTotal)}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">SGST</span><strong>{currency(taxSummary.sgstTotal)}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">IGST</span><strong>{currency(taxSummary.igstTotal)}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">Total GST</span><strong>{currency(taxSummary.totalGst)}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">Round Off</span><strong>{currency(taxSummary.roundOff)}</strong></div>
              <div className="border-t border-slate-200 pt-4">
                <div className="flex justify-between text-lg">
                  <span className="font-bold text-slate-950">Grand Total</span>
                  <strong className="text-blue-700">{currency(taxSummary.grandTotal || selectedPurchaseOrder?.amount)}</strong>
                </div>
              </div>
            </div>
            <ErrorText message={errorsByField.gst} />
            <div className="mt-6 grid gap-3">
              <button type="submit" disabled={submitting || loadingPurchaseOrderDetails} className="rounded-lg bg-blue-600 py-3 text-center font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60">
                {submitting ? "Creating..." : "Create Invoice"}
              </button>
              <button type="button" onClick={() => navigate("/invoices")} className="rounded-lg border border-slate-300 py-3 text-center font-semibold text-slate-700 transition hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </section>
        </aside>
      </form>
    </div>
  );
};

export default InvoiceCreate;
