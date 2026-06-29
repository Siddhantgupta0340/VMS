import prisma from '../../config/prisma.js';
import { UserEntity } from '../../zodSchema/index.js';

class UserRepository {
  /**
   * @class UserRepository
   * @description A data access layer for interacting with the User model in the database.
   */

  sanitizeUpdateData(updateData) {
    if (!updateData || typeof updateData !== 'object' || Array.isArray(updateData)) {
      throw new Error('Update data must be a non-array object');
    }

    const normalizedData = Object.fromEntries(
      Object.entries(updateData).filter(([, value]) => value !== undefined)
    );

    if (Object.keys(normalizedData).length === 0) {
      throw new Error('No valid fields provided for update');
    }

    const validColumns = new Set(Object.values(UserEntity.columns));
    const invalidKeys = Object.keys(normalizedData).filter((key) => !validColumns.has(key));

    if (invalidKeys.length > 0) {
      throw new Error(`Invalid user update field(s): ${invalidKeys.join(', ')}`);
    }

    return normalizedData;
  }

  /**
   * Fetch all users with filters, search, and pagination.
   */
  async findAll({ search, role, isActive, skip = 0, take = 10 }) {
    const where = {
      [UserEntity.columns.DELETED_AT]: null, // Exclude soft-deleted users
      ...(role && { [UserEntity.columns.ROLE]: role }),
      ...(isActive !== undefined && { [UserEntity.columns.IS_ACTIVE]: isActive === 'true' }),
      ...(search && {
        OR: [
          { [UserEntity.columns.FIRST_NAME]: { contains: search, mode: 'insensitive' } },
          { [UserEntity.columns.LAST_NAME]: { contains: search, mode: 'insensitive' } },
          { [UserEntity.columns.EMAIL]: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(take),
        orderBy: { [UserEntity.columns.CREATED_AT]: 'desc' },
        select: {
          [UserEntity.columns.ID]: true,
          [UserEntity.columns.EMAIL]: true,
          [UserEntity.columns.FIRST_NAME]: true,
          [UserEntity.columns.LAST_NAME]: true,
          [UserEntity.columns.ROLE]: true,
          [UserEntity.columns.IS_ACTIVE]: true,
          [UserEntity.columns.LAST_LOGIN_AT]: true,
          [UserEntity.columns.CREATED_AT]: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return { users, total };
  }

  /**
   * Find a single user by ID, excluding soft-deleted records.
   */
  async findById(id) {
    return await prisma.user.findFirst({
      where: {
        [UserEntity.columns.ID]: id,
        [UserEntity.columns.DELETED_AT]: null,
      },
    });
  }

  /**
   * Find a single user by email, including soft-deleted ones for auth checks.
   */
  async findByEmail(email) {
    return await prisma.user.findUnique({
      where: { [UserEntity.columns.EMAIL]: email },
    });
  }

  /**
   * Find a user by their refresh token.
   */
  async findByRefreshToken(refreshToken) {
    return await prisma.user.findFirst({
      where: { [UserEntity.columns.REFRESH_TOKEN]: refreshToken },
    });
  }

  async findByResetOtp(email, otp) {
    return await prisma.user.findFirst({
      where: {
        [UserEntity.columns.EMAIL]: email,
        [UserEntity.columns.PASSWORD_RESET_OTP]: otp,
        [UserEntity.columns.DELETED_AT]: null,
      },
    });
  }

  /**
   * Create a new user.
   */
  async createUser(userData) {
    return await prisma.user.create({
      data: userData,
    });
  }

  /**
   * Update a user's details by their ID.
   */
  async updateUser(id, updateData) {
    const safeUpdateData = this.sanitizeUpdateData(updateData);

    if (process.env.NODE_ENV !== 'production') {
      console.debug('UserEntity.columns =', UserEntity.columns);
      console.debug('Update Data =', safeUpdateData);
      console.debug('Keys =', Object.keys(safeUpdateData));
    }

    return await prisma.user.update({
      where: { [UserEntity.columns.ID]: id },
      data: safeUpdateData,
    });
  }

  /**
   * Soft delete a user by their ID.
   */
  async softDeleteUser(id) {
    return await prisma.user.update({
      where: { [UserEntity.columns.ID]: id },
      data: {
        [UserEntity.columns.DELETED_AT]: new Date(),
        [UserEntity.columns.IS_ACTIVE]: false, // Also deactivate on delete
        [UserEntity.columns.REFRESH_TOKEN]: null, // Invalidate session
      },
    });
  }

  async countUsers() {
    return await prisma.user.count();
  }
}

export default new UserRepository();
