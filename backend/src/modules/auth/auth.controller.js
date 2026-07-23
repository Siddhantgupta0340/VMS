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
<<<<<<< HEAD
    console.log("login", req.body);
    const { email, password } = req.body;
    const { user, accessToken, refreshToken } = await authService.login(
      email,
      password,
    );
    res.status(200).json({
      success: true,
      message: AUTH_MESSAGES.LOGIN_SUCCESS,
      data: { user, accessToken, refreshToken },
=======
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

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };

    res.cookie('vms_access_token', result.accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000,
    });

    if (result.refreshToken) {
      res.cookie('vms_refresh_token', result.refreshToken, cookieOptions);
    }

    res.status(200).json({
      success: true,
      message: AUTH_MESSAGES.LOGIN_SUCCESS,
      data: result,
>>>>>>> origin/main
    });
  });

  /**
   * @desc    Log user out
   * @route   POST /api/v1/auth/logout
   * @access  Private
   */
  logout = asyncHandler(async (req, res) => {
<<<<<<< HEAD
    // Assuming userId is available from an authentication middleware (e.g., req.user.id)
    const message = await authService.logout(req.user.id);
=======
    const message = await authService.logout(req.user.id);
    res.clearCookie('vms_access_token', { path: '/' });
    res.clearCookie('vms_refresh_token', { path: '/' });
>>>>>>> origin/main
    res.status(200).json({ success: true, message });
  });

  /**
   * @desc    Refresh access token
   * @route   POST /api/v1/auth/refresh-token
   * @access  Public
   */
  refreshToken = asyncHandler(async (req, res) => {
<<<<<<< HEAD
    console.log("token received");
    const { refreshToken: oldRefreshToken } = req.body;
    const { accessToken, refreshToken } =
      await authService.refreshToken(oldRefreshToken);
=======
    const oldRefreshToken = req.cookies?.vms_refresh_token || req.body.refreshToken;
    const { accessToken, refreshToken } =
      await authService.refreshToken(oldRefreshToken);

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };

    res.cookie('vms_access_token', accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000,
    });

    if (refreshToken) {
      res.cookie('vms_refresh_token', refreshToken, cookieOptions);
    }

>>>>>>> origin/main
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
<<<<<<< HEAD
    console.log("\n================ FORGOT PASSWORD =================");
    console.log("[Controller] Forgot Password API Hit");
    console.log("[Controller] Request Body:", req.body);

    const { email } = req.body;

    console.log("[Controller] Email Received:", email);
    const message = await authService.forgotPassword(email);

    console.log("[Controller] Service Response:", message);

=======
    const { email } = req.body;
    const message = await authService.forgotPassword(email);

>>>>>>> origin/main
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
<<<<<<< HEAD
=======

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

>>>>>>> origin/main
}

export default new AuthController();
