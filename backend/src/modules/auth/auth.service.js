import bcrypt from "bcryptjs";
import userRepository from "../users/user.repository.js";
<<<<<<< HEAD
import { generateAuthTokens, verifyRefreshToken } from "../../utils/jwt.js";
=======
import {
  generateAuthTokens,
  generatePasswordChangeToken,
  verifyPasswordChangeToken,
  verifyRefreshToken,
} from "../../utils/jwt.js";
>>>>>>> 870185c8e3ae31efe09445248cd7c7dc457a6b52
import { AUTH_MESSAGES } from "./auth.constants.js";
import ApiError from "../../utils/ApiError.js";
import { UserEntity } from "../../zodSchema/index.js";
import sendEmail from "../../utils/email.js";
import { sanitizeUser } from "../../utils/sanitizeUser.js";
<<<<<<< HEAD
=======
import { attachPermissions } from "./role-permissions.js";
import prisma from "../../config/prisma.js";
import { USER_ACCOUNT_STATUS } from "../users/user-status.constants.js";
import {
  ACTIVATION_RESEND_COOLDOWN_MINUTES,
  ACTIVATION_TOKEN_TTL_MINUTES,
  generateActivationToken,
  hashActivationToken,
  sendActivationEmail,
} from "./onboarding.service.js";
import notificationService from "../notifications/notification.service.js";

const GENERIC_ACTIVATION_MESSAGE = 'If the account is eligible, an activation email has been sent.';
const MAX_FAILED_LOGIN_ATTEMPTS = Number(process.env.MAX_FAILED_LOGIN_ATTEMPTS || 5);
const LOGIN_LOCK_MINUTES = Number(process.env.LOGIN_LOCK_MINUTES || 15);

const isActiveAccount = (user) =>
  user?.status === USER_ACCOUNT_STATUS.ACTIVE && !user.deleted_at;

const isActivationValid = (user) => {
  if (!user) return { valid: false, reason: 'invalid' };
  if (user.activation_token_used_at || user.password_set_at || user.activated_at) {
    return { valid: false, reason: 'used' };
  }
  if (!user.activation_token_hash) return { valid: false, reason: 'invalid' };
  if (!user.activation_token_expires_at || user.activation_token_expires_at < new Date()) {
    return { valid: false, reason: 'expired' };
  }
  if (!isActiveAccount(user)) return { valid: false, reason: 'inactive' };
  return { valid: true, reason: 'valid' };
};
>>>>>>> 870185c8e3ae31efe09445248cd7c7dc457a6b52

class AuthService {
  /**
   * LOGIN
   */
  async login(email, password) {
<<<<<<< HEAD
    const user = await userRepository.findByEmail(email);
=======
    const normalizedEmail = email.toLowerCase().trim();
    const user = await userRepository.findByEmail(normalizedEmail);
>>>>>>> 870185c8e3ae31efe09445248cd7c7dc457a6b52

    if (!user) {
      throw new ApiError(401, AUTH_MESSAGES.INVALID_CREDENTIALS);
    }

<<<<<<< HEAD
=======
    if (!isActiveAccount(user)) {
      throw new ApiError(401, AUTH_MESSAGES.INVALID_CREDENTIALS);
    }

    if (user.locked_until && user.locked_until > new Date()) {
      throw new ApiError(423, 'Account is temporarily locked. Try again later.');
    }

    if (!user.activated_at && !user.must_change_password) {
      throw new ApiError(403, 'Account activation is required before login.');
    }

    if (!user[UserEntity.columns.PASSWORD]) {
      throw new ApiError(403, 'Account activation is required before login.');
    }

>>>>>>> 870185c8e3ae31efe09445248cd7c7dc457a6b52
    const passwordField = UserEntity.columns.PASSWORD;

    const isMatch = await bcrypt.compare(password, user[passwordField]);

    if (!isMatch) {
<<<<<<< HEAD
      throw new ApiError(401, AUTH_MESSAGES.INVALID_CREDENTIALS);
    }

=======
      const failedAttempts = (user.failed_login_attempts || 0) + 1;
      const lockData = failedAttempts >= MAX_FAILED_LOGIN_ATTEMPTS
        ? { [UserEntity.columns.LOCKED_UNTIL]: new Date(Date.now() + LOGIN_LOCK_MINUTES * 60 * 1000) }
        : {};
      await userRepository.updateUser(user[UserEntity.columns.ID], {
        [UserEntity.columns.FAILED_LOGIN_ATTEMPTS]: failedAttempts,
        ...lockData,
      });
      throw new ApiError(401, AUTH_MESSAGES.INVALID_CREDENTIALS);
    }

