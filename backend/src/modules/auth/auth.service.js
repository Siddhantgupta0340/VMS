import bcrypt from 'bcryptjs';
import userRepository from '../users/user.repository.js'; // Corrected to point to the authoritative repository
import { generateAuthTokens, verifyRefreshToken } from '../../utils/jwt.js';
import { AUTH_MESSAGES } from './auth.constants.js';
import ApiError from '../../utils/ApiError.js'; // Assuming ApiError utility exists
import { v4 as uuidv4 } from 'uuid'; // For generating password reset tokens
import { UserEntity } from '../../zodSchema/index.js';
import sendEmail from '../../utils/email.js';
import { sanitizeUser } from '../../utils/sanitizeUser.js';

/**
 * @class AuthService
 * @description Contains business logic for authentication, including user login, token management, and password recovery.
 */
class AuthService {
  /**
   * Authenticates a user and generates JWT and refresh tokens.
   * @param {string} email - User's email.
   * @param {string} password - User's password.
   * @returns {object} - User data and tokens.
   * @throws {ApiError} If authentication fails.
   */
  async login(email, password) {
    const user = await userRepository.findByEmail(email);

    const passwordField = UserEntity.columns.PASSWORD;
    if (!user || !(await bcrypt.compare(password, user[passwordField]))) {
      throw new ApiError(401, AUTH_MESSAGES.INVALID_CREDENTIALS);
    }

    // Generate tokens
    const idField = UserEntity.columns.ID;
    const roleField = UserEntity.columns.ROLE;
    const { accessToken, refreshToken } = generateAuthTokens(user[idField], user[roleField]);

    // Store refresh token in DB
    await userRepository.updateUser(user[idField], { 
      [UserEntity.columns.REFRESH_TOKEN]: refreshToken, 
      [UserEntity.columns.LAST_LOGIN_AT]: new Date() 
    });

    return { user: sanitizeUser(user), accessToken, refreshToken };
  }

  /**
   * Invalidates a user's refresh token, effectively logging them out.
   * @param {string} userId - ID of the user to log out.
   * @returns {string} - Success message.
   * @throws {ApiError} If user not found.
   */
  async logout(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new ApiError(404, AUTH_MESSAGES.USER_NOT_FOUND);
    }

