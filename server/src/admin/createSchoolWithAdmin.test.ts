import type pg from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../app.ts';
import { activationUrl } from '../auth/activation.ts';
import { createPool } from '../db/pool.ts';
import { inRolledBackTransaction } from '../db/testUtils.ts';
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

  it('leads from the script to a working school: activate, sign in, add a teacher', async () => {
    await inTransaction(async (client) => {
      const app = createApp({ pool: client, publicUrl: PUBLIC_URL });
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
      expect(teacher.body.user.schoolId).toBe(activated.body.user.schoolId);
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
