import type pg from 'pg';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { createPool } from '../db/pool.ts';
import { inRolledBackTransaction, insertSchool, insertUser } from '../db/testUtils.ts';
import { deleteExpired, startCleanup } from './cleanup.ts';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// These tests talk to the real local database, so they run only when DATABASE_URL is set.
describe.skipIf(!process.env.DATABASE_URL)('deleteExpired', () => {
  // Created in beforeAll because describe bodies run even when the suite is skipped.
  let pool: pg.Pool;

  beforeAll(() => {
    pool = createPool();
  });

  afterAll(() => pool.end());

  async function addSession(client: pg.PoolClient, userId: string, hash: string, ends: string) {
    await client.query(
      `INSERT INTO sessions (user_id, token_hash, created_at, expires_at)
       VALUES ($1, $2, now() - interval '60 days', now() + $3::interval)`,
      [userId, hash, ends],
    );
  }

  async function addLink(
    client: pg.PoolClient,
    ids: { schoolId: string; userId: string },
    hash: string,
    expires: string,
  ) {
    await client.query(
      `INSERT INTO activation_tokens (user_id, school_id, created_by, token_hash, created_at, expires_at)
       VALUES ($1, $2, $1, $3, now() - interval '90 days', now() + $4::interval)`,
      [ids.userId, ids.schoolId, hash, expires],
    );
  }

  it('removes ended sessions and keeps the ones still running', async () => {
    await inRolledBackTransaction(pool, async (client) => {
      const schoolId = await insertSchool(client);
      const userId = await insertUser(client, schoolId, 'admin');
      await addSession(client, userId, 'ended', '-1 day');
      await addSession(client, userId, 'running', '1 day');

      const result = await deleteExpired(client);

      expect(result.sessions).toBe(1);
      const { rows } = await client.query<{ token_hash: string }>(
        'SELECT token_hash FROM sessions',
      );
      expect(rows).toEqual([{ token_hash: 'running' }]);
    });
  });

  it('removes activation links that expired more than 30 days ago, whatever happened to them', async () => {
    await inRolledBackTransaction(pool, async (client) => {
      const schoolId = await insertSchool(client);
      // One user per link, because a user has at most one live link at a time.
      const links: [string, string][] = [
        ['long-gone', '-31 days'],
        ['just-expired', '-1 day'],
        ['still-valid', '3 days'],
      ];
      for (const [hash, expires] of links) {
        const userId = await insertUser(client, schoolId, 'admin');
        await addLink(client, { schoolId, userId }, hash, expires);
      }
      const usedBy = await insertUser(client, schoolId, 'admin');
      await client.query(
        `INSERT INTO activation_tokens
           (user_id, school_id, created_by, token_hash, created_at, expires_at, used_at)
         VALUES ($1, $2, $1, 'used-long-ago', now() - interval '90 days',
                 now() - interval '40 days', now() - interval '80 days')`,
        [usedBy, schoolId],
      );

      const result = await deleteExpired(client);

      expect(result.activationLinks).toBe(2);
      const { rows } = await client.query<{ token_hash: string }>(
        'SELECT token_hash FROM activation_tokens ORDER BY token_hash',
      );
      expect(rows.map((row) => row.token_hash)).toEqual(['just-expired', 'still-valid']);
    });
  });

  it('does nothing when there is nothing to remove', async () => {
    await inRolledBackTransaction(pool, async (client) => {
      expect(await deleteExpired(client)).toEqual({ sessions: 0, activationLinks: 0 });
    });
  });
});

describe('startCleanup', () => {
  const queryReturning = (rowCount: number) => vi.fn().mockResolvedValue({ rows: [], rowCount });

  it('runs at once and then every interval, until stopped', async () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const query = queryReturning(0);

    const stop = startCleanup({ query }, { intervalMs: 1000 });
    await vi.advanceTimersByTimeAsync(0);
    const afterStart = query.mock.calls.length;
    await vi.advanceTimersByTimeAsync(2500);
    const afterTwoRounds = query.mock.calls.length;
    stop();
    await vi.advanceTimersByTimeAsync(5000);

    expect(afterStart).toBe(2); // sessions and links
    expect(afterTwoRounds).toBe(6); // two more rounds
    expect(query.mock.calls.length).toBe(afterTwoRounds);
  });

  it('only logs a failure and keeps running', async () => {
    vi.useFakeTimers();
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const query = vi.fn().mockRejectedValue(new Error('database is down'));

    const stop = startCleanup({ query }, { intervalMs: 1000 });
    await vi.advanceTimersByTimeAsync(2500);
    stop();

    expect(error).toHaveBeenCalledWith('Cleanup failed:', 'database is down');
    expect(error.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('says what it removed, but stays quiet when there was nothing', async () => {
    vi.useFakeTimers();
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    const quiet = startCleanup({ query: queryReturning(0) }, { intervalMs: 1000 });
    await vi.advanceTimersByTimeAsync(0);
    quiet();
    expect(log).not.toHaveBeenCalled();

    const busy = startCleanup({ query: queryReturning(3) }, { intervalMs: 1000 });
    await vi.advanceTimersByTimeAsync(0);
    busy();
    expect(log).toHaveBeenCalledWith(
      'Cleanup removed 3 ended sessions and 3 old activation links.',
    );
  });
});
