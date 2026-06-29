import { z } from 'zod';
import { ROLES } from './auth.model.js'; 
import { passwordSchema } from './auth.schema.js'; 

export const createUserSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address').trim().lowercase(),
    password: passwordSchema,
    firstName: z.string().min(1, 'First name is required').trim(),
    lastName: z.string().min(1, 'Last name is required').trim(),
    role: z.nativeEnum(ROLES, {
      errorMap: () => ({ message: `Role must be one of: ${Object.values(ROLES).join(', ')}` }),
    }),
  }),
});

export const updateUserSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address').trim().lowercase().optional(),
    firstName: z.string().min(1, 'First name cannot be empty').trim().optional(),
    lastName: z.string().min(1, 'Last name cannot be empty').trim().optional(),
    role: z.nativeEnum(ROLES, {
      errorMap: () => ({ message: `Role must be one of: ${Object.values(ROLES).join(', ')}` }),
    }).optional(),
  }).refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
    path: ['body'],
  }),
  params: z.object({
    id: z.string().uuid('Invalid user ID format'),
  }),
});

export const deleteUserSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid user ID format'),
  }),
});

export const assignRoleSchema = z.object({
  body: z.object({
    role: z.nativeEnum(ROLES, {
      errorMap: () => ({ message: `Role must be one of: ${Object.values(ROLES).join(', ')}` }),
    }),
  }),
  params: z.object({
    id: z.string().uuid('Invalid user ID format'),
  }),
});

export const searchUsersSchema = z.object({
  query: z.object({
    search: z.string().trim().optional(),
    role: z.nativeEnum(ROLES).optional(),
    isActive: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
    page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).optional().default('10'),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    newPassword: passwordSchema,
  }),
  params: z.object({
    id: z.string().uuid('Invalid user ID format'),
  }),
});

export const toggleStatusSchema = z.object({
  body: z.object({
    isActive: z.boolean('isActive must be a boolean'),
  }),
  params: z.object({
    id: z.string().uuid('Invalid user ID format'),
  }),
});

export default { createUserSchema, updateUserSchema, deleteUserSchema, assignRoleSchema, searchUsersSchema, resetPasswordSchema, toggleStatusSchema };
