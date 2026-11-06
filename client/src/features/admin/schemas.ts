import { z } from 'zod';
import { text } from '@/text/sr-Latn';

const t = text.admin.newUser;

/**
 * Quick feedback only. The server is the source of truth and answers `invalid_full_name`
 * (also when the name has fewer than two letters or digits).
 */
export const newUserSchema = z.object({
  fullName: z.string().trim().min(2, t.fullNameShort).max(100, t.fullNameLong),
  role: z.enum(['teacher', 'student', 'parent'], { error: t.roleRequired }),
});

export type NewUserInput = z.input<typeof newUserSchema>;
export type NewUserValues = z.output<typeof newUserSchema>;

const classText = text.admin.classes;

/** The server answers `invalid_class_name` and `class_exists`; this is quick feedback only. */
export const className = z
  .string()
  .trim()
  .min(1, classText.nameRequired)
  .max(50, classText.nameLong);

export const newClassSchema = z.object({ name: className });

export type NewClassInput = z.input<typeof newClassSchema>;
export type NewClassValues = z.output<typeof newClassSchema>;
