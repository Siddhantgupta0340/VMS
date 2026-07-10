import { ROLES } from '../../zodSchema/index.js';

/**
 * Permission mapping for the User Management module.
 */
export const USER_PERMISSIONS = {
  MANAGE: [ROLES.SUPER_ADMIN],
};