/**
 * Zod-based validation schemas for the iFinallyWill application
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Primitive schemas
// ---------------------------------------------------------------------------

/**
 * Email address validation.
 */
export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .email('Please enter a valid email address');

/**
 * North American phone number validation.
 * Accepts digits, spaces, dashes, parentheses, dots, and optional leading +1.
 */
export const phoneSchema = z
  .string()
  .trim()
  .min(1, 'Phone number is required')
  .regex(/^\+?1?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/, 'Please enter a valid phone number');

/**
 * Canadian postal code validation (e.g. "A1A 1A1" or "A1A1A1").
 */
export const postalCodeSchema = z
  .string()
  .trim()
  .min(1, 'Postal code is required')
  .regex(
    /^[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d$/,
    'Please enter a valid Canadian postal code (e.g. A1A 1A1)'
  );

/**
 * Password validation.
 * Requires at least 8 characters, 1 uppercase letter, 1 lowercase letter,
 * and 1 number.
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/\d/, 'Password must contain at least one number');

/**
 * General name field validation.
 * Between 1 and 100 characters.
 */
export const nameSchema = z
  .string()
  .trim()
  .min(1, 'Name is required')
  .max(100, 'Name must be 100 characters or fewer');

// ---------------------------------------------------------------------------
// Compound schemas
// ---------------------------------------------------------------------------

/**
 * Canadian address schema.
 */
export const addressSchema = z.object({
  street: z.string().trim().min(1, 'Street address is required'),
  city: z.string().trim().min(1, 'City is required'),
  province: z.string().trim().min(1, 'Province is required'),
  postalCode: postalCodeSchema,
  country: z.string().trim().default('Canada'),
});

/**
 * Login credentials schema.
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

/**
 * Registration schema with password confirmation.
 */
export const registrationSchema = z
  .object({
    firstName: nameSchema,
    lastName: nameSchema,
    email: emailSchema,
    phone: phoneSchema.optional().or(z.literal('')),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------

export type Email = z.infer<typeof emailSchema>;
export type Phone = z.infer<typeof phoneSchema>;
export type PostalCode = z.infer<typeof postalCodeSchema>;
export type Password = z.infer<typeof passwordSchema>;
export type Name = z.infer<typeof nameSchema>;
export type Address = z.infer<typeof addressSchema>;
export type LoginCredentials = z.infer<typeof loginSchema>;
export type RegistrationData = z.infer<typeof registrationSchema>;
