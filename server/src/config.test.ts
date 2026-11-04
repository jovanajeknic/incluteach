import { describe, expect, it } from 'vitest';

import { loadConfig } from './config.ts';

describe('loadConfig', () => {
  it('returns the database URL from the environment', () => {
    expect(loadConfig({ DATABASE_URL: 'postgresql://u:p@localhost:5432/db' })).toEqual({
      databaseUrl: 'postgresql://u:p@localhost:5432/db',
    });
  });

  it('trims surrounding whitespace', () => {
    expect(loadConfig({ DATABASE_URL: '  postgresql://localhost/db \n' }).databaseUrl).toBe(
      'postgresql://localhost/db',
    );
  });

  it.each([undefined, '', '   '])('throws a helpful error when DATABASE_URL is %j', (value) => {
    expect(() => loadConfig({ DATABASE_URL: value })).toThrow(/DATABASE_URL is not set/);
  });
});
