import { z } from 'zod';
import { text } from '@/text/sr-Latn';

/**
 * TEMPORARY password rule. No backend password policy exists yet; replace this with the
 * backend's rule once it is agreed. Spaces are allowed and the value is never trimmed or
 * shortened, so long passphrases and password-manager values work as typed.
 */
export const PASSWORD_MIN_LENGTH = 12;

const errors = text.auth.errors;

// Email is trimmed (stray spaces from copying are common); passwords are not.
const emailField = z
  .string()
  .trim()
  .min(1, errors.emailRequired)
  .pipe(z.email(errors.emailInvalid));

/**
 * TEMPORARY code format for invitation and card codes: 8 letters or digits, written in two
 * groups of four. Spaces, dashes and lower case are accepted and normalized. The backend
 * decides the real format.
 */
const CODE_PATTERN = /^[A-Z0-9]{8}$/;

const codeField = (required: string, invalid: string) =>
  z
    .string()
    .transform((value) => value.replace(/[\s-]/g, '').toUpperCase())
    .pipe(z.string().min(1, required).regex(CODE_PATTERN, invalid));

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, errors.passwordRequired),
});

export type LoginFormInput = z.input<typeof loginSchema>;
export type LoginFormValues = z.output<typeof loginSchema>;

export const studentLoginSchema = z.object({
  cardCode: codeField(errors.cardCodeRequired, errors.cardCodeInvalid),
});

export type StudentLoginFormInput = z.input<typeof studentLoginSchema>;
export type StudentLoginFormValues = z.output<typeof studentLoginSchema>;

export const activateSchema = z
  .object({
    inviteCode: codeField(errors.inviteCodeRequired, errors.inviteCodeInvalid),
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

export type ActivateFormInput = z.input<typeof activateSchema>;
export type ActivateFormValues = z.output<typeof activateSchema>;
