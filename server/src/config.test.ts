import { describe, expect, it } from 'vitest';

import { loadConfig } from './config.ts';

const DATABASE_URL = 'postgresql://u:p@localhost:5432/db';

describe('loadConfig', () => {
  it('returns the database URL from the environment', () => {
    expect(loadConfig({ DATABASE_URL }).databaseUrl).toBe(DATABASE_URL);
  });

  it('trims surrounding whitespace', () => {
    expect(loadConfig({ DATABASE_URL: '  postgresql://localhost/db \n' }).databaseUrl).toBe(
      'postgresql://localhost/db',
    );
  });

  it.each([undefined, '', '   '])('throws a helpful error when DATABASE_URL is %j', (value) => {
    expect(() => loadConfig({ DATABASE_URL: value })).toThrow(/DATABASE_URL is not set/);
  });

  describe('port', () => {
    it('defaults to 3000', () => {
      expect(loadConfig({ DATABASE_URL }).port).toBe(3000);
    });

    it('uses PORT when it is set', () => {
      expect(loadConfig({ DATABASE_URL, PORT: '4100' }).port).toBe(4100);
    });

    it.each(['abc', '0', '70000', '-1', '30.5'])('rejects the invalid PORT "%s"', (value) => {
      expect(() => loadConfig({ DATABASE_URL, PORT: value })).toThrow(/PORT must be/);
    });
  });

  describe('secureCookies', () => {
    it('is on only in production', () => {
      expect(loadConfig({ DATABASE_URL, NODE_ENV: 'production' }).secureCookies).toBe(true);
      expect(loadConfig({ DATABASE_URL, NODE_ENV: 'development' }).secureCookies).toBe(false);
      expect(loadConfig({ DATABASE_URL }).secureCookies).toBe(false);
    });
  });

  describe('publicUrl', () => {
    it('defaults to the local frontend', () => {
      expect(loadConfig({ DATABASE_URL }).publicUrl).toBe('http://localhost:5173');
    });

    it.each([
      ['https://skola.example.com', 'https://skola.example.com'],
      ['https://skola.example.com/', 'https://skola.example.com'],
      ['  https://skola.example.com///  ', 'https://skola.example.com'],
      ['https://example.com/app/', 'https://example.com/app'],
    ])('turns "%s" into "%s"', (value, expected) => {
      expect(loadConfig({ DATABASE_URL, PUBLIC_URL: value }).publicUrl).toBe(expected);
    });

    it.each(['skola.example.com', 'ftp://example.com', 'not a url'])(
      'rejects the invalid PUBLIC_URL "%s"',
      (value) => {
        expect(() => loadConfig({ DATABASE_URL, PUBLIC_URL: value })).toThrow(/PUBLIC_URL must/);
      },
    );
  });
});
