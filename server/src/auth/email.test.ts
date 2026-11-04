import { describe, expect, it } from 'vitest';

import { isValidEmail, MAX_EMAIL_LENGTH } from './email.ts';

describe('isValidEmail', () => {
  it.each(['ana@example.com', 'ana.ivic+skola@mail.example.rs', 'a@b.co', 'ana@sub.example.com'])(
    'accepts "%s"',
    (email) => {
      expect(isValidEmail(email)).toBe(true);
    },
  );

  it.each([
    '',
    'ana',
    'ana@',
    '@example.com',
    'ana@example',
    'ana@@example.com',
    'ana ivic@example.com',
    'ana@exa mple.com',
    `${'a'.repeat(MAX_EMAIL_LENGTH)}@example.com`,
  ])('rejects "%s"', (email) => {
    expect(isValidEmail(email)).toBe(false);
  });
});
