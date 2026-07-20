import {
  LayoutDashboard,
  Building2,
  ShoppingCart,
  Receipt,
  GitCompare,
  ClipboardCheck,
  Wallet,
  Users,
  Bell,
  FileBarChart2,
  History,
} from "lucide-react";

import { PERMISSIONS } from "../config/permissions";
import { ROLES } from "../config/permissions";

export const navigation = [
  {
    section: "MAIN",
    items: [
      {
        title: "Dashboard",
        icon: LayoutDashboard,
        path: "/dashboard",
        permission: PERMISSIONS.VIEW_DASHBOARD,
      },
    ],
  },

  {
    section: "PROCUREMENT",
    items: [
      {
        title: "Vendors",
        icon: Building2,
        path: "/vendors",
        pathByRole: {
          [ROLES.FINANCE_HEAD]: "/finance-head/vendors",
        },
        activePaths: ["/vendors", "/finance-head/vendors"],
        permission: PERMISSIONS.VIEW_VENDORS,
        excludedRoles: [ROLES.MANAGER],
      },

      {
        title: "Purchase Orders",
        icon: ShoppingCart,
        path: "/purchase-orders",
        permission: PERMISSIONS.VIEW_PURCHASE_ORDERS,
      },

      {
        title: "Receipt Documents",
        icon: ClipboardCheck,
        path: "/receipt-documents",
        permission: PERMISSIONS.VIEW_THREE_WAY_MATCHING,
        allowedRoles: [ROLES.CASE_MANAGER, ROLES.SUPER_ADMIN],
      },

      {
        title: "Invoices",
        icon: Receipt,
        path: "/invoices",
        permission: PERMISSIONS.VIEW_INVOICES,
        excludedRoles: [ROLES.FINANCE_HEAD, ROLES.MANAGER],
      },

      {
        title: "Three-Way Matching",
        icon: GitCompare,
        path: "/three-way-matching",
        permission: PERMISSIONS.VIEW_THREE_WAY_MATCHING,
        allowedRoles: [ROLES.CASE_MANAGER, ROLES.SUPER_ADMIN],
      },

      {
        title: "Payments",
        titleByRole: {
          [ROLES.TEAM_LEAD]: "Payment Approvals",
          [ROLES.MANAGER]: "Payment Approvals",
          [ROLES.FINANCE_HEAD]: "Payment Approvals",
        },
        icon: Wallet,
        path: "/payments",
        permission: PERMISSIONS.VIEW_PAYMENTS,
      },
    ],
  },

  {
    // section: "SUPER ADMIN",
    items: [
      {
        title: "Reports",
        icon: FileBarChart2,
        path: "/super-admin/reports",
        permission: PERMISSIONS.VIEW_VENDOR_REPORTS,
      },
      {
        title: "Audit Logs",
        icon: History,
        path: "/audit-logs",
        permission: PERMISSIONS.VIEW_AUDIT_LOGS,
      },
    ],
  },

  {
    // section: "ADMINISTRATION",
    items: [
      // {
      //   title: "Reports",
      //   icon: BarChart3,
      //   path: "/reports",
      //   permission: PERMISSIONS.VIEW_REPORTS,
      // },

      {
        title: "Notifications",
        icon: Bell,
        path: "/notifications",
        permission: PERMISSIONS.VIEW_NOTIFICATIONS,
      },

      {
        title: "Users",
        icon: Users,
        path: "/users",
        permission: PERMISSIONS.MANAGE_USERS,
      },
    ],
  },
];
