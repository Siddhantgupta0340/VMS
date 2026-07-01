export type InvoiceStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'PENDING_L1'
  | 'PENDING_L2'
  | 'PENDING_L3'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

export type ApprovalLevel = 'L1' | 'L2' | 'L3';

export type InvoicePaymentStatus =
  | 'UNPAID'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'OVERDUE'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_FAILED'
  | 'REFUNDED';

export interface UserSummary {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role?: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  vendor_id: string;
  purchase_order_id: string;
  created_by_id: string | null;
  updated_by_id: string | null;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  required_approval_role: string;
  current_approval_level: string | null;
  payment_status: InvoicePaymentStatus;
  invoice_total: number;
  paid_amount: number;
  remaining_amount: number;
  last_payment_date: string | null;
  last_payment_id: string | null;

  // L1 Approval info
  l1_approver_id: string | null;
  l1_approved_at: string | null;
  l1_remarks: string | null;

  // L2 Approval info
  l2_approver_id: string | null;
  l2_approved_at: string | null;
  l2_remarks: string | null;

  // L3 Approval info
  l3_approver_id: string | null;
  l3_approved_at: string | null;
  l3_remarks: string | null;

  // Rejection/Cancellation
  final_approved_at: string | null;
  rejected_by_id: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  cancelled_at: string | null;

  invoice_date: string;
  due_date: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;

  // Expanded fields
  vendor?: {
    id: string;
    name: string;
    vendor_code: string;
    email: string;
    phone: string;
  };
  purchase_order?: {
    id: string;
    po_number: string;
    amount: number;
    currency: string;
  };
  created_by?: UserSummary;
  updated_by?: UserSummary;
  l1_approver?: UserSummary;
  l2_approver?: UserSummary;
  l3_approver?: UserSummary;
  rejected_by?: UserSummary;
}

export interface ApprovalLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  from_status: string | null;
  to_status: string | null;
  performed_by_id: string | null;
  remarks: string | null;
  created_at: string;
  performed_by?: UserSummary;
}

export interface CreateInvoicePayload {
  vendorId: string;
  purchaseOrderId: string;
  invoiceNumber?: string;
  amount: number;
  currency?: string;
  invoiceDate?: string;
  dueDate?: string;
  description?: string;
}

export interface InvoiceListResponse {
  success: boolean;
  invoices: Invoice[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
