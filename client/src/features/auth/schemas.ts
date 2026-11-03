import { z } from 'zod';
import { text } from '@/text/sr-Latn';

/**
 * TEMPORARY password rule. No backend password policy exists yet; replace this with the
 * backend's rule once it is agreed. Spaces are allowed and the value is never trimmed or
 * shortened, so long passphrases and password-manager values work as typed.
 */
export const PASSWORD_MIN_LENGTH = 12;

export const REGISTRATION_ROLES = ['teacher', 'parent'] as const;
export type RegistrationRole = (typeof REGISTRATION_ROLES)[number];

const errors = text.auth.errors;

// Email is trimmed (stray spaces from copying are common); passwords are not.
const emailField = z
  .string()
  .trim()
  .min(1, errors.emailRequired)
  .pipe(z.email(errors.emailInvalid));

const requiredName = (message: string) => z.string().trim().min(1, message);

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, errors.passwordRequired),
});

export type LoginFormInput = z.input<typeof loginSchema>;
export type LoginFormValues = z.output<typeof loginSchema>;

export const registerSchema = z
  .object({
    role: z.enum(REGISTRATION_ROLES, { error: errors.roleRequired }),
    firstName: requiredName(errors.firstNameRequired),
    lastName: requiredName(errors.lastNameRequired),
    email: emailField,
    password: z
      .string()
      .min(1, errors.passwordRequired)
      .min(PASSWORD_MIN_LENGTH, errors.passwordTooShort(PASSWORD_MIN_LENGTH)),
    confirmPassword: z.string().min(1, errors.confirmPasswordRequired),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    error: errors.passwordsDoNotMatch,
  });

export type RegisterFormInput = z.input<typeof registerSchema>;
export type RegisterFormValues = z.output<typeof registerSchema>;
