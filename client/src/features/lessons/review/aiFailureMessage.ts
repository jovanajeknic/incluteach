import { text } from '@/text/sr-Latn';

/**
 * Serbian text for the reason a run of the AI failed. The server stores the reason in English
 * (`processingError`, for developers; see `server/src/lessons/generate.ts`, `ai/fake.ts` and
 * `ai/groq.ts`), so it is recognised by its wording; anything unknown gets the general text.
 */
export function aiFailureMessage(reason: string): string {
  const t = text.teacher.review.failures;
  if (/daily limit/i.test(reason)) return t.dailyLimit;
  if (/busy/i.test(reason)) return t.busy;
  if (/too long/i.test(reason)) return t.tooLong;
  if (/too short/i.test(reason)) return t.tooShort;
  if (/could not be used/i.test(reason)) return t.unusable;
  if (/interrupted/i.test(reason)) return t.interrupted;
  return t.general;
}
