import ApiError from '../utils/ApiError.js';
import { AUTH_MESSAGES } from '../modules/auth/auth.constants.js';

/**
<<<<<<< HEAD
 * Middleware to authorize requests based on user roles.
 * @param {Array<string>} allowedRoles - An array of roles that are permitted to access the route.
 */
const authorize = (allowedRoles) => (req, res, next) => {
  try {
    if (!req.user || !req.user.role) {
      throw new ApiError(401, AUTH_MESSAGES.UNAUTHORIZED);
    }

    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      throw new ApiError(403, AUTH_MESSAGES.FORBIDDEN);
=======
 * Middleware to authorize requests based on user roles or permission keys.
 * @param {Array<string>|string} allowedAccess - Roles or permissions that are permitted to access the route.
 */
const authorize = (allowedAccess) => (req, res, next) => {
  try {
    if (!req.user || !req.user.role) {
      const error = new ApiError(401, AUTH_MESSAGES.UNAUTHORIZED);
      error.code = 'UNAUTHENTICATED';
      throw error;
    }

    const userRole = req.user.role;
    const userPermissions = req.user.permissions || [];
    const allowed = Array.isArray(allowedAccess) ? allowedAccess : [allowedAccess];

    const isAllowed =
      allowed.includes(userRole) ||
      allowed.some((permission) => userPermissions.includes(permission));

    if (!isAllowed) {
      const error = new ApiError(403, AUTH_MESSAGES.FORBIDDEN);
      error.code = 'FORBIDDEN';
      throw error;
>>>>>>> 870185c8e3ae31efe09445248cd7c7dc457a6b52
    }

    next();
  } catch (error) {
    next(error);
  }
};

<<<<<<< HEAD
export default authorize;
=======
export default authorize;
>>>>>>> 870185c8e3ae31efe09445248cd7c7dc457a6b52
