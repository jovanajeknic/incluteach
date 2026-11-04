import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createPool } from './pool.ts';
import { inRolledBackTransaction, insertSchool, insertUser, randomUsername } from './testUtils.ts';

interface TokenFields {
  userId: string;
  schoolId: string;
  createdBy: string;
  tokenHash?: string;
  expiresAt?: string;
  usedAt?: string | null;
  revokedAt?: string | null;
}

let hashCounter = 0;

function uniqueHash(): string {
  hashCounter += 1;
  return `hash-${process.pid}-${hashCounter}`;
}

async function insertActivationToken(client: pg.PoolClient, fields: TokenFields): Promise<string> {
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO activation_tokens
       (user_id, school_id, created_by, token_hash, expires_at, used_at, revoked_at)
     VALUES ($1, $2, $3, $4, COALESCE($5::timestamptz, now() + interval '7 days'), $6, $7)
     RETURNING id`,
    [
      fields.userId,
      fields.schoolId,
      fields.createdBy,
      fields.tokenHash ?? uniqueHash(),
      fields.expiresAt ?? null,
      fields.usedAt ?? null,
      fields.revokedAt ?? null,
    ],
  );
  return rows[0].id;
}

async function insertSession(
  client: pg.PoolClient,
  userId: string,
  tokenHash = uniqueHash(),
  expiresAt = `now() + interval '1 day'`,
): Promise<string> {
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO sessions (user_id, token_hash, expires_at)
     VALUES ($1, $2, ${expiresAt}) RETURNING id`,
    [userId, tokenHash],
  );
  return rows[0].id;
}

async function createFixture(client: pg.PoolClient) {
  const schoolId = await insertSchool(client);
  const adminId = await insertUser(client, schoolId, 'admin');
  const studentId = await insertUser(client, schoolId, 'student');
  return { schoolId, adminId, studentId };
}

type Fixture = Awaited<ReturnType<typeof createFixture>>;

