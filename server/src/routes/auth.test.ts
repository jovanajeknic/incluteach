import type pg from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../app.ts';
import { hashToken } from '../auth/sessions.ts';
import { createPool } from '../db/pool.ts';
import {
  inRolledBackTransaction,
  insertActivatedUser,
  insertSchool,
  insertUser,
} from '../db/testUtils.ts';
import { sessionCookie } from './testHelpers.ts';

const PASSWORD = 'tajna-lozinka';

// These tests talk to the real local database, so they run only when DATABASE_URL is set.
describe.skipIf(!process.env.DATABASE_URL)('authentication routes', () => {
  // Created in beforeAll because describe bodies run even when the suite is skipped.
  let pool: pg.Pool;

  beforeAll(() => {
    pool = createPool();
  });

  afterAll(() => pool.end());

  // Each test runs against one connection inside a transaction that is rolled back,
  // and gets a fresh app, so no data and no rate limit counters carry over.
  function inApp(
    run: (app: ReturnType<typeof createApp>, client: pg.PoolClient, f: Fixture) => Promise<void>,
    options: { secureCookies?: boolean } = {},
  ) {
    return inRolledBackTransaction(pool, async (client) => {
      const schoolId = await insertSchool(client);
      const userId = await insertActivatedUser(client, schoolId, 'teacher', {
        username: 'ana_ivic',
        email: 'Ana.Ivic@Example.com',
        password: PASSWORD,
      });
      const otherUserId = await insertActivatedUser(client, schoolId, 'student', {
        username: 'marko_maric',
        email: 'marko@example.com',
        password: PASSWORD,
      });
      const notActivatedId = await insertUser(client, schoolId, 'student', 'novi_nalog');

      await run(createApp({ pool: client, ...options }), client, {
        schoolId,
        userId,
        otherUserId,
        notActivatedId,
      });
    });
  }

  interface Fixture {
    schoolId: string;
    userId: string;
    otherUserId: string;
    notActivatedId: string;
  }

  const login = (app: ReturnType<typeof createApp>, identifier: unknown, password: unknown) =>
    request(app).post('/auth/login').send({ identifier, password });

  describe('POST /auth/login', () => {
    it('signs in with the username', async () => {
      await inApp(async (app, _client, f) => {
        const response = await login(app, 'ana_ivic', PASSWORD);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          user: {
            id: f.userId,
            username: 'ana_ivic',
            fullName: 'Test User',
            email: 'Ana.Ivic@Example.com',
            role: 'teacher',
            schoolId: f.schoolId,
          },
        });
      });
    });

    it('signs in with the email, whatever the letter case', async () => {
      await inApp(async (app, _client, f) => {
        const response = await login(app, 'ana.ivic@example.COM', PASSWORD);

        expect(response.status).toBe(200);
        expect(response.body.user.id).toBe(f.userId);
      });
    });

    it('accepts the username in any letter case and with spaces around it', async () => {
      await inApp(async (app) => {
        expect((await login(app, '  Ana_Ivic ', PASSWORD)).status).toBe(200);
      });
    });

    it('never returns the password hash', async () => {
      await inApp(async (app) => {
        const response = await login(app, 'ana_ivic', PASSWORD);

        expect(JSON.stringify(response.body)).not.toMatch(/password|scrypt/i);
      });
    });

    it('sets a safe session cookie lasting 7 days', async () => {
      await inApp(async (app) => {
        const cookie = sessionCookie(await login(app, 'ana_ivic', PASSWORD));

        expect(cookie).toMatch(/HttpOnly/i);
        expect(cookie).toMatch(/SameSite=Lax/i);
        expect(cookie).toMatch(/Path=\//);
        expect(cookie).toMatch(/Max-Age=604800/);
        expect(cookie).not.toMatch(/Secure/i);
      });
    });

    it('marks the cookie Secure when secure cookies are on', async () => {
      await inApp(
        async (app) => {
          expect(sessionCookie(await login(app, 'ana_ivic', PASSWORD))).toMatch(/Secure/i);
        },
        { secureCookies: true },
      );
    });

    it('stores only a hash of the cookie value, valid for 7 days', async () => {
      await inApp(async (app, client, f) => {
        const cookie = sessionCookie(await login(app, 'ana_ivic', PASSWORD));
        const token = cookie.split(';')[0].replace('session=', '');

        const { rows } = await client.query<{ token_hash: string; days: number }>(
          `SELECT token_hash, extract(epoch FROM expires_at - created_at) / 86400 AS days
           FROM sessions WHERE user_id = $1`,
          [f.userId],
        );

        expect(rows).toHaveLength(1);
        expect(rows[0].token_hash).toBe(hashToken(token));
        expect(rows[0].token_hash).not.toBe(token);
        expect(Number(rows[0].days)).toBeCloseTo(7, 5);
      });
    });

    it('gives the same answer for a wrong password, an unknown account and an account not activated yet', async () => {
      await inApp(async (app) => {
        const responses = await Promise.all([
          login(app, 'ana_ivic', 'pogresna-lozinka'),
          login(app, 'nema_takvog', PASSWORD),
          login(app, 'nema@example.com', PASSWORD),
          login(app, 'novi_nalog', PASSWORD),
        ]);

        for (const response of responses) {
          expect(response.status).toBe(401);
          expect(response.body).toEqual(responses[0].body);
          expect(response.headers['set-cookie']).toBeUndefined();
        }
        expect(responses[0].body.error.code).toBe('invalid_credentials');
      });
    });

    it('rejects a password longer than the allowed maximum without checking it', async () => {
      await inApp(async (app) => {
        const response = await login(app, 'ana_ivic', 'a'.repeat(1000));

        expect(response.status).toBe(401);
        expect(response.body.error.code).toBe('invalid_credentials');
      });
    });

    it.each([
      ['nothing', undefined],
      ['an empty body', {}],
      ['a missing password', { identifier: 'ana_ivic' }],
      ['a missing identifier', { password: PASSWORD }],
      ['a blank identifier', { identifier: '   ', password: PASSWORD }],
      ['numbers instead of text', { identifier: 5, password: 6 }],
      ['an identifier that is far too long', { identifier: 'a'.repeat(300), password: PASSWORD }],
      ['an object instead of text', { identifier: { $ne: '' }, password: PASSWORD }],
    ])('answers 400 for %s', async (_name, body) => {
      await inApp(async (app) => {
        const response = await request(app).post('/auth/login').send(body);

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('invalid_request');
      });
    });

    it('does not let a username be mistaken for another account through SQL', async () => {
      await inApp(async (app) => {
        const response = await login(app, `' OR '1'='1`, PASSWORD);

        expect(response.status).toBe(401);
      });
    });
  });

  describe('rate limit', () => {
    it('blocks an account after 10 wrong passwords, even for the right one', async () => {
      await inApp(async (app) => {
        for (let attempt = 1; attempt <= 10; attempt += 1) {
          expect((await login(app, 'ana_ivic', 'pogresna-lozinka')).status).toBe(401);
        }

        const blocked = await login(app, 'ana_ivic', PASSWORD);
        expect(blocked.status).toBe(429);
        expect(blocked.body.error.code).toBe('too_many_attempts');
        expect(blocked.headers['retry-after']).toBeDefined();
      });
    });

    it('does not block other accounts from the same address', async () => {
      await inApp(async (app) => {
        for (let attempt = 1; attempt <= 10; attempt += 1) {
          await login(app, 'ana_ivic', 'pogresna-lozinka');
        }

        expect((await login(app, 'marko_maric', PASSWORD)).status).toBe(200);
      });
    });

    it('counts the email and the username of an account separately, but case-insensitively', async () => {
      await inApp(async (app) => {
        for (let attempt = 1; attempt <= 10; attempt += 1) {
          await login(app, attempt % 2 ? 'ANA_IVIC' : 'ana_ivic', 'pogresna-lozinka');
        }

        expect((await login(app, 'ana_ivic', PASSWORD)).status).toBe(429);
      });
    });

    it('does not count successful sign-ins', async () => {
      await inApp(async (app) => {
        for (let attempt = 1; attempt <= 12; attempt += 1) {
          expect((await login(app, 'ana_ivic', PASSWORD)).status).toBe(200);
        }
      });
    });
  });

  describe('GET /auth/me', () => {
    it('returns the signed-in user', async () => {
      await inApp(async (app, _client, f) => {
        const cookie = sessionCookie(await login(app, 'ana_ivic', PASSWORD));

        const response = await request(app).get('/auth/me').set('Cookie', cookie);

        expect(response.status).toBe(200);
        expect(response.body.user.id).toBe(f.userId);
      });
    });

    it('answers 401 without a cookie', async () => {
      await inApp(async (app) => {
        const response = await request(app).get('/auth/me');

        expect(response.status).toBe(401);
        expect(response.body.error.code).toBe('unauthenticated');
      });
    });

    it('answers 401 for a cookie that was never issued', async () => {
      await inApp(async (app) => {
        const response = await request(app).get('/auth/me').set('Cookie', 'session=made-up-value');

        expect(response.status).toBe(401);
      });
    });

    it('answers 401 once the session has expired', async () => {
      await inApp(async (app, client) => {
        const cookie = sessionCookie(await login(app, 'ana_ivic', PASSWORD));
        await client.query(
          `UPDATE sessions SET created_at = now() - interval '8 days',
             expires_at = now() - interval '1 day'`,
        );

        const response = await request(app).get('/auth/me').set('Cookie', cookie);

        expect(response.status).toBe(401);
      });
    });

    it('keeps the sessions of two users apart', async () => {
      await inApp(async (app, _client, f) => {
        const anaCookie = sessionCookie(await login(app, 'ana_ivic', PASSWORD));
        const markoCookie = sessionCookie(await login(app, 'marko_maric', PASSWORD));

        const ana = await request(app).get('/auth/me').set('Cookie', anaCookie);
        const marko = await request(app).get('/auth/me').set('Cookie', markoCookie);

        expect(ana.body.user.id).toBe(f.userId);
        expect(marko.body.user.id).toBe(f.otherUserId);
      });
    });
  });

  describe('POST /auth/logout', () => {
    it('ends the session and clears the cookie', async () => {
      await inApp(async (app, client, f) => {
        const cookie = sessionCookie(await login(app, 'ana_ivic', PASSWORD));

        const response = await request(app).post('/auth/logout').set('Cookie', cookie);

        expect(response.status).toBe(204);
        expect(sessionCookie(response)).toMatch(/session=;/);
        expect((await request(app).get('/auth/me').set('Cookie', cookie)).status).toBe(401);
        const { rows } = await client.query('SELECT 1 FROM sessions WHERE user_id = $1', [
          f.userId,
        ]);
        expect(rows).toHaveLength(0);
      });
    });

    it('leaves the other sessions of the user alone', async () => {
      await inApp(async (app) => {
        const phone = sessionCookie(await login(app, 'ana_ivic', PASSWORD));
        const laptop = sessionCookie(await login(app, 'ana_ivic', PASSWORD));

        await request(app).post('/auth/logout').set('Cookie', phone);

        expect((await request(app).get('/auth/me').set('Cookie', laptop)).status).toBe(200);
      });
    });

    it('answers 204 even when nobody is signed in', async () => {
      await inApp(async (app) => {
        expect((await request(app).post('/auth/logout')).status).toBe(204);
      });
    });
  });
});
