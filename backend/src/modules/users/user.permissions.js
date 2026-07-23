<<<<<<< HEAD
import { ROLES } from '../../zodSchema/index.js';
=======
import { PERMISSION_KEYS } from '../auth/role-permissions.js';
>>>>>>> 870185c8e3ae31efe09445248cd7c7dc457a6b52

/**
 * Permission mapping for the User Management module.
 */
export const USER_PERMISSIONS = {
<<<<<<< HEAD
  MANAGE: [ROLES.SUPER_ADMIN],
};
=======
  MANAGE: [PERMISSION_KEYS.MANAGE_USERS],
  DELETE: [PERMISSION_KEYS.DELETE_USERS],
  DEACTIVATE: [PERMISSION_KEYS.DEACTIVATE_USERS],
  RESTORE: [PERMISSION_KEYS.RESTORE_USERS],
};
>>>>>>> 870185c8e3ae31efe09445248cd7c7dc457a6b52
