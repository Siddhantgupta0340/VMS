import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Ban,
  CheckCircle,
  Clock,
  Download,
  Eye,
  FileText,
  MessageSquare,
  Paperclip,
  Printer,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import StatusBadge from "../../components/common/StatusBadge";
import { hasPermission, canDownloadDocument, PERMISSIONS, ROLES } from "../../config/permissions";
import { useAuth } from "../../context/AuthContext";
import { downloadHtmlAsPdf } from "../../utils/pdfGenerator";
import {
  addRemark,
  approveInvoice,
  cancelInvoice,
  getInvoiceById,
  rejectInvoice,
  softDeleteInvoice,
  downloadInvoicePdf,
} from "../../services/invoiceService";
import { getMatchReportByInvoice } from "../../services/matchingService";
import api from "../../api/axios";

const companyName = import.meta.env.VITE_COMPANY_NAME || "Vendor Management System";
const companyGst = import.meta.env.VITE_COMPANY_GST || "";
const companyAddress = import.meta.env.VITE_COMPANY_ADDRESS || "";
const companyLogo = import.meta.env.VITE_COMPANY_LOGO_URL || "";
const companyPan = import.meta.env.VITE_COMPANY_PAN || "";
const companyPhone = import.meta.env.VITE_COMPANY_PHONE || "";
const companyEmail = import.meta.env.VITE_COMPANY_EMAIL || "";

// ─── Utilities ────────────────────────────────────────────────────────────────

const currency = (value, code = "INR") =>
  `${code || "INR"} ${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const formatDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const MissingBadge = ({ text = "Not Available" }) => (
  <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
    {text}
  </span>
);

const displayValue = (value, missingText = "Not Available") =>
  value || value === 0 ? value : <MissingBadge text={missingText} />;

const Detail = ({ label, value, missingText }) => (
  <div className="rounded-lg border border-slate-200 bg-white p-4">
    <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
    <p className="mt-1 wrap-break-word text-sm font-semibold text-slate-900">
      {displayValue(value, missingText)}
    </p>
  </div>
);

const totalFromItem = (item) =>
  Number(
    item.lineTotal ||
      item.amount ||
      Number(item.quantity || 0) * Number(item.unitPrice || item.rate || 0) ||
      0
  );

// ─── History event colours/labels ──────────────────────────────────────────────
const historyEventMeta = (action = "") => {
  const a = action.toLowerCase();
  if (a.includes("created")) return { color: "bg-blue-500", label: "Created" };
  if (a.includes("approved")) return { color: "bg-emerald-500", label: "Approved" };
  if (a.includes("rejected") || a.includes("reject")) return { color: "bg-red-500", label: "Rejected" };
  if (a.includes("cancelled") || a.includes("cancel")) return { color: "bg-amber-500", label: "Cancelled" };
  if (a.includes("deleted") || a.includes("delete")) return { color: "bg-slate-600", label: "Deleted" };
  if (a.includes("updated") || a.includes("update")) return { color: "bg-indigo-500", label: "Updated" };
  if (a.includes("remark") || a.includes("observation")) return { color: "bg-violet-500", label: "Remark" };
  if (a.includes("download")) return { color: "bg-teal-500", label: "Downloaded" };
  if (a.includes("match")) return { color: "bg-cyan-500", label: "Three-Way Match" };
  if (a.includes("admin")) return { color: "bg-orange-500", label: "Admin Review" };
  return { color: "bg-slate-400", label: action };
};

// ─── Professional Invoice PDF HTML ────────────────────────────────────────────

const buildInvoiceHtml = ({ invoice, matchReports, autoPrint = true }) => {
  const summary = invoice.taxSummary || {};
  const grnNumber =
    invoice.grnNumber ||
    matchReports.find((r) => r.grnNumber && r.grnNumber !== "N/A")?.grnNumber ||
    "";
  const deliveryChallanNumber =
    invoice.deliveryChallanNumber ||
    matchReports.find((r) => r.deliveryChallanNumber && r.deliveryChallanNumber !== "N/A")
      ?.deliveryChallanNumber ||
    "";

  const rows = (invoice.items || [])
    .map(
      (item, index) => `
    <tr>
      <td style="text-align:center">${index + 1}</td>
      <td>
        <strong>${escapeHtml(item.itemName || item.description || "Item")}</strong>
        ${item.description && item.itemName ? `<br/><span style="color:#64748b;font-size:11px">${escapeHtml(item.description)}</span>` : ""}
      </td>
      <td class="num">${escapeHtml(item.quantity || 0)}</td>
      <td class="num">${escapeHtml(currency(item.unitPrice || item.rate, invoice.currency))}</td>
      <td class="num">${escapeHtml(currency(item.taxableAmount, invoice.currency))}</td>
      <td class="num">${escapeHtml(currency(item.cgstAmount || 0, invoice.currency))}</td>
      <td class="num">${escapeHtml(currency(item.sgstAmount || 0, invoice.currency))}</td>
      <td class="num">${escapeHtml(currency(item.igstAmount || 0, invoice.currency))}</td>
      <td class="num"><strong>${escapeHtml(currency(totalFromItem(item), invoice.currency))}</strong></td>
    </tr>
  `
    )
    .join("");

  return `<!doctype html>
