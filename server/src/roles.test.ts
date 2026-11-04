import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type pg from 'pg';

import { createPool } from './db/pool.ts';
import { isUserRole, USER_ROLES } from './roles.ts';

describe('isUserRole', () => {
  it.each(USER_ROLES)('accepts "%s"', (role) => {
    expect(isUserRole(role)).toBe(true);
  });

  it.each(['superadmin', 'Admin', '', null, undefined, 42])('rejects %j', (value) => {
    expect(isUserRole(value)).toBe(false);
  });
});

// These tests talk to the real local database, so they run only when DATABASE_URL is set.
describe.skipIf(!process.env.DATABASE_URL)('users.role column', () => {
  // Created in beforeAll because describe bodies run even when the suite is skipped.
  let pool: pg.Pool;

  beforeAll(() => {
    pool = createPool();
  });

  afterAll(() => pool.end());

  // Every test runs in a transaction that is rolled back, so no test data is left behind.
  async function inRolledBackTransaction(run: (client: pg.PoolClient) => Promise<void>) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await run(client);
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  }

  it('has the same values as USER_ROLES', async () => {
    const { rows } = await pool.query<{ role: string }>(
      `SELECT enumlabel AS role FROM pg_enum
       WHERE enumtypid = 'user_role'::regtype ORDER BY enumsortorder`,
    );

    expect(rows.map((row) => row.role)).toEqual([...USER_ROLES]);
  });

  it.each(USER_ROLES)('accepts a user with the role "%s"', async (role) => {
    await inRolledBackTransaction(async (client) => {
      const { rows } = await client.query<{ role: string }>(
        `INSERT INTO users (full_name, role) VALUES ('Test User', $1) RETURNING role`,
        [role],
      );

      expect(rows[0].role).toBe(role);
    });
  });

  it('rejects an unknown role', async () => {
    await inRolledBackTransaction(async (client) => {
      await expect(
        client.query(`INSERT INTO users (full_name, role) VALUES ('Test User', 'superadmin')`),
      ).rejects.toThrow(/invalid input value for enum user_role/);
    });
  });

  it('rejects a user without a role', async () => {
    await inRolledBackTransaction(async (client) => {
      await expect(
        client.query(`INSERT INTO users (full_name) VALUES ('Test User')`),
      ).rejects.toThrow(/null value in column "role"/);
    });
  });
});
