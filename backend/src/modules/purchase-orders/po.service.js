import ApiError from '../../utils/ApiError.js';
import purchaseOrderRepository from './po.repository.js';
import vendorRepository from '../vendors/vendor.repository.js';
import { ROLES } from '../../zodSchema/index.js';
import { VENDOR_MESSAGES, isVendorApprovedAndActive } from '../vendors/vendor.constants.js';
import prisma from '../../config/prisma.js';
import notificationService from '../notifications/notification.service.js';

export const PO_STATUS = {
  CREATED: 'created',
  CLOSED: 'closed',
  CANCELLED: 'cancelled',
};

const ALLOWED_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED'];
const DEFAULT_GST_RATE = Number(process.env.DEFAULT_PO_GST_RATE || 0);
const COMPANY_STATE = String(process.env.COMPANY_STATE || process.env.DEFAULT_COMPANY_STATE || '').trim().toLowerCase();

const generatePoNumber = async () => {
  const year = new Date().getFullYear();
  const rows = await prisma.$queryRaw`SELECT nextval('purchase_order_number_seq')::bigint AS value`;
  const nextValue = Number(rows?.[0]?.value || 0);
  return `PO/${year}/${String(nextValue).padStart(6, '0')}`;
};

const roundMoney = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const calculatePurchaseOrderTax = ({ vendor, items = [], otherCharges = 0 }) => {
  const vendorState = String(vendor?.state || '').trim().toLowerCase();
  const isIntraState = Boolean(COMPANY_STATE && vendorState && COMPANY_STATE === vendorState);

  let subtotal = 0;
  let taxableTotal = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;

  const calculatedItems = items.map((item, index) => {
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.unitPrice ?? item.rate ?? 0);
    const taxableAmount = roundMoney(quantity * unitPrice);
    const gstRate = Number(item.gstRate ?? DEFAULT_GST_RATE);
    const cgstRate = isIntraState ? roundMoney(gstRate / 2) : 0;
    const sgstRate = isIntraState ? roundMoney(gstRate / 2) : 0;
    const igstRate = isIntraState ? 0 : gstRate;
    const cgstAmount = roundMoney((taxableAmount * cgstRate) / 100);
    const sgstAmount = roundMoney((taxableAmount * sgstRate) / 100);
    const igstAmount = roundMoney((taxableAmount * igstRate) / 100);
    const gstAmount = roundMoney(cgstAmount + sgstAmount + igstAmount);
    const lineTotal = roundMoney(taxableAmount + gstAmount);

    subtotal += taxableAmount;
    taxableTotal += taxableAmount;
    cgstTotal += cgstAmount;
    sgstTotal += sgstAmount;
    igstTotal += igstAmount;

    return {
      lineNumber: index + 1,
      itemName: item.itemName,
      description: item.description,
      unit: item.unit || null,
      itemCode: item.itemCode || null,
      quantity,
      unitPrice,
      gstRate,
      taxableAmount,
      cgstRate,
      sgstRate,
      igstRate,
      cgstAmount,
      sgstAmount,
      igstAmount,
      gstAmount,
      lineTotal,
    };
  });

  const totalGst = roundMoney(cgstTotal + sgstTotal + igstTotal);
  const preRoundTotal = roundMoney(taxableTotal + totalGst + Number(otherCharges || 0));
  const grandTotal = Math.round(preRoundTotal);

  return {
    items: calculatedItems,
    summary: {
      companyState: COMPANY_STATE || null,
      vendorState: vendor?.state || null,
      taxType: isIntraState ? 'CGST_SGST' : 'IGST',
      subtotal: roundMoney(subtotal),
      taxableAmount: roundMoney(taxableTotal),
      cgstTotal: roundMoney(cgstTotal),
      sgstTotal: roundMoney(sgstTotal),
      igstTotal: roundMoney(igstTotal),
      totalGst,
      otherCharges: roundMoney(otherCharges),
      roundOff: roundMoney(grandTotal - preRoundTotal),
      grandTotal: roundMoney(grandTotal),
    },
  };
};

const actorName = (user) => `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.email || user?.role || 'System';

const summarizeChanges = (oldValue, newValue, fields) => fields
  .filter((field) => JSON.stringify(oldValue?.[field] ?? null) !== JSON.stringify(newValue?.[field] ?? null))
  .join(', ') || 'No material field changes detected';

const VENDOR_MASTER_REQUIRED_FOR_PO = [
  ['Vendor GST Number', (vendor) => vendor.gst_number || vendor.tax_id || vendor.vendorGst || vendor.gstNumber],
  ['Vendor Contact Person', (vendor) => vendor.contact_person || vendor.vendorContactPerson || vendor.name || vendor.vendorName],
  ['Vendor Email', (vendor) => vendor.email || vendor.vendorEmail],
  ['Vendor Phone', (vendor) => vendor.phone || vendor.vendorPhone],
  ['Vendor State', (vendor) => vendor.state || vendor.vendorState],
];

const assertVendorMasterReadyForPO = (vendor) => {
  const missing = VENDOR_MASTER_REQUIRED_FOR_PO
    .filter(([, getter]) => !getter(vendor))
    .map(([label]) => label);
  if (missing.length) {
    throw new ApiError(400, `Vendor Master data is incomplete. Complete these fields in Vendor Master before creating a Purchase Order: ${missing.join(', ')}.`);
  }
};

class PurchaseOrderService {
  async getAllowedVendorForPurchaseOrder(vendorId, user) {
    const vendor = await vendorRepository.findById(vendorId);
    if (!vendor) {
      throw new ApiError(404, VENDOR_MESSAGES.NOT_FOUND);
    }

    if (!isVendorApprovedAndActive(vendor)) {
      throw new ApiError(400, VENDOR_MESSAGES.ONLY_APPROVED_FOR_PO);
    }

    if (user.role === ROLES.CASE_MANAGER && vendor.created_by_id !== user.id) {
      throw new ApiError(403, 'You can only create purchase orders for vendors you created.');
    }

    assertVendorMasterReadyForPO(vendor);

    return vendor;
  }

  async calculatePurchaseOrderTaxPreview(payload, user) {
    const vendor = await this.getAllowedVendorForPurchaseOrder(payload.vendorId, user);
    return calculatePurchaseOrderTax({
      vendor,
      items: payload.items,
      otherCharges: payload.otherCharges,
    });
  }

  async createPurchaseOrder(payload, user) {
    const vendor = await this.getAllowedVendorForPurchaseOrder(payload.vendorId, user);
    const currency = (payload.currency || 'INR').toUpperCase();

    if (!ALLOWED_CURRENCIES.includes(currency)) {
      throw new ApiError(400, `Currency must be one of: ${ALLOWED_CURRENCIES.join(', ')}`);
    }

    try {
      const taxCalculation = calculatePurchaseOrderTax({
        vendor,
        items: payload.items,
        otherCharges: payload.otherCharges,
      });

      const poData = {
        po_number: await generatePoNumber(),
        vendor_id: payload.vendorId,
        created_by_id: user.id,
        amount: taxCalculation.summary.grandTotal,
        currency,
        description: payload.description || null,
        billing_address: payload.billingAddress || null,
        delivery_address: payload.deliveryAddress || null,
        order_date: payload.orderDate ? new Date(payload.orderDate) : new Date(),
        expected_delivery_date: payload.expectedDeliveryDate ? new Date(payload.expectedDeliveryDate) : null,
        payment_terms: payload.paymentTerms || null,
        line_items: taxCalculation.items,
        tax_summary: taxCalculation.summary,
        status: PO_STATUS.CREATED,
        po_type: payload.poType || 'STANDARD',
        purchase_requisition_number: payload.purchaseRequisitionNumber || null,
        department: payload.department || null,
        cost_center: payload.costCenter || null,
        project_code: payload.projectCode || null,
        requester: payload.requester || null,
        buyer: payload.buyer || null,
        quotation_reference: payload.quotationReference || null,
        quotation_date: payload.quotationDate ? new Date(payload.quotationDate) : null,
        contract_reference: payload.contractReference || null,
      };

      const created = await purchaseOrderRepository.create(poData);
      return created;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ApiError(409, 'A purchase order with this PO number already exists.');
      }
      throw error;
    }
  }

  async listPurchaseOrders(query, user) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 10);
    const where = {
      deleted_at: null,
      ...(query.status && { status: query.status }),
      ...(query.vendorId && { vendor_id: query.vendorId }),
      ...(user.role === ROLES.CASE_MANAGER && { created_by_id: user.id }),
    };

    const result = await purchaseOrderRepository.findAll({
      where,
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      purchaseOrders: result.purchaseOrders,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    };
  }

  async getPurchaseOrderById(id, user) {
    const purchaseOrder = await purchaseOrderRepository.findById(id);
    if (!purchaseOrder) {
      throw new ApiError(404, 'Purchase order not found.');
    }
    if (purchaseOrder.deleted_at) {
      throw new ApiError(404, 'Purchase order not found.');
    }

    if (user.role === ROLES.CASE_MANAGER && purchaseOrder.created_by_id !== user.id) {
      throw new ApiError(403, 'You can only access purchase orders you created.');
    }

    return purchaseOrder;
  }

  async assertCanMutatePurchaseOrder(purchaseOrder, user) {
    if (![ROLES.CASE_MANAGER, ROLES.SUPER_ADMIN].includes(user.role)) {
      throw new ApiError(403, 'Only Case Managers can edit or delete purchase orders.');
    }
    if (user.role === ROLES.CASE_MANAGER && purchaseOrder.created_by_id !== user.id) {
      throw new ApiError(403, 'You can only modify purchase orders you created.');
    }
    if (purchaseOrder.deleted_at) {
      throw new ApiError(400, 'Purchase Order has already been deleted.');
    }
  }

  async getPurchaseOrderReferenceBlocker(purchaseOrderId) {
    const [grn, invoice, match, payment] = await Promise.all([
      prisma.goodsReceiptNote.findFirst({ where: { purchase_order_id: purchaseOrderId }, select: { grn_number: true } }),
      prisma.invoice.findFirst({ where: { purchase_order_id: purchaseOrderId, deleted_at: null }, select: { invoice_number: true } }),
      prisma.threeWayMatch.findFirst({ where: { purchase_order_id: purchaseOrderId }, select: { id: true } }),
      prisma.payment.findFirst({ where: { purchase_order_id: purchaseOrderId }, select: { payment_number: true } }),
    ]);
    if (grn) return 'This Purchase Order cannot be deleted because it is already linked to a Goods Receipt Note.';
    if (invoice) return 'This Purchase Order cannot be deleted because it is already linked to an Invoice.';
    if (match) return 'This Purchase Order cannot be deleted because it is already linked to Three-Way Matching.';
    if (payment) return 'This Purchase Order cannot be deleted because it is already linked to a Payment.';
    return null;
  }

  async updatePurchaseOrder(id, payload, user, req = null) {
    const existing = await purchaseOrderRepository.findById(id);
    if (!existing) throw new ApiError(404, 'Purchase order not found.');
    await this.assertCanMutatePurchaseOrder(existing, user);

    const vendor = await this.getAllowedVendorForPurchaseOrder(payload.vendorId, user);
    const currency = (payload.currency || existing.currency || 'INR').toUpperCase();
    if (!ALLOWED_CURRENCIES.includes(currency)) {
      throw new ApiError(400, `Currency must be one of: ${ALLOWED_CURRENCIES.join(', ')}`);
    }

    const taxCalculation = calculatePurchaseOrderTax({
      vendor,
      items: payload.items,
      otherCharges: payload.otherCharges,
    });

    return purchaseOrderRepository.transaction(async (tx) => {
      const updated = await tx.purchaseOrder.update({
        where: { id },
        data: {
          vendor_id: payload.vendorId,
          updated_by_id: user.id,
          amount: taxCalculation.summary.grandTotal,
          currency,
          description: payload.description || null,
          billing_address: payload.billingAddress || null,
          delivery_address: payload.deliveryAddress || null,
          order_date: payload.orderDate ? new Date(payload.orderDate) : existing.order_date,
          expected_delivery_date: payload.expectedDeliveryDate ? new Date(payload.expectedDeliveryDate) : null,
          payment_terms: payload.paymentTerms || null,
          line_items: taxCalculation.items,
          tax_summary: taxCalculation.summary,
          po_type: payload.poType || existing.po_type,
          purchase_requisition_number: payload.purchaseRequisitionNumber !== undefined ? payload.purchaseRequisitionNumber : existing.purchase_requisition_number,
          department: payload.department !== undefined ? payload.department : existing.department,
          cost_center: payload.costCenter !== undefined ? payload.costCenter : existing.cost_center,
          project_code: payload.projectCode !== undefined ? payload.projectCode : existing.project_code,
          requester: payload.requester !== undefined ? payload.requester : existing.requester,
          buyer: payload.buyer !== undefined ? payload.buyer : existing.buyer,
          quotation_reference: payload.quotationReference !== undefined ? payload.quotationReference : existing.quotation_reference,
          quotation_date: payload.quotationDate !== undefined ? (payload.quotationDate ? new Date(payload.quotationDate) : null) : existing.quotation_date,
          contract_reference: payload.contractReference !== undefined ? payload.contractReference : existing.contract_reference,
        },
        include: { vendor: true, created_by: { select: { id: true, email: true, first_name: true, last_name: true, role: true } } },
      });

      const fields = ['vendor_id', 'amount', 'currency', 'description', 'billing_address', 'delivery_address', 'order_date', 'expected_delivery_date', 'payment_terms', 'line_items', 'tax_summary', 'po_type', 'purchase_requisition_number', 'department', 'cost_center', 'project_code', 'requester', 'buyer', 'quotation_reference', 'quotation_date', 'contract_reference'];
      const summary = summarizeChanges(existing, updated, fields);
      await tx.auditLog.create({
        data: {
          entity_type: 'purchase_order',
          entity_id: id,
          action: 'updated',
          from_status: existing.status,
          to_status: updated.status,
          performed_by_id: user.id,
          remarks: payload.reason || `Purchase Order updated. Changes: ${summary}`,
          old_value: existing,
          new_value: updated,
          ip_address: req?.ip || null,
          user_agent: req?.headers?.['user-agent'] || null,
        },
      });

      notificationService.notifyDocumentEdited({
        entityType: 'purchase_order',
        entityId: id,
        documentNumber: updated.po_number,
        editedBy: actorName(user),
        summary,
      }).catch(() => {});

      return updated;
    });
  }

  async deletePurchaseOrder(id, user, deleteReason, req = null) {
    const existing = await purchaseOrderRepository.findById(id);
    if (!existing) throw new ApiError(404, 'Purchase order not found.');
    await this.assertCanMutatePurchaseOrder(existing, user);

    const blocker = await this.getPurchaseOrderReferenceBlocker(id);
    if (blocker) throw new ApiError(409, blocker);

    return purchaseOrderRepository.transaction(async (tx) => {
      const deleted = await tx.purchaseOrder.update({
        where: { id },
        data: {
          deleted_at: new Date(),
          deleted_by_id: user.id,
          delete_reason: deleteReason,
          updated_by_id: user.id,
        },
        include: { vendor: true, created_by: { select: { id: true, email: true, first_name: true, last_name: true, role: true } } },
      });

      await tx.auditLog.create({
        data: {
          entity_type: 'purchase_order',
          entity_id: id,
          action: 'deleted',
          from_status: existing.status,
          to_status: existing.status,
          performed_by_id: user.id,
          remarks: deleteReason,
          old_value: existing,
          new_value: deleted,
          ip_address: req?.ip || null,
          user_agent: req?.headers?.['user-agent'] || null,
        },
      });

      notificationService.notifyPurchaseOrderDeleted(deleted, actorName(user), deleteReason).catch(() => {});
      return { message: 'Purchase Order deleted successfully.', purchaseOrder: deleted };
    });
  }

  async downloadPurchaseOrderPdf(id, user, req = null) {
    const po = await this.getPurchaseOrderById(id, user);
    if (!po) {
      throw new ApiError(404, 'Purchase Order not found.');
    }

    await prisma.auditLog.create({
      data: {
        entity_type: 'purchase_order',
        entity_id: po.id,
        action: 'downloaded',
        from_status: po.status,
        to_status: po.status,
        performed_by_id: user.id,
        remarks: `PDF downloaded by ${user.first_name || user.email} (${user.role}) for PO #${po.po_number || po.poNumber}`,
        new_value: {
          downloadedBy: user.id,
          userEmail: user.email,
          role: user.role,
          documentType: 'PURCHASE_ORDER',
          documentNumber: po.po_number || po.poNumber,
          timestamp: new Date(),
        },
        ip_address: req?.ip || null,
        user_agent: req?.headers?.['user-agent'] || null,
      },
    });

    return po;
  }
}

export default new PurchaseOrderService();

// notifyPurchaseOrderApprovalRequested
// notifyPurchaseOrderStatusChange
// approvalLog.create
// auditLog.create

