export type PaymentStatus =
  | 'PENDING'
  | 'INITIATED'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'PARTIALLY_PAID'
  | 'COMPLETED';

export type PaymentMethod =
  | 'NEFT'
  | 'RTGS'
  | 'IMPS'
  | 'UPI'
  | 'CHEQUE'
  | 'CASH'
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'NET_BANKING'
  | 'WALLET'
  | 'ACH'
  | 'WIRE_TRANSFER';

export type PaymentType =
  | 'FULL'
  | 'PARTIAL'
  | 'ADVANCE'
  | 'FINAL'
  | 'SCHEDULED'
  | 'RECURRING'
  | 'REFUND'
  | 'ADJUSTMENT';

export type PaymentProvider =
  | 'RAZORPAY'
  | 'STRIPE'
  | 'PAYPAL'
  | 'CASHFREE'
  | 'PHONEPE'
  | 'PAYU'
  | 'BANK_API'
  | 'MANUAL';

export interface UserSummary {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role?: string;
}

export interface Payment {
  id: string;
  payment_number: string;
  invoice_id: string;
  vendor_id: string;
  purchase_order_id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  payment_method: PaymentMethod | null;
  payment_type: PaymentType;
  payment_provider: PaymentProvider;
  provider_transaction_id: string | null;
  gateway_reference: string | null;
  payment_gateway_response: Record<string, string | number | boolean | null | undefined> | null;
  gateway_status: string | null;
  response_message: string | null;
  payment_date: string | null;
  due_date: string | null;
  remarks: string | null;
  processed_by_id: string | null;
  approved_by_id: string | null;
  created_by_id: string | null;
  updated_by_id: string | null;
  created_at: string;
  updated_at: string;

  // Relations
  invoice?: {
    id: string;
    invoice_number: string;
    amount: number;
    status: string;
  };
  vendor?: {
    id: string;
    name: string;
    vendor_code: string;
  };
  purchase_order?: {
    id: string;
    po_number: string;
    amount: number;
  };
  created_by?: UserSummary;
  approved_by?: UserSummary;
  processed_by?: UserSummary;
  updated_by?: UserSummary;
}

export interface CreatePaymentPayload {
  invoiceId: string;
  amount?: number;
  currency?: string;
  paymentMethod?: PaymentMethod;
  paymentType?: PaymentType;
  paymentProvider?: PaymentProvider;
  remarks?: string;
  dueDate?: string;
}

export interface UpdatePaymentPayload {
  amount?: number;
  paymentMethod?: string;
  paymentType?: string;
  paymentProvider?: string;
  remarks?: string;
  dueDate?: string;
  paymentDate?: string;
}

export interface PaymentListResponse {
  success: boolean;
  payments: Payment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
