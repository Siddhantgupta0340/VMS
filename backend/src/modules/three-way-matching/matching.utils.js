import { THREE_WAY_MATCH_STATUS } from '../../utils/approval-helper.js';

const toNumber = (value) => Number(value || 0);
const norm = (value) => String(value || '').trim().toLowerCase();
const money = (value) => Math.round(toNumber(value) * 100) / 100;
const sameMoney = (a, b) => Math.abs(money(a) - money(b)) <= 0.01;

const asArray = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const itemKey = (item) => norm(item.itemName || item.item_name || item.name || item.description || item.hsnCode || item.hsn_code);

const mapItems = (items) => {
  const mapped = new Map();
  for (const item of asArray(items)) {
    const key = itemKey(item);
    if (!key) continue;
    const existing = mapped.get(key) || {
      itemName: item.itemName || item.item_name || item.name || '',
      description: item.description || '',
      hsnCode: item.hsnCode || item.hsn_code || '',
      unit: item.unit || '',
      quantity: 0,
      receivedQuantity: 0,
      deliveredQuantity: 0,
      unitPrice: toNumber(item.unitPrice || item.unit_price || item.rate),
      cgst: 0,
      sgst: 0,
      igst: 0,
      gstAmount: 0,
      lineTotal: 0,
    };

    existing.quantity += toNumber(item.quantity || item.qty);
    existing.receivedQuantity += toNumber(item.receivedQuantity || item.received_quantity || item.quantity || item.qty);
    existing.deliveredQuantity += toNumber(item.deliveredQuantity || item.delivered_quantity || item.quantity || item.qty);
    existing.cgst += toNumber(item.cgst || item.cgstAmount || item.cgst_amount);
    existing.sgst += toNumber(item.sgst || item.sgstAmount || item.sgst_amount);
    existing.igst += toNumber(item.igst || item.igstAmount || item.igst_amount);
    existing.gstAmount += toNumber(item.gstAmount || item.gst_amount || item.taxAmount || item.tax_amount);
    existing.lineTotal += toNumber(item.lineTotal || item.line_total || item.total || item.amount);
    mapped.set(key, existing);
  }
  return mapped;
};

const documentSnapshot = ({ invoice, po, grn, deliveryChallan }) => ({
  purchaseOrder: {
    id: po.id,
    poNumber: po.po_number,
    vendorName: po.vendor?.name || '',
    vendorCode: po.vendor?.vendor_code || '',
    poDate: po.order_date,
    grandTotal: money(po.amount),
    gstAmount: money(po.gst_amount || po.tax_summary?.gstAmount),
    items: asArray(po.line_items),
  },
  goodsReceiptNote: grn ? {
    id: grn.id,
    grnNumber: grn.grn_number,
    receivedDate: grn.delivery_date,
    remarks: grn.remarks,
    grandTotal: money(grn.total_amount),
    gstAmount: money(grn.gst_amount),
    items: asArray(grn.line_items),
  } : null,
  deliveryChallan: deliveryChallan ? {
    id: deliveryChallan.id,
    deliveryChallanNumber: deliveryChallan.delivery_challan_number,
    deliveryDate: deliveryChallan.delivery_date,
    vehicleDetails: deliveryChallan.vehicle_details,
    remarks: deliveryChallan.remarks,
    vendorName: deliveryChallan.vendor_name || '',
    vendorCode: deliveryChallan.vendor_code || '',
    grandTotal: money(deliveryChallan.total_amount),
    gstAmount: money(deliveryChallan.gst_amount),
    items: asArray(deliveryChallan.line_items),
  } : null,
  invoice: {
    id: invoice.id,
    invoiceNumber: invoice.invoice_number,
    invoiceDate: invoice.invoice_date,
    vendorName: invoice.vendor?.name || '',
    vendorCode: invoice.vendor?.vendor_code || '',
    grandTotal: money(invoice.invoice_total || invoice.amount),
    gstAmount: money(invoice.tax_summary?.gstAmount),
    items: asArray(invoice.line_items),
  },
});

const mismatch = (field, reason, poValue, grnValue, invoiceValue, deliveryChallanValue = undefined) => ({
  field,
  label: field.replace(/_/g, ' '),
  status: poValue == null || invoiceValue == null ? 'MISSING_DATA' : 'MISMATCH',
  reason,
  po_value: poValue,
  grn_value: grnValue,
  delivery_challan_value: deliveryChallanValue,
  invoice_value: invoiceValue,
});