    if (user.must_change_password) {
      if (!user.temporary_password_expires_at || user.temporary_password_expires_at < new Date()) {
        throw new ApiError(403, 'Temporary password has expired. Contact an administrator for new credentials.');
      }

      await userRepository.updateUser(user[UserEntity.columns.ID], {
        [UserEntity.columns.FAILED_LOGIN_ATTEMPTS]: 0,
        [UserEntity.columns.LOCKED_UNTIL]: null,
      });

      return {
        user: attachPermissions(sanitizeUser(user)),
        requiresPasswordChange: true,
        passwordChangeToken: generatePasswordChangeToken(user[UserEntity.columns.ID]),
      };
    }

    if (!user.password_set_at) {
      throw new ApiError(403, 'Account activation is required before login.');
    }

>>>>>>> 870185c8e3ae31efe09445248cd7c7dc457a6b52
    const idField = UserEntity.columns.ID;
    const roleField = UserEntity.columns.ROLE;

    const { accessToken, refreshToken } = generateAuthTokens(
      user[idField],
      user[roleField],
    );

    await userRepository.updateUser(user[idField], {
      [UserEntity.columns.REFRESH_TOKEN]: refreshToken,
      [UserEntity.columns.LAST_LOGIN_AT]: new Date(),
<<<<<<< HEAD
    });

    return {
      user: sanitizeUser(user),
=======
      [UserEntity.columns.FAILED_LOGIN_ATTEMPTS]: 0,
      [UserEntity.columns.LOCKED_UNTIL]: null,
    });

    await prisma.auditLog.create({
      data: {
        entity_type: 'user',
        entity_id: user[idField],
        action: 'login_success',
        performed_by_id: user[idField],
        remarks: `User logged in with email ${normalizedEmail}`,
      },
    });

    return {
      user: attachPermissions(sanitizeUser(user)),
>>>>>>> 870185c8e3ae31efe09445248cd7c7dc457a6b52
      accessToken,
      refreshToken,
    };
  }

<<<<<<< HEAD
=======
  async validateActivationToken(token) {
    const tokenHash = hashActivationToken(token);
    const user = await userRepository.findByActivationTokenHash(tokenHash);
    const result = isActivationValid(user);
    if (!result.valid) {
      throw new ApiError(400, `Activation token is ${result.reason}.`);
    }
    return {
      valid: true,
      user: {
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        employeeId: user.employee_id,
        role: user.role,
      },
      expiresAt: user.activation_token_expires_at,
    };
  }

  async setPassword(token, newPassword) {
    const tokenHash = hashActivationToken(token);
    const user = await userRepository.findByActivationTokenHash(tokenHash);
    const result = isActivationValid(user);
    if (!result.valid) {
      throw new ApiError(400, `Activation token is ${result.reason}.`);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const now = new Date();

    const updatedUser = await userRepository.updateUser(user.id, {
      [UserEntity.columns.PASSWORD]: hashedPassword,
      [UserEntity.columns.ACTIVATION_TOKEN_USED_AT]: now,
      [UserEntity.columns.ACTIVATION_TOKEN_HASH]: null,
      [UserEntity.columns.ACTIVATION_TOKEN_EXPIRES_AT]: null,
      [UserEntity.columns.ACTIVATED_AT]: now,
      [UserEntity.columns.PASSWORD_SET_AT]: now,
      [UserEntity.columns.FAILED_LOGIN_ATTEMPTS]: 0,
      [UserEntity.columns.LOCKED_UNTIL]: null,
    });

    await prisma.auditLog.create({
      data: {
        entity_type: 'user',
        entity_id: user.id,
        action: 'account_activated',
        performed_by_id: user.id,
        remarks: 'User completed account activation and password setup.',
      },
    });

    return attachPermissions(sanitizeUser(updatedUser));
  }

  async activateAccount(token, newPassword) {
    return this.setPassword(token, newPassword);
  }

  async resendActivation(email, requester = null, ipAddress = null, userAgent = null) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await userRepository.findByEmail(normalizedEmail);

    if (!user || !isActiveAccount(user) || user.activated_at || user.password_set_at) {
      return GENERIC_ACTIVATION_MESSAGE;
    }

    if (user.activation_last_sent_at) {
      const nextAllowed = new Date(user.activation_last_sent_at.getTime() + ACTIVATION_RESEND_COOLDOWN_MINUTES * 60 * 1000);
      if (nextAllowed > new Date()) {
        return GENERIC_ACTIVATION_MESSAGE;
      }
    }

    const token = generateActivationToken();
    const now = new Date();
    const expiresAt = new Date(Date.now() + ACTIVATION_TOKEN_TTL_MINUTES * 60 * 1000);
    const updatedUser = await userRepository.updateUser(user.id, {
      [UserEntity.columns.ACTIVATION_TOKEN_HASH]: hashActivationToken(token),
      [UserEntity.columns.ACTIVATION_TOKEN_EXPIRES_AT]: expiresAt,
      [UserEntity.columns.ACTIVATION_TOKEN_USED_AT]: null,
      [UserEntity.columns.ACTIVATION_LAST_SENT_AT]: now,
      [UserEntity.columns.ACTIVATION_SENT_AT]: user.activation_sent_at || now,
      [UserEntity.columns.ACTIVATION_RESEND_COUNT]: (user.activation_resend_count || 0) + 1,
    });

    await sendActivationEmail({ user: updatedUser, creator: requester, token });
    await prisma.auditLog.create({
      data: {
        entity_type: 'user',
        entity_id: user.id,
        action: 'activation_invitation_resent',
        performed_by_id: requester?.id || null,
        remarks: `Activation invitation resent to ${normalizedEmail}`,
        ip_address: ipAddress,
        user_agent: userAgent,
      },
    });

    return GENERIC_ACTIVATION_MESSAGE;
  }

