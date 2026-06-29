import userService from './user.service.js';
import { USER_MESSAGES } from './user.constants.js';
import asyncHandler from '../../middleware/asyncHandler.middleware.js';

/**
 * @class UserController
 * @description Manages HTTP requests for user-related operations like CRUD and status changes.
 */
class UserController {
  /**
   * @desc    Create a new user
   * @route   POST /api/v1/users
   * @access  Private (Admin)
   */
  createUser = asyncHandler(async (req, res) => {
    const user = await userService.createUser(req.body);
    res.status(201).json({
      success: true,
      message: USER_MESSAGES.USER_CREATED,
      data: user,
    });
  });

  /**
   * @desc    Get all users with filtering and pagination
   * @route   GET /api/v1/users
   * @access  Private (Admin)
   */
  getUsers = asyncHandler(async (req, res) => {
    const result = await userService.searchUsers(req.query);
    res.status(200).json({ success: true, ...result });
  });

  /**
   * @desc    Get a single user by ID
   * @route   GET /api/v1/users/:id
   * @access  Private (Admin)
   */
  getUserById = asyncHandler(async (req, res) => {
    const user = await userService.getUserById(req.params.id);
    res.status(200).json({ success: true, data: user });
  });

  /**
   * @desc    Update a user
   * @route   PUT /api/v1/users/:id
   * @access  Private (Admin)
   */
  updateUser = asyncHandler(async (req, res) => {
    const updatedUser = await userService.updateUser(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: USER_MESSAGES.USER_UPDATED,
      data: updatedUser,
    });
  });

  /**
   * @desc    Delete a user (soft delete)
   * @route   DELETE /api/v1/users/:id
   * @access  Private (Admin)
   */
  deleteUser = asyncHandler(async (req, res) => {
    const message = await userService.deleteUser(req.params.id);
    res.status(200).json({ success: true, message });
  });

  /**
   * @desc    Toggle user active status
   * @route   PATCH /api/v1/users/:id/status
   * @access  Private (Admin)
   */
  toggleUserStatus = asyncHandler(async (req, res) => {
    const updatedUser = await userService.toggleUserStatus(req.params.id, req.body.isActive);
    res.status(200).json({ success: true, message: USER_MESSAGES.STATUS_UPDATED, data: updatedUser });
  });

  /**
   * @desc    Reset a user's password (by Admin)
   * @route   POST /api/v1/users/:id/reset-password
   * @access  Private (Admin)
   */
  adminResetPassword = asyncHandler(async (req, res) => {
    const message = await userService.adminResetPassword(req.params.id, req.body.newPassword);
    res.status(200).json({ success: true, message });
  });
}

export default new UserController();
