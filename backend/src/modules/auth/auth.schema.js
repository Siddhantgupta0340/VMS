import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    email: z.string({ required_error: 'Email is required' }).email('Invalid email address'),
    password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'), 
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string({ required_error: 'Refresh token is required' }).min(1, 'Refresh token is required'),
  }),
});

export const changePasswordSchema = z.object({
  body: z
    .object({
      oldPassword: z.string({ required_error: 'Old password is required' }).min(1, 'Old password is required'),
      newPassword: z.string({ required_error: 'New password is required' }).min(8, 'New password must be at least 8 characters long'),
    })
    .refine((data) => data.oldPassword !== data.newPassword, {
      message: 'New password must be different from the old password',
      path: ['newPassword'], // Associates the error with the newPassword field
    }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string({ required_error: 'Email is required' }).email('Invalid email address'),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string({ required_error: 'Token is required' }).min(1, 'Token is required'),
    newPassword: z.string({ required_error: 'New password is required' }).min(8, 'New password must be at least 8 characters long'),
  }),
});