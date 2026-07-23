// ─────────────────────────────────────────────────────────────────────────────
// Invoice Types — VMS Enterprise v2
// ─────────────────────────────────────────────────────────────────────────────

export type InvoiceStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'PENDING_THREE_WAY_MATCH'
  | 'PENDING_TEAM_LEAD'
  | 'PENDING_MANAGER'
  | 'PENDING_FINANCE_HEAD'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

export type ApprovalRole = 'TEAM_LEAD' | 'MANAGER' | 'FINANCE_HEAD';
export type ApprovalLevel = 'TEAM_LEAD' | 'MANAGER' | 'FINANCE_HEAD' | 'THREE_WAY_MATCH' | null;
export type ThreeWayMatchStatus = 'PENDING' | 'MATCHED' | 'UNMATCHED' | 'SKIPPED';
export type PaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'PAYMENT_PENDING' | 'PAYMENT_FAILED' | 'REFUNDED';

export interface InvoiceUser {
  id:         string;
  email:      string;
  first_name: string | null;
  last_name:  string | null;
  role:       string;
}

export interface Invoice {
  id:             string;
  invoice_number: string;
  vendor_id:      string;
  purchase_order_id: string;
  created_by_id:  string | null;
  updated_by_id:  string | null;

  // Amounts
  amount:          number;
  currency:        string;
  invoice_total:   number;
  paid_amount:     number;
  remaining_amount: number;

  // Workflow
  status:                 InvoiceStatus;
  required_approval_role: ApprovalRole;
  current_approval_level: ApprovalLevel;
  payment_status:         PaymentStatus;
  last_payment_date:      string | null;
  last_payment_id:        string | null;

  // Three-Way Matching
  three_way_match_status:      ThreeWayMatchStatus | null;
  three_way_match_percentage:  number | null;
  matching_completed_by_id:    string | null;
  matching_completed_at:       string | null;
  matching_remarks:            string | null;



  // Team Lead (formerly L1) Approval
  team_lead_approver_id:  string | null;
  team_lead_approved_at:  string | null;
  team_lead_remarks:      string | null;

  // Manager (formerly L2) Approval
  manager_approver_id:    string | null;
  manager_approved_at:    string | null;
  manager_remarks:        string | null;

  // Finance Head (formerly L3) Approval
  finance_head_approver_id: string | null;
  finance_head_approved_at: string | null;
  finance_head_remarks:     string | null;

  // Final State
  final_approved_at:  string | null;
  rejected_by_id:     string | null;
  rejected_at:        string | null;
  rejection_reason:   string | null;
  cancelled_at:       string | null;

  // Soft Delete
  deleted_at:    string | null;
  deleted_by_id: string | null;
  delete_reason: string | null;

  // Dates
  invoice_date: string;
  due_date:     string | null;
  description:  string | null;
  created_at:   string;
  updated_at:   string;

  // Relations (optional, from includes)
  vendor?:        { id: string; name: string; vendor_code: string; email: string };
  purchase_order?: { id: string; po_number: string; amount: number; currency: string };
  created_by?:    InvoiceUser | null;
  team_lead_approver?: InvoiceUser | null;
  manager_approver?: InvoiceUser | null;
  finance_head_approver?: InvoiceUser | null;
  rejected_by?: InvoiceUser | null;
  deleted_by?:  InvoiceUser | null;
  three_way_matches?: ThreeWayMatch[];
}

// ─── Three-Way Matching Types ─────────────────────────────────────────────────

export interface MatchFieldResult {
  field:         string;
  label:         string;
  po_value:      string | number;
  grn_value:     string | number;
  invoice_value: string | number;
  status:        'MATCHED' | 'UNMATCHED' | 'WARNING';
  mandatory:     boolean;
}

export interface ThreeWayMatchComparison {
  results:              MatchFieldResult[];
  matched_fields:       string[];
  unmatched_fields:     MatchFieldResult[];
  warnings:             string[];
  matched_fields_count: number;
  total_fields_count:   number;
  match_percentage:     number;
  overall_status:       ThreeWayMatchStatus;
  approval_recommendation: 'APPROVE' | 'REJECT' | 'REVIEW';
}

