import { ApiError, NETWORK_ERROR } from '@/shared/api/apiClient';
import { text } from '@/text/sr-Latn';

const messages: Record<string, string> = text.teacher.errors;

/** Serbian text for a failed call about subjects and lessons, chosen by the error `code`. */
export function lessonErrorMessage(error: unknown): string {
  const code = error instanceof ApiError ? error.code : NETWORK_ERROR;
  return messages[code] ?? text.teacher.errors.unknown_error;
}
