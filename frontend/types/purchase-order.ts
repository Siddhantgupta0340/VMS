/**
 * TypeScript types for Purchase Orders.
 * These match the Prisma schema and API response shapes.
 */

export type POStatus = 'pending' | 'open' | 'closed' | 'cancelled';

export type Currency = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED';

export interface PurchaseOrder {
  id: string;
  po_number: string;
  vendor_id: string;
  created_by_id: string | null;
  amount: number;
  currency: Currency;
  status: POStatus;
  description: string | null;
  order_date: string;
  expected_delivery_date: string | null;
  closed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  vendor?: {
    id: string;
    name: string;
    vendor_code: string;
    email: string;
    status: string;
  };
  created_by?: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    role: string;
  } | null;
}

/** Payload sent to POST /api/v1/purchase-orders */
export interface CreatePurchaseOrderPayload {
  vendorId: string;
  poNumber?: string;
  amount: number;
  currency?: Currency;
  description?: string;
  orderDate?: string;       // ISO 8601 date string
  expectedDeliveryDate?: string; // ISO 8601 date string
}

/** Zod-compatible form values (all strings from input fields) */
export interface CreatePurchaseOrderFormValues {
  vendorId: string;
  poNumber?: string;
  amount: string;           // string from <input type="text" />
  currency: Currency;
  description?: string;
  orderDate?: string;
  expectedDeliveryDate?: string;
}

export interface PurchaseOrderListResponse {
  success: boolean;
  purchaseOrders: PurchaseOrder[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreatePurchaseOrderResponse {
  success: boolean;
  message: string;
  data: PurchaseOrder;
}
