import { describe, expect, it } from 'vitest';

import {
  checkPassword,
  hashPassword,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  verifyPassword,
  type ScryptCost,
} from './password.ts';

// A cheap cost keeps the tests fast; the default cost is checked once below.
const FAST: ScryptCost = { N: 1024, r: 8, p: 1 };

describe('checkPassword', () => {
  it('requires at least 7 characters', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(7);
    expect(checkPassword('abcdef')).toBe('too_short');
    expect(checkPassword('abcdefg')).toBeNull();
  });

  it('rejects an empty password', () => {
    expect(checkPassword('')).toBe('too_short');
  });

  it('counts letters, not bytes, so Serbian letters are not penalised', () => {
    expect(checkPassword('čćšžđ')).toBe('too_short');
    expect(checkPassword('čćšžđab')).toBeNull();
  });

  it('counts a letter and its separate accent as one character', () => {
    // "č" typed as "c" plus a combining caron, then 6 more letters: 7 characters once normalised.
    expect(checkPassword('čabcdef')).toBeNull();
    expect(checkPassword('čabcd')).toBe('too_short');
  });

  it('allows up to 128 characters', () => {
    expect(MAX_PASSWORD_LENGTH).toBe(128);
    expect(checkPassword('a'.repeat(128))).toBeNull();
    expect(checkPassword('a'.repeat(129))).toBe('too_long');
  });
});

describe('hashPassword and verifyPassword', () => {
  it('accepts the right password', async () => {
    const hash = await hashPassword('tajna-lozinka', FAST);

    await expect(verifyPassword('tajna-lozinka', hash)).resolves.toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await hashPassword('tajna-lozinka', FAST);

    await expect(verifyPassword('tajna-lozinkA', hash)).resolves.toBe(false);
    await expect(verifyPassword('', hash)).resolves.toBe(false);
  });

  it('gives a different hash each time, thanks to a random salt', async () => {
    const first = await hashPassword('tajna-lozinka', FAST);
    const second = await hashPassword('tajna-lozinka', FAST);

    expect(first).not.toBe(second);
    await expect(verifyPassword('tajna-lozinka', second)).resolves.toBe(true);
  });

  it('never contains the password itself', async () => {
    const hash = await hashPassword('tajna-lozinka', FAST);

    expect(hash).not.toContain('tajna-lozinka');
    expect(hash.startsWith('scrypt$1024$8$1$')).toBe(true);
  });

  it('treats the two ways of typing the same letter as the same password', async () => {
    const hash = await hashPassword('lozinka-č', FAST);

    await expect(verifyPassword('lozinka-č', hash)).resolves.toBe(true);
  });

  it('keeps working for hashes made with another cost', async () => {
    const oldHash = await hashPassword('tajna-lozinka', { N: 2048, r: 8, p: 1 });

    await expect(verifyPassword('tajna-lozinka', oldHash)).resolves.toBe(true);
  });

  it('works with the default (production) cost', async () => {
    const hash = await hashPassword('tajna-lozinka');

    expect(hash.startsWith(`scrypt$${2 ** 17}$8$1$`)).toBe(true);
    await expect(verifyPassword('tajna-lozinka', hash)).resolves.toBe(true);
    await expect(verifyPassword('pogresna', hash)).resolves.toBe(false);
  });

  it.each([
    ['an empty value', ''],
    ['text that is not a hash', 'nonsense'],
    ['another algorithm', 'bcrypt$1024$8$1$c2FsdA==$aGFzaA=='],
    ['too few parts', 'scrypt$1024$8$c2FsdA==$aGFzaA=='],
    ['a cost that is not a number', 'scrypt$abc$8$1$c2FsdA==$aGFzaA=='],
    ['a cost scrypt does not accept', 'scrypt$1000$8$1$c2FsdA==$aGFzaA=='],
    ['an empty salt', 'scrypt$1024$8$1$$aGFzaA=='],
    ['an empty hash', 'scrypt$1024$8$1$c2FsdA==$'],
  ])('returns false, without throwing, for %s', async (_name, stored) => {
    await expect(verifyPassword('tajna-lozinka', stored)).resolves.toBe(false);
  });
});