    await userRepository.updateUser(userId, { [UserEntity.columns.REFRESH_TOKEN]: null });
    return AUTH_MESSAGES.LOGOUT_SUCCESS;
  }

  /**
   * Refreshes access and refresh tokens using an existing refresh token.
   * @param {string} oldRefreshToken - The refresh token to be verified.
   * @returns {object} - New access token and refresh token.
   * @throws {ApiError} If refresh token is invalid or expired.
   */
  async refreshToken(oldRefreshToken) {
    const decoded = verifyRefreshToken(oldRefreshToken);

    const idField = UserEntity.columns.ID;
    if (!decoded || !decoded[idField]) {
      throw new ApiError(401, AUTH_MESSAGES.UNAUTHORIZED);
    }

    const user = await userRepository.findByRefreshToken(oldRefreshToken);

    if (!user || user[idField] !== decoded[idField]) {
      throw new ApiError(401, AUTH_MESSAGES.UNAUTHORIZED);
    }

    const roleField = UserEntity.columns.ROLE;
    const { accessToken, refreshToken: newRefreshToken } = generateAuthTokens(user[idField], user[roleField]);

    await userRepository.updateUser(user[idField], { [UserEntity.columns.REFRESH_TOKEN]: newRefreshToken });

    return { accessToken, refreshToken: newRefreshToken };
  }

  /**
   * Retrieves a user's profile information.
   * @param {string} userId - ID of the user.
   * @returns {object} - User profile data.
   * @throws {ApiError} If user not found.
   */
  async getProfile(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new ApiError(404, AUTH_MESSAGES.USER_NOT_FOUND);
    }
    return sanitizeUser(user);
  }

  /**
   * Allows a user to change their password.
   * @param {string} userId - ID of the user.
   * @param {string} oldPassword - User's current password.
   * @param {string} newPassword - User's new password.
   * @returns {string} - Success message.
   * @throws {ApiError} If old password is incorrect or user not found.
   */
  async changePassword(userId, oldPassword, newPassword) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new ApiError(404, AUTH_MESSAGES.USER_NOT_FOUND);
    }

    const passwordField = UserEntity.columns.PASSWORD;
    if (!(await bcrypt.compare(oldPassword, user[passwordField]))) {
      throw new ApiError(401, AUTH_MESSAGES.INVALID_CREDENTIALS);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await userRepository.updateUser(userId, { [UserEntity.columns.PASSWORD]: hashedPassword });

    return AUTH_MESSAGES.PASSWORD_CHANGED;
  }

  /**
   * Generates a password reset token and saves it to the user record.
   * @param {string} email - The email of the user who forgot their password.
   * @returns {string} - Success message (generic to prevent enumeration).
   */
  async forgotPassword(email) {
    const user = await userRepository.findByEmail(email); 

    if (user) {
      const resetToken = uuidv4();
      const resetExpires = new Date(Date.now() + 3600000); // Token expires in 1 hour

      const idField = UserEntity.columns.ID;
      await userRepository.updateUser(user[idField], {
        [UserEntity.columns.PASSWORD_RESET_TOKEN]: resetToken,
        [UserEntity.columns.PASSWORD_RESET_EXPIRES]: resetExpires,
      });

      // Construct the reset URL (ensure FRONTEND_URL is in your .env file)
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

      const emailHtml = `
        <h1>Password Reset Request</h1>
        <p>You are receiving this email because you (or someone else) has requested the reset of a password. Please click on the following link, or paste this into your browser to complete the process:</p>
        <a href="${resetUrl}" target="_blank">${resetUrl}</a>
        <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
      `;

      await sendEmail({
        to: user[UserEntity.columns.EMAIL],
        subject: 'VMS - Password Reset',
        html: emailHtml,
      });
    }

    return AUTH_MESSAGES.FORGOT_PASSWORD_SENT;
  }

  /**
   * Verifies the reset token and updates the user's password.
   * @param {string} token - The password reset token.
   * @param {string} newPassword - The new password.
   * @returns {string} - Success message.
   * @throws {ApiError} If token is invalid or expired.
   */
  async resetPassword(token, newPassword) {
    const user = await userRepository.findByResetToken(token);

    const expiresField = UserEntity.columns.PASSWORD_RESET_EXPIRES;
    const idField = UserEntity.columns.ID;
    if (!user || !user[expiresField] || user[expiresField] < new Date()) {
      throw new ApiError(400, AUTH_MESSAGES.INVALID_RESET_TOKEN);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await userRepository.updateUser(user[idField], {
      [UserEntity.columns.PASSWORD]: hashedPassword,
      [UserEntity.columns.PASSWORD_RESET_TOKEN]: null,
      [UserEntity.columns.PASSWORD_RESET_EXPIRES]: null,
    });

    return AUTH_MESSAGES.PASSWORD_RESET_SUCCESS;
  }

  /**
   * Forces a password reset for a user (Administrative action).
   * @param {string} userId - The ID of the user.
   * @param {string} newPassword - The new password to set.
   * @returns {string} - Success message.
   * @throws {ApiError} If user is not found.
   */
  async adminResetPassword(userId, newPassword) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new ApiError(404, AUTH_MESSAGES.USER_NOT_FOUND);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await userRepository.updateUser(userId, {
      [UserEntity.columns.PASSWORD]: hashedPassword,
      [UserEntity.columns.PASSWORD_RESET_TOKEN]: null,
      [UserEntity.columns.PASSWORD_RESET_EXPIRES]: null,
    });

    return AUTH_MESSAGES.PASSWORD_RESET_SUCCESS;
  }
}

export default new AuthService();