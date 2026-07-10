import {
  LayoutDashboard,
  Building2,
  ShoppingCart,
  Receipt,
  Wallet,
  BadgeCheck,
  BarChart3,
  Users,
  Settings,
} from "lucide-react";

import { ROLES } from "../config/permissions";

export const navigation = [
  {
    section: "MAIN",
    items: [
      {
        title: "Dashboard",
        icon: LayoutDashboard,
        path: "/dashboard",
        roles: [
          ROLES.SUPER_ADMIN,
          ROLES.CASE_MANAGER,
          ROLES.TEAM_LEAD,
          ROLES.MANAGER,
          ROLES.FINANCE_HEAD,
        ],
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
        roles: [
          ROLES.SUPER_ADMIN,
          ROLES.CASE_MANAGER,
          ROLES.FINANCE_HEAD,
        ],
      },

      {
        title: "Purchase Orders",
        icon: ShoppingCart,
        path: "/purchase-orders",
        roles: [
          ROLES.SUPER_ADMIN,
          ROLES.CASE_MANAGER,
          ROLES.FINANCE_HEAD,
        ],
      },

      {
        title: "Invoices",
        icon: Receipt,
        path: "/invoices",
        roles: [
          ROLES.SUPER_ADMIN,
          ROLES.CASE_MANAGER,
          ROLES.TEAM_LEAD,
          ROLES.MANAGER,
          ROLES.FINANCE_HEAD,
        ],
      },

      // {
      //   title: "Approvals",
      //   icon: BadgeCheck,
      //   path: "/approvals",
      //   roles: [
      //     ROLES.SUPER_ADMIN,
      //     ROLES.TEAM_LEAD,
      //     ROLES.MANAGER,
      //     ROLES.FINANCE_HEAD,
      //   ],
      // },

      {
        title: "Payments",
        icon: Wallet,
        path: "/payments",
        roles: [
          ROLES.SUPER_ADMIN,
          ROLES.FINANCE_HEAD,
        ],
      },
    ],
  },

  {
    section: "ADMINISTRATION",
    items: [
      {
        title: "Reports",
        icon: BarChart3,
        path: "/reports",
        roles: [
          ROLES.SUPER_ADMIN,
          ROLES.FINANCE_HEAD,
        ],
      },

      {
        title: "Users",
        icon: Users,
        path: "/users",
        roles: [
          ROLES.SUPER_ADMIN,
        ],
      },

      {
        title: "Settings",
        icon: Settings,
        path: "/settings",
        roles: [
          ROLES.SUPER_ADMIN,
        ],
      },
    ],
  },
];