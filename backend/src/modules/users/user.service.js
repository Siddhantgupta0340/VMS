import bcrypt from 'bcryptjs';
import userRepository from './user.repository.js';
import ApiError from '../../utils/ApiError.js';
import { USER_MESSAGES } from './user.constants.js';
import { UserEntity } from '../../zodSchema/index.js';
import { sanitizeUser } from '../../utils/sanitizeUser.js';

/**
 * @class UserService
 * @description Contains the business logic for user management operations.
 */
class UserService {
  /**
   * Creates a new user.
   * @param {object} userData - Data for the new user.
   * @returns {object} The created user, excluding sensitive fields.
   */
  async createUser(userData) {
    const { email, password, firstName, lastName, role } = userData;

    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw new ApiError(409, USER_MESSAGES.EMAIL_ALREADY_EXISTS);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await userRepository.createUser({
      [UserEntity.columns.EMAIL]: email,
      [UserEntity.columns.PASSWORD]: hashedPassword,
      [UserEntity.columns.FIRST_NAME]: firstName,
      [UserEntity.columns.LAST_NAME]: lastName,
      [UserEntity.columns.ROLE]: role,
    });

    return sanitizeUser(newUser);
  }

  /**
   * Retrieves a list of users with pagination and filtering.
   * @param {object} query - Query parameters for searching and pagination.
   * @returns {object} A list of users and pagination metadata.
   */
  async searchUsers(query) {
    return await userRepository.findAll(query);
  }

  /**
   * Retrieves a single user by their ID.
   * @param {string} userId - The ID of the user.
   * @returns {object} The user data, excluding sensitive fields.
   */
  async getUserById(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new ApiError(404, USER_MESSAGES.USER_NOT_FOUND);
    }
    return sanitizeUser(user);
  }

  /**
   * Updates a user's information.
   * @param {string} userId - The ID of the user to update.
   * @param {object} updateData - The data to update.
   * @returns {object} The updated user data.
   */
  async updateUser(userId, updateData) {
    await this.getUserById(userId); // Ensures user exists
    const mappedUpdateData = {};

    if (updateData.email !== undefined) {
      mappedUpdateData[UserEntity.columns.EMAIL] = updateData.email;
    }

    if (updateData.firstName !== undefined) {
      mappedUpdateData[UserEntity.columns.FIRST_NAME] = updateData.firstName;
    }

    if (updateData.lastName !== undefined) {
      mappedUpdateData[UserEntity.columns.LAST_NAME] = updateData.lastName;
    }

    if (updateData.role !== undefined) {
      mappedUpdateData[UserEntity.columns.ROLE] = updateData.role;
    }

    const updatedUser = await userRepository.updateUser(userId, mappedUpdateData);
    return sanitizeUser(updatedUser);
  }

  /**
   * Deletes a user (soft delete).
   * @param {string} userId - The ID of the user to delete.
   * @returns {string} A success message.
   */
  async deleteUser(userId) {
    await this.getUserById(userId); // Ensures user exists
    await userRepository.softDeleteUser(userId);
    return USER_MESSAGES.USER_DELETED;
  }

  /**
   * Toggles the active status of a user.
   * @param {string} userId - The ID of the user.
   * @param {boolean} isActive - The new active status.
   * @returns {object} The updated user data.
   */
  async toggleUserStatus(userId, isActive) {
    await this.getUserById(userId); // Ensures user exists
    const updatedUser = await userRepository.updateUser(userId, { [UserEntity.columns.IS_ACTIVE]: isActive });
    return sanitizeUser(updatedUser);
  }

  /**
   * Resets a user's password by an admin.
   * @param {string} userId - The ID of the user.
   * @param {string} newPassword - The replacement password.
   * @returns {string} A success message.
   */
  async adminResetPassword(userId, newPassword) {
    await this.getUserById(userId);

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await userRepository.updateUser(userId, {
      [UserEntity.columns.PASSWORD]: hashedPassword,
      [UserEntity.columns.PASSWORD_RESET_OTP]: null,
      [UserEntity.columns.PASSWORD_RESET_OTP_EXPIRES]: null,
    });

    return USER_MESSAGES.PASSWORD_RESET_SUCCESS;
  }
}

export default new UserService();
