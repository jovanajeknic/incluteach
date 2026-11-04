import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createPool } from '../db/pool.ts';
import { inRolledBackTransaction, insertSchool, insertUser } from '../db/testUtils.ts';
import { HttpError } from '../http/errors.ts';
import { USER_ROLES } from '../roles.ts';
import { createUser } from './createUser.ts';

// These tests talk to the real local database, so they run only when DATABASE_URL is set.
describe.skipIf(!process.env.DATABASE_URL)('createUser', () => {
  // Created in beforeAll because describe bodies run even when the suite is skipped.
  let pool: pg.Pool;

  beforeAll(() => {
    pool = createPool();
  });

  afterAll(() => pool.end());

  const inTransaction = (run: (client: pg.PoolClient, schoolId: string) => Promise<void>) =>
    inRolledBackTransaction(pool, async (client) => run(client, await insertSchool(client)));

  it('creates an account with a username made from the name', async () => {
    await inTransaction(async (client, schoolId) => {
      const user = await createUser(client, { schoolId, role: 'student', fullName: 'Ana Ivić' });

      expect(user).toMatchObject({
        username: 'ana_ivic',
        fullName: 'Ana Ivić',
        email: null,
        role: 'student',
        schoolId,
      });
    });
  });

  it('leaves the account without a password until it is activated', async () => {
    await inTransaction(async (client, schoolId) => {
      const user = await createUser(client, { schoolId, role: 'teacher', fullName: 'Ana Ivić' });

      const { rows } = await client.query<{ password_hash: string | null }>(
        'SELECT password_hash FROM users WHERE id = $1',
        [user.id],
      );
      expect(rows[0].password_hash).toBeNull();
    });
  });

  it.each(USER_ROLES)('can create a user with the role "%s"', async (role) => {
    await inTransaction(async (client, schoolId) => {
      const user = await createUser(client, { schoolId, role, fullName: 'Ana Ivić' });

      expect(user.role).toBe(role);
    });
  });

  it('adds a number to the username when the name is already taken', async () => {
    await inTransaction(async (client, schoolId) => {
      const first = await createUser(client, { schoolId, role: 'student', fullName: 'Ana Ivić' });
      const second = await createUser(client, { schoolId, role: 'parent', fullName: 'Ana Ivić' });
      const third = await createUser(client, { schoolId, role: 'student', fullName: 'ANA IVIĆ' });

      expect([first.username, second.username, third.username]).toEqual([
        'ana_ivic',
        'ana_ivic2',
        'ana_ivic3',
      ]);
    });
  });

  it('keeps usernames unique across schools', async () => {
    await inTransaction(async (client, schoolId) => {
      const otherSchoolId = await insertSchool(client, 'School B');
      await createUser(client, { schoolId, role: 'student', fullName: 'Ana Ivić' });

      const user = await createUser(client, {
        schoolId: otherSchoolId,
        role: 'student',
        fullName: 'Ana Ivić',
      });

      expect(user.username).toBe('ana_ivic2');
    });
  });

  it('skips a username that was created some other way', async () => {
    await inTransaction(async (client, schoolId) => {
      await insertUser(client, schoolId, 'student', 'ana_ivic');
      await insertUser(client, schoolId, 'student', 'ana_ivic2');

      const user = await createUser(client, { schoolId, role: 'student', fullName: 'Ana Ivić' });

      expect(user.username).toBe('ana_ivic3');
    });
  });

  it('does not confuse a longer surname with the same one', async () => {
    await inTransaction(async (client, schoolId) => {
      await insertUser(client, schoolId, 'student', 'ana_ivicevic');

      const user = await createUser(client, { schoolId, role: 'student', fullName: 'Ana Ivić' });

      expect(user.username).toBe('ana_ivic');
    });
  });

  it('handles an underscore in the name without treating it as a wildcard', async () => {
    await inTransaction(async (client, schoolId) => {
      await insertUser(client, schoolId, 'student', 'anaxivic');

      const user = await createUser(client, { schoolId, role: 'student', fullName: 'Ana Ivić' });

      expect(user.username).toBe('ana_ivic');
    });
  });

  it('refuses a name without letters', async () => {
    await inTransaction(async (client, schoolId) => {
      const error = await createUser(client, {
        schoolId,
        role: 'student',
        fullName: '###',
      }).catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).code).toBe('invalid_full_name');
    });
  });
});
