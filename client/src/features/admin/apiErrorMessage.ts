import { ApiError, NETWORK_ERROR } from '@/shared/api/apiClient';
import { text } from '@/text/sr-Latn';

const messages: Record<string, string> = text.admin.errors;

/** Serbian text for a failed call of the admin's screens, chosen by the error `code`. */
export function adminErrorMessage(error: unknown): string {
  const code = error instanceof ApiError ? error.code : NETWORK_ERROR;
  return messages[code] ?? text.admin.errors.unknown_error;
}
