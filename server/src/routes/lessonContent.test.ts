import type pg from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createPool } from '../db/pool.ts';
import {
  insertActivatedUser,
  insertClass,
  insertEnrollment,
  insertLesson,
  insertParentStudent,
  insertSubject,
} from '../db/testUtils.ts';
import { inApi as runWithApi, PASSWORD, type Api, type Requests } from './testApi.ts';

const LESSON =
  'Fotosinteza je proces u kojem biljke prave hranu uz pomoć svjetlosti. ' +
  'Za to koriste vodu iz zemljišta i ugljen-dioksid iz vazduha. ' +
  'Proces se odvija u zelenim dijelovima biljke, najviše u lišću. ' +
  'Zelena boja potiče od hlorofila, koji hvata svjetlosnu energiju. ' +
  'Hlorofil se nalazi u sitnim ćelijskim organelama koje se zovu hloroplasti. ' +
  'Tokom fotosinteze nastaje glukoza, vrsta šećera koja biljci služi kao hrana. ' +
  'Pored glukoze, biljka ispušta kisik koji je potreban svim živim bićima. ' +
  'Bez fotosinteze na Zemlji ne bi bilo dovoljno kisika za disanje.';

const choice = (prompt = 'Gdje nastaje glukoza?') => ({
  kind: 'choice',
  prompt,
  explanation: 'Glukoza nastaje u lišću.',
  options: [
    { text: 'u korijenu', isCorrect: false },
    { text: 'u lišću', isCorrect: true },
    { text: 'u stablu', isCorrect: false },
  ],
});
const trueFalse = (prompt = 'Biljke ispuštaju kisik.', isTrue = true) => ({
  kind: 'true_false',
  prompt,
  options: [
    { text: 'Tačno', isCorrect: isTrue },
    { text: 'Netačno', isCorrect: !isTrue },
  ],
});

