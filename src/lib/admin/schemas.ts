import { z } from 'zod'

export const loginEmailSchema = z.object({
  email: z.string().trim().email('Enter a valid email.'),
})

export const loginPasswordSchema = z.object({
  email: z.string().trim().email('Enter a valid email.'),
  password: z.string().min(1, 'Password is required.'),
})

export const otpVerifySchema = z.object({
  email: z.string().trim().email('Enter a valid email.'),
  token: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code.'),
})

export const registerAdminSchema = z.object({
  email: z.string().trim().email('Enter a valid email.'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .max(128, 'Password is too long.'),
  full_name: z.string().trim().min(2, 'Enter your full name.').max(120),
})

export const uuidSchema = z.string().uuid()

export const configurationIdsSchema = z.array(z.string().uuid()).min(1).max(500)
