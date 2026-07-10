import ApiError from '../../utils/ApiError.js';
import purchaseOrderRepository from './po.repository.js';
import vendorRepository from '../vendors/vendor.repository.js';
import { ROLES } from '../../zodSchema/index.js';
import { VENDOR_MESSAGES, VENDOR_STATUS } from '../vendors/vendor.constants.js';

export const PO_STATUS = {
  PENDING: 'pending',
  OPEN: 'open',
  CLOSED: 'closed',
  CANCELLED: 'cancelled',
};

const ALLOWED_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED'];

/**
 * Generates a unique PO number using the current timestamp.
 * @returns {string}
 */
const buildPoNumber = () => `PO-${Date.now()}`;

class PurchaseOrderService {
  /**
   * Create a new Purchase Order.
   *
   * Business Rules:
   * 1. Vendor must exist.
   * 2. Vendor must be in APPROVED status.
   * 3. CASE_MANAGER can only create POs for vendors they created.
   * 4. Currency must be one of the allowed currencies.
   * 5. PO number must be unique (handled by Prisma P2002 error).
   *
   * @param {object} payload - Validated request body (from Zod).
   * @param {object} user    - Authenticated user (from req.user).
   */
  async createPurchaseOrder(payload, user) {
    console.log(`[PurchaseOrderService] createPurchaseOrder — user: ${user.id} (${user.role})`);
    console.log(`[PurchaseOrderService] payload: ${JSON.stringify(payload)}`);
    console.log("PAYLOAD ITEMS =", payload.items);

    // ── 1. Validate Vendor ───────────────────────────────────────────────────
    const vendor = await vendorRepository.findById(payload.vendorId);
    if (!vendor) {
      throw new ApiError(404, VENDOR_MESSAGES.NOT_FOUND);
    }

    if (vendor.status !== VENDOR_STATUS.APPROVED) {
      throw new ApiError(400, VENDOR_MESSAGES.ONLY_APPROVED_FOR_PO);
    }

    // ── 2. Authorization: CASE_MANAGER can only use their own vendors ────────
    if (user.role === ROLES.CASE_MANAGER && vendor.created_by_id !== user.id) {
      throw new ApiError(403, 'You can only create purchase orders for vendors you created.');
    }

    // ── 3. Validate Currency ─────────────────────────────────────────────────
    const currency = (payload.currency || 'INR').toUpperCase();
    if (!ALLOWED_CURRENCIES.includes(currency)) {
      throw new ApiError(400, `Currency must be one of: ${ALLOWED_CURRENCIES.join(', ')}`);
    }

    // ── 4. Persist to Database ───────────────────────────────────────────────
    try {
      const poData = {
  po_number: payload.poNumber || buildPoNumber(),

  vendor_id: payload.vendorId,

  created_by_id: user.id,

  amount: payload.amount,

  currency,

  description: payload.description || null,

  order_date: payload.orderDate
    ? new Date(payload.orderDate)
    : new Date(),

  expected_delivery_date: payload.expectedDeliveryDate
    ? new Date(payload.expectedDeliveryDate)
    : null,

  payment_terms: payload.paymentTerms || null,

  line_items: payload.items || [],

  status: PO_STATUS.PENDING,
};

      console.log(`[PurchaseOrderService] Inserting PO: ${JSON.stringify(poData)}`);
      const created = await purchaseOrderRepository.create(poData);
      console.log(`[PurchaseOrderService] PO created: ${created.id} — ${created.po_number}`);
      return created;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ApiError(409, 'A purchase order with this PO number already exists.');
      }
      throw error;
    }
  }

  /**
   * List Purchase Orders with filters and pagination.
   *
   * @param {object} query - Validated query params.
   * @param {object} user  - Authenticated user.
   */
  async listPurchaseOrders(query, user) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 10);

    console.log("========== PO LIST ==========");
console.log("USER ROLE =", user.role);
console.log("USER ID =", user.id);

    const where = {
      ...(query.status && { status: query.status }),
      ...(query.vendorId && { vendor_id: query.vendorId }),
      // CASE_MANAGER only sees POs they created
      ...(user.role === ROLES.CASE_MANAGER && { created_by_id: user.id }),
    };

    console.log("WHERE =", where);

    const result = await purchaseOrderRepository.findAll({
      where,
      skip: (page - 1) * limit,
      take: limit,
    });

    console.log("TOTAL POS =", result.purchaseOrders.length);
console.log(result.purchaseOrders);

    return {
      purchaseOrders: result.purchaseOrders,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    };
  }

  /**
   * Get a single Purchase Order by ID.
   *
   * @param {string} id   - Purchase Order UUID.
   * @param {object} user - Authenticated user.
   */
  async getPurchaseOrderById(id, user) {
    const purchaseOrder = await purchaseOrderRepository.findById(id);
    if (!purchaseOrder) {
      throw new ApiError(404, 'Purchase order not found.');
    }

    // CASE_MANAGER can only access their own POs
    if (user.role === ROLES.CASE_MANAGER && purchaseOrder.created_by_id !== user.id) {
      throw new ApiError(403, 'You can only access purchase orders you created.');
    }

    return purchaseOrder;
  }

  /**
   * Update a Purchase Order's status.
   *
   * @param {string} id     - Purchase Order UUID.
   * @param {string} status - New status value.
   */
  async updatePurchaseOrderStatus(id, status) {
    const purchaseOrder = await purchaseOrderRepository.findById(id);
    if (!purchaseOrder) {
      throw new ApiError(404, 'Purchase order not found.');
    }

    const now = new Date();
    return purchaseOrderRepository.update(id, {
      status,
      closed_at: status === PO_STATUS.CLOSED ? now : null,
      cancelled_at: status === PO_STATUS.CANCELLED ? now : null,
    });
  }
}

export default new PurchaseOrderService();
