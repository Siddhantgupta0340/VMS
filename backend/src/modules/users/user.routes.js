import express from 'express';
import userController from './user.controller.js';
import { protect } from '../../middleware/auth.middleware.js';
import authorize from '../../middleware/authorize.middleware.js';
import validate from '../../middleware/validate.middleware.js';
import {
  ROLES,
  createUserSchema,
  updateUserSchema,
  deleteUserSchema,
  searchUsersSchema,
  toggleStatusSchema,
  adminResetPasswordSchema,
} from '../../zodSchema/index.js';
import { PERMISSIONS } from '../auth/auth.permissions.js';

const router = express.Router();

/**
 * All routes below are protected and require admin privileges
 */
router.use(protect, authorize(PERMISSIONS.USER.MANAGE));

router.route('/').post(validate(createUserSchema), userController.createUser).get(validate(searchUsersSchema), userController.getUsers);

router.route('/:id').get(userController.getUserById).put(validate(updateUserSchema), userController.updateUser).delete(validate(deleteUserSchema), userController.deleteUser);

router.patch('/:id/status', validate(toggleStatusSchema), userController.toggleUserStatus);
router.post('/:id/reset-password', validate(adminResetPasswordSchema), userController.adminResetPassword);

export default router;