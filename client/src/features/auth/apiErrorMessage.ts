import { ApiError, NETWORK_ERROR } from '@/shared/api/apiClient';
import { text } from '@/text/sr-Latn';

const messages: Record<string, string> = text.auth.apiErrors;

/** Serbian text for a failed sign-in or activation, chosen by the error `code`. */
export function authErrorMessage(error: unknown): string {
  const code = error instanceof ApiError ? error.code : NETWORK_ERROR;
  return messages[code] ?? text.auth.apiErrors.unknown_error;
}
