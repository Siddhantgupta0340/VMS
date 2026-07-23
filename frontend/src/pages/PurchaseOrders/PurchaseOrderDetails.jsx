import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, Trash2, Edit3, Printer, Eye } from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { canDownloadDocument } from "../../config/permissions";
import {
  getPurchaseOrderById,
  deletePurchaseOrder,
  downloadPurchaseOrderPdf,
  openPurchaseOrderPdfInNewTab,
} from "../../services/purchaseOrderServices";
import { COMPANY_CONFIG } from "../../config/company";
import { getErrorMessage, notify } from "../../utils/feedback";
import ConfirmationModal from "../../components/common/ConfirmationModal";
import StatusBadge from "../../components/common/StatusBadge";

// ─── Amount in Words Conversion Utilities ──────────────────────────────────
const numberToWordsINR = (num) => {
  const a = [
    "", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ", "Ten ",
    "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ", "Seventeen ", "Eighteen ", "Nineteen "
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const numToWords = (n, suffix) => {
    let str = "";
    if (n > 19) {
      str += b[Math.floor(n / 10)] + " " + a[n % 10];
    } else if (n > 0) {
      str += a[n];
    }
    if (n) {
      str += suffix;
    }
    return str;
  };

  let res = "";
  res += numToWords(Math.floor(num / 10000000), "Crore ");
  res += numToWords(Math.floor((num / 100000) % 100), "Lakh ");
  res += numToWords(Math.floor((num / 1000) % 100), "Thousand ");
  res += numToWords(Math.floor((num / 100) % 10), "Hundred ");

  if (num > 100 && num % 100) {
    res += "and ";
  }
  res += numToWords(num % 100, "");

  return res.trim();
};

const numberToWordsUSD = (num) => {
  const a = [
    "", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ", "Ten ",
    "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ", "Seventeen ", "Eighteen ", "Nineteen "
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const numToWords = (n, suffix) => {
    let str = "";
    if (n > 99) {
      str += a[Math.floor(n / 100)] + "Hundred " + (n % 100 ? "and " : "");
      n %= 100;
    }
    if (n > 19) {
      str += b[Math.floor(n / 10)] + " " + a[n % 10];
    } else if (n > 0) {
      str += a[n];
    }
    if (n || str) {
      str += suffix;
    }
    return str;
  };

  let res = "";
  res += numToWords(Math.floor(num / 1000000), "Million ");
  res += numToWords(Math.floor((num / 1000) % 1000), "Thousand ");
  res += numToWords(num % 1000, "");

  return res.trim();
};

const amountToWords = (amount, currency = "INR") => {
  const amt = Number(amount || 0);
  if (amt <= 0) return "Zero Amount Only";

  const whole = Math.floor(amt);
  const decimal = Math.round((amt - whole) * 100);

  let currencyName = "Rupees";
  let fractionName = "Paise";
  let wordsFunc = numberToWordsINR;

  if (currency === "USD") {
    currencyName = "Dollars";
    fractionName = "Cents";
    wordsFunc = numberToWordsUSD;
  } else if (currency === "EUR") {
    currencyName = "Euros";
    fractionName = "Cents";
    wordsFunc = numberToWordsUSD;
  } else if (currency === "GBP") {
    currencyName = "Pounds";
    fractionName = "Pence";
    wordsFunc = numberToWordsUSD;
  }

  let wholeWords = wordsFunc(whole);
  let decimalWords = decimal > 0 ? wordsFunc(decimal) : "";

  let result = wholeWords ? `${wholeWords} ${currencyName}` : "";
  if (decimalWords) {
    if (result) result += " and ";
    result += `${decimalWords} ${fractionName}`;
  }
  return `${result} Only`.trim().replace(/\s+/g, " ");
};

const money = (value, cur = "INR") =>
  `${cur} ${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const esc = (v) =>
  String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const fmtDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const displayVal = (v) => (v || v === 0 ? v : "Not Available");

const PurchaseOrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  useEffect(() => {
    const fetchPO = async () => {
      try {
        setLoading(true);
        const data = await getPurchaseOrderById(id);
        setPo(data);
      } catch (err) {
        console.error(err);
        notify.error(getErrorMessage(err, "Purchase Order details could not be loaded."));
        navigate("/purchase-orders");
      } finally {
        setLoading(false);
      }
    };
    fetchPO();
  }, [id, navigate]);

  /**
   * Downloads the PO as a real PDF binary from the backend.
   * The backend generates the PDF server-side and streams it as application/pdf.
   */
  const handleDownload = async () => {
    if (downloading) return;
    try {
      setDownloading(true);
      notify.info("Generating PDF, please wait...");
      // The service function handles blob creation, URL, and auto-click download
      await downloadPurchaseOrderPdf(po.id);
      notify.success(`PDF for ${po.poNumber} downloaded successfully.`);
    } catch (err) {
      let msg = "Unable to generate PDF.";
      if (err?.response?.status === 403 || err?.status === 403) {
        msg = "Permission denied. You do not have permission to download this document.";
      } else if (err?.response?.status === 404 || err?.status === 404) {
        msg = "Purchase Order not found.";
      }
      notify.error(getErrorMessage(err, msg));
    } finally {
      setDownloading(false);
    }
  };

  /**
   * Opens the PDF in a new browser tab for quick preview and printing.
   * Uses the same backend PDF endpoint with responseType: blob.
   */
  const handlePrint = async () => {
    try {
      await openPurchaseOrderPdfInNewTab(po.id);
    } catch (err) {
      // Fallback: try browser print dialog on the current page
      notify.error(getErrorMessage(err, "Unable to open PDF for printing."));
      window.print();
    }
  };

  const confirmDelete = async () => {
    if (!deleteReason.trim()) {
      notify.error("Delete reason is required.");
      return;
    }
    try {
      setDeleting(true);
      await deletePurchaseOrder(po.id, deleteReason.trim());
      notify.success("Purchase Order deleted successfully.");
      setDeleteTarget(null);
      setDeleteReason("");
      navigate("/purchase-orders");
    } catch (error) {
      notify.error(getErrorMessage(error, "Purchase Order could not be deleted."));
    } finally {
      setDeleting(false);
    }
  };

  // ─── RBAC Permissions ──────────────────────────────────────────────────────
  const isCaseManager = user?.role === "CASE_MANAGER";
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const canEdit = isCaseManager || isSuperAdmin;
  const canDelete = isCaseManager || isSuperAdmin;
  const canDownload = canDownloadDocument(user);

  // Filter references to display only non-empty ones
  const procurementRefs = useMemo(() => {
    if (!po) return [];
    const fields = [
      { label: "Purchase Requisition", value: po.purchaseRequisitionNumber },
      { label: "Department", value: po.department },
      { label: "Cost Center", value: po.costCenter },
      { label: "Project Code", value: po.projectCode },
      { label: "Requester", value: po.requester },
      { label: "Buyer", value: po.buyer },
      { label: "Quotation Reference", value: po.quotationReference },
      { label: "Quotation Date", value: fmtDate(po.quotationDate) },
      { label: "Contract Reference", value: po.contractReference },
    ];
    return fields.filter((f) => f.value && String(f.value).trim() !== "");
  }, [po]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center text-slate-500">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="font-semibold text-sm">Loading Purchase Order details...</p>
        </div>
      </div>
    );
  }

  if (!po) return null;

  return (
    <div className="space-y-6 pb-12 print:pb-0">
      {/* SECTION 10: ACTION HEADER BAR (Hidden in print mode) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5 no-print">
        <div className="flex items-center gap-3">
          <Link to="/purchase-orders" className="rounded-xl border border-slate-200 p-2.5 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-black text-slate-900">{po.poNumber}</h1>
              <StatusBadge status={po.status} />
            </div>
            <p className="text-[11px] text-slate-500">
              Created on {fmtDate(po.createdAt)} · Creator: <span className="font-semibold text-slate-700">{po.createdBy}</span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
          {/* View PO / Preview PO Toggle */}
          <button
            type="button"
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold shadow-sm transition duration-150 ${
              isPreviewMode 
                ? "bg-slate-900 border-slate-900 text-white hover:bg-slate-800" 
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Eye size={14} /> {isPreviewMode ? "Standard View" : "Document Preview"}
          </button>

          {canEdit && (
            <Link
              to={`/purchase-orders/${po.id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <Edit3 size={14} /> Edit PO
            </Link>
          )}

          {canDownload && (
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {downloading ? (
                <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-400 border-t-slate-700" /> Generating...</>
              ) : (
                <><Download size={14} /> Download PDF</>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800"
          >
            <Printer size={14} /> Open &amp; Print PDF
          </button>

          {canDelete && (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3.5 py-2 text-xs font-bold text-red-600 shadow-sm transition hover:bg-red-50"
              onClick={() => setDeleteTarget(po)}
            >
              <Trash2 size={14} /> Delete PO
            </button>
          )}
        </div>
      </div>

      {/* DOCUMENT CANVAS SHEET */}
      <div className={`mx-auto bg-white border border-slate-200 print:border-none shadow-xl print:shadow-none transition-all duration-200 ${
        isPreviewMode 
          ? "max-w-4xl p-8 sm:p-12 md:p-16 border-t-4 border-t-slate-900" 
          : "max-w-6xl p-6 sm:p-8 md:p-10"
      }`}>
        <article className="space-y-8 print:space-y-6">
          
          {/* SECTION 1: COMPANY HEADER */}
          <header className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between border-b-2 border-slate-900 pb-6 print:pb-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {COMPANY_CONFIG.logo && (
                  <img className="h-10 w-10 rounded-lg object-contain border border-slate-100 print:h-8 print:w-8" src={COMPANY_CONFIG.logo} alt="Company Logo" />
                )}
                <h1 className="text-xl font-black text-slate-900 tracking-tight">{COMPANY_CONFIG.name}</h1>
              </div>
              <div className="text-xs text-slate-500 leading-relaxed max-w-md">
                <p>{COMPANY_CONFIG.address}</p>
                <p>{COMPANY_CONFIG.city}, {COMPANY_CONFIG.state}, {COMPANY_CONFIG.country} - {COMPANY_CONFIG.pinCode}</p>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-400">
                  <span>Tel: {COMPANY_CONFIG.phone}</span>
                  <span>Email: {COMPANY_CONFIG.email}</span>
                  <span>Web: {COMPANY_CONFIG.website}</span>
                </div>
              </div>
            </div>
            <div className="text-left md:text-right space-y-1 self-start md:self-auto">
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">TAX INVOICE / DOCUMENT</div>
              <div className="text-2xl font-black tracking-tight text-slate-900">PURCHASE ORDER</div>
              <div className="mt-1.5 inline-flex items-center gap-2 border border-slate-200 rounded-md bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-800">
                <span>GSTIN:</span> <span className="font-extrabold">{COMPANY_CONFIG.gstin}</span>
              </div>
              <div className="ml-2 inline-flex items-center gap-1.5 border border-slate-200 rounded-md bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-800">
                <span>PAN:</span> <span className="font-extrabold">{COMPANY_CONFIG.pan}</span>
              </div>
            </div>
          </header>

          {/* SECTION 2: PO INFORMATION (Shipment Left / PO Details Right) */}
          <section className="grid gap-6 md:grid-cols-2 border-b border-slate-200 pb-6 print:pb-4">
            {/* Shipment Address Block */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1.5">
                Shipment / Delivery Address
              </h3>
              <div className="text-xs text-slate-700 space-y-1">
                <p className="font-black text-slate-800">Corporate Delivery Hub</p>
                <p className="font-semibold">{po.deliveryAddress || "Not Available"}</p>
                <div className="pt-2 text-[11px] font-medium text-slate-500">
                  <p><strong>Billing Address:</strong> {po.billingAddress || "Not Available"}</p>
                </div>
              </div>
            </div>

            {/* PO Information Block */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1.5">
                Purchase Order Details
              </h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div><span className="text-slate-400 font-semibold">PO Number:</span></div>
                <div><strong className="text-slate-900 font-bold">{po.poNumber}</strong></div>

                <div><span className="text-slate-400 font-semibold">PO Date:</span></div>
                <div><strong className="text-slate-800">{fmtDate(po.orderDate) || "Not Available"}</strong></div>

                <div><span className="text-slate-400 font-semibold">PO Type:</span></div>
                <div><strong className="text-slate-800 uppercase">{po.poType || "STANDARD"}</strong></div>

                <div><span className="text-slate-400 font-semibold">PO Status:</span></div>
                <div><strong className="text-slate-800 capitalize">{po.status}</strong></div>

                <div><span className="text-slate-400 font-semibold">Currency:</span></div>
                <div><strong className="text-slate-800">{po.currency || "INR"}</strong></div>

                <div><span className="text-slate-400 font-semibold">Payment Terms:</span></div>
                <div><strong className="text-slate-800">{po.paymentTerms || "Not Available"}</strong></div>

                <div><span className="text-slate-400 font-semibold">Expected Delivery:</span></div>
                <div><strong className="text-slate-800">{fmtDate(po.expectedDelivery) || "Not Available"}</strong></div>
              </div>
            </div>
          </section>

          {/* SECTION 3: VENDOR ADDRESS */}
          <section className="space-y-3 border-b border-slate-200 pb-6 print:pb-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1.5">
              Vendor / Supplier
            </h3>
            <div className="grid gap-6 md:grid-cols-2 text-xs leading-relaxed text-slate-700">
              {/* Address details */}
              <div className="space-y-1">
                <p className="text-sm font-black text-slate-900">{po.vendorName || po.vendor || "Not Available"}</p>
                <p className="text-xs font-bold text-blue-600">{po.vendorCode || "—"}</p>
                <p className="font-semibold text-slate-600 mt-1.5">{po.vendorAddress || "Not Available"}</p>
              </div>

              {/* Compliance & Contact */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                <div><span className="text-slate-400 font-semibold">Contact Person:</span></div>
                <div><strong className="text-slate-800">{displayVal(po.vendorContactPerson)}</strong></div>

                <div><span className="text-slate-400 font-semibold">Phone:</span></div>
                <div><strong className="text-slate-800">{displayVal(po.vendorPhone)}</strong></div>

                <div><span className="text-slate-400 font-semibold">Email:</span></div>
                <div><strong className="text-slate-800 break-all">{displayVal(po.vendorEmail)}</strong></div>

                <div><span className="text-slate-400 font-semibold">GSTIN:</span></div>
                <div><strong className="text-slate-900 font-bold">{displayVal(po.vendorGst || po.gstNumber)}</strong></div>

                <div><span className="text-slate-400 font-semibold">PAN:</span></div>
                <div><strong className="text-slate-900 font-bold">{displayVal(po.vendorPan)}</strong></div>

                <div><span className="text-slate-400 font-semibold">Registration Type:</span></div>
                <div><strong className="text-slate-800 uppercase">{displayVal(po.vendorTaxType)}</strong></div>
              </div>
            </div>
          </section>

          {/* SECTION 4: PROCUREMENT REFERENCES (Only non-empty) */}
          {procurementRefs.length > 0 && (
            <section className="space-y-3 border-b border-slate-200 pb-6 print:pb-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1.5">
                Procurement References
              </h3>
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 text-xs">
                {procurementRefs.map((ref, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <span className="text-slate-400 font-semibold">{ref.label}:</span>
                    <p className="font-bold text-slate-800 break-words">{ref.value}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* SECTION 5: ITEM DETAILS TABLE */}
          <section className="space-y-3 print:pt-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1.5">
              Line Items
            </h3>
            <div className="overflow-x-auto rounded-lg border border-slate-200 print:border-slate-300">
              <table className="w-full text-left border-collapse text-[11px] print:text-[10px]">
                <thead>
                  <tr className="bg-slate-900 text-white text-[10px] print:bg-slate-800 uppercase tracking-wider font-bold">
                    <th className="py-2.5 px-2 text-center w-8">Sl</th>
                    <th className="py-2.5 px-2 text-center w-24">Item Code</th>
                    <th className="py-2.5 px-3 min-w-[150px]">Item Description</th>
                    <th className="py-2.5 px-2 text-center w-12">Unit</th>
                    <th className="py-2.5 px-2 text-center w-12">Qty</th>
                    <th className="py-2.5 px-3 text-right w-24">Unit Price</th>
                    <th className="py-2.5 px-3 text-right w-24">Taxable Amt</th>
                    <th className="py-2.5 px-2 text-center w-12">GST%</th>
                    <th className="py-2.5 px-3 text-right w-20">CGST</th>
                    <th className="py-2.5 px-3 text-right w-20">SGST</th>
                    <th className="py-2.5 px-3 text-right w-20">IGST</th>
                    <th className="py-2.5 px-3 text-right w-28">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {po.items?.length ? (
                    po.items.map((item, index) => (
                      <tr key={index} className="border-b border-slate-200 print:border-slate-300 hover:bg-slate-50/50">
                        <td className="py-3 px-2 text-center text-slate-400 font-medium">{index + 1}</td>
                        <td className="py-3 px-2 text-center font-semibold text-slate-700">{item.itemCode || "—"}</td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-800">{item.itemName || "Item"}</div>
                          {item.description && (
                            <div className="text-[10px] text-slate-400 mt-0.5 whitespace-pre-wrap">{item.description}</div>
                          )}
                        </td>
                        <td className="py-3 px-2 text-center font-semibold text-slate-600">{item.unit || "—"}</td>
                        <td className="py-3 px-2 text-center font-bold text-slate-800">{item.quantity}</td>
                        <td className="py-3 px-3 text-right text-slate-700">{money(item.unitPrice, po.currency)}</td>
                        <td className="py-3 px-3 text-right font-semibold text-slate-800">{money(item.taxableAmount, po.currency)}</td>
                        <td className="py-3 px-2 text-center font-semibold text-slate-600">{item.gstRate}%</td>
                        <td className="py-3 px-3 text-right text-slate-500">{money(item.cgstAmount, po.currency)}</td>
                        <td className="py-3 px-3 text-right text-slate-500">{money(item.sgstAmount, po.currency)}</td>
                        <td className="py-3 px-3 text-right text-slate-500">{money(item.igstAmount, po.currency)}</td>
                        <td className="py-3 px-3 text-right font-extrabold text-slate-900">{money(item.lineTotal, po.currency)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="12" className="py-12 text-center text-slate-400 font-semibold bg-slate-50/20">
                        No items available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* SECTION 6: TAX SUMMARY & AMOUNT IN WORDS */}
          <section className="grid gap-6 md:grid-cols-2 pt-2">
            {/* Column Left: Amount in Words */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-5 space-y-2 h-fit">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block border-b border-slate-100 pb-1.5">Amount in Words</span>
              <p className="text-xs font-black text-slate-800 leading-relaxed capitalize">
                {amountToWords(po.taxSummary?.grandTotal || po.amount, po.currency)}
              </p>
            </div>

            {/* Column Right: Financial summaries */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/20 p-5 space-y-3.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block border-b border-slate-100 pb-1.5">Financial Summary</span>
              <div className="space-y-2.5 text-xs text-slate-600">
                <div className="flex justify-between font-semibold"><span>Subtotal (Taxable)</span><strong className="text-slate-800">{money(po.taxSummary?.taxableAmount || po.taxSummary?.subtotal, po.currency)}</strong></div>
                <div className="flex justify-between font-semibold"><span>CGST Total</span><strong className="text-slate-800">{money(po.taxSummary?.cgstTotal, po.currency)}</strong></div>
                <div className="flex justify-between font-semibold"><span>SGST Total</span><strong className="text-slate-800">{money(po.taxSummary?.sgstTotal, po.currency)}</strong></div>
                <div className="flex justify-between font-semibold"><span>IGST Total</span><strong className="text-slate-800">{money(po.taxSummary?.igstTotal, po.currency)}</strong></div>
                <div className="flex justify-between font-semibold border-t border-slate-100 pt-2 text-slate-700"><span>Total Tax / GST</span><strong className="text-slate-850 font-bold">{money(po.taxSummary?.totalGst, po.currency)}</strong></div>
                {Number(po.taxSummary?.otherCharges || 0) > 0 && (
                  <div className="flex justify-between font-semibold"><span>Other Charges</span><strong className="text-slate-800">{money(po.taxSummary?.otherCharges, po.currency)}</strong></div>
                )}
                {Number(po.taxSummary?.roundOff || 0) !== 0 && (
                  <div className="flex justify-between font-semibold"><span>Round Off</span><strong className="text-slate-850">{money(po.taxSummary?.roundOff, po.currency)}</strong></div>
                )}
                <div className="flex justify-between border-t-2 border-slate-900 bg-slate-900 -mx-5 px-5 py-3 text-sm font-black text-white rounded-b-xl">
                  <span>NET PO AMOUNT</span>
                  <strong className="text-base font-extrabold">{money(po.taxSummary?.grandTotal || po.amount, po.currency)}</strong>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 7: PAYMENT TERMS & SECTION 8: TERMS AND CONDITIONS */}
          <section className="grid gap-6 md:grid-cols-2 border-t border-slate-200 pt-6">
            <div className="space-y-2">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Payment Conditions</h4>
              <div className="text-xs space-y-1 text-slate-750">
                <p><strong>Payment Terms:</strong> {po.paymentTerms || "No payment terms defined"}</p>
                <p><strong>Currency:</strong> {po.currency || "INR"}</p>
                <p><strong>Expected Delivery Date:</strong> {fmtDate(po.expectedDelivery) || "Not Available"}</p>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Terms and Conditions</h4>
              <div className="text-xs text-slate-500 leading-relaxed bg-slate-50 border border-slate-100 rounded-lg p-3">
                {po.description ? (
                  <p className="whitespace-pre-line font-medium text-slate-650">{po.description}</p>
                ) : (
                  <p className="italic text-slate-400">No terms and conditions specified.</p>
                )}
              </div>
            </div>
          </section>

          {/* SECTION 9: APPROVAL / AUDIT INFORMATION */}
          <section className="grid gap-6 sm:grid-cols-3 border-t border-slate-200 pt-6 text-xs text-slate-500">
            <div className="space-y-1">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">Created</span>
              <p><strong>User:</strong> {po.createdBy}</p>
              <p><strong>Date:</strong> {fmtDate(po.createdAt)}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">Last Modified</span>
              <p><strong>User:</strong> {po.updated_by || "System"}</p>
              <p><strong>Date:</strong> {fmtDate(po.updatedAt)}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">Workflow State</span>
              <p className="capitalize font-bold text-slate-800">{po.status}</p>
            </div>
          </section>

          {/* Document Acceptance Signature Blocks for printing */}
          <footer className="hidden print:grid grid-cols-2 gap-12 pt-16 text-xs text-slate-500 leading-normal">
            <div className="border-t border-slate-900 pt-3">
              <p className="font-extrabold uppercase text-[9px] tracking-wide text-slate-400">Vendor Acceptance / Stamp</p>
              <div className="h-12"></div>
              <p className="font-bold text-slate-700">Authorized Signatory Name &amp; Date</p>
            </div>
            <div className="border-t border-slate-900 pt-3 text-right">
              <p className="font-extrabold uppercase text-[9px] tracking-wide text-slate-400">For {COMPANY_CONFIG.name}</p>
              <div className="h-12"></div>
              <p className="font-bold text-slate-700">Authorized Signatory Stamp &amp; Date</p>
            </div>
          </footer>

        </article>
      </div>

      {/* SECTION 10: DELETE CONFIRMATION MODAL */}
      <ConfirmationModal
        open={Boolean(deleteTarget)}
        title="Delete Purchase Order?"
        description={deleteTarget ? `This will archive ${deleteTarget.poNumber}. The backend will block deletion if it is linked to a GRN, Invoice, Three-Way Matching, or Payment.` : ""}
        confirmLabel="Delete Purchase Order"
        cancelLabel="Cancel"
        variant="destructive"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => {
          if (!deleting) {
            setDeleteTarget(null);
            setDeleteReason("");
          }
        }}
        ariaLabel="Delete purchase order confirmation"
      >
        <label className="mt-4 block text-sm font-semibold text-slate-700">
          Delete Reason
          <textarea
            value={deleteReason}
            onChange={(event) => setDeleteReason(event.target.value)}
            rows={3}
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
            placeholder="Explain why this Purchase Order is being deleted"
            required
          />
        </label>
      </ConfirmationModal>
    </div>
  );
};

export default PurchaseOrderDetails;