>>>>>>> 870185c8e3ae31efe09445248cd7c7dc457a6b52
  /**
   * LOGOUT
   */
  async logout(userId) {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new ApiError(404, AUTH_MESSAGES.USER_NOT_FOUND);
    }

    await userRepository.updateUser(userId, {
      [UserEntity.columns.REFRESH_TOKEN]: null,
    });

    return AUTH_MESSAGES.LOGOUT_SUCCESS;
  }

  /**
   * REFRESH TOKEN
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

    const { accessToken, refreshToken } = generateAuthTokens(
      user[idField],
      user[roleField],
    );

    await userRepository.updateUser(user[idField], {
      [UserEntity.columns.REFRESH_TOKEN]: refreshToken,
    });

    return { accessToken, refreshToken };
  }

  /**
   * GET PROFILE
   */
  async getProfile(userId) {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new ApiError(404, AUTH_MESSAGES.USER_NOT_FOUND);
    }

<<<<<<< HEAD
    return sanitizeUser(user);
=======
    return attachPermissions(sanitizeUser(user));
>>>>>>> 870185c8e3ae31efe09445248cd7c7dc457a6b52
  }

  /**
   * CHANGE PASSWORD
   */
  async changePassword(userId, oldPassword, newPassword) {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new ApiError(404, AUTH_MESSAGES.USER_NOT_FOUND);
    }

    const passwordField = UserEntity.columns.PASSWORD;

    const isMatch = await bcrypt.compare(oldPassword, user[passwordField]);

    if (!isMatch) {
      throw new ApiError(401, AUTH_MESSAGES.INVALID_CREDENTIALS);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

<<<<<<< HEAD
    await userRepository.updateUser(userId, {
      [UserEntity.columns.PASSWORD]: hashedPassword,
=======
    const now = new Date();
    await userRepository.updateUser(userId, {
      [UserEntity.columns.PASSWORD]: hashedPassword,
      [UserEntity.columns.MUST_CHANGE_PASSWORD]: false,
      [UserEntity.columns.TEMPORARY_PASSWORD_EXPIRES_AT]: null,
      [UserEntity.columns.PASSWORD_CHANGED_AT]: now,
      [UserEntity.columns.PASSWORD_SET_AT]: user.password_set_at || now,
>>>>>>> 870185c8e3ae31efe09445248cd7c7dc457a6b52
    });

    return AUTH_MESSAGES.PASSWORD_CHANGED;
  }

<<<<<<< HEAD
=======
  async completeTemporaryPasswordChange(passwordChangeToken, newPassword) {
    const decoded = verifyPasswordChangeToken(passwordChangeToken);
    if (!decoded?.[UserEntity.columns.ID]) {
      throw new ApiError(401, 'Password change session is invalid or expired.');
    }

    const user = await userRepository.findById(decoded[UserEntity.columns.ID]);
    if (!user || !isActiveAccount(user)) {
      throw new ApiError(401, AUTH_MESSAGES.INVALID_CREDENTIALS);
    }
    if (!user.must_change_password) {
      throw new ApiError(400, 'Password change is not required for this account.');
    }
    if (!user.temporary_password_expires_at || user.temporary_password_expires_at < new Date()) {
      throw new ApiError(403, 'Temporary password has expired. Contact an administrator for new credentials.');
    }

    const reusedTemporaryPassword = await bcrypt.compare(newPassword, user[UserEntity.columns.PASSWORD]);
    if (reusedTemporaryPassword) {
      throw new ApiError(400, 'New password must be different from the temporary password.');
    }

    const now = new Date();
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updatedUser = await userRepository.updateUser(user.id, {
      [UserEntity.columns.PASSWORD]: hashedPassword,
      [UserEntity.columns.MUST_CHANGE_PASSWORD]: false,
      [UserEntity.columns.TEMPORARY_PASSWORD_EXPIRES_AT]: null,
      [UserEntity.columns.PASSWORD_CHANGED_AT]: now,
      [UserEntity.columns.PASSWORD_SET_AT]: now,
      [UserEntity.columns.ACTIVATED_AT]: user.activated_at || now,
      [UserEntity.columns.REFRESH_TOKEN]: null,
      [UserEntity.columns.FAILED_LOGIN_ATTEMPTS]: 0,
      [UserEntity.columns.LOCKED_UNTIL]: null,
    });

    const { accessToken, refreshToken } = generateAuthTokens(updatedUser.id, updatedUser.role);
    await userRepository.updateUser(updatedUser.id, {
      [UserEntity.columns.REFRESH_TOKEN]: refreshToken,
      [UserEntity.columns.LAST_LOGIN_AT]: now,
    });

    await prisma.auditLog.create({
      data: {
        entity_type: 'user',
        entity_id: updatedUser.id,
        action: 'temporary_password_changed',
        performed_by_id: updatedUser.id,
        remarks: 'User changed temporary password during first login.',
      },
    });

    notificationService.createNotification(
      updatedUser.id,
      'password_changed',
      'Password changed successfully',
      'Your VMS password was changed successfully.',
      'user',
      updatedUser.id
    ).catch(() => {});

    return {
      user: attachPermissions(sanitizeUser(updatedUser)),
      accessToken,
      refreshToken,
    };
  }

>>>>>>> 870185c8e3ae31efe09445248cd7c7dc457a6b52
  /**
   * FORGOT PASSWORD
   * - Generates OTP
   * - Saves password_reset_otp + expires
   * - Emails OTP + expiry time + security warning
   */
  async forgotPassword(payload) {
<<<<<<< HEAD
    console.log("\n========== FORGOT PASSWORD ==========");

=======
>>>>>>> 870185c8e3ae31efe09445248cd7c7dc457a6b52
    // Accept either string email or { email }
    const email =
      typeof payload === "string" ? payload : payload?.email;

    if (!email || typeof email !== "string") {
      throw new ApiError(400, "Email is required.");
    }

    const user = await userRepository.findByEmail(email);

    // Do NOT reveal existence
    if (!user) {
<<<<<<< HEAD
      console.log("[AuthService] User not found. Returning generic success.");
=======
>>>>>>> 870185c8e3ae31efe09445248cd7c7dc457a6b52
      return AUTH_MESSAGES.FORGOT_PASSWORD_SENT;
    }

    const resetOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const resetExpires = new Date(Date.now() + 10 * 60 * 1000);

<<<<<<< HEAD
    console.log("Generated OTP :", resetOtp);
    console.log("OTP Expiry :", resetExpires);

=======
>>>>>>> 870185c8e3ae31efe09445248cd7c7dc457a6b52
    await userRepository.updateUser(user[UserEntity.columns.ID], {
      [UserEntity.columns.PASSWORD_RESET_OTP]: resetOtp,
      [UserEntity.columns.PASSWORD_RESET_OTP_EXPIRES]: resetExpires,
    });

    const emailHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
</head>
<body style="background:#f4f6f9;padding:30px;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:auto;background:#ffffff;border-radius:10px;padding:35px;box-shadow:0 0 20px rgba(0,0,0,.15);">
    <h2 style="text-align:center;color:#2563eb;">Vendor Management System</h2>

    <p>Hello <b>${user.first_name || "User"}</b>,</p>

    <p>We received a request to reset your password.</p>

    <p style="font-weight:bold;">Your OTP is:</p>

    <div style="margin:20px 0;background:#2563eb;color:white;font-size:34px;font-weight:bold;letter-spacing:10px;text-align:center;padding:18px;border-radius:8px;">
      ${resetOtp}
    </div>

    <p><b>OTP Expiry Time:</b> ${resetExpires.toISOString()}</p>

    <div style="background:#fef3c7;border:1px solid #f59e0b;padding:14px;border-radius:8px;margin-top:14px;">
      <p style="margin:0;"><b>Security Warning:</b> If you didn’t request this reset, ignore this email. Do not share this OTP with anyone.</p>
    </div>

    <hr />

    <p style="font-size:12px;color:gray;margin:0;">Vendor Management System</p>
  </div>
</body>
</html>`;

    await sendEmail({
      to: user[UserEntity.columns.EMAIL],
      subject: "Vendor Management System - Password Reset OTP",
      html: emailHtml,
      text: `Vendor Management System - Password Reset OTP\nOTP: ${resetOtp}\nExpiry: ${resetExpires.toISOString()}\nSecurity Warning: Do not share OTP with anyone.`,
    });

<<<<<<< HEAD
    console.log("OTP Email Sent Successfully.");
    console.log("==============================");

=======
>>>>>>> 870185c8e3ae31efe09445248cd7c7dc457a6b52
    return AUTH_MESSAGES.FORGOT_PASSWORD_SENT;
  }

  /**
   * verify-otp support
   */
  async verifyOtp(email, otp) {
<<<<<<< HEAD
    console.log("\n========== VERIFY OTP ==========");

=======
>>>>>>> 870185c8e3ae31efe09445248cd7c7dc457a6b52
    if (!email || typeof email !== "string") {
      throw new ApiError(400, "Email is required.");
    }

    if (!otp || typeof otp !== "string") {
      throw new ApiError(400, "OTP is required.");
    }

    const user = await userRepository.findByResetOtp(email, otp);

    if (!user) {
      throw new ApiError(400, "OTP is invalid.");
    }

    const expiryField = UserEntity.columns.PASSWORD_RESET_OTP_EXPIRES;

    if (!user[expiryField] || user[expiryField] < new Date()) {
      throw new ApiError(400, "OTP has expired.");
    }

    return "OTP verified";
  }

  /**
   * RESET PASSWORD USING OTP
   */
  async resetPassword(email, otp, newPassword) {
<<<<<<< HEAD
    console.log("\n========== RESET PASSWORD ==========");

=======
>>>>>>> 870185c8e3ae31efe09445248cd7c7dc457a6b52
    if (!email || typeof email !== "string") {
      throw new ApiError(400, "Email is required.");
    }

    if (!otp || typeof otp !== "string") {
      throw new ApiError(400, "OTP is required.");
    }

    if (!newPassword || typeof newPassword !== "string") {
      throw new ApiError(400, "New password is required.");
    }

    const user = await userRepository.findByResetOtp(email, otp);

    if (!user) {
      throw new ApiError(400, "Invalid OTP.");
    }

    const expiryField = UserEntity.columns.PASSWORD_RESET_OTP_EXPIRES;

    if (!user[expiryField] || user[expiryField] < new Date()) {
      throw new ApiError(400, "OTP has expired.");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await userRepository.updateUser(user[UserEntity.columns.ID], {
      [UserEntity.columns.PASSWORD]: hashedPassword,
      [UserEntity.columns.PASSWORD_RESET_OTP]: null,
      [UserEntity.columns.PASSWORD_RESET_OTP_EXPIRES]: null,
    });

<<<<<<< HEAD
    console.log("Password Updated Successfully.");

=======
>>>>>>> 870185c8e3ae31efe09445248cd7c7dc457a6b52
    return AUTH_MESSAGES.PASSWORD_RESET_SUCCESS;
  }

  /**
   * ADMIN RESET PASSWORD
   */
  async adminResetPassword(userId, newPassword) {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new ApiError(404, AUTH_MESSAGES.USER_NOT_FOUND);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await userRepository.updateUser(userId, {
      [UserEntity.columns.PASSWORD]: hashedPassword,
      [UserEntity.columns.PASSWORD_RESET_OTP]: null,
      [UserEntity.columns.PASSWORD_RESET_OTP_EXPIRES]: null,
    });

    return AUTH_MESSAGES.PASSWORD_RESET_SUCCESS;
  }
}

export default new AuthService();

