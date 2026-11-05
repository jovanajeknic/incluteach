import { z } from 'zod';
import { text } from '@/text/sr-Latn';

/**
 * Password length rule of the backend (`POST /auth/activate`). The server is the source of
 * truth and answers `password_too_short` or `password_too_long`; this only gives quick
 * feedback. Spaces are allowed and the value is never trimmed, so passphrases and
 * password-manager values work as typed. The same letter typed in two ways (such as "č")
 * counts once, as on the server.
 */
export const PASSWORD_MIN_LENGTH = 7;
export const PASSWORD_MAX_LENGTH = 128;

/** The backend accepts identifiers up to 254 characters. */
const IDENTIFIER_MAX_LENGTH = 254;

const errors = text.auth.errors;

const passwordLength = (value: string) => value.normalize('NFC').length;

// Email is trimmed (stray spaces from copying are common); passwords are not.
const emailField = z
  .string()
  .trim()
  .min(1, errors.emailRequired)
  .pipe(z.email(errors.emailInvalid));

export const loginSchema = z.object({
  // An email or a username, so only "not empty" can be checked here.
  identifier: z.string().trim().min(1, errors.identifierRequired).max(IDENTIFIER_MAX_LENGTH),
  password: z.string().min(1, errors.passwordRequired),
});

export type LoginFormInput = z.input<typeof loginSchema>;
export type LoginFormValues = z.output<typeof loginSchema>;

export const activateSchema = z
  .object({
    password: z
      .string()
      .min(1, errors.passwordRequired)
      .refine((value) => passwordLength(value) >= PASSWORD_MIN_LENGTH, {
        error: errors.passwordTooShort(PASSWORD_MIN_LENGTH),
      })
      .refine((value) => passwordLength(value) <= PASSWORD_MAX_LENGTH, {
        error: errors.passwordTooLong(PASSWORD_MAX_LENGTH),
      }),
    confirmPassword: z.string().min(1, errors.confirmPasswordRequired),
    email: emailField,
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    error: errors.passwordsDoNotMatch,
  });

export type ActivateFormInput = z.input<typeof activateSchema>;
export type ActivateFormValues = z.output<typeof activateSchema>;
