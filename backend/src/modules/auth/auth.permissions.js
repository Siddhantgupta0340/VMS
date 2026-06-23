import { ROLES } from '../../zodSchema/index.js';
import { USER_PERMISSIONS } from '../users/user.permissions.js';

/**
 * Permission mapping for the Authentication module.
 * In a full system, this would also include permissions for vendors, POs, etc.
 */
export const PERMISSIONS = {
  AUTH: {
    GET_PROFILE: [ROLES.SUPER_ADMIN, ROLES.CASE_MANAGER, ROLES.FINANCE_MANAGER, ROLES.L1, ROLES.L2, ROLES.L3],
    CHANGE_PASSWORD: [ROLES.SUPER_ADMIN, ROLES.CASE_MANAGER, ROLES.FINANCE_MANAGER, ROLES.L1, ROLES.L2, ROLES.L3],
    LOGOUT: [ROLES.SUPER_ADMIN, ROLES.CASE_MANAGER, ROLES.FINANCE_MANAGER, ROLES.L1, ROLES.L2, ROLES.L3],
  },
  USER: USER_PERMISSIONS,
  ADMIN: {
    ALL: [ROLES.SUPER_ADMIN],
  }
};

export default PERMISSIONS;