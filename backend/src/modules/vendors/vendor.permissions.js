<<<<<<< HEAD
import { ROLES } from '../../zodSchema/index.js';
=======
import { PERMISSION_KEYS } from '../auth/role-permissions.js';
>>>>>>> origin/main

/**
 * Permission mapping for the Vendor Management module.
 *
 * CREATE: Case Manager creates vendors
 * READ:   All authenticated roles can view vendors
 * REVIEW: Finance Head reviews (approve/reject/block) vendors — merged from former FINANCE_MANAGER
 */
export const VENDOR_PERMISSIONS = {
<<<<<<< HEAD
  CREATE: [ROLES.CASE_MANAGER],
  READ:   [ROLES.SUPER_ADMIN, ROLES.CASE_MANAGER, ROLES.TEAM_LEAD, ROLES.MANAGER, ROLES.FINANCE_HEAD],
  REVIEW: [ROLES.FINANCE_HEAD],
=======
  CREATE: [
    PERMISSION_KEYS.MANAGE_VENDORS,
  ],
  READ:   [PERMISSION_KEYS.VIEW_VENDORS],
  REVIEW: [PERMISSION_KEYS.REVIEW_VENDORS],
>>>>>>> origin/main
};
