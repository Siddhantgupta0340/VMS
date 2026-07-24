import { verifyAccessToken } from '../utils/jwt.js';
import ApiError from '../utils/ApiError.js';
import { AUTH_MESSAGES } from '../modules/auth/auth.constants.js';
import { UserEntity } from '../zodSchema/index.js';
import prisma from '../config/prisma.js';

/**
 * Middleware to protect routes by verifying a JWT access token.
 *
 * - Reads the Bearer token from the Authorization header.
 * - Verifies the JWT signature and expiry.
 * - Fetches the user record from the database to attach a rich `req.user` object.
 * - Rejects requests where the user is deleted or inactive.
 *
 * req.user shape:
 * {
 *   id: string,
 *   email: string,
 *   role: string,
 *   first_name: string | null,
 *   last_name: string | null,
 *   is_active: boolean,
 * }
 */
export const protect = async (req, res, next) => {
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

    const userId = decoded[UserEntity.columns.ID];

    // Fetch fresh user data from DB on every request for security and completeness.
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        first_name: true,
        last_name: true,
        status: true,
        deleted_at: true,
      },
    });

    if (!user || user.deleted_at !== null) {
      throw new ApiError(401, AUTH_MESSAGES.UNAUTHORIZED);
    }

    if (user.status !== 'ACTIVE') {
      const statusText = user.status ? user.status.toLowerCase() : 'inactive';
      throw new ApiError(403, `Your account is ${statusText}. Please contact an administrator.`);
    }

    // Attach full user context to the request object.
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      first_name: user.first_name,
      last_name: user.last_name,
      status: user.status || 'ACTIVE',
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      next(new ApiError(401, AUTH_MESSAGES.TOKEN_EXPIRED));
    } else {
      next(error);
    }
  }
};
