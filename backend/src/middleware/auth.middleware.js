import { verifyAccessToken } from '../utils/jwt.js';
import ApiError from '../utils/ApiError.js';
import { AUTH_MESSAGES } from '../modules/auth/auth.constants.js';
import { UserEntity } from '../zodSchema/index.js';

/**
 * Middleware to protect routes by verifying a JWT access token.
 * It checks for a 'Bearer' token in the Authorization header, verifies it,
 * and attaches the user payload to `req.user`.
 *
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 * @param {import('express').NextFunction} next - The next middleware function.
 */
export const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, AUTH_MESSAGES.UNAUTHORIZED);
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    if (!decoded) {
      // verifyAccessToken should throw on its own, but this is a safeguard.
      throw new ApiError(401, AUTH_MESSAGES.TOKEN_EXPIRED);
    }

    // Attach user info to the request object
    req.user = {
      id: decoded[UserEntity.columns.ID],
      role: decoded[UserEntity.columns.ROLE],
    };

    next();
  } catch (error) {
    // Pass JWT-related errors (like TokenExpiredError) to the central error handler
    if (error.name === 'TokenExpiredError') {
      next(new ApiError(401, AUTH_MESSAGES.TOKEN_EXPIRED));
    } else {
      next(error);
    }
  }
};