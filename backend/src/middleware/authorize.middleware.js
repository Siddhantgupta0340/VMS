import ApiError from '../utils/ApiError.js';
import { AUTH_MESSAGES } from '../modules/auth/auth.constants.js';

/**
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
    }

    next();
  } catch (error) {
    next(error);
  }
};

export default authorize;