// These tests talk to the real local database, so they run only when DATABASE_URL is set.
describe.skipIf(!process.env.DATABASE_URL)(
  'the teacher edits and approves the summary and quiz',
  () => {
    // Created in beforeAll because describe bodies run even when the suite is skipped.
    let pool: pg.Pool;

    beforeAll(() => {
      pool = createPool();
    });

    afterAll(() => pool.end());

    const inApi = (run: (api: Api) => Promise<void>) => runWithApi(pool, run);

    interface World {
      subjectId: string;
      teacher: Requests;
      otherTeacher: Requests;
      student: Requests;
      parent: Requests;
    }

    async function setup(api: Api): Promise<World> {
      const { client, f } = api;
      await insertActivatedUser(client, f.schoolId, 'teacher', {
        username: 'mira_miric',
        email: 'mira@example.com',
        password: PASSWORD,
      });
      const classId = await insertClass(client, f.schoolId, '5-2', 2026);
      const subjectId = await insertSubject(client, f.schoolId, classId, f.teacherId, 'Biologija');
      await insertParentStudent(client, f.schoolId, f.parentId, f.studentId, f.adminId);
      await insertEnrollment(client, {
        schoolId: f.schoolId,
        studentId: f.studentId,
        subjectId,
        requestedBy: f.studentId,
        requestedByRole: 'student',
        status: 'approved',
        parentDecidedBy: f.parentId,
        teacherDecidedBy: f.teacherId,
      });
      return {
        subjectId,
        teacher: await api.as('jovan_jovanovic'),
        otherTeacher: await api.as('mira_miric'),
        student: await api.as('ana_ivic'),
        parent: await api.as('petar_ivic'),
      };
    }

    const lessonIn = (api: Api, w: World, fields: object = {}) =>
      insertLesson(api.client, {
        schoolId: api.f.schoolId,
        subjectId: w.subjectId,
        createdBy: api.f.teacherId,
        body: LESSON,
        ...fields,
      });

    async function generated(api: Api, w: World) {
      const id = await lessonIn(api, w);
      await w.teacher.post(`/lessons/${id}/generate`);
      await api.jobs.onIdle();
      return id;
    }

    const lessonOf = async (w: World, id: string) =>
      (await w.teacher.get(`/lessons/${id}`)).body.lesson;

    describe('the summary', () => {
      it('can be written by the teacher alone, as a draft', async () => {
        await inApi(async (api) => {
          const w = await setup(api);
          const id = await lessonIn(api, w);

          const response = await w.teacher.put(`/lessons/${id}/summary`, {
            points: ['  Biljke prave   hranu.  ', 'Za to trebaju voda i svjetlost.'],
          });

          expect(response.status).toBe(200);
          expect(response.body.lesson.summary).toMatchObject({
            points: ['Biljke prave hranu.', 'Za to trebaju voda i svjetlost.'],
            origin: 'teacher',
            status: 'draft',
            outdated: false,
            approvedAt: null,
          });
        });
      });

      it('replaces what the AI made, and still says that the AI made it', async () => {
        await inApi(async (api) => {
          const w = await setup(api);
          const id = await generated(api, w);

          const response = await w.teacher.put(`/lessons/${id}/summary`, {
            points: ['Jedna tačka.'],
          });

          expect(response.body.lesson.summary).toMatchObject({
            points: ['Jedna tačka.'],
            origin: 'ai',
            status: 'draft',
          });
        });
      });

      it('becomes a draft again when an approved summary is changed', async () => {
        await inApi(async (api) => {
          const w = await setup(api);
          const id = await lessonIn(api, w);
          await w.teacher.put(`/lessons/${id}/summary`, { points: ['Prva.'] });
          await w.teacher.post(`/lessons/${id}/summary/approve`);

          const response = await w.teacher.put(`/lessons/${id}/summary`, { points: ['Druga.'] });

          expect(response.body.lesson.summary).toMatchObject({ status: 'draft', approvedAt: null });
        });
      });

      it('works for a lesson in review', async () => {
        await inApi(async (api) => {
          const w = await setup(api);
          const id = await lessonIn(api, w, { status: 'in_review' });

          expect(
            (await w.teacher.put(`/lessons/${id}/summary`, { points: ['Tačka.'] })).status,
          ).toBe(200);
        });
      });

      it.each([
        ['no points', {}],
        ['an empty list', { points: [] }],
        ['a list that is not a list', { points: 'tačka' }],
        ['a point that is not text', { points: [5] }],
        ['a blank point', { points: ['Dobro.', '   '] }],
        ['a point above 300 characters', { points: ['x'.repeat(301)] }],
        ['more than 30 points', { points: Array.from({ length: 31 }, () => 'Tačka.') }],
      ])('answers 400 for %s, and leaves the summary as it was', async (_name, body) => {
        await inApi(async (api) => {
          const w = await setup(api);
          const id = await lessonIn(api, w);
          await w.teacher.put(`/lessons/${id}/summary`, { points: ['Ostaje.'] });

          const response = await w.teacher.put(`/lessons/${id}/summary`, body);

          expect(response.status).toBe(400);
          expect(response.body.error.code).toBe('invalid_summary');
          expect(response.body.error.message).toEqual(expect.any(String));
          expect((await lessonOf(w, id)).summary.points).toEqual(['Ostaje.']);
        });
      });

      it('is approved by the teacher, with the time', async () => {
        await inApi(async (api) => {
          const w = await setup(api);
          const id = await lessonIn(api, w);
          await w.teacher.put(`/lessons/${id}/summary`, { points: ['Tačka.'] });

          const response = await w.teacher.post(`/lessons/${id}/summary/approve`);

          expect(response.status).toBe(200);
          expect(response.body.lesson.summary).toMatchObject({
            status: 'approved',
            approvedAt: expect.any(String),
          });
          const { rows } = await api.client.query<{ approved_by: string }>(
            'SELECT approved_by FROM lesson_summaries WHERE lesson_id = $1',
            [id],
          );
          expect(rows[0].approved_by).toBe(api.f.teacherId);
        });
      });

      it('can be approved again after the text changed, which confirms it still fits', async () => {
        await inApi(async (api) => {
          const w = await setup(api);
          const id = await generated(api, w);
          await w.teacher.patch(`/lessons/${id}`, { body: `${LESSON} Još jedna rečenica.` });
          expect((await lessonOf(w, id)).summary.outdated).toBe(true);

          const response = await w.teacher.post(`/lessons/${id}/summary/approve`);

          expect(response.body.lesson.summary).toMatchObject({
            status: 'approved',
            outdated: false,
          });
          // The quiz was not approved, so it is still outdated.
          expect(response.body.lesson.quiz.outdated).toBe(true);
        });
      });

      it('can be deleted, and then there is nothing to delete or approve', async () => {
        await inApi(async (api) => {
          const w = await setup(api);
          const id = await generated(api, w);

          const removed = await w.teacher.delete(`/lessons/${id}/summary`);
          const again = await w.teacher.delete(`/lessons/${id}/summary`);
          const approve = await w.teacher.post(`/lessons/${id}/summary/approve`);

          expect(removed.status).toBe(200);
          expect(removed.body.lesson.summary).toBeNull();
          expect(removed.body.lesson.quiz).not.toBeNull();
          expect(again.status).toBe(404);
          expect(approve.status).toBe(404);
        });
      });

      it('is locked while the lesson is published or being processed', async () => {
        await inApi(async (api) => {
          const w = await setup(api);
          const live = await lessonIn(api, w, {
            status: 'published',
            publishedAt: new Date().toISOString(),
          });
          const busy = await lessonIn(api, w, { status: 'processing' });
          const body = { points: ['Tačka.'] };

          for (const [id, code] of [
            [live, 'lesson_published'],
            [busy, 'lesson_busy'],
          ] as const) {
            expect((await w.teacher.put(`/lessons/${id}/summary`, body)).body.error.code).toBe(
              code,
            );
            expect((await w.teacher.delete(`/lessons/${id}/summary`)).body.error.code).toBe(code);
            expect((await w.teacher.post(`/lessons/${id}/summary/approve`)).body.error.code).toBe(
              code,
            );
          }
        });
      });

      it("answers 404 for another teacher's lesson, 403 for others and 401 when nobody is signed in", async () => {
        await inApi(async (api) => {
          const w = await setup(api);
          const id = await lessonIn(api, w);
          const body = { points: ['Tačka.'] };

          for (const lessonId of [id, '00000000-0000-0000-0000-000000000000', 'nope']) {
            expect((await w.otherTeacher.put(`/lessons/${lessonId}/summary`, body)).status).toBe(
              404,
            );
          }
          for (const person of [w.student, w.parent, api]) {
            expect((await person.put(`/lessons/${id}/summary`, body)).status).toBe(403);
            expect((await person.delete(`/lessons/${id}/summary`)).status).toBe(403);
            expect((await person.post(`/lessons/${id}/summary/approve`)).status).toBe(403);
          }
          expect((await request(api.app).put(`/lessons/${id}/summary`).send(body)).status).toBe(
            401,
          );
          expect((await lessonOf(w, id)).summary).toBeNull();
        });
      });
    });

    describe('the quiz', () => {
      it('can be written by the teacher alone, with both kinds of question', async () => {
        await inApi(async (api) => {
          const w = await setup(api);
          const id = await lessonIn(api, w);

          const response = await w.teacher.put(`/lessons/${id}/quiz`, {
            questions: [choice(), trueFalse()],
          });

          expect(response.status).toBe(200);
          const { quiz } = response.body.lesson;
          expect(quiz).toMatchObject({ origin: 'teacher', status: 'draft', outdated: false });
          expect(quiz.questions.map((q: { position: number }) => q.position)).toEqual([1, 2]);
          expect(quiz.questions[0].options[1]).toMatchObject({ text: 'u lišću', isCorrect: true });
          expect(quiz.questions[1].options.map((o: { text: string }) => o.text)).toEqual([
            'Tačno',
            'Netačno',
          ]);
        });
      });

      it('keeps the answers of a true/false question in one order, whatever order was sent', async () => {
        await inApi(async (api) => {
          const w = await setup(api);
          const id = await lessonIn(api, w);

          const response = await w.teacher.put(`/lessons/${id}/quiz`, {
            questions: [
              {
                kind: 'true_false',
                prompt: 'Biljke ne trebaju vodu.',
                options: [
                  { text: 'netačno', isCorrect: true },
                  { text: 'TAČNO', isCorrect: false },
                ],
              },
            ],
          });

          expect(response.body.lesson.quiz.questions[0].options).toMatchObject([
            { text: 'Tačno', isCorrect: false },
            { text: 'Netačno', isCorrect: true },
          ]);
        });
      });

      it('replaces what the AI made: a teacher can remove, change and add questions', async () => {
        await inApi(async (api) => {
          const w = await setup(api);
          const id = await generated(api, w);
          const { quiz } = await lessonOf(w, id);
          const kept = quiz.questions.slice(0, 2);
          kept[0].prompt = 'Ovo je ručno ispravljeno pitanje?';

          const response = await w.teacher.put(`/lessons/${id}/quiz`, {
            questions: [...kept, choice('Novo pitanje koje je dodao nastavnik?')],
          });

          const edited = response.body.lesson.quiz;
          expect(edited.origin).toBe('ai');
          expect(edited.status).toBe('draft');
          expect(edited.questions).toHaveLength(3);
          expect(edited.questions[0].prompt).toBe('Ovo je ručno ispravljeno pitanje?');
          expect(edited.questions[2].prompt).toBe('Novo pitanje koje je dodao nastavnik?');
        });
      });

      it('becomes a draft again when an approved quiz is changed', async () => {
        await inApi(async (api) => {
          const w = await setup(api);
          const id = await lessonIn(api, w);
          await w.teacher.put(`/lessons/${id}/quiz`, { questions: [choice()] });
          await w.teacher.post(`/lessons/${id}/quiz/approve`);

          const response = await w.teacher.put(`/lessons/${id}/quiz`, { questions: [trueFalse()] });

          expect(response.body.lesson.quiz).toMatchObject({ status: 'draft', approvedAt: null });
        });
      });

      it.each([
        ['no questions', {}],
        ['an empty list', { questions: [] }],
        ['more than 20 questions', { questions: Array.from({ length: 21 }, () => choice()) }],
        ['an unknown kind of question', { questions: [{ ...choice(), kind: 'essay' }] }],
        ['a blank question', { questions: [choice('   ')] }],
        ['a question above 500 characters', { questions: [choice('x'.repeat(501))] }],
        [
          'a choice question with two answers',
          { questions: [{ ...choice(), options: choice().options.slice(0, 2) }] },
        ],
        [
          'no right answer',
          {
            questions: [
              { ...choice(), options: choice().options.map((o) => ({ ...o, isCorrect: false })) },
            ],
          },
        ],
        [
          'two right answers',
          {
            questions: [
              { ...choice(), options: choice().options.map((o) => ({ ...o, isCorrect: true })) },
            ],
          },
        ],
        [
          'two answers that are the same',
          {
            questions: [
              {
                ...choice(),
                options: [
                  { text: 'a', isCorrect: true },
                  { text: 'A', isCorrect: false },
                  { text: 'c', isCorrect: false },
                ],
              },
            ],
          },
        ],
        [
          'a true/false question with other answers',
          {
            questions: [
              {
                ...trueFalse(),
                options: [
                  { text: 'Da', isCorrect: true },
                  { text: 'Ne', isCorrect: false },
                ],
              },
            ],
          },
        ],
      ])('answers 400 for %s, and leaves the quiz as it was', async (_name, body) => {
        await inApi(async (api) => {
          const w = await setup(api);
          const id = await lessonIn(api, w);
          await w.teacher.put(`/lessons/${id}/quiz`, { questions: [choice('Ostaje?')] });

          const response = await w.teacher.put(`/lessons/${id}/quiz`, body);

          expect(response.status).toBe(400);
          expect(response.body.error.code).toBe('invalid_quiz');
          expect((await lessonOf(w, id)).quiz.questions[0].prompt).toBe('Ostaje?');
        });
      });

      it('is approved by the teacher, with the time, and needs a quiz to approve', async () => {
        await inApi(async (api) => {
          const w = await setup(api);
          const id = await lessonIn(api, w);
          expect((await w.teacher.post(`/lessons/${id}/quiz/approve`)).status).toBe(404);
          await w.teacher.put(`/lessons/${id}/quiz`, { questions: [choice()] });

          const response = await w.teacher.post(`/lessons/${id}/quiz/approve`);

          expect(response.body.lesson.quiz).toMatchObject({
            status: 'approved',
            approvedAt: expect.any(String),
          });
          const { rows } = await api.client.query<{ approved_by: string }>(
            'SELECT approved_by FROM lesson_quizzes WHERE lesson_id = $1',
            [id],
          );
          expect(rows[0].approved_by).toBe(api.f.teacherId);
        });
      });

      it('can be deleted with all its questions', async () => {
        await inApi(async (api) => {
          const w = await setup(api);
          const id = await generated(api, w);

          const removed = await w.teacher.delete(`/lessons/${id}/quiz`);

          expect(removed.body.lesson.quiz).toBeNull();
          const { rows } = await api.client.query(
            'SELECT 1 FROM quiz_questions WHERE lesson_id = $1',
            [id],
          );
          expect(rows).toHaveLength(0);
          expect((await w.teacher.delete(`/lessons/${id}/quiz`)).status).toBe(404);
        });
      });

      it('is locked while the lesson is published or being processed', async () => {
        await inApi(async (api) => {
          const w = await setup(api);
          const live = await lessonIn(api, w, {
            status: 'published',
            publishedAt: new Date().toISOString(),
          });
          const busy = await lessonIn(api, w, { status: 'processing' });

          for (const [id, code] of [
            [live, 'lesson_published'],
            [busy, 'lesson_busy'],
          ] as const) {
            expect(
              (await w.teacher.put(`/lessons/${id}/quiz`, { questions: [choice()] })).body.error
                .code,
            ).toBe(code);
            expect((await w.teacher.delete(`/lessons/${id}/quiz`)).body.error.code).toBe(code);
            expect((await w.teacher.post(`/lessons/${id}/quiz/approve`)).body.error.code).toBe(
              code,
            );
          }
        });
      });

      it("answers 404 for another teacher's lesson, 403 for others and 401 when nobody is signed in", async () => {
        await inApi(async (api) => {
          const w = await setup(api);
          const id = await lessonIn(api, w);
          const body = { questions: [choice()] };

          expect((await w.otherTeacher.put(`/lessons/${id}/quiz`, body)).status).toBe(404);
          for (const person of [w.student, w.parent, api]) {
            expect((await person.put(`/lessons/${id}/quiz`, body)).status).toBe(403);
            expect((await person.delete(`/lessons/${id}/quiz`)).status).toBe(403);
            expect((await person.post(`/lessons/${id}/quiz/approve`)).status).toBe(403);
          }
          expect((await request(api.app).put(`/lessons/${id}/quiz`).send(body)).status).toBe(401);
          expect((await lessonOf(w, id)).quiz).toBeNull();
        });
      });
    });

    describe('the whole way, from the AI to the student', () => {
      it('lets a teacher fix what the AI made, approve it, publish, and the student sees the fixed version', async () => {
        await inApi(async (api) => {
          const w = await setup(api);
          const id = await generated(api, w);
          const before = await lessonOf(w, id);

          // The teacher removes a point, rewrites another, and fixes a question.
          const points = before.summary.points.slice(1);
          points[0] = 'Ovu tačku je ispravio nastavnik.';
          await w.teacher.put(`/lessons/${id}/summary`, { points });
          const questions = before.quiz.questions.slice(0, 3);
          questions[0].prompt = 'Pitanje koje je ispravio nastavnik?';
          await w.teacher.put(`/lessons/${id}/quiz`, { questions });

          const early = await w.teacher.post(`/lessons/${id}/publish`);
          await w.teacher.post(`/lessons/${id}/summary/approve`);
          await w.teacher.post(`/lessons/${id}/quiz/approve`);
          const published = await w.teacher.post(`/lessons/${id}/publish`);

          expect(early.body.error.code).toBe('needs_approval');
          expect(published.status).toBe(200);
          for (const person of [w.student, w.parent]) {
            const { lesson } = (await person.get(`/lessons/${id}`)).body;
            expect(lesson.summary.points[0]).toBe('Ovu tačku je ispravio nastavnik.');
            expect(lesson.summary.points).toHaveLength(points.length);
            expect(lesson.quiz.questions).toHaveLength(3);
            expect(lesson.quiz.questions[0].prompt).toBe('Pitanje koje je ispravio nastavnik?');
            expect(JSON.stringify(lesson.quiz)).not.toMatch(/isCorrect|explanation/);
          }
        });
      });

      it('needs a new approval after every change', async () => {
        await inApi(async (api) => {
          const w = await setup(api);
          const id = await generated(api, w);
          await w.teacher.post(`/lessons/${id}/summary/approve`);
          await w.teacher.post(`/lessons/${id}/quiz/approve`);

          await w.teacher.put(`/lessons/${id}/summary`, { points: ['Promijenjena tačka.'] });
          const refused = await w.teacher.post(`/lessons/${id}/publish`);

          expect(refused.status).toBe(409);
          expect(refused.body.error.code).toBe('needs_approval');
        });
      });

      it('can publish a lesson with only a summary the teacher wrote, and no quiz', async () => {
        await inApi(async (api) => {
          const w = await setup(api);
          const id = await lessonIn(api, w);
          await w.teacher.put(`/lessons/${id}/summary`, { points: ['Samo sažetak.'] });
          await w.teacher.post(`/lessons/${id}/summary/approve`);

          const published = await w.teacher.post(`/lessons/${id}/publish`);

          expect(published.status).toBe(200);
          const { lesson } = (await w.student.get(`/lessons/${id}`)).body;
          expect(lesson.summary.points).toEqual(['Samo sažetak.']);
          expect(lesson.quiz).toBeNull();
        });
      });
    });
  },
);
