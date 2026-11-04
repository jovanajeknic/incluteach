import type pg from 'pg';
import request from 'supertest';

import type { AiProvider } from '../ai/types.ts';
import { createApp } from '../app.ts';
import { BackgroundJobs } from '../lessons/jobs.ts';
import {
  FAST_HASH_COST,
  inRolledBackTransaction,
  insertActivatedUser,
  insertSchool,
  insertUser,
} from '../db/testUtils.ts';
import { sessionCookie } from './testHelpers.ts';

export const PASSWORD = 'tajna-lozinka';

// Ready-made people for tests. Everyone in "School A" has the password PASSWORD, except the
// student who has not activated the account. Usernames: admin_a, jovan_jovanovic (teacher),
// ana_ivic (student), marko_maric (student, not activated), petar_ivic (parent).
export interface Fixture {
  schoolId: string;
  adminId: string;
  teacherId: string;
  studentId: string;
  notActivatedStudentId: string;
  parentId: string;
  otherSchoolId: string;
  otherSchoolStudentId: string;
}

type App = ReturnType<typeof createApp>;

// Requests made as one particular signed-in user.
export interface Requests {
  get: (path: string) => request.Test;
  post: (path: string, body?: object) => request.Test;
  patch: (path: string, body?: object) => request.Test;
  delete: (path: string) => request.Test;
  // Sends a file as the whole body of the request, like a browser does with fetch.
  postFile: (
    path: string,
    data: Buffer,
    options?: { name?: string; type?: string },
  ) => request.Test;
}

export interface Api extends Requests {
  app: App;
  // Work that goes on after an answer is sent, such as the AI making a summary.
  jobs: BackgroundJobs;
  client: pg.PoolClient;
  f: Fixture;
  deactivate: (...ids: string[]) => Promise<request.Response>;
  signIn: (identifier: string) => Promise<request.Response>;
  // Requests made as another user of School A, for example to check that a teacher gets 403.
  as: (username: string) => Promise<Requests>;
}

function requestsWith(app: App, cookie: string): Requests {
  return {
    get: (path) => request(app).get(path).set('Cookie', cookie),
    post: (path, body) =>
      request(app)
        .post(path)
        .set('Cookie', cookie)
        .send(body ?? {}),
    patch: (path, body) =>
      request(app)
        .patch(path)
        .set('Cookie', cookie)
        .send(body ?? {}),
    delete: (path) => request(app).delete(path).set('Cookie', cookie),
    postFile: (path, data, options = {}) => {
      const upload = request(app)
        .post(path)
        .set('Cookie', cookie)
        .set('Content-Type', options.type ?? 'application/octet-stream');
      if (options.name !== undefined) {
        upload.set('X-File-Name', options.name);
      }
      return upload.send(data);
    },
  };
}

// Runs a test as the admin of School A. Everything happens on one connection inside a
// transaction that is rolled back, and the app is new for each test, so no data and no
// rate limit counters carry over.
export function inApi(
  pool: pg.Pool,
  run: (api: Api) => Promise<void>,
  options: { ai?: AiProvider; aiTimeoutMs?: number } = {},
): Promise<void> {
  return inRolledBackTransaction(pool, async (client) => {
    const schoolId = await insertSchool(client, 'School A');
    const account = (
      role: 'admin' | 'teacher' | 'student' | 'parent',
      username: string,
      fullName: string,
    ) =>
      insertActivatedUser(client, schoolId, role, {
        username,
        email: `${username}@example.com`,
        password: PASSWORD,
        fullName,
      });

    const otherSchoolId = await insertSchool(client, 'School B');
    const f: Fixture = {
      schoolId,
      adminId: await account('admin', 'admin_a', 'Admin Adminović'),
      teacherId: await account('teacher', 'jovan_jovanovic', 'Jovan Jovanović'),
      studentId: await account('student', 'ana_ivic', 'Ana Ivić'),
      notActivatedStudentId: await insertUser(
        client,
        schoolId,
        'student',
        'marko_maric',
        'Marko Marić',
      ),
      parentId: await account('parent', 'petar_ivic', 'Petar Ivić'),
      otherSchoolId,
      otherSchoolStudentId: await insertUser(client, otherSchoolId, 'student', 'tudji_ucenik'),
    };

    const jobs = new BackgroundJobs();
    const app = createApp({ pool: client, passwordCost: FAST_HASH_COST, jobs, ...options });
    const signIn = (identifier: string) =>
      request(app).post('/auth/login').send({ identifier, password: PASSWORD });
    const admin = requestsWith(app, sessionCookie(await signIn('admin_a')));

    const api: Api = {
      ...admin,
      app,
      jobs,
      client,
      f,
      deactivate: (...ids) => admin.post('/users/deactivate', { ids }),
      signIn,
      as: async (username) => requestsWith(app, sessionCookie(await signIn(username))),
    };
    await run(api);
  });
}
