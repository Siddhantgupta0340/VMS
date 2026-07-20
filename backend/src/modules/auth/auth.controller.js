import authService from "./auth.service.js";
import { AUTH_MESSAGES } from "./auth.constants.js";
import asyncHandler from "../../middleware/asyncHandler.middleware.js";

/**
 * @class AuthController
 * @description Handles HTTP requests for authentication, such as login, logout, and token refreshing.
 */
class AuthController {
  /**
   * @desc    Authenticate user & get token
   * @route   POST /api/v1/auth/login
   * @access  Public
   */
  login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await authService.login(
      email,
      password,
    );
    if (result.requiresPasswordChange) {
      return res.status(200).json({
        success: true,
        message: 'Password change required before accessing VMS.',
        data: result,
      });
    }
    res.status(200).json({
      success: true,
      message: AUTH_MESSAGES.LOGIN_SUCCESS,
      data: result,
    });
  });

  /**
   * @desc    Log user out
   * @route   POST /api/v1/auth/logout
   * @access  Private
   */
  logout = asyncHandler(async (req, res) => {
    // Assuming userId is available from an authentication middleware (e.g., req.user.id)
    const message = await authService.logout(req.user.id);
    res.status(200).json({ success: true, message });
  });

  /**
   * @desc    Refresh access token
   * @route   POST /api/v1/auth/refresh-token
   * @access  Public
   */
  refreshToken = asyncHandler(async (req, res) => {
    const { refreshToken: oldRefreshToken } = req.body;
    const { accessToken, refreshToken } =
      await authService.refreshToken(oldRefreshToken);
    res.status(200).json({
      success: true,
      message: AUTH_MESSAGES.REFRESH_SUCCESS,
      data: { accessToken, refreshToken },
    });
  });

  /**
   * @desc    Get current user profile
   * @route   GET /api/v1/auth/profile
   * @access  Private
   */
  getProfile = asyncHandler(async (req, res) => {
    // Assuming userId is available from an authentication middleware
    const profile = await authService.getProfile(req.user.id);
    res.status(200).json({ success: true, data: profile });
  });

  /**
   * @desc    Change user password
   * @route   PUT /api/v1/auth/password
   * @access  Private
   */
  changePassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    // Assuming userId is available from an authentication middleware
    const message = await authService.changePassword(
      req.user.id,
      oldPassword,
      newPassword,
    );
    res.status(200).json({ success: true, message });
  });

  /**
   * @desc    Initiate password reset process
   * @route   POST /api/v1/auth/forgot-password
   * @access  Public
   */
  /**
   * @desc    Initiate password reset process
   * @route   POST /api/v1/auth/forgot-password
   * @access  Public
   */
  forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const message = await authService.forgotPassword(email);

    // Required response format
    return res.status(200).json({
      success: true,
      message: message || "OTP sent successfully",
    });
  });

  /**
   * @desc    Verify password reset OTP
   * @route   POST /api/v1/auth/verify-otp
   * @access  Public
   */
  verifyOtp = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;
    const message = await authService.verifyOtp(email, otp);

    res.status(200).json({ success: true, message });
  });

  /**
   * @desc    Reset password using OTP
   * @route   POST /api/v1/auth/reset-password
   * @access  Public
   */
  resetPassword = asyncHandler(async (req, res) => {
    const { email, otp, newPassword } = req.body;

    const message = await authService.resetPassword(
      email,
      otp,
      newPassword,
    );

    res.status(200).json({ success: true, message });
  });

  completeTemporaryPasswordChange = asyncHandler(async (req, res) => {
    const { passwordChangeToken, newPassword } = req.body;
    const result = await authService.completeTemporaryPasswordChange(passwordChangeToken, newPassword);
    res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
      data: result,
    });
  });

  validateActivationToken = asyncHandler(async (req, res) => {
    const data = await authService.validateActivationToken(req.query.token);
    res.status(200).json({ success: true, data });
  });

  setPassword = asyncHandler(async (req, res) => {
    const user = await authService.setPassword(req.body.token, req.body.newPassword);
    res.status(200).json({ success: true, message: 'Password set successfully. You can now log in.', data: user });
  });

  activateAccount = asyncHandler(async (req, res) => {
    const user = await authService.activateAccount(req.body.token, req.body.newPassword);
    res.status(200).json({ success: true, message: 'Account activated successfully.', data: user });
  });

  resendActivation = asyncHandler(async (req, res) => {
    const message = await authService.resendActivation(
      req.body.email,
      req.user || null,
      req.ip,
      req.headers['user-agent'],
    );
    res.status(200).json({ success: true, message });
  });

}

export default new AuthController();
