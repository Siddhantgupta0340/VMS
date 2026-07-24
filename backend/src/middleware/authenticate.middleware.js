import { verifyAccessToken } from '../utils/jwt.js';
import ApiError from '../utils/ApiError.js';
import { AUTH_MESSAGES } from '../modules/auth/auth.constants.js';
import { UserEntity } from '../zodSchema/index.js';

/**
 * Middleware to authenticate requests using JWT Access Tokens.
 */
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, AUTH_MESSAGES.UNAUTHORIZED);
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    if (!decoded) {
      throw new ApiError(401, AUTH_MESSAGES.TOKEN_EXPIRED);
    }

    // Map the dynamic database column keys from the token payload back to a standard req.user structure
    req.user = {
      id: decoded[UserEntity.columns.ID],
      role: decoded[UserEntity.columns.ROLE],
    };

    next();
  } catch (error) {
    next(error);
  }
};

export default authenticate;
