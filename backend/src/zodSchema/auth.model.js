export const USER_TABLE = 'users';

/**
 * System-wide Role constants.
 * ─────────────────────────────────────────────────────────────────────
 * SUPER_ADMIN    → System administrator (full access)
 * CASE_MANAGER   → Creates vendors, POs, invoices; initiates 3-way matching
 * TEAM_LEAD      → Approves invoices ≤ ₹10,000 (formerly L1)
 * MANAGER        → Approves invoices ₹10,001–₹1,00,000 (formerly L2)
 * FINANCE_HEAD   → Approves invoices > ₹1,00,000; Vendor review; Payment approval (merged L3 + FINANCE_MANAGER)
 * ─────────────────────────────────────────────────────────────────────
 */
export const ROLES = {
  SUPER_ADMIN:   'SUPER_ADMIN',
  CASE_MANAGER:  'CASE_MANAGER',
  TEAM_LEAD:     'TEAM_LEAD',
  MANAGER:       'MANAGER',
  FINANCE_HEAD:  'FINANCE_HEAD',
};

export const AUTH_STATUS = {
  ACTIVE:    'ACTIVE',
  INACTIVE:  'INACTIVE',
  SUSPENDED: 'SUSPENDED',
  LOCKED:    'LOCKED',
  PENDING:   'PENDING',
  DISABLED:  'DISABLED',
};

export const USER_COLUMNS = {
  ID:                         'id',
  EMAIL:                      'email',
  PASSWORD:                   'password',
  ROLE:                       'role',
  FIRST_NAME:                 'first_name',
  LAST_NAME:                  'last_name',
  STATUS:                     'status',
  STATUS_CHANGED_AT:          'status_changed_at',
  STATUS_CHANGED_BY:          'status_changed_by',
  UPDATED_BY:                 'updated_by',
  DELETED_AT:                 'deleted_at',
  LAST_LOGIN_AT:              'last_login_at',
  REFRESH_TOKEN:              'refresh_token',
  PASSWORD_RESET_OTP:         'password_reset_otp',
  PASSWORD_RESET_OTP_EXPIRES: 'password_reset_otp_expires',
  CREATED_AT:                 'created_at',
  UPDATED_AT:                 'updated_at',
};

export const USER_DEFAULTS = {
  ROLE:      ROLES.TEAM_LEAD,
};

export const UserEntity = {
  table:   USER_TABLE,
  columns: USER_COLUMNS,
};
