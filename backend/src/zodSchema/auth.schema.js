import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address').trim().lowercase(),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const refreshTokenSchema = z.object({ body: z.object({ refreshToken: z.string().min(1) }) });
export const forgotPasswordSchema = z.object({ body: z.object({ email: z.string().email() }) });
export const resetPasswordSchema = z.object({ body: z.object({ password: passwordSchema }) });
export const logoutSchema = z.object({ body: z.object({ refreshToken: z.string().optional() }) }); 
export const changePasswordSchema = z.object({
  body: z.object({
    oldPassword: z.string().min(1),
    newPassword: passwordSchema,
  }),
});