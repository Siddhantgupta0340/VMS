import { verifyAccessToken } from '../utils/jwt.js';
import ApiError from '../utils/ApiError.js';
import { AUTH_MESSAGES } from '../modules/auth/auth.constants.js';
import { UserEntity } from '../zodSchema/index.js';

<<<<<<< HEAD
=======
const authError = (statusCode, message, code) => {
  const error = new ApiError(statusCode, message);
  error.code = code;
  return error;
};

>>>>>>> origin/main
/**
 * Middleware to authenticate requests using JWT Access Tokens.
 */
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
<<<<<<< HEAD
      throw new ApiError(401, AUTH_MESSAGES.UNAUTHORIZED);
=======
      throw authError(401, AUTH_MESSAGES.UNAUTHORIZED, 'UNAUTHENTICATED');
>>>>>>> origin/main
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    if (!decoded) {
<<<<<<< HEAD
      throw new ApiError(401, AUTH_MESSAGES.TOKEN_EXPIRED);
=======
      throw authError(401, AUTH_MESSAGES.TOKEN_EXPIRED, 'TOKEN_EXPIRED');
>>>>>>> origin/main
    }

    // Map the dynamic database column keys from the token payload back to a standard req.user structure
    req.user = {
      id: decoded[UserEntity.columns.ID],
      role: decoded[UserEntity.columns.ROLE],
<<<<<<< HEAD
=======
      permissions: decoded.permissions || [],
>>>>>>> origin/main
    };

    next();
  } catch (error) {
<<<<<<< HEAD
=======
    if (error.name === 'TokenExpiredError') {
      next(authError(401, AUTH_MESSAGES.TOKEN_EXPIRED, 'TOKEN_EXPIRED'));
      return;
    }
>>>>>>> origin/main
    next(error);
  }
};

<<<<<<< HEAD
export default authenticate;
=======
export default authenticate;
>>>>>>> origin/main
