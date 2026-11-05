import { ApiError, NETWORK_ERROR } from '@/shared/api/apiClient';
import { text } from '@/text/sr-Latn';

const messages: Record<string, string> = text.pupil.errors;

/** Serbian text for a failed call of the student's screens, chosen by the error `code`. */
export function studentErrorMessage(error: unknown): string {
  const code = error instanceof ApiError ? error.code : NETWORK_ERROR;
  return messages[code] ?? text.pupil.errors.unknown_error;
}
