import type pg from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../app.ts';
import { activationUrl } from '../auth/activation.ts';
import { createPool } from '../db/pool.ts';
import { FAST_HASH_COST, inRolledBackTransaction } from '../db/testUtils.ts';
import { createSchoolWithAdmin } from './createSchoolWithAdmin.ts';

const PUBLIC_URL = 'https://skola.example.com';

// These tests talk to the real local database, so they run only when DATABASE_URL is set.
describe.skipIf(!process.env.DATABASE_URL)('createSchoolWithAdmin', () => {
  // Created in beforeAll because describe bodies run even when the suite is skipped.
  let pool: pg.Pool;

  beforeAll(() => {
    pool = createPool();
  });

  afterAll(() => pool.end());

  const inTransaction = (run: (client: pg.PoolClient) => Promise<void>) =>
    inRolledBackTransaction(pool, run);

  it('creates the school and an admin who cannot sign in yet', async () => {
    await inTransaction(async (client) => {
      const result = await createSchoolWithAdmin(client, {
        schoolName: 'OŠ Branko Radičević',
        adminName: 'Ana Ivić',
      });

      expect(result.school.name).toBe('OŠ Branko Radičević');
      expect(result.admin).toMatchObject({
        username: 'ana_ivic',
        role: 'admin',
        schoolId: result.school.id,
        email: null,
      });
      const { rows } = await client.query<{ password_hash: string | null }>(
        'SELECT password_hash FROM users WHERE id = $1',
        [result.admin.id],
      );
      expect(rows[0].password_hash).toBeNull();
    });
  });

  it('gives a link valid for 7 days', async () => {
    await inTransaction(async (client) => {
      const { activation } = await createSchoolWithAdmin(client, {
        schoolName: 'OŠ Test',
        adminName: 'Ana Ivić',
      });

      const days = (activation.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
      expect(days).toBeGreaterThan(6.99);
      expect(days).toBeLessThanOrEqual(7);
    });
  });

  it('lets two schools have admins with the same name', async () => {
    await inTransaction(async (client) => {
      const first = await createSchoolWithAdmin(client, { schoolName: 'A', adminName: 'Ana Ivić' });
      const second = await createSchoolWithAdmin(client, {
        schoolName: 'B',
        adminName: 'Ana Ivić',
      });

      expect(first.admin.username).toBe('ana_ivic');
      expect(second.admin.username).toBe('ana_ivic2');
    });
  });

  describe('when the school already exists', () => {
    const countSchools = async (client: pg.PoolClient, name: string) =>
      (
        await client.query<{ count: string }>(
          'SELECT count(*) FROM schools WHERE lower(name) = lower($1)',
          [name],
        )
      ).rows[0].count;

    it('adds the new admin to that school instead of creating another one', async () => {
      await inTransaction(async (client) => {
        const first = await createSchoolWithAdmin(client, {
          schoolName: 'OŠ Test',
          adminName: 'Ana Ivić',
        });
        const second = await createSchoolWithAdmin(client, {
          schoolName: 'OŠ Test',
          adminName: 'Jovan Jovanović',
        });

        expect(first.schoolCreated).toBe(true);
        expect(second.schoolCreated).toBe(false);
        expect(second.school.id).toBe(first.school.id);
        expect(second.admin.schoolId).toBe(first.school.id);
        expect(await countSchools(client, 'OŠ Test')).toBe('1');
      });
    });

    it('finds the school whatever the letter case', async () => {
      await inTransaction(async (client) => {
        const first = await createSchoolWithAdmin(client, {
          schoolName: 'OŠ Test',
          adminName: 'Ana Ivić',
        });
        const second = await createSchoolWithAdmin(client, {
          schoolName: 'oš TEST',
          adminName: 'Jovan Jovanović',
        });

        expect(second.school.id).toBe(first.school.id);
      });
    });

    it('does not mix up schools with different names', async () => {
      await inTransaction(async (client) => {
        const first = await createSchoolWithAdmin(client, {
          schoolName: 'OŠ Test',
          adminName: 'Ana Ivić',
        });
        const second = await createSchoolWithAdmin(client, {
          schoolName: 'OŠ Test 2',
          adminName: 'Jovan Jovanović',
        });

        expect(second.schoolCreated).toBe(true);
        expect(second.school.id).not.toBe(first.school.id);
      });
    });

    it('lets the admins of that school issue links for each other', async () => {
      await inTransaction(async (client) => {
        const app = createApp({
          pool: client,
          publicUrl: PUBLIC_URL,
          passwordCost: FAST_HASH_COST,
        });
        const first = await createSchoolWithAdmin(client, {
          schoolName: 'OŠ Test',
          adminName: 'Ana Ivić',
        });
        const second = await createSchoolWithAdmin(client, {
          schoolName: 'OŠ Test',
          adminName: 'Jovan Jovanović',
        });

        await request(app).post('/auth/activate').send({
          token: first.activation.token,
          password: 'admin-lozinka',
          email: 'ana@skola.example.com',
        });
        const login = await request(app)
          .post('/auth/login')
          .send({ identifier: 'ana_ivic', password: 'admin-lozinka' });
        const response = await request(app)
          .post(`/users/${second.admin.id}/activation`)
          .set('Cookie', login.headers['set-cookie']);

        expect(response.status).toBe(201);
      });
    });

    it('creates a separate school when asked to', async () => {
      await inTransaction(async (client) => {
        const first = await createSchoolWithAdmin(client, {
          schoolName: 'OŠ Test',
          adminName: 'Ana Ivić',
        });
        const second = await createSchoolWithAdmin(client, {
          schoolName: 'OŠ Test',
          adminName: 'Jovan Jovanović',
          forceNewSchool: true,
        });

        expect(second.schoolCreated).toBe(true);
        expect(second.school.id).not.toBe(first.school.id);
        expect(await countSchools(client, 'OŠ Test')).toBe('2');
      });
    });

    it('refuses to guess when several schools have that name', async () => {
      await inTransaction(async (client) => {
        await client.query("INSERT INTO schools (name) VALUES ('OŠ Test'), ('OŠ Test')");

        await expect(
          createSchoolWithAdmin(client, { schoolName: 'OŠ Test', adminName: 'Ana Ivić' }),
        ).rejects.toThrow(/2 schools are called "OŠ Test"/);
        const { rows } = await client.query('SELECT 1 FROM users');
        expect(rows).toHaveLength(0);
      });
    });
  });

  it('leads from the script to a working school: activate, sign in, add a teacher', async () => {
    await inTransaction(async (client) => {
      const app = createApp({ pool: client, publicUrl: PUBLIC_URL, passwordCost: FAST_HASH_COST });
      const { activation } = await createSchoolWithAdmin(client, {
        schoolName: 'OŠ Test',
        adminName: 'Ana Ivić',
      });

      const url = new URL(activationUrl(PUBLIC_URL, activation.token));
      const activated = await request(app)
        .post('/auth/activate')
        .send({
          token: url.searchParams.get('token'),
          password: 'admin-lozinka',
          email: 'ana@skola.example.com',
        });
      expect(activated.status).toBe(200);

      const login = await request(app)
        .post('/auth/login')
        .send({ identifier: 'ana@skola.example.com', password: 'admin-lozinka' });
      expect(login.status).toBe(200);

      const teacher = await request(app)
        .post('/users')
        .set('Cookie', login.headers['set-cookie'])
        .send({ fullName: 'Jovan Jovanović', role: 'teacher' });
      expect(teacher.status).toBe(201);
      const { rows } = await client.query<{ school_id: string }>(
        'SELECT school_id FROM users WHERE id = $1',
        [teacher.body.user.id],
      );
      expect(rows[0].school_id).toBe(activated.body.user.schoolId);
    });
  });

  it('leaves nothing behind when it fails halfway', async () => {
    await inTransaction(async (client) => {
      // The caller is expected to wrap the call in a transaction; a savepoint stands in for it.
      await client.query('SAVEPOINT before_school');
      await expect(
        createSchoolWithAdmin(client, { schoolName: 'OŠ Test', adminName: '###' }),
      ).rejects.toThrow();
      await client.query('ROLLBACK TO SAVEPOINT before_school');

      const { rows } = await client.query("SELECT 1 FROM schools WHERE name = 'OŠ Test'");
      expect(rows).toHaveLength(0);
    });
  });
});
