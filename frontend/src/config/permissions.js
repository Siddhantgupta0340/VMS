export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  CASE_MANAGER: "CASE_MANAGER",
  TEAM_LEAD: "TEAM_LEAD",
  MANAGER: "MANAGER",
  FINANCE_HEAD: "FINANCE_HEAD",
};

export const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: [
    "/dashboard",
    "/vendors",
    "/purchase-orders",
    "/invoices",
    "/payments",
    "/approvals",
    "/reports",
    "/users",
    "/settings",
  ],

  [ROLES.CASE_MANAGER]: [
    "/dashboard",
    "/vendors",
    "/purchase-orders",
    "/invoices",
  ],

  [ROLES.TEAM_LEAD]: [
    "/dashboard",
    "/approvals",
    "/invoices",
  ],

  [ROLES.MANAGER]: [
    "/dashboard",
    "/approvals",
    "/invoices",
  ],

  [ROLES.FINANCE_HEAD]: [
    "/dashboard",
    "/vendors",
    "/purchase-orders",
    "/payments",
    "/approvals",
    "/reports",
    "/invoices",
  ],
};