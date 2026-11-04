import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createPool } from './pool.ts';
import { inTransaction } from './transaction.ts';
import { inRolledBackTransaction, insertSchool } from './testUtils.ts';

// These tests talk to the real local database, so they run only when DATABASE_URL is set.
describe.skipIf(!process.env.DATABASE_URL)('inTransaction', () => {
  // Created in beforeAll because describe bodies run even when the suite is skipped.
  let pool: pg.Pool;

  beforeAll(() => {
    pool = createPool();
  });

  afterAll(() => pool.end());

  const schoolCount = async (db: Pick<pg.Pool, 'query'>, name: string) =>
    (await db.query<{ count: string }>('SELECT count(*) FROM schools WHERE name = $1', [name]))
      .rows[0].count;

  describe('inside a connection that is already in a transaction', () => {
    it('returns what the function returns and keeps its changes', async () => {
      await inRolledBackTransaction(pool, async (client) => {
        const result = await inTransaction(client, async (db) => {
          await db.query("INSERT INTO schools (name) VALUES ('kept')");
          return 42;
        });

        expect(result).toBe(42);
        expect(await schoolCount(client, 'kept')).toBe('1');
      });
    });

    it('undoes only its own changes when the function fails, and passes the error on', async () => {
      await inRolledBackTransaction(pool, async (client) => {
        await insertSchool(client, 'before');

        await expect(
          inTransaction(client, async (db) => {
            await db.query("INSERT INTO schools (name) VALUES ('lost')");
            throw new Error('something went wrong');
          }),
        ).rejects.toThrow('something went wrong');

        expect(await schoolCount(client, 'lost')).toBe('0');
        expect(await schoolCount(client, 'before')).toBe('1');
        // The outer transaction is still usable.
        await expect(insertSchool(client, 'after')).resolves.toBeTruthy();
      });
    });

    it('recovers from a database error inside the function', async () => {
      await inRolledBackTransaction(pool, async (client) => {
        await expect(
          inTransaction(client, async (db) => {
            await db.query("INSERT INTO schools (name) VALUES ('lost')");
            await db.query('SELECT * FROM table_that_does_not_exist');
          }),
        ).rejects.toThrow(/table_that_does_not_exist/);

        expect(await schoolCount(client, 'lost')).toBe('0');
        await expect(insertSchool(client, 'after')).resolves.toBeTruthy();
      });
    });
  });

  describe('with a pool', () => {
    const name = `transaction-test-${process.pid}`;

    it('commits when the function succeeds', async () => {
      try {
        await inTransaction(pool, async (db) => {
          await db.query('INSERT INTO schools (name) VALUES ($1)', [name]);
        });

        // Another connection sees it, so it was really committed.
        expect(await schoolCount(pool, name)).toBe('1');
      } finally {
        await pool.query('DELETE FROM schools WHERE name = $1', [name]);
      }
    });

    it('rolls back when the function fails', async () => {
      try {
        await expect(
          inTransaction(pool, async (db) => {
            await db.query('INSERT INTO schools (name) VALUES ($1)', [name]);
            throw new Error('something went wrong');
          }),
        ).rejects.toThrow('something went wrong');

        expect(await schoolCount(pool, name)).toBe('0');
      } finally {
        await pool.query('DELETE FROM schools WHERE name = $1', [name]);
      }
    });
  });
});