export interface ThreeWayMatch {
  id:                   string;
  invoice_id:           string;
  purchase_order_id:    string;
  grn_id:               string | null;
  status:               ThreeWayMatchStatus;
  match_percentage:     number;
  matched_fields_count: number;
  total_fields_count:   number;
  unmatched_fields:     MatchFieldResult[] | null;
  matched_fields:       string[] | null;
  warnings:             string[] | null;
  approval_recommendation: 'APPROVE' | 'REJECT' | 'REVIEW' | null;
  po_snapshot:          Record<string, unknown> | null;
  grn_snapshot:         Record<string, unknown> | null;
  invoice_snapshot:     Record<string, unknown> | null;
  completed_by_id:      string | null;
  completed_at:         string | null;
  remarks:              string | null;
  created_at:           string;
  updated_at:           string;
  invoice?:      Invoice;
  grn?:          GoodsReceiptNote | null;
  completed_by?: InvoiceUser | null;
}

// ─── GRN Types ────────────────────────────────────────────────────────────────

export interface GRNLineItem {
  description:  string;
  quantity:     number;
  unit:         string;
  unit_price:   number;
  total:        number;
  hsn_code?:    string;
  gst_rate?:    number;
}

export interface GoodsReceiptNote {
  id:                 string;
  grn_number:         string;
  vendor_id:          string;
  purchase_order_id:  string;
  created_by_id:      string | null;
  status:             'draft' | 'verified' | 'rejected';
  vendor_name:        string | null;
  vendor_code:        string | null;
  gst_number:         string | null;
  delivery_date:      string | null;
  delivery_challan_no: string | null;
  delivery_address:   string | null;
  billing_address:    string | null;
  delivery_terms:     string | null;
  payment_terms:      string | null;
  currency:           string;
  subtotal:           number;
  gst_amount:         number;
  discount:           number;
  total_amount:       number;
  line_items:         GRNLineItem[] | null;
  remarks:            string | null;
  created_at:         string;
  updated_at:         string;
}

// ─── Audit Log Types ──────────────────────────────────────────────────────────

export interface AuditLog {
  id:              string;
  entity_type:     string;
  entity_id:       string;
  action:          string;
  from_status:     string | null;
  to_status:       string | null;
  performed_by_id: string | null;
  remarks:         string | null;
  old_value:       Record<string, unknown> | null;
  new_value:       Record<string, unknown> | null;
  ip_address:      string | null;
  user_agent:      string | null;
  created_at:      string;
  performed_by?:   InvoiceUser | null;
}

// ─── Status Label Map (for UI display) ────────────────────────────────────────

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  DRAFT:                    'Draft',
  SUBMITTED:                'Submitted',
  PENDING_THREE_WAY_MATCH:  'Pending Three-Way Matching',
  PENDING_TEAM_LEAD:        'Pending Team Lead',
  PENDING_MANAGER:          'Pending Manager',
  PENDING_FINANCE_HEAD:     'Pending Finance Head',
  APPROVED:                 'Approved',
  REJECTED:                 'Rejected',
  CANCELLED:                'Cancelled',
};

export const INVOICE_STATUS_COLORS: Record<string, string> = {
  DRAFT:                    'gray',
  SUBMITTED:                'blue',
  PENDING_THREE_WAY_MATCH:  'purple',
  PENDING_TEAM_LEAD:        'yellow',
  PENDING_MANAGER:          'amber',
  PENDING_FINANCE_HEAD:     'indigo',
  APPROVED:                 'green',
  REJECTED:                 'red',
  CANCELLED:                'gray',
};

// ─── API Response Types ────────────────────────────────────────────────────────

export interface InvoiceListResponse {
  success:    boolean;
  invoices:   Invoice[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

export interface MatchingListResponse {
  success:    boolean;
  matches:    ThreeWayMatch[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}