// These tests talk to the real local database, so they run only when DATABASE_URL is set.
describe.skipIf(!process.env.DATABASE_URL)('authentication tables', () => {
  // Created in beforeAll because describe bodies run even when the suite is skipped.
  let pool: pg.Pool;

  beforeAll(() => {
    pool = createPool();
  });

  afterAll(() => pool.end());

  const inTransaction = (run: (client: pg.PoolClient, f: Fixture) => Promise<void>) =>
    inRolledBackTransaction(pool, async (client) => run(client, await createFixture(client)));

  const foreignKeyViolation = /violates foreign key constraint/;
  const checkViolation = /violates check constraint/;
  const uniqueViolation = /duplicate key value violates unique constraint/;

  describe('usernames', () => {
    it.each(['ana_ivic', 'ana_ivic2', 'a1b', 'x'.repeat(40)])('accept "%s"', async (username) => {
      await inTransaction(async (client, f) => {
        await expect(insertUser(client, f.schoolId, 'student', username)).resolves.toBeTruthy();
      });
    });

    it.each(['Ana_Ivic', 'ana ivic', 'ana-ivic', 'ana.ivic', 'ab', '', 'x'.repeat(41), 'ana_ivić'])(
      'reject "%s"',
      async (username) => {
        await inTransaction(async (client, f) => {
          await expect(insertUser(client, f.schoolId, 'student', username)).rejects.toThrow(
            checkViolation,
          );
        });
      },
    );

    it('are required', async () => {
      await inTransaction(async (client, f) => {
        await expect(
          client.query(
            `INSERT INTO users (full_name, role, school_id) VALUES ('Test User', 'student', $1)`,
            [f.schoolId],
          ),
        ).rejects.toThrow(/null value in column "username"/);
      });
    });

    it('are unique, even across schools', async () => {
      await inTransaction(async (client, f) => {
        const otherSchoolId = await insertSchool(client, 'School B');
        await insertUser(client, f.schoolId, 'student', 'ana_ivic');

        await expect(insertUser(client, otherSchoolId, 'teacher', 'ana_ivic')).rejects.toThrow(
          uniqueViolation,
        );
      });
    });
  });

  describe('activated accounts', () => {
    it('need an email once they have a password', async () => {
      await inTransaction(async (client, f) => {
        await expect(
          client.query(`UPDATE users SET password_hash = 'hash' WHERE id = $1`, [f.studentId]),
        ).rejects.toThrow(checkViolation);
      });
    });

    it('accept a password together with an email', async () => {
      await inTransaction(async (client, f) => {
        await expect(
          client.query(
            `UPDATE users SET password_hash = 'hash', email = 'ana@example.com' WHERE id = $1`,
            [f.studentId],
          ),
        ).resolves.toBeTruthy();
      });
    });

    it('cannot share an email, whatever the letter case', async () => {
      await inTransaction(async (client, f) => {
        const otherId = await insertUser(client, f.schoolId, 'parent');
        await client.query(`UPDATE users SET email = 'Ana@Example.com' WHERE id = $1`, [
          f.studentId,
        ]);

        await expect(
          client.query(`UPDATE users SET email = 'ana@example.COM' WHERE id = $1`, [otherId]),
        ).rejects.toThrow(uniqueViolation);
      });
    });
  });

  describe('activation tokens', () => {
    it('can be issued by an admin of the same school for one of its users', async () => {
      await inTransaction(async (client, f) => {
        await expect(
          insertActivationToken(client, { ...f, userId: f.studentId, createdBy: f.adminId }),
        ).resolves.toBeTruthy();
      });
    });

    it('have a unique hash', async () => {
      await inTransaction(async (client, f) => {
        const otherId = await insertUser(client, f.schoolId, 'parent');
        const base = { schoolId: f.schoolId, createdBy: f.adminId, tokenHash: 'same-hash' };
        await insertActivationToken(client, { ...base, userId: f.studentId });

        await expect(insertActivationToken(client, { ...base, userId: otherId })).rejects.toThrow(
          uniqueViolation,
        );
      });
    });

    it('allow only one live token per user', async () => {
      await inTransaction(async (client, f) => {
        const fields = { schoolId: f.schoolId, userId: f.studentId, createdBy: f.adminId };
        await insertActivationToken(client, fields);

        await expect(insertActivationToken(client, fields)).rejects.toThrow(uniqueViolation);
      });
    });

    it('allow a new token once the old one is revoked', async () => {
      await inTransaction(async (client, f) => {
        const fields = { schoolId: f.schoolId, userId: f.studentId, createdBy: f.adminId };
        await insertActivationToken(client, fields);
        await client.query(`UPDATE activation_tokens SET revoked_at = now()`);

        await expect(insertActivationToken(client, fields)).resolves.toBeTruthy();
      });
    });

    it('allow a new token once the old one is used (for example to reset a password)', async () => {
      await inTransaction(async (client, f) => {
        const fields = { schoolId: f.schoolId, userId: f.studentId, createdBy: f.adminId };
        await insertActivationToken(client, fields);
        await client.query(`UPDATE activation_tokens SET used_at = now()`);

        await expect(insertActivationToken(client, fields)).resolves.toBeTruthy();
      });
    });

    it('cannot be both used and revoked', async () => {
      await inTransaction(async (client, f) => {
        await expect(
          insertActivationToken(client, {
            schoolId: f.schoolId,
            userId: f.studentId,
            createdBy: f.adminId,
            usedAt: new Date().toISOString(),
            revokedAt: new Date().toISOString(),
          }),
        ).rejects.toThrow(checkViolation);
      });
    });

    it('must expire after they are created', async () => {
      await inTransaction(async (client, f) => {
        await expect(
          insertActivationToken(client, {
            schoolId: f.schoolId,
            userId: f.studentId,
            createdBy: f.adminId,
            expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          }),
        ).rejects.toThrow(checkViolation);
      });
    });

    it.each(['teacher', 'student', 'parent'] as const)(
      'cannot be issued by a user with the role "%s"',
      async (role) => {
        await inTransaction(async (client, f) => {
          const notAnAdminId = await insertUser(client, f.schoolId, role);

          await expect(
            insertActivationToken(client, {
              schoolId: f.schoolId,
              userId: f.studentId,
              createdBy: notAnAdminId,
            }),
          ).rejects.toThrow(foreignKeyViolation);
        });
      },
    );

    it('cannot be issued by an admin of another school', async () => {
      await inTransaction(async (client, f) => {
        const otherAdminId = await insertUser(
          client,
          await insertSchool(client, 'School B'),
          'admin',
        );

        await expect(
          insertActivationToken(client, {
            schoolId: f.schoolId,
            userId: f.studentId,
            createdBy: otherAdminId,
          }),
        ).rejects.toThrow(foreignKeyViolation);
      });
    });

    it('cannot be issued for a user of another school', async () => {
      await inTransaction(async (client, f) => {
        const otherSchoolId = await insertSchool(client, 'School B');
        const otherStudentId = await insertUser(client, otherSchoolId, 'student');

        await expect(
          insertActivationToken(client, {
            schoolId: f.schoolId,
            userId: otherStudentId,
            createdBy: f.adminId,
          }),
        ).rejects.toThrow(foreignKeyViolation);
      });
    });
  });

  describe('sessions', () => {
    it('can be created for a user', async () => {
      await inTransaction(async (client, f) => {
        await expect(insertSession(client, f.studentId)).resolves.toBeTruthy();
      });
    });

    it('have a unique token hash', async () => {
      await inTransaction(async (client, f) => {
        await insertSession(client, f.studentId, 'same-hash');

        await expect(insertSession(client, f.adminId, 'same-hash')).rejects.toThrow(
          uniqueViolation,
        );
      });
    });

    it('must expire after they are created', async () => {
      await inTransaction(async (client, f) => {
        await expect(
          insertSession(client, f.studentId, uniqueHash(), `now() - interval '1 hour'`),
        ).rejects.toThrow(checkViolation);
      });
    });

    it('need an existing user', async () => {
      await inTransaction(async (client) => {
        await expect(insertSession(client, '00000000-0000-0000-0000-000000000000')).rejects.toThrow(
          foreignKeyViolation,
        );
      });
    });

    it('are removed together with their user', async () => {
      await inTransaction(async (client) => {
        const schoolId = await insertSchool(client, 'School B');
        const userId = await insertUser(client, schoolId, 'student', randomUsername());
        await insertSession(client, userId);

        await client.query('DELETE FROM users WHERE id = $1', [userId]);

        const { rows } = await client.query('SELECT 1 FROM sessions WHERE user_id = $1', [userId]);
        expect(rows).toHaveLength(0);
      });
    });
  });
});
