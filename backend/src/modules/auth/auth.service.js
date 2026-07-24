import bcrypt from "bcryptjs";
import userRepository from "../users/user.repository.js";
import { generateAuthTokens, verifyRefreshToken } from "../../utils/jwt.js";
import { AUTH_MESSAGES } from "./auth.constants.js";
import ApiError from "../../utils/ApiError.js";
import { UserEntity } from "../../zodSchema/index.js";
import sendEmail from "../../utils/email.js";
import { sanitizeUser } from "../../utils/sanitizeUser.js";

class AuthService {
  /**
   * LOGIN
   */
  async login(email, password) {
    const user = await userRepository.findByEmail(email);

    if (!user) {
      throw new ApiError(401, AUTH_MESSAGES.INVALID_CREDENTIALS);
    }

    const passwordField = UserEntity.columns.PASSWORD;

    const isMatch = await bcrypt.compare(password, user[passwordField]);

    if (!isMatch) {
      throw new ApiError(401, AUTH_MESSAGES.INVALID_CREDENTIALS);
    }

    const idField = UserEntity.columns.ID;
    const roleField = UserEntity.columns.ROLE;

    const { accessToken, refreshToken } = generateAuthTokens(
      user[idField],
      user[roleField],
    );

    await userRepository.updateUser(user[idField], {
      [UserEntity.columns.REFRESH_TOKEN]: refreshToken,
      [UserEntity.columns.LAST_LOGIN_AT]: new Date(),
    });

    return {
      user: sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  }

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

    return sanitizeUser(user);
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

    await userRepository.updateUser(userId, {
      [UserEntity.columns.PASSWORD]: hashedPassword,
    });

    return AUTH_MESSAGES.PASSWORD_CHANGED;
  }

  /**
   * FORGOT PASSWORD
   * - Generates OTP
   * - Saves password_reset_otp + expires
   * - Emails OTP + expiry time + security warning
   */
  async forgotPassword(payload) {
    console.log("\n========== FORGOT PASSWORD ==========");

    // Accept either string email or { email }
    const email =
      typeof payload === "string" ? payload : payload?.email;

    if (!email || typeof email !== "string") {
      throw new ApiError(400, "Email is required.");
    }

    const user = await userRepository.findByEmail(email);

    // Do NOT reveal existence
    if (!user) {
      console.log("[AuthService] User not found. Returning generic success.");
      return AUTH_MESSAGES.FORGOT_PASSWORD_SENT;
    }

    const resetOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const resetExpires = new Date(Date.now() + 10 * 60 * 1000);

    console.log("Generated OTP :", resetOtp);
    console.log("OTP Expiry :", resetExpires);

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

    console.log("OTP Email Sent Successfully.");
    console.log("==============================");

    return AUTH_MESSAGES.FORGOT_PASSWORD_SENT;
  }

  /**
   * verify-otp support
   */
  async verifyOtp(email, otp) {
    console.log("\n========== VERIFY OTP ==========");

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
    console.log("\n========== RESET PASSWORD ==========");

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

    console.log("Password Updated Successfully.");

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

