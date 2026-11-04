import type request from 'supertest';

// The "session=..." cookie that the server set in a response.
export function sessionCookie(response: request.Response): string {
  const cookies = response.headers['set-cookie'] as unknown as string[] | undefined;
  const cookie = cookies?.find((value) => value.startsWith('session='));
  if (!cookie) {
    throw new Error('No session cookie was set.');
  }
  return cookie;
}
