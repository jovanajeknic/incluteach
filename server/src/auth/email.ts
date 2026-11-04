export const MAX_EMAIL_LENGTH = 254;

// A simple shape check: something, one "@", something, a dot, something. The real proof that
// an address works is sending a message to it, which is not part of the app yet.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return email.length <= MAX_EMAIL_LENGTH && EMAIL_SHAPE.test(email);
}
