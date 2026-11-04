import { z } from 'zod';
import { text } from '@/text/sr-Latn';

export const SCHOOL_CONTACT_ROLES = [
  'principal',
  'deputy',
  'pedagogue',
  'psychologist',
  'secretary',
  'other',
] as const;
export type SchoolContactRole = (typeof SCHOOL_CONTACT_ROLES)[number];

export const MESSAGE_MAX_LENGTH = 1000;

const errors = text.schoolRequest.errors;
const authErrors = text.auth.errors;
const required = (message: string) => z.string().trim().min(1, message);

/**
 * A school's request to join. It creates no account: the IncluTeach team checks the school
 * and later invites its first administrator. The rules here are a first proposal.
 */
export const schoolRequestSchema = z.object({
  schoolName: required(errors.schoolNameRequired),
  municipality: required(errors.municipalityRequired),
  contactName: required(errors.contactNameRequired),
  contactRole: z.enum(SCHOOL_CONTACT_ROLES, { error: errors.contactRoleRequired }),
  email: z.string().trim().min(1, authErrors.emailRequired).pipe(z.email(authErrors.emailInvalid)),
  phone: z.string().trim(),
  message: z.string().trim().max(MESSAGE_MAX_LENGTH, errors.messageTooLong(MESSAGE_MAX_LENGTH)),
  consent: z.literal(true, { error: errors.consentRequired }),
});

export type SchoolRequestInput = z.input<typeof schoolRequestSchema>;
export type SchoolRequestValues = z.output<typeof schoolRequestSchema>;

/** Form order, used to focus the first field with a problem. */
export const schoolRequestFieldOrder = [
  'schoolName',
  'municipality',
  'contactName',
  'contactRole',
  'email',
  'phone',
  'message',
  'consent',
] as const satisfies readonly (keyof SchoolRequestInput)[];
