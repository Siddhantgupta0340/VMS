import { ROLES } from '../../zodSchema/index.js';

/**
 * Permission mapping for the Vendor Management module.
 *
 * CREATE: Case Manager creates vendors
 * READ:   All authenticated roles can view vendors
 * REVIEW: Finance Head reviews (approve/reject/block) vendors — merged from former FINANCE_MANAGER
 */
export const VENDOR_PERMISSIONS = {
  CREATE: [ROLES.CASE_MANAGER],
  READ:   [ROLES.SUPER_ADMIN, ROLES.CASE_MANAGER, ROLES.TEAM_LEAD, ROLES.MANAGER, ROLES.FINANCE_HEAD],
  REVIEW: [ROLES.FINANCE_HEAD, ROLES.SUPER_ADMIN],
  REVIEW: [ROLES.FINANCE_HEAD],
};
