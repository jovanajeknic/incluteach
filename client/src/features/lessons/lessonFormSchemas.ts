import { z } from 'zod';
import { text } from '@/text/sr-Latn';
import { BODY_MAX_LENGTH, FILE_MAX_BYTES, TITLE_MAX_LENGTH } from './api/lessonsApi';

const errors = text.teacher.newLesson.errors;

type FileProblem = 'fileTooLarge' | 'fileOldWord' | 'fileUnsupported';

/**
 * A quick check in the browser, before sending. The server looks at what is really inside
 * the file, not at its name, and has the last word; this only saves a wait for the obvious.
 */
export function checkLessonFile(file: { name: string; size: number }): FileProblem | null {
  const name = file.name.toLowerCase();
  if (name.endsWith('.doc')) return 'fileOldWord';
  if (!name.endsWith('.docx') && !name.endsWith('.pdf')) return 'fileUnsupported';
  if (file.size > FILE_MAX_BYTES) return 'fileTooLarge';
  return null;
}

const title = z
  .string()
  .trim()
  .min(1, errors.titleRequired)
  .max(TITLE_MAX_LENGTH, errors.titleTooLong);

export const newLessonSchema = z
  .object({
    subjectId: z.string().min(1, errors.subjectRequired),
    title,
    mode: z.enum(['paste', 'file']),
    body: z.string(),
    file: z.custom<File | null>().nullable(),
  })
  .superRefine((values, ctx) => {
    if (values.mode === 'paste') {
      if (values.body.trim().length === 0) {
        ctx.addIssue({ code: 'custom', path: ['body'], message: errors.bodyRequired });
      } else if (values.body.length > BODY_MAX_LENGTH) {
        ctx.addIssue({ code: 'custom', path: ['body'], message: errors.bodyTooLong });
      }
      return;
    }
    if (!values.file) {
      ctx.addIssue({ code: 'custom', path: ['file'], message: errors.fileRequired });
      return;
    }
    const problem = checkLessonFile(values.file);
    if (problem) ctx.addIssue({ code: 'custom', path: ['file'], message: errors[problem] });
  });

export type NewLessonFormInput = z.input<typeof newLessonSchema>;
export type NewLessonFormValues = z.output<typeof newLessonSchema>;

/** Editing an existing lesson: the text may be empty (a lesson can be filled in later). */
export const editLessonSchema = z.object({
  title,
  body: z.string().max(BODY_MAX_LENGTH, errors.bodyTooLong),
});

export type EditLessonFormValues = z.output<typeof editLessonSchema>;