export const compareThreeWayDocuments = ({ invoice, purchaseOrder, grn, deliveryChallan }) => {
  const po = purchaseOrder;
  const poItems = mapItems(po.line_items);
  const grnItems = mapItems(grn?.line_items);
  const challanItems = mapItems(deliveryChallan?.line_items);
  const invoiceItems = mapItems(invoice.line_items);
  const unmatched = [];
  const matched = [];
  const warnings = [];

  const check = (field, ok, reason, poValue, grnValue, invoiceValue, deliveryChallanValue = undefined) => {
    if (ok) matched.push(field);
    else unmatched.push(mismatch(field, reason, poValue, grnValue, invoiceValue, deliveryChallanValue));
  };

  check(
    'vendor',
    invoice.vendor_id === po.vendor_id && (!grn || grn.vendor_id === po.vendor_id) && (!deliveryChallan || deliveryChallan.vendor_id === po.vendor_id),
    'Vendor does not match across Purchase Order, Delivery Challan, GRN, and Invoice.',
    po.vendor?.vendor_code,
    grn?.vendor_code,
    invoice.vendor?.vendor_code,
  );

  if (!deliveryChallan) {
    unmatched.push(mismatch('delivery_challan', 'Delivery Challan is required before matching can be approved.', po.po_number, null, invoice.invoice_number));
  }

  if (!grn) {
    unmatched.push(mismatch('goods_receipt_note', 'Goods Receipt Note is required before three-way matching can be approved.', po.po_number, null, invoice.invoice_number));
  }

  for (const [key, invoiceItem] of invoiceItems.entries()) {
    const poItem = poItems.get(key);
    const grnItem = grnItems.get(key);
    const challanItem = challanItems.get(key);
    check('item', Boolean(poItem), `Invoice item "${invoiceItem.itemName || key}" is not present on the Purchase Order.`, poItem?.itemName, grnItem?.itemName, invoiceItem.itemName, challanItem?.itemName);
    if (!poItem) continue;

    check('quantity', invoiceItem.quantity <= poItem.quantity && (!deliveryChallan || invoiceItem.quantity <= (challanItem?.deliveredQuantity || 0)) && (!grn || invoiceItem.quantity <= (grnItem?.receivedQuantity || 0)), 'Invoice quantity exceeds Purchase Order, Delivery Challan, or GRN quantity.', poItem.quantity, grnItem?.receivedQuantity, invoiceItem.quantity, challanItem?.deliveredQuantity);
    check('unit_price', sameMoney(invoiceItem.unitPrice, poItem.unitPrice), 'Invoice unit price differs from Purchase Order.', poItem.unitPrice, grnItem?.unitPrice, invoiceItem.unitPrice, challanItem?.unitPrice);
    check('gst', sameMoney(invoiceItem.gstAmount, poItem.gstAmount), 'GST differs from Purchase Order.', poItem.gstAmount, grnItem?.gstAmount, invoiceItem.gstAmount, challanItem?.gstAmount);
    check('line_total', invoiceItem.lineTotal <= poItem.lineTotal || sameMoney(invoiceItem.lineTotal, poItem.lineTotal), 'Invoice line amount exceeds Purchase Order line amount.', poItem.lineTotal, grnItem?.lineTotal, invoiceItem.lineTotal, challanItem?.lineTotal);
  }

  for (const [key, poItem] of poItems.entries()) {
    if (!invoiceItems.has(key)) {
      warnings.push(`Purchase Order item "${poItem.itemName || key}" is not present on the Invoice.`);
    }
  }

  const poAmount = money(po.amount);
  const grnAmount = money(grn?.total_amount);
  const challanAmount = money(deliveryChallan?.total_amount);
  const invoiceAmount = money(invoice.invoice_total || invoice.amount);
  check('amount', invoiceAmount <= poAmount && sameMoney(invoiceAmount, poAmount), 'Invoice amount exceeds or differs from Purchase Order.', poAmount, grnAmount, invoiceAmount);
  if (grn && grnAmount > 0) {
    check('grn_amount', invoiceAmount <= grnAmount || sameMoney(invoiceAmount, grnAmount), 'Invoice amount exceeds GRN amount.', poAmount, grnAmount, invoiceAmount);
  }
  if (deliveryChallan && challanAmount > 0) {
    check('delivery_challan_amount', invoiceAmount <= challanAmount || sameMoney(invoiceAmount, challanAmount), 'Invoice amount exceeds Delivery Challan amount.', poAmount, grnAmount, invoiceAmount, challanAmount);
  }

  const totalFields = Math.max(matched.length + unmatched.length, 1);
  const matchedCount = matched.length;
  const matchPercentage = Math.round((matchedCount / totalFields) * 10000) / 100;
  const varianceAmount = money(invoiceAmount - Math.min(poAmount, grnAmount || poAmount, challanAmount || poAmount));
  const status = unmatched.length === 0
    ? THREE_WAY_MATCH_STATUS.MATCHED
    : THREE_WAY_MATCH_STATUS.MISMATCH;

  return {
    status,
    matched_fields: matched,
    unmatched_fields: unmatched,
    warnings,
    matched_fields_count: matchedCount,
    total_fields_count: totalFields,
    match_percentage: matchPercentage,
    approval_recommendation: status === THREE_WAY_MATCH_STATUS.MATCHED ? 'APPROVE' : 'REJECT',
    summary: {
      poAmount,
      grnAmount,
      deliveryChallanAmount: challanAmount,
      invoiceAmount,
      matchedAmount: status === THREE_WAY_MATCH_STATUS.MATCHED ? invoiceAmount : Math.max(0, invoiceAmount - Math.max(0, varianceAmount)),
      varianceAmount,
      variancePercentage: poAmount > 0 ? Math.round((Math.abs(varianceAmount) / poAmount) * 10000) / 100 : 0,
    },
    snapshots: documentSnapshot({ invoice, po, grn, deliveryChallan }),
  };
};
