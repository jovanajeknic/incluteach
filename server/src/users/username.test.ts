import { describe, expect, it } from 'vitest';

import { pickUsername, usernameBase } from './username.ts';

const ALLOWED = /^[a-z0-9_]{3,40}$/;

describe('usernameBase', () => {
  it.each([
    ['Ana Ivić', 'ana_ivic'],
    ['Marko Marković', 'marko_markovic'],
    ['Đorđe Đurđević', 'djordje_djurdjevic'],
    ['Žarko Šćepanović', 'zarko_scepanovic'],
    ['Čedomir Ćirić', 'cedomir_ciric'],
    ['Ana Marija Ivić', 'ana_ivic'],
    ['Marko Marković Jovanović', 'marko_jovanovic'],
    ['  ANA    IVIĆ  ', 'ana_ivic'],
    ['Ana Petrović-Njegoš', 'ana_petrovicnjegos'],
    ["Ana O'Brien", 'ana_obrien'],
    ['José Muñoz', 'jose_munoz'],
    ['Madonna', 'madonna'],
  ])('turns "%s" into "%s"', (name, expected) => {
    expect(usernameBase(name)).toBe(expected);
  });

  it.each([
    ['Љиљана Ђурђевић', 'ljiljana_djurdjevic'],
    ['Његош Џонић', 'njegos_dzonic'],
    ['Мирослав Ћосић', 'miroslav_cosic'],
  ])('turns the Cyrillic name "%s" into "%s"', (name, expected) => {
    expect(usernameBase(name)).toBe(expected);
  });

  it.each(['', '   ', '###', '- -', '李明', 'A', 'A.', '. X'])('gives nothing for "%s"', (name) => {
    expect(usernameBase(name)).toBeNull();
  });

  it('cuts very long names so a number still fits', () => {
    const base = usernameBase(`${'a'.repeat(60)} ${'b'.repeat(60)}`) as string;

    expect(base.length).toBeLessThanOrEqual(35);
  });

  it('only gives characters the database accepts', () => {
    for (const name of ['Ana Ivić', 'Љиљана Ђурђевић', 'José Muñoz', "Ana O'Brien-Smith"]) {
      expect(usernameBase(name)).toMatch(ALLOWED);
    }
  });
});

describe('pickUsername', () => {
  it('uses the base when it is free', () => {
    expect(pickUsername('ana_ivic', new Set())).toBe('ana_ivic');
    expect(pickUsername('ana_ivic', new Set(['marko_markovic']))).toBe('ana_ivic');
  });

  it('adds a number when the base is taken', () => {
    expect(pickUsername('ana_ivic', new Set(['ana_ivic']))).toBe('ana_ivic2');
  });

  it('takes the next free number', () => {
    expect(pickUsername('ana_ivic', new Set(['ana_ivic', 'ana_ivic2', 'ana_ivic3']))).toBe(
      'ana_ivic4',
    );
  });

  it('fills a gap in the numbers', () => {
    expect(pickUsername('ana_ivic', new Set(['ana_ivic', 'ana_ivic3']))).toBe('ana_ivic2');
  });

  it('adds a number when the base alone would be too short', () => {
    expect(pickUsername('ai', new Set())).toBe('ai2');
    expect(pickUsername('ai', new Set(['ai2']))).toBe('ai3');
  });

  it('always gives an allowed username, even with a long base', () => {
    const base = usernameBase(`${'a'.repeat(60)} ${'b'.repeat(60)}`) as string;
    const taken = new Set([
      base,
      ...Array.from({ length: 98 }, (_, index) => `${base}${index + 2}`),
    ]);

    expect(pickUsername(base, taken)).toMatch(ALLOWED);
  });
});