<html>
  <head>
    <title>${escapeHtml(invoice.invoiceNumber || "Invoice")}</title>
    <style>
      @page { size: A4; margin: 14mm 16mm; }
      * { box-sizing: border-box; }
      body { font-family: "Segoe UI", Arial, sans-serif; color: #0f172a; margin: 0; font-size: 12px; }
      .sheet { max-width: 794px; margin: 0 auto; }

      /* Header */
      .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1d4ed8; padding-bottom: 14px; margin-bottom: 16px; }
      .brand-row { display: flex; align-items: center; gap: 12px; }
      .logo { width: 52px; height: 52px; object-fit: contain; border: 1px solid #e2e8f0; border-radius: 8px; }
      .brand-name { font-size: 20px; font-weight: 800; color: #1d4ed8; }
      .brand-sub { font-size: 11px; color: #64748b; line-height: 1.6; margin-top: 2px; }
      .doc-title { text-align: right; }
      .doc-title h1 { margin: 0; font-size: 30px; font-weight: 900; color: #1d4ed8; letter-spacing: -1px; }
      .doc-title .inv-num { font-size: 13px; font-weight: 700; color: #334155; margin-top: 4px; }

      /* Info Grid */
      .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
      .info-grid.cols3 { grid-template-columns: 1fr 1fr 1fr; }
      .box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; }
      .box .lbl { color: #64748b; font-size: 10px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; }
      .box .val { margin-top: 3px; font-size: 12px; font-weight: 700; color: #0f172a; }

      /* Section heading */
      h2 { margin: 14px 0 8px; font-size: 11px; text-transform: uppercase; color: #334155; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; letter-spacing: 1px; }

      /* Table */
      table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 11px; }
      thead th { background: #1d4ed8; color: #fff; text-align: left; padding: 8px 6px; }
      thead th.num { text-align: right; }
      tbody td { padding: 7px 6px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
      tbody tr:hover td { background: #f8fafc; }
      .num { text-align: right; white-space: nowrap; }

      /* Summary */
      .summary-wrap { display: flex; justify-content: flex-end; margin-top: 12px; }
      .summary { width: 310px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
      .sum-row { display: flex; justify-content: space-between; padding: 6px 12px; border-bottom: 1px solid #f1f5f9; font-size: 12px; }
      .sum-row.grand { background: #1d4ed8; color: #fff; font-size: 14px; font-weight: 800; border-bottom: none; }

      /* Signatures */
      .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 28px; }
      .sig-box { border-top: 2px solid #0f172a; padding-top: 8px; }
      .sig-label { font-size: 10px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 0.5px; }
      .sig-name { margin-top: 36px; font-weight: 700; }

      /* T&C */
      .tnc { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-top: 16px; font-size: 10px; color: #64748b; }
      .tnc strong { color: #334155; }

      /* Stamp */
      .stamp { border: 3px solid #16a34a; border-radius: 50%; width: 88px; height: 88px; display: flex; align-items: center; justify-content: center; color: #16a34a; font-weight: 900; font-size: 11px; text-align: center; transform: rotate(-20deg); margin-left: auto; margin-top: -10px; }

      .remarks { border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; font-size: 11px; color: #475569; min-height: 36px; }
      @media print { .no-print { display: none; } }
    </style>
  </head>
  <body>
    <main class="sheet">
      <!-- Header -->
      <section class="header">
        <div class="brand-row">
          ${companyLogo ? `<img class="logo" src="${escapeHtml(companyLogo)}" alt="${escapeHtml(companyName)} logo" />` : ""}
          <div>
            <div class="brand-name">${escapeHtml(companyName)}</div>
            <div class="brand-sub">
              ${companyAddress ? escapeHtml(companyAddress) + "<br/>" : ""}
              ${companyGst ? "GST: " + escapeHtml(companyGst) : ""}
              ${companyPan ? " | PAN: " + escapeHtml(companyPan) : ""}
              ${companyPhone ? "<br/>Tel: " + escapeHtml(companyPhone) : ""}
              ${companyEmail ? " | " + escapeHtml(companyEmail) : ""}
            </div>
          </div>
        </div>
        <div class="doc-title">
          <h1>TAX INVOICE</h1>
          <div class="inv-num">${escapeHtml(invoice.invoiceNumber || "Not Available")}</div>
        </div>
      </section>

      <!-- Invoice + PO Details -->
      <h2>Invoice Details</h2>
      <div class="info-grid cols3">
        <div class="box"><div class="lbl">Invoice Date</div><div class="val">${escapeHtml(formatDate(invoice.invoiceDate) || "N/A")}</div></div>
        <div class="box"><div class="lbl">Due Date</div><div class="val">${escapeHtml(formatDate(invoice.dueDate) || "N/A")}</div></div>
        <div class="box"><div class="lbl">Payment Terms</div><div class="val">${escapeHtml(invoice.paymentTerms || "N/A")}</div></div>
        <div class="box"><div class="lbl">Purchase Order #</div><div class="val">${escapeHtml(invoice.poNumber || "N/A")}</div></div>
        <div class="box"><div class="lbl">Delivery Challan #</div><div class="val">${escapeHtml(deliveryChallanNumber || "N/A")}</div></div>
        <div class="box"><div class="lbl">GRN Number</div><div class="val">${escapeHtml(grnNumber || "N/A")}</div></div>
      </div>

      <!-- Vendor Details -->
      <h2>Vendor / Bill From</h2>
      <div class="info-grid">
        <div class="box"><div class="lbl">Vendor Name</div><div class="val">${escapeHtml(invoice.vendor || "N/A")}</div></div>
        <div class="box"><div class="lbl">Vendor Code</div><div class="val">${escapeHtml(invoice.vendorCode || "N/A")}</div></div>
        <div class="box"><div class="lbl">Vendor GST</div><div class="val">${escapeHtml(invoice.vendorGst || "N/A")}</div></div>
        <div class="box"><div class="lbl">Vendor PAN</div><div class="val">${escapeHtml(invoice.vendorPan || "N/A")}</div></div>
        <div class="box" style="grid-column:1/-1"><div class="lbl">Vendor Address</div><div class="val">${escapeHtml(invoice.vendorAddress || "N/A")}</div></div>
      </div>

      <!-- Items Table -->
      <h2>Items</h2>
      <table>
        <thead>
          <tr>
            <th style="width:30px">#</th>
            <th>Item / Description</th>
            <th class="num" style="width:50px">Qty</th>
            <th class="num" style="width:90px">Unit Price</th>
            <th class="num" style="width:90px">Taxable Amt</th>
            <th class="num" style="width:70px">CGST</th>
            <th class="num" style="width:70px">SGST</th>
            <th class="num" style="width:70px">IGST</th>
            <th class="num" style="width:90px">Line Total</th>
          </tr>
        </thead>
        <tbody>
          ${rows || `<tr><td colspan="9" style="text-align:center;padding:16px;color:#64748b">No items available</td></tr>`}
        </tbody>
      </table>

      <!-- Tax Summary -->
      <div class="summary-wrap">
        <div class="summary">
          <div class="sum-row"><span>Subtotal (Taxable)</span><strong>${escapeHtml(currency(summary.subtotal, invoice.currency))}</strong></div>
          <div class="sum-row"><span>CGST</span><strong>${escapeHtml(currency(summary.cgstTotal, invoice.currency))}</strong></div>
          <div class="sum-row"><span>SGST</span><strong>${escapeHtml(currency(summary.sgstTotal, invoice.currency))}</strong></div>
          <div class="sum-row"><span>IGST</span><strong>${escapeHtml(currency(summary.igstTotal, invoice.currency))}</strong></div>
          ${Number(summary.otherCharges || 0) > 0 ? `<div class="sum-row"><span>Other Charges</span><strong>${escapeHtml(currency(summary.otherCharges, invoice.currency))}</strong></div>` : ""}
          ${Number(summary.roundOff || 0) !== 0 ? `<div class="sum-row"><span>Round Off</span><strong>${escapeHtml(currency(summary.roundOff, invoice.currency))}</strong></div>` : ""}
          <div class="sum-row grand">
            <span>GRAND TOTAL</span>
            <strong>${escapeHtml(currency(summary.grandTotal || invoice.invoiceTotal || invoice.amount, invoice.currency))}</strong>
          </div>
        </div>
      </div>

      <!-- Remarks -->
      ${invoice.description ? `<h2>Remarks</h2><div class="remarks">${escapeHtml(invoice.description)}</div>` : ""}

      <!-- Terms & Conditions -->
      <div class="tnc">
        <strong>Terms &amp; Conditions:</strong>
        1. Payment should be made within the agreed payment terms.
        2. All disputes subject to local jurisdiction.
        3. Interest @ 18% p.a. will be charged on delayed payments.
        4. This is a computer-generated invoice and does not require a physical signature unless stamped below.
        5. Goods once sold will not be accepted back without prior written approval.
      </div>

      <!-- Signatures -->
      <div class="sig-grid">
        <div class="sig-box">
          <div class="sig-label">Received By / Buyer's Signature</div>
          <div class="sig-name">&nbsp;</div>
          <div style="font-size:11px;color:#64748b">Name &amp; Stamp</div>
        </div>
        <div class="sig-box" style="text-align:right">
          <div class="sig-label">For ${escapeHtml(companyName)}</div>
          <div class="sig-name">&nbsp;</div>
          <div style="font-size:11px;color:#64748b">Authorized Signatory</div>
        </div>
      </div>
    </main>
    ${autoPrint ? "<script>window.onload = () => { window.focus(); window.print(); };</script>" : ""}
  </body>
</html>`;
};

// ─── InvoiceDetails Component ─────────────────────────────────────────────────

const InvoiceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canViewMatching = hasPermission(user, PERMISSIONS.VIEW_THREE_WAY_MATCHING);

  const [invoice, setInvoice] = useState(null);
  const [matchReports, setMatchReports] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState(null);
  const [remarks, setRemarks] = useState("");

  const loadInvoiceData = useCallback(async () => {
    try {
      setLoading(true);
      const [data] = await Promise.all([
        getInvoiceById(id),
      ]);
      setInvoice(data);

      // Load matching reports in parallel (non-blocking)
      if (canViewMatching) {
        getMatchReportByInvoice(id)
          .then((r) => setMatchReports(r))
          .catch(() => setMatchReports([]));
      }

      // Load document history from backend audit log
      api
        .get(`/v1/invoices/${id}/history`)
        .then((res) => setHistory(Array.isArray(res.data.data) ? res.data.data : []))
        .catch(() => setHistory([]));
    } catch (err) {
      console.error(err);
      toast.error("Failed to load invoice details");
    } finally {
      setLoading(false);
    }
  }, [canViewMatching, id]);

  useEffect(() => {
    loadInvoiceData();
  }, [loadInvoiceData]);

  const latestMatch = useMemo(() => matchReports[0] || null, [matchReports]);
  const grnNumber =
    latestMatch?.grnNumber && latestMatch.grnNumber !== "N/A" ? latestMatch.grnNumber : "";
  const deliveryChallanNumber =
    invoice?.deliveryChallanNumber ||
    (latestMatch?.deliveryChallanNumber && latestMatch.deliveryChallanNumber !== "N/A"
      ? latestMatch.deliveryChallanNumber
      : "");
  const summary = invoice?.taxSummary || {};

  const handleDownloadInvoice = async () => {
    if (!canDownload) {
      toast.error("Permission denied. You do not have permission to download this document.");
      return;
    }
    try {
      const full = await downloadInvoicePdf(invoice.id);
      const htmlContent = buildInvoiceHtml({ invoice: full, matchReports, autoPrint: false });
      const filename = `${full.invoiceNumber || "Invoice"}.pdf`;
      await downloadHtmlAsPdf({ htmlContent, filename, documentTitle: `Invoice (${full.invoiceNumber || "Invoice"})` });
    } catch (err) {
      let msg = "Unable to generate PDF.";
      if (err?.response?.status === 403 || err?.status === 403) {
        msg = "Permission denied. You do not have permission to download this document.";
      } else if (err?.response?.status === 404 || err?.status === 404) {
        msg = "Document not found.";
      }
      toast.error(msg);
    }
  };

  const handleAction = async () => {
    try {
      if (activeModal === "approve") {
        await approveInvoice(id, remarks);
        toast.success("Invoice approved successfully.");
      } else if (activeModal === "reject") {
        if (!remarks.trim()) { toast.error("Rejection reason is required"); return; }
        await rejectInvoice(id, remarks);
        toast.success("Invoice rejected successfully.");
      } else if (activeModal === "cancel") {
        await cancelInvoice(id, remarks);
        toast.success("Invoice cancelled successfully.");
      } else if (activeModal === "remark") {
        if (!remarks.trim()) { toast.error("Remark is required"); return; }
        await addRemark(id, remarks);
        toast.success("Observation remark added successfully.");
      } else if (activeModal === "delete") {
        if (!remarks.trim()) { toast.error("Delete reason is required"); return; }
        await softDeleteInvoice(id, remarks);
        toast.success("Invoice archived successfully");
        navigate("/invoices");
        return;
      }
      setActiveModal(null);
      setRemarks("");
      loadInvoiceData();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Operation failed");
    }
  };

  if (loading)
    return (
      <div className="flex h-96 items-center justify-center text-slate-500">
        Loading invoice details...
      </div>
    );

  if (!invoice) {
    return (
      <div className="space-y-4 p-12 text-center">
        <h3 className="text-lg font-bold text-slate-700">Invoice Not Found</h3>
        <Link to="/invoices" className="text-blue-600 hover:underline">
          Back to invoices list
        </Link>
      </div>
    );
  }

  const canDownload = canDownloadDocument(user);
  const normalizedInvoiceStatus = (invoice.status || "").toUpperCase();
  const normalizedUserRole = (user?.role || "").toUpperCase();
  const isApprover = [ROLES.TEAM_LEAD, ROLES.MANAGER, ROLES.FINANCE_HEAD].includes(normalizedUserRole);
  const canApprove =
    isApprover &&
    invoice.currentApprovalLevel === normalizedUserRole &&
    normalizedInvoiceStatus.startsWith("PENDING_") &&
    normalizedInvoiceStatus !== "PENDING_THREE_WAY_MATCH" &&
    normalizedInvoiceStatus !== "PENDING_ADMIN_REVIEW";
  const canCancel =
    normalizedUserRole === ROLES.CASE_MANAGER &&
    invoice.createdById === user.id &&
    normalizedInvoiceStatus !== "APPROVED" &&
    normalizedInvoiceStatus !== "CANCELLED";
  const canDelete =
    [ROLES.SUPER_ADMIN, ROLES.CASE_MANAGER].includes(normalizedUserRole) &&
    (normalizedUserRole !== ROLES.CASE_MANAGER || invoice.createdById === user.id);
  const canAddRemark = normalizedUserRole === ROLES.SUPER_ADMIN;

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Link
          to="/invoices"
          className="inline-flex items-center text-sm font-medium text-slate-600 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} className="mr-2" /> Back to Invoices
        </Link>

        <div className="flex flex-wrap gap-2">
          {canDownload ? (
            <button
              type="button"
              onClick={handleDownloadInvoice}
              className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
            >
              <Download size={16} /> Download Invoice PDF
            </button>
          ) : (
            <span className="inline-flex items-center rounded-xl bg-amber-50 border border-amber-200 px-4 py-2 text-xs font-semibold text-amber-700">
              You do not have permission to download this document.
            </span>
          )}
          {canApprove && (
            <>
              <button
                onClick={() => setActiveModal("approve")}
                className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700"
              >
                <CheckCircle size={16} /> Approve
              </button>
              <button
                onClick={() => setActiveModal("reject")}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
              >
                <XCircle size={16} /> Reject
              </button>
            </>
          )}
          {canCancel && (
            <button
              onClick={() => setActiveModal("cancel")}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-600"
            >
              <Ban size={16} /> Cancel
            </button>
          )}
          {canAddRemark && (
            <button
              onClick={() => setActiveModal("remark")}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <MessageSquare size={16} /> Add Remark
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => setActiveModal("delete")}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-rose-400 transition hover:bg-slate-800"
            >
              <Trash2 size={16} /> Archive
            </button>
          )}
        </div>
      </div>

      {/* Invoice Header Card */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3 text-blue-600">
              <FileText size={32} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Tax Invoice</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-950">{invoice.invoiceNumber}</h1>
              <p className="mt-2 text-sm text-slate-500">
                {displayValue(invoice.vendor)} · {displayValue(invoice.poNumber)}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-start gap-2 lg:items-end">
            <StatusBadge status={invoice.status} />
            <p className="text-lg font-bold text-slate-900">
              {currency(invoice.invoiceTotal || invoice.amount, invoice.currency)}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="space-y-6">
          {/* Business Info */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="border-b border-slate-100 pb-3 text-base font-bold text-slate-950">
              Business Information
            </h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Detail label="Invoice Date" value={formatDate(invoice.invoiceDate)} />
              <Detail label="Due Date" value={formatDate(invoice.dueDate)} />
              <Detail label="Purchase Order Number" value={invoice.poNumber} />
              <Detail label="Purchase Order Date" value={formatDate(invoice.poDate)} />
              <Detail
                label="Delivery Challan Number"
                value={deliveryChallanNumber}
                missingText="Not Uploaded"
              />
              <Detail label="GRN Number" value={invoice.grnNumber || grnNumber} />
              <Detail label="Payment Terms" value={invoice.paymentTerms} />
              <Detail label="Delivery Address" value={invoice.deliveryAddress} />
              <Detail label="Billing Address" value={invoice.billingAddress} />
            </div>
          </section>

          {/* Vendor Info */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="border-b border-slate-100 pb-3 text-base font-bold text-slate-950">
              Vendor Information
            </h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Detail label="Vendor Name" value={invoice.vendor} />
              <Detail label="Vendor Code" value={invoice.vendorCode} />
              <Detail label="Vendor GST" value={invoice.vendorGst} />
              <Detail label="Vendor PAN" value={invoice.vendorPan} />
              <Detail label="Vendor Contact" value={invoice.vendorContact || invoice.vendorEmail} />
              <Detail label="Vendor Address" value={invoice.vendorAddress} />
            </div>
          </section>

          {/* Item Table — All 7 required columns */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="border-b border-slate-100 pb-3 text-base font-bold text-slate-950">
              Item Details
            </h2>
            <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-215 border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="p-4">#</th>
                    <th className="p-4">Item Name</th>
                    <th className="p-4">Description</th>
                    <th className="p-4 text-right">Quantity</th>
                    <th className="p-4 text-right">Unit Price</th>
                    <th className="p-4 text-right">Taxable Amount</th>
                    <th className="p-4 text-right">GST</th>
                    <th className="p-4 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items?.length ? (
                    invoice.items.map((item, index) => (
                      <tr
                        key={`${item.itemName || item.description}-${index}`}
                        className="border-t border-slate-100 hover:bg-slate-50/60"
                      >
                        <td className="p-4 text-slate-500">{item.lineNumber || index + 1}</td>
                        <td className="p-4 font-semibold text-slate-900">
                          {displayValue(item.itemName || item.description)}
                        </td>
                        <td className="p-4 text-slate-500">
                          {displayValue(item.description, "Not Provided")}
                        </td>
                        <td className="p-4 text-right">{displayValue(item.quantity)}</td>
                        <td className="p-4 text-right">
                          {currency(item.unitPrice || item.rate, invoice.currency)}
                        </td>
                        <td className="p-4 text-right">
                          {currency(item.taxableAmount, invoice.currency)}
                        </td>
                        <td className="p-4 text-right">
                          {currency(item.gstAmount, invoice.currency)}
                        </td>
                        <td className="p-4 text-right font-bold text-slate-900">
                          {currency(totalFromItem(item), invoice.currency)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500">
                        No items available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Invoice Attachments */}
          {invoice.attachments?.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="border-b border-slate-100 pb-3 text-base font-bold text-slate-950">
                <Paperclip size={16} className="mr-2 inline" />
                Attached Documents
              </h2>
              <div className="mt-5 space-y-3">
                {invoice.attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="shrink-0 rounded-lg bg-blue-100 p-2 text-blue-700">
                        <FileText size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {att.original_file_name || att.stored_file_name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {att.attachment_type || att.file_type} ·{" "}
                          {att.file_size
                            ? `${(Number(att.file_size) / 1024).toFixed(1)} KB`
                            : "Unknown size"}{" "}
                          ·{" "}
                          {att.uploaded_at
                            ? new Date(att.uploaded_at).toLocaleDateString("en-IN")
                            : "Date N/A"}
                        </p>
                      </div>
                    </div>
                    {att.file_url && (
                      <a
                        href={att.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Download size={12} /> Download
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Document History Timeline */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="border-b border-slate-100 pb-3 text-base font-bold text-slate-950">
              <Clock size={16} className="mr-2 inline" />
              Document History
            </h2>
            {history.length > 0 ? (
              <div className="mt-5 space-y-0">
                {history.map((entry, idx) => {
                  const { color, label } = historyEventMeta(entry.action);
                  const performedBy = entry.performed_by
                    ? `${entry.performed_by.first_name || ""} ${entry.performed_by.last_name || ""}`.trim() ||
                      entry.performed_by.email
                    : "System";
                  const role = entry.performed_by?.role || "";
                  const dateStr = entry.created_at
                    ? new Date(entry.created_at).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "";
                  return (
                    <div key={entry.id || idx} className="relative flex gap-4 pb-6">
                      {/* Vertical line */}
                      {idx < history.length - 1 && (
                        <div className="absolute left-2.75 top-6 h-full w-0.5 bg-slate-200" />
                      )}
                      {/* Dot */}
                      <div
                        className={`mt-1 h-6 w-6 shrink-0 rounded-full ${color} flex items-center justify-center shadow-sm`}
                      >
                        <div className="h-2 w-2 rounded-full bg-white" />
                      </div>
                      {/* Content */}
                      <div className="min-w-0 flex-1 rounded-xl border border-slate-100 bg-slate-50 p-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <span
                              className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold text-white ${color}`}
                            >
                              {label}
                            </span>
                            {entry.from_status && entry.to_status && (
                              <span className="ml-2 text-xs text-slate-500">
                                {entry.from_status} → {entry.to_status}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-400">{dateStr}</span>
                        </div>
                        <p className="mt-1.5 text-sm font-semibold text-slate-800">
                          {performedBy}
                          {role && (
                            <span className="ml-2 rounded-md bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                              {role}
                            </span>
                          )}
                        </p>
                        {entry.remarks && (
                          <p className="mt-1 text-xs text-slate-600 italic">"{entry.remarks}"</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                No document history available yet.
              </div>
            )}
          </section>
        </main>

        {/* Sidebar */}
        <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-950">GST Summary</h2>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal (Taxable)</span>
                <strong>{currency(summary.subtotal, invoice.currency)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">CGST</span>
                <strong>{currency(summary.cgstTotal, invoice.currency)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">SGST</span>
                <strong>{currency(summary.sgstTotal, invoice.currency)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">IGST</span>
                <strong>{currency(summary.igstTotal, invoice.currency)}</strong>
              </div>
              {Number(summary.otherCharges || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Other Charges</span>
                  <strong>{currency(summary.otherCharges, invoice.currency)}</strong>
                </div>
              )}
              {Number(summary.roundOff || 0) !== 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Round Off</span>
                  <strong>{currency(summary.roundOff, invoice.currency)}</strong>
                </div>
              )}
              <div className="border-t border-slate-200 pt-4">
                <div className="flex justify-between text-lg">
                  <span className="font-bold text-slate-950">Grand Total</span>
                  <strong className="text-blue-700">
                    {currency(
                      summary.grandTotal || invoice.invoiceTotal || invoice.amount,
                      invoice.currency
                    )}
                  </strong>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-950">Remarks</h2>
            <p className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700">
              {displayValue(invoice.description, "Not Provided")}
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-950">Matching Status</h2>
            {latestMatch ? (
              <div className="mt-4 space-y-3">
                <StatusBadge status={latestMatch.status} />
                <p className="text-sm text-slate-600">
                  Match Score: <strong>{latestMatch.matchPercentage}%</strong>
                </p>
                {canViewMatching && (
                  <Link
                    to={`/three-way-matching/${latestMatch.id}`}
                    className="block rounded-lg bg-blue-50 py-2 text-center text-sm font-semibold text-blue-700 hover:bg-blue-100"
                  >
                    View Match Analysis
                  </Link>
                )}
              </div>
            ) : (
              <p className="mt-3">
                <MissingBadge text="Awaiting Data" />
              </p>
            )}
          </section>
        </aside>
      </div>

      {/* Action Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-125 max-w-full space-y-6 rounded-2xl bg-white p-6 shadow-2xl">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-bold capitalize text-slate-900">
                {activeModal === "delete" ? "Confirm Archive Invoice" : `${activeModal} Invoice`}
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                {activeModal === "delete"
                  ? "Archive this invoice with an auditable reason."
                  : "Confirm this workflow action with remarks where required."}
              </p>
            </div>
            <label className="block text-xs font-semibold uppercase text-slate-700">
              Remarks {["reject", "remark", "delete"].includes(activeModal) ? "*" : ""}
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Include confirmation remarks or reason details..."
                className="mt-2 h-24 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600"
                required={["reject", "remark", "delete"].includes(activeModal)}
              />
            </label>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setActiveModal(null); setRemarks(""); }}
                className="rounded-xl border px-4 py-2 text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                className={`rounded-xl px-4 py-2 text-sm font-semibold capitalize text-white ${
                  activeModal === "reject" || activeModal === "delete"
                    ? "bg-red-600 hover:bg-red-700"
                    : activeModal === "cancel"
                    ? "bg-amber-500 hover:bg-amber-600"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                Confirm {activeModal}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceDetails;
export { InvoiceDetails };
