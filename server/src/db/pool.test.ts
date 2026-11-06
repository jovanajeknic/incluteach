import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { checkConnection, createPool } from './pool.ts';

// These tests talk to the real local database, so they run only when DATABASE_URL is set.
describe.skipIf(!process.env.DATABASE_URL)('database connection', () => {
  // Created in beforeAll because describe bodies run even when the suite is skipped.
  let pool: pg.Pool;

  beforeAll(() => {
    pool = createPool();
  });

  afterAll(() => pool.end());

  it('connects and reports the database and user', async () => {
    const info = await checkConnection(pool);

    expect(info.database).toBeTruthy();
    expect(info.user).toBeTruthy();
    expect(info.version).toMatch(/PostgreSQL/);
  });

  describe('after migrations', () => {
    let usersTable: string | null = null;

    beforeAll(async () => {
      // Looked up through the search path, so it works in the test schema as well as in public.
      const { rows } = await pool.query<{ name: string | null }>(
        `SELECT to_regclass('users')::text AS name`,
      );
      usersTable = rows[0].name;
    });

    it('has the users table', () => {
      expect(usersTable).toBe('users');
    });
  });
});

describe('createPool', () => {
  it('rejects with an error instead of hanging when the database is unreachable', async () => {
    // Port 1 is never a PostgreSQL server, so the connection is refused immediately.
    const pool = createPool('postgresql://nobody:nothing@127.0.0.1:1/missing');

    await expect(checkConnection(pool)).rejects.toThrow();
    await pool.end();
  });
});
