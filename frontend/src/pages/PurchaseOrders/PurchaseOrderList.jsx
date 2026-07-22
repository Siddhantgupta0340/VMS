import { Download, Eye, Plus, Printer, Trash2, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

import ConfirmationModal from "../../components/common/ConfirmationModal";
import DataTable from "../../components/common/DataTable";
import EmptyState from "../../components/common/EmptyState";
import StatusBadge from "../../components/common/StatusBadge";
import { deletePurchaseOrder, getPurchaseOrderById, getPurchaseOrders, downloadPurchaseOrderPdf } from "../../services/purchaseOrderServices";
import { getErrorMessage, notify } from "../../utils/feedback";
import { useAuth } from "../../context/AuthContext";
import { canDownloadDocument } from "../../config/permissions";
import { downloadHtmlAsPdf } from "../../utils/pdfGenerator";

const companyName = import.meta.env.VITE_COMPANY_NAME || "Vendor Management System";
const companyGst  = import.meta.env.VITE_COMPANY_GST  || "";
const companyAddress = import.meta.env.VITE_COMPANY_ADDRESS || "";
const companyLogo    = import.meta.env.VITE_COMPANY_LOGO_URL || "";
const companyPan     = import.meta.env.VITE_COMPANY_PAN || "";
const companyPhone   = import.meta.env.VITE_COMPANY_PHONE || "";
const companyEmail   = import.meta.env.VITE_COMPANY_EMAIL || "";

const money = (value, cur = "INR") =>
  `${cur} ${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const esc = (v) =>
  String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const fmtDate = (v) => {
  if (!v) return "N/A";
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? "N/A"
    : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

// ─── Professional Purchase Order PDF ──────────────────────────────────────────
const buildPurchaseOrderHtml = (po, autoPrint = true) => {
  const summary = po.taxSummary || {};
  const items = po.items || [];

  const itemRows = items
    .map(
      (item, i) => `
    <tr>
      <td style="text-align:center">${i + 1}</td>
      <td>
        <strong>${esc(item.itemName || item.description || "Item")}</strong>
        ${item.description && item.itemName ? `<br/><span style="color:#64748b;font-size:10px">${esc(item.description)}</span>` : ""}
      </td>
      <td>—</td>
      <td style="text-align:center">${esc(item.quantity || 0)}</td>
      <td class="num">${esc(money(item.unitPrice, po.currency))}</td>
      <td class="num">${esc(money(item.taxableAmount, po.currency))}</td>
      <td style="text-align:center">${esc(item.gstRate || 0)}%</td>
      <td class="num">${esc(money(item.cgstAmount || 0, po.currency))}</td>
      <td class="num">${esc(money(item.sgstAmount || 0, po.currency))}</td>
      <td class="num">${esc(money(item.igstAmount || 0, po.currency))}</td>
      <td class="num"><strong>${esc(money(item.lineTotal, po.currency))}</strong></td>
    </tr>`
    )
    .join("");

  return `<!doctype html>
<html>
  <head>
    <title>Purchase Order — ${esc(po.poNumber || "PO")}</title>
    <style>
      @page { size: A4 landscape; margin: 10mm 12mm; }
      * { box-sizing: border-box; }
      body { font-family: "Segoe UI", Arial, sans-serif; color: #0f172a; margin: 0; font-size: 11px; }
      .sheet { max-width: 1100px; margin: 0 auto; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1d4ed8; padding-bottom: 12px; margin-bottom: 14px; }
      .brand-row { display: flex; align-items: center; gap: 10px; }
      .logo { width: 48px; height: 48px; object-fit: contain; border-radius: 6px; border: 1px solid #e2e8f0; }
      .brand-name { font-size: 18px; font-weight: 800; color: #1d4ed8; }
      .brand-sub { font-size: 10px; color: #64748b; line-height: 1.6; margin-top: 2px; }
      .doc-title { text-align: right; }
      .doc-title h1 { margin: 0; font-size: 26px; font-weight: 900; color: #1d4ed8; }
      .doc-title .po-num { font-size: 12px; font-weight: 700; color: #334155; margin-top: 3px; }
      .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
      .info-grid.cols3 { grid-template-columns: 1fr 1fr 1fr; }
      .info-grid.cols4 { grid-template-columns: 1fr 1fr 1fr 1fr; }
      .box { border: 1px solid #cbd5e1; border-radius: 5px; padding: 6px 9px; }
      .box .lbl { color: #64748b; font-size: 9px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; }
      .box .val { margin-top: 2px; font-size: 11px; font-weight: 700; }
      h2 { margin: 12px 0 6px; font-size: 10px; text-transform: uppercase; color: #334155; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; letter-spacing: 1px; }
      table { width: 100%; border-collapse: collapse; font-size: 10px; }
      thead th { background: #1d4ed8; color: #fff; text-align: left; padding: 6px 5px; font-size: 9px; }
      thead th.num { text-align: right; }
      tbody td { padding: 6px 5px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
      .num { text-align: right; white-space: nowrap; }
      .summary-wrap { display: flex; justify-content: flex-end; margin-top: 10px; }
      .summary { width: 280px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; }
      .sum-row { display: flex; justify-content: space-between; padding: 5px 10px; border-bottom: 1px solid #f1f5f9; font-size: 11px; }
      .sum-row.grand { background: #1d4ed8; color: #fff; font-size: 13px; font-weight: 800; border-bottom: none; }
      .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 24px; }
      .sig-box { border-top: 2px solid #0f172a; padding-top: 6px; }
      .sig-label { font-size: 9px; text-transform: uppercase; font-weight: 700; color: #64748b; }
      .sig-name { margin-top: 30px; font-weight: 700; font-size: 11px; }
      .tnc { border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; margin-top: 12px; font-size: 9px; color: #64748b; }
      .tnc strong { color: #334155; }
      @media print { .no-print { display: none; } }
    </style>
  </head>
  <body>
    <main class="sheet">
      <!-- Header -->
      <section class="header">
        <div class="brand-row">
          ${companyLogo ? `<img class="logo" src="${esc(companyLogo)}" alt="logo" />` : ""}
          <div>
            <div class="brand-name">${esc(companyName)}</div>
            <div class="brand-sub">
              ${companyAddress ? esc(companyAddress) + "<br/>" : ""}
              ${companyGst ? "GST: " + esc(companyGst) : ""}
              ${companyPan ? " | PAN: " + esc(companyPan) : ""}
              ${companyPhone ? "<br/>Tel: " + esc(companyPhone) : ""}
              ${companyEmail ? " | " + esc(companyEmail) : ""}
            </div>
          </div>
        </div>
        <div class="doc-title">
          <h1>PURCHASE ORDER</h1>
          <div class="po-num">${esc(po.poNumber || "N/A")}</div>
        </div>
      </section>

      <!-- PO Metadata -->
      <h2>Order Information</h2>
      <div class="info-grid cols4">
        <div class="box"><div class="lbl">PO Number</div><div class="val">${esc(po.poNumber)}</div></div>
        <div class="box"><div class="lbl">Order Date</div><div class="val">${fmtDate(po.orderDate)}</div></div>
        <div class="box"><div class="lbl">Expected Delivery</div><div class="val">${fmtDate(po.expectedDelivery)}</div></div>
        <div class="box"><div class="lbl">Payment Terms</div><div class="val">${esc(po.paymentTerms || "N/A")}</div></div>
        <div class="box"><div class="lbl">Currency</div><div class="val">${esc(po.currency || "INR")}</div></div>
        <div class="box"><div class="lbl">Status</div><div class="val">${esc(po.status || "N/A")}</div></div>
        <div class="box"><div class="lbl">Created By</div><div class="val">${esc(po.createdBy || "N/A")}</div></div>
        <div class="box"><div class="lbl">Role</div><div class="val">${esc(po.createdByRole || "N/A")}</div></div>
      </div>

      <!-- Vendor -->
      <h2>Vendor / Bill To</h2>
      <div class="info-grid cols3">
        <div class="box"><div class="lbl">Vendor Name</div><div class="val">${esc(po.vendor || "N/A")}</div></div>
        <div class="box"><div class="lbl">Delivery Address</div><div class="val">${esc(po.deliveryAddress || "N/A")}</div></div>
        <div class="box"><div class="lbl">Billing Address</div><div class="val">${esc(po.billingAddress || "N/A")}</div></div>
      </div>

      <!-- Items Table -->
      <h2>Line Items</h2>
      <table>
        <thead>
          <tr>
            <th style="width:28px">#</th>
            <th>Item / Description</th>
            <th style="width:60px">HSN</th>
            <th style="width:60px;text-align:center">Qty</th>
            <th class="num" style="width:90px">Unit Price</th>
            <th class="num" style="width:90px">Taxable Amt</th>
            <th style="width:50px;text-align:center">GST%</th>
            <th class="num" style="width:70px">CGST</th>
            <th class="num" style="width:70px">SGST</th>
            <th class="num" style="width:70px">IGST</th>
            <th class="num" style="width:90px">Line Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows || `<tr><td colspan="11" style="text-align:center;padding:14px;color:#64748b">No items available</td></tr>`}
        </tbody>
      </table>

      <!-- Tax Summary -->
      <div class="summary-wrap">
        <div class="summary">
          <div class="sum-row"><span>Subtotal (Taxable)</span><strong>${esc(money(summary.taxableAmount || summary.subtotal, po.currency))}</strong></div>
          <div class="sum-row"><span>CGST</span><strong>${esc(money(summary.cgstTotal, po.currency))}</strong></div>
          <div class="sum-row"><span>SGST</span><strong>${esc(money(summary.sgstTotal, po.currency))}</strong></div>
          <div class="sum-row"><span>IGST</span><strong>${esc(money(summary.igstTotal, po.currency))}</strong></div>
          ${Number(summary.otherCharges || 0) > 0 ? `<div class="sum-row"><span>Other Charges</span><strong>${esc(money(summary.otherCharges, po.currency))}</strong></div>` : ""}
          ${Number(summary.roundOff || 0) !== 0 ? `<div class="sum-row"><span>Round Off</span><strong>${esc(money(summary.roundOff, po.currency))}</strong></div>` : ""}
          <div class="sum-row grand"><span>GRAND TOTAL</span><strong>${esc(money(summary.grandTotal || po.amount, po.currency))}</strong></div>
        </div>
      </div>

      ${po.description ? `<h2>Description / Remarks</h2><div style="border:1px solid #e2e8f0;border-radius:5px;padding:8px 12px;font-size:10px;color:#475569">${esc(po.description)}</div>` : ""}

      <!-- Terms & Conditions -->
      <div class="tnc">
        <strong>Terms &amp; Conditions:</strong>
        1. Goods/services must be delivered by the expected delivery date.
        2. Invoice must quote this PO Number for payment processing.
        3. All prices are inclusive of taxes unless stated separately.
        4. Disputes subject to local jurisdiction.
        5. The vendor must comply with applicable GST regulations and provide a valid Tax Invoice.
      </div>

      <!-- Signatures -->
      <div class="sig-grid">
        <div class="sig-box">
          <div class="sig-label">Vendor Acceptance / Signature</div>
          <div class="sig-name">&nbsp;</div>
          <div style="font-size:9px;color:#64748b">Name, Date &amp; Stamp</div>
        </div>
        <div class="sig-box" style="text-align:right">
          <div class="sig-label">For ${esc(companyName)}</div>
          <div class="sig-name">&nbsp;</div>
          <div style="font-size:9px;color:#64748b">Authorized Signatory</div>
        </div>
      </div>
    </main>
    ${autoPrint ? "<script>window.onload = () => { window.focus(); window.print(); };</script>" : ""}
  </body>
</html>`;
};

const handleDownloadPO = async (po) => {
  try {
    const full = await downloadPurchaseOrderPdf(po.id);
    const htmlContent = buildPurchaseOrderHtml(full, false);
    const filename = `${full.poNumber || "PurchaseOrder"}.pdf`;
    await downloadHtmlAsPdf({ htmlContent, filename, documentTitle: `Purchase Order (${full.poNumber || "PO"})` });
  } catch (err) {
    let msg = "Unable to generate PDF.";
    if (err?.response?.status === 403 || err?.status === 403) {
      msg = "Permission denied. You do not have permission to download this document.";
    } else if (err?.response?.status === 404 || err?.status === 404) {
      msg = "Document not found.";
    }
    notify.error(getErrorMessage(err, msg));
  }
};

const Detail = ({ label, value }) => (
  <div className="rounded-lg border border-slate-200 p-4">
    <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
    <p className="mt-1 break-words text-sm font-semibold text-slate-900">
      {value || <span className="rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-700">Not Available</span>}
    </p>
  </div>
);

const PurchaseOrderList = () => {
  const { user } = useAuth();
  const canDownload = canDownloadDocument(user);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPO, setSelectedPO] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleting, setDeleting] = useState(false);

  const loadPOs = async () => {
    try {
      setLoading(true);
      setPurchaseOrders(await getPurchaseOrders());
    } catch (error) {
      notify.error(getErrorMessage(error, "Purchase orders could not be loaded."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPOs();
  }, []);

  const totalValue = purchaseOrders.reduce((sum, po) => sum + Number(po.amount || 0), 0);
  const createdCount = purchaseOrders.filter((po) => po.status === "Created").length;

  const columns = [
    {
      key: "poNumber",
      label: "PO Number",
      sortable: true,
      render: (value) => <span className="font-semibold text-blue-700">{value}</span>,
    },
    { key: "vendor", label: "Vendor", sortable: true },
    {
      key: "amount",
      label: "Amount",
      sortable: true,
      render: (value, row) => <span className="font-semibold">{money(value, row.currency)}</span>,
    },
    { key: "itemCount", label: "Items", sortable: true },
    {
      key: "orderDate",
      label: "Order Date",
      sortable: true,
      render: (value) => (value ? new Date(value).toLocaleDateString("en-IN") : "-"),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (value) => <StatusBadge status={value} />,
    },
  ];

  const openDetails = async (po) => {
    try {
      setSelectedPO(await getPurchaseOrderById(po.id));
    } catch (error) {
      notify.error(getErrorMessage(error, "Purchase order details could not be loaded."));
    }
  };

  const confirmDelete = async () => {
    if (!deleteReason.trim()) {
      notify.error("Delete reason is required.");
      return;
    }
    try {
      setDeleting(true);
      await deletePurchaseOrder(deleteTarget.id, deleteReason.trim());
      notify.success("Purchase Order deleted successfully.");
      setDeleteTarget(null);
      setDeleteReason("");
      await loadPOs();
    } catch (error) {
      notify.error(getErrorMessage(error, "Purchase Order could not be deleted."));
    } finally {
      setDeleting(false);
    }
  };

  const exportCSV = () => {
    if (!purchaseOrders.length) return;
    const rows = purchaseOrders.map((po) => ({
      "PO Number": po.poNumber,
      Vendor: po.vendor,
      Amount: po.amount,
      Currency: po.currency,
      Status: po.status,
      "Order Date": po.orderDate,
    }));
    const csv = [
      Object.keys(rows[0]).join(","),
      ...rows.map((row) => Object.values(row).map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")),
    ].join("\n");
    const url = window.URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "purchase-orders.csv";
    link.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="flex h-96 items-center justify-center text-slate-500">Loading purchase orders...</div>;
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Purchase Orders</h1>
            <p className="mt-2 text-slate-500">Purchase orders are created by Case Managers and available immediately.</p>
          </div>
          <Link to="/purchase-orders/new" className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700">
            <Plus size={18} />
            New Purchase Order
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Total POs</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{purchaseOrders.length}</p>
          </section>
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Available</p>
            <p className="mt-2 text-2xl font-bold text-emerald-700">{createdCount}</p>
          </section>
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Total Value</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{money(totalValue)}</p>
          </section>
        </div>

        <div className="flex justify-end">
          <button type="button" onClick={exportCSV} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
            <Download size={16} />
            Export
          </button>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
          {purchaseOrders.length ? (
            <DataTable
              columns={columns}
              data={purchaseOrders}
              searchableFields={["poNumber", "vendor", "description", "status"]}
              rowActions={(po) => (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                    onClick={() => openDetails(po)}
                  >
                    <Eye size={15} /> View
                  </button>
                  {canDownload ? (
                    <button
                      type="button"
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                      onClick={() => handleDownloadPO(po)}
                    >
                      <Download size={15} /> PDF
                    </button>
                  ) : (
                    <span
                      className="inline-flex h-9 items-center px-2 text-[11px] font-semibold text-slate-400"
                      title="You do not have permission to download this document."
                    >
                      No download access
                    </span>
                  )}
                  <button
                    type="button"
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                    onClick={() => setDeleteTarget(po)}
                  >
                    <Trash2 size={15} /> Delete
                  </button>
                </div>
              )}
              itemsPerPage={10}
            />
          ) : (
            <EmptyState
              icon={Plus}
              title="No purchase orders"
              description="Create the first purchase order from an approved vendor."
              action={<Link to="/purchase-orders/new" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"><Plus size={16} />Create Purchase Order</Link>}
            />
          )}
        </section>
      </div>

      {selectedPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <section className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-950">Purchase Order Details</h2>
                <p className="mt-1 text-sm font-semibold text-blue-700">{selectedPO.poNumber}</p>
              </div>
              <div className="flex items-center gap-2">
                {canDownload ? (
                  <button
                    type="button"
                    onClick={() => handleDownloadPO(selectedPO)}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                  >
                    <Download size={15} /> Download PDF
                  </button>
                ) : (
                  <span className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-medium text-amber-700">
                    You do not have permission to download this document.
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedPO(null)}
                  className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 hover:text-red-600"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="space-y-6 p-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Detail label="PO Number" value={selectedPO.poNumber} />
                <Detail label="Vendor" value={selectedPO.vendor} />
                <Detail label="Status" value={selectedPO.status} />
                <Detail label="Amount" value={money(selectedPO.amount, selectedPO.currency)} />
                <Detail label="Order Date" value={selectedPO.orderDate ? new Date(selectedPO.orderDate).toLocaleDateString("en-IN") : "-"} />
                <Detail label="Expected Delivery" value={selectedPO.expectedDelivery ? new Date(selectedPO.expectedDelivery).toLocaleDateString("en-IN") : "-"} />
                <Detail label="Payment Terms" value={selectedPO.paymentTerms} />
                <Detail label="Created By" value={`${selectedPO.createdByRole || ""} ${selectedPO.createdBy || ""}`.trim()} />
              </div>

              <section>
                <h3 className="mb-3 text-base font-bold text-slate-950">Line Items</h3>
                <div className="grid gap-3">
                  {selectedPO.items?.length ? selectedPO.items.map((item, index) => (
                    <article key={`${item.itemName || item.description}-${index}`} className="rounded-lg border border-slate-200 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-semibold text-slate-950">{item.itemName || item.description}</p>
                          <p className="mt-1 text-sm text-slate-500">{item.description}</p>
                        </div>
                        <p className="font-bold text-blue-700">{money(item.lineTotal, selectedPO.currency)}</p>
                      </div>
                      <div className="mt-3 grid gap-3 text-sm sm:grid-cols-4">
                        <Detail label="Qty" value={item.quantity} />
                        <Detail label="Unit Price" value={money(item.unitPrice, selectedPO.currency)} />
                        <Detail label="Taxable Amount" value={money(item.taxableAmount, selectedPO.currency)} />
                        <Detail label="GST" value={money(item.gstAmount, selectedPO.currency)} />
                      </div>
                    </article>
                  )) : <p className="rounded-lg border border-dashed border-slate-200 p-5 text-center text-slate-500">No line items available.</p>}
                </div>
              </section>
            </div>
          </section>
        </div>
      )}
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
    </>
  );
};

export default PurchaseOrderList;
