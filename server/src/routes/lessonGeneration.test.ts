import type pg from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { BAD_OUTPUT_MARKER, createFakeAi, FAIL_MARKER } from '../ai/fake.ts';
import type { AiProvider } from '../ai/types.ts';
import { createPool } from '../db/pool.ts';
import {
  insertActivatedUser,
  insertClass,
  insertEnrollment,
  insertLesson,
  insertParentStudent,
  insertQuestion,
  insertOption,
  insertQuiz,
  insertSubject,
  insertSummary,
} from '../db/testUtils.ts';
import { BackgroundJobs } from '../lessons/jobs.ts';
import { inApi as runWithApi, PASSWORD, type Api, type Requests } from './testApi.ts';

const LESSON =
  'Fotosinteza je proces u kojem biljke prave hranu uz pomoć svjetlosti. ' +
  'Za to koriste vodu iz zemljišta i ugljen-dioksid iz vazduha. ' +
  'Proces se odvija u zelenim dijelovima biljke, najviše u lišću. ' +
  'Zelena boja potiče od hlorofila, koji hvata svjetlosnu energiju. ' +
  'Hlorofil se nalazi u sitnim ćelijskim organelama koje se zovu hloroplasti. ' +
  'Tokom fotosinteze nastaje glukoza, vrsta šećera koja biljci služi kao hrana. ' +
  'Pored glukoze, biljka ispušta kisik koji je potreban svim živim bićima. ' +
  'Bez fotosinteze na Zemlji ne bi bilo dovoljno kisika za disanje. ' +
  'Korijen upija vodu i mineralne materije iz zemlje. ' +
  'Voda putuje kroz stablo do lišća pomoću sitnih cjevčica.';

// These tests talk to the real local database, so they run only when DATABASE_URL is set.
describe.skipIf(!process.env.DATABASE_URL)('making a summary and a quiz with the AI', () => {
  // Created in beforeAll because describe bodies run even when the suite is skipped.
  let pool: pg.Pool;

  beforeAll(() => {
    pool = createPool();
  });

  afterAll(() => pool.end());

  const inApi = (
    run: (api: Api) => Promise<void>,
    options?: { ai?: AiProvider; aiTimeoutMs?: number },
  ) => runWithApi(pool, run, options);

  interface World {
    subjectId: string;
    teacher: Requests;
    otherTeacher: Requests;
    student: Requests;
    parent: Requests;
  }

  // Ana joined the subject (her parent is Petar); Jovan teaches it, Mira is another teacher.
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

  // Asks for the AI to work, waits for it to finish, and returns the lesson as the teacher sees it.
  async function generate(api: Api, w: World, id: string, body: object = {}) {
    const started = await w.teacher.post(`/lessons/${id}/generate`, body);
    await api.jobs.onIdle();
    const finished = await w.teacher.get(`/lessons/${id}`);
    return { started, lesson: finished.body.lesson };
  }

  describe('POST /lessons/:id/generate', () => {
    it('answers at once that the lesson is being processed', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await lessonIn(api, w);

        const response = await w.teacher.post(`/lessons/${id}/generate`);
        await api.jobs.onIdle();

        expect(response.status).toBe(202);
        expect(response.body.lesson).toMatchObject({
          id,
          status: 'processing',
          processingError: null,
        });
      });
    });

    it('leaves the lesson in review with a summary and a quiz that wait for approval', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await lessonIn(api, w);

        const { lesson } = await generate(api, w, id);

        expect(lesson.status).toBe('in_review');
        expect(lesson.processingError).toBeNull();
        expect(lesson.summary).toMatchObject({
          origin: 'ai',
          status: 'draft',
          outdated: false,
          approvedAt: null,
        });
        expect(lesson.summary.points.length).toBeGreaterThanOrEqual(3);
        expect(lesson.quiz).toMatchObject({
          origin: 'ai',
          status: 'draft',
          outdated: false,
          approvedAt: null,
        });
        expect(lesson.quiz.questions.length).toBeGreaterThanOrEqual(5);
      });
    });

    it('shows the teacher every question with its answers, the right one and the explanation', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await lessonIn(api, w);

        const { lesson } = await generate(api, w, id);

        for (const [index, question] of lesson.quiz.questions.entries()) {
          expect(question).toMatchObject({ id: expect.any(String), position: index + 1 });
          expect(question.explanation).toEqual(expect.any(String));
          expect(
            question.options.filter((option: { isCorrect: boolean }) => option.isCorrect),
          ).toHaveLength(1);
          expect(question.options.map((option: { position: number }) => option.position)).toEqual(
            question.options.map((_: unknown, position: number) => position + 1),
          );
        }
      });
    });

    it('can make only the summary, or only the quiz', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const onlySummary = await lessonIn(api, w);
        const onlyQuiz = await lessonIn(api, w);

        const first = await generate(api, w, onlySummary, { quiz: false });
        const second = await generate(api, w, onlyQuiz, { summary: false });

        expect(first.lesson.summary).not.toBeNull();
        expect(first.lesson.quiz).toBeNull();
        expect(second.lesson.summary).toBeNull();
        expect(second.lesson.quiz).not.toBeNull();
        expect(first.lesson.status).toBe('in_review');
      });
    });

    it('marks both as outdated once the text changes', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await lessonIn(api, w);
        await generate(api, w, id);

        const changed = await w.teacher.patch(`/lessons/${id}`, {
          body: `${LESSON} Još jedna rečenica.`,
        });

        expect(changed.body.lesson.bodyRevision).toBe(2);
        expect(changed.body.lesson.summary.outdated).toBe(true);
        expect(changed.body.lesson.quiz.outdated).toBe(true);
      });
    });

    it('makes them again on request, replacing the old ones and cancelling an approval', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await lessonIn(api, w);
        await generate(api, w, id);
        await api.client.query(
          `UPDATE lesson_summaries SET status = 'approved', approved_by = $2, approved_at = now()
           WHERE lesson_id = $1`,
          [id, api.f.teacherId],
        );
        await w.teacher.patch(`/lessons/${id}`, { body: `${LESSON} Još jedna rečenica.` });

        const { lesson } = await generate(api, w, id);

        expect(lesson.summary).toMatchObject({
          status: 'draft',
          outdated: false,
          approvedAt: null,
        });
        expect(lesson.quiz.outdated).toBe(false);
        const { rows } = await api.client.query(
          'SELECT 1 FROM quiz_questions WHERE lesson_id = $1',
          [id],
        );
        expect(rows.length).toBe(lesson.quiz.questions.length);
      });
    });

    it('refuses a lesson without real text, and leaves it as it was', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const empty = await lessonIn(api, w, { body: '' });
        const blank = await lessonIn(api, w, { body: '  \n\n ' });

        for (const id of [empty, blank]) {
          const response = await w.teacher.post(`/lessons/${id}/generate`);

          expect(response.status).toBe(409);
          expect(response.body.error.code).toBe('lesson_has_no_text');
          expect((await w.teacher.get(`/lessons/${id}`)).body.lesson.status).toBe('draft');
        }
      });
    });

    it('refuses a lesson that is already being processed or is published', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const busy = await lessonIn(api, w, { status: 'processing' });
        const live = await lessonIn(api, w, {
          status: 'published',
          publishedAt: new Date().toISOString(),
        });

        expect((await w.teacher.post(`/lessons/${busy}/generate`)).body.error.code).toBe(
          'lesson_busy',
        );
        expect((await w.teacher.post(`/lessons/${live}/generate`)).body.error.code).toBe(
          'lesson_published',
        );
      });
    });

    it.each([
      ['neither the summary nor the quiz', { summary: false, quiz: false }],
      ['a summary that is not true or false', { summary: 'yes' }],
      ['a quiz that is not true or false', { quiz: 1 }],
    ])('answers 400 for %s', async (_name, body) => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await lessonIn(api, w);

        const response = await w.teacher.post(`/lessons/${id}/generate`, body);

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('invalid_request');
        expect((await w.teacher.get(`/lessons/${id}`)).body.lesson.status).toBe('draft');
      });
    });

    it('does not start a second job when asked twice at once', async () => {
      await inApi(
        async (api) => {
          const w = await setup(api);
          const id = await lessonIn(api, w);

          const first = await w.teacher.post(`/lessons/${id}/generate`);
          const second = await w.teacher.post(`/lessons/${id}/generate`);
          await api.jobs.onIdle();

          expect(first.status).toBe(202);
          expect(second.status).toBe(409);
          expect(second.body.error.code).toBe('lesson_busy');
        },
        { ai: createFakeAi({ delayMs: 150 }) },
      );
    });

    it('does not let the text be changed or the lesson deleted while the AI works', async () => {
      await inApi(
        async (api) => {
          const w = await setup(api);
          const id = await lessonIn(api, w);

          await w.teacher.post(`/lessons/${id}/generate`);
          const edit = await w.teacher.patch(`/lessons/${id}`, { title: 'Novo' });
          const removal = await w.teacher.delete(`/lessons/${id}`);
          const publication = await w.teacher.post(`/lessons/${id}/publish`);
          await api.jobs.onIdle();

          expect(edit.body.error.code).toBe('lesson_busy');
          expect(removal.body.error.code).toBe('lesson_busy');
          expect(publication.body.error.code).toBe('lesson_busy');
        },
        { ai: createFakeAi({ delayMs: 150 }) },
      );
    });

    it("answers 404 for another teacher's lesson and an unknown one, and 403 for others", async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await lessonIn(api, w);

        for (const lessonId of [id, '00000000-0000-0000-0000-000000000000', 'nope']) {
          expect((await w.otherTeacher.post(`/lessons/${lessonId}/generate`)).status).toBe(404);
        }
        expect((await w.student.post(`/lessons/${id}/generate`)).status).toBe(403);
        expect((await w.parent.post(`/lessons/${id}/generate`)).status).toBe(403);
        expect((await api.post(`/lessons/${id}/generate`)).status).toBe(403);
        expect((await request(api.app).post(`/lessons/${id}/generate`)).status).toBe(401);
        expect((await w.teacher.get(`/lessons/${id}`)).body.lesson.status).toBe('draft');
      });
    });
  });

  describe('when the AI fails', () => {
    it('puts the lesson back to a draft with a general message, never the details', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await lessonIn(api, w, { body: `${LESSON} ${FAIL_MARKER}` });

        const { lesson } = await generate(api, w, id);

        expect(lesson.status).toBe('draft');
        expect(lesson.processingError).toBe(
          'The AI could not make the summary and the quiz. Try again in a moment.',
        );
        expect(JSON.stringify(lesson)).not.toMatch(/simulated|broke/);
        expect(lesson.summary).toBeNull();
        expect(lesson.quiz).toBeNull();
      });
    });

    it('keeps what the lesson already had', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await lessonIn(api, w);
        await generate(api, w, id);
        await w.teacher.patch(`/lessons/${id}`, { body: `${LESSON} ${FAIL_MARKER}` });

        const { lesson } = await generate(api, w, id);

        expect(lesson.status).toBe('draft');
        expect(lesson.processingError).not.toBeNull();
        expect(lesson.summary.points.length).toBeGreaterThan(0);
        expect(lesson.quiz.questions.length).toBeGreaterThan(0);
      });
    });

    it('does not use an answer that is not in the right form', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await lessonIn(api, w, { body: `${LESSON} ${BAD_OUTPUT_MARKER}` });

        const { lesson } = await generate(api, w, id);

        expect(lesson.status).toBe('draft');
        expect(lesson.processingError).toMatch(/form that could not be used/);
        expect(lesson.summary).toBeNull();
        expect(lesson.quiz).toBeNull();
      });
    });

    it('tells the teacher when the text is too short for a quiz', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await lessonIn(api, w, { body: 'Biljke prave hranu uz pomoć svjetlosti.' });

        const { lesson } = await generate(api, w, id, { summary: false });

        expect(lesson.status).toBe('draft');
        expect(lesson.processingError).toBe('The text is too short to make a quiz.');
      });
    });

    it('can be tried again, and a success clears the message', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await lessonIn(api, w, { body: `${LESSON} ${FAIL_MARKER}` });
        await generate(api, w, id);

        await w.teacher.patch(`/lessons/${id}`, { body: LESSON });
        const { lesson } = await generate(api, w, id);

        expect(lesson.status).toBe('in_review');
        expect(lesson.processingError).toBeNull();
      });
    });

    it('gives up when the AI takes too long', async () => {
      const hanging: AiProvider = {
        name: 'hanging',
        makeSummary: () => new Promise(() => {}),
        makeQuiz: () => new Promise(() => {}),
      };

      await inApi(
        async (api) => {
          const w = await setup(api);
          const id = await lessonIn(api, w);

          const { lesson } = await generate(api, w, id);

          expect(lesson.status).toBe('draft');
          expect(lesson.processingError).toBe(
            'The AI could not make the summary and the quiz. Try again in a moment.',
          );
        },
        { ai: hanging, aiTimeoutMs: 50 },
      );
    });
  });

  describe('what students and parents see', () => {
    // A published lesson with a summary and a quiz, approved by the teacher.
    async function publishedWithContent(api: Api, w: World) {
      const { client, f } = api;
      const id = await lessonIn(api, w, {
        status: 'published',
        publishedAt: new Date().toISOString(),
      });
      const approved = {
        schoolId: f.schoolId,
        lessonId: id,
        status: 'approved' as const,
        approvedBy: f.teacherId,
        approvedAt: new Date().toISOString(),
      };
      await insertSummary(client, { ...approved, points: ['Prva tačka.', 'Druga tačka.'] });
      await insertQuiz(client, approved);
      const questionId = await insertQuestion(client, {
        lessonId: id,
        prompt: 'Gdje nastaje glukoza?',
      });
      await client.query("UPDATE quiz_questions SET explanation = 'U lišću.' WHERE id = $1", [
        questionId,
      ]);
      await insertOption(client, { questionId, position: 1, text: 'u korijenu' });
      await insertOption(client, { questionId, position: 2, text: 'u lišću', isCorrect: true });
      await insertOption(client, { questionId, position: 3, text: 'u stablu' });
      return id;
    }

    it('shows the approved summary and quiz, but never the right answers', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await publishedWithContent(api, w);

        for (const person of [w.student, w.parent]) {
          const { lesson } = (await person.get(`/lessons/${id}`)).body;

          expect(lesson.summary).toMatchObject({
            points: ['Prva tačka.', 'Druga tačka.'],
            status: 'approved',
          });
          expect(lesson.quiz.questions).toHaveLength(1);
          expect(
            lesson.quiz.questions[0].options.map((option: { text: string }) => option.text),
          ).toEqual(['u korijenu', 'u lišću', 'u stablu']);
          expect(JSON.stringify(lesson.quiz)).not.toMatch(/isCorrect|explanation|U lišću\./);
        }
      });
    });

    it('shows the teacher the same quiz with the right answer and the explanation', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await publishedWithContent(api, w);

        const { lesson } = (await w.teacher.get(`/lessons/${id}`)).body;

        expect(lesson.quiz.questions[0].explanation).toBe('U lišću.');
        expect(lesson.quiz.questions[0].options[1]).toMatchObject({
          text: 'u lišću',
          isCorrect: true,
        });
      });
    });

    it('never shows content that is not approved or no longer fits the text', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const { client, f } = api;
        const id = await publishedWithContent(api, w);
        await client.query(
          "UPDATE lesson_summaries SET status = 'draft', approved_by = NULL, approved_at = NULL WHERE lesson_id = $1",
          [id],
        );
        await client.query('UPDATE lesson_quizzes SET based_on_revision = 1 WHERE lesson_id = $1', [
          id,
        ]);
        await client.query('UPDATE lessons SET body_revision = 2 WHERE id = $1', [id]);

        const { lesson } = (await w.student.get(`/lessons/${id}`)).body;

        expect(lesson.summary).toBeNull();
        expect(lesson.quiz).toBeNull();
        expect(f.studentId).toBeTruthy();
      });
    });

    it('does not show the processing error to a student', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await publishedWithContent(api, w);
        await api.client.query(
          "UPDATE lessons SET processing_error = 'Nešto interno.' WHERE id = $1",
          [id],
        );

        const { lesson } = (await w.student.get(`/lessons/${id}`)).body;

        expect(lesson.processingError).toBeNull();
      });
    });
  });

  describe('publishing what the AI made', () => {
    it('is refused until a teacher approves it, and then allowed', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await lessonIn(api, w);
        await generate(api, w, id);

        const refused = await w.teacher.post(`/lessons/${id}/publish`);
        await api.client.query(
          `UPDATE lesson_summaries SET status = 'approved', approved_by = $2, approved_at = now() WHERE lesson_id = $1`,
          [id, api.f.teacherId],
        );
        await api.client.query(
          `UPDATE lesson_quizzes SET status = 'approved', approved_by = $2, approved_at = now() WHERE lesson_id = $1`,
          [id, api.f.teacherId],
        );
        const allowed = await w.teacher.post(`/lessons/${id}/publish`);

        expect(refused.status).toBe(409);
        expect(refused.body.error.code).toBe('needs_approval');
        expect(allowed.status).toBe(200);
        expect((await w.student.get(`/lessons/${id}`)).body.lesson.summary).not.toBeNull();
      });
    });

    it('is refused when the text changed after it was made', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await lessonIn(api, w);
        await generate(api, w, id);
        await api.client.query(
          `UPDATE lesson_summaries SET status = 'approved', approved_by = $2, approved_at = now() WHERE lesson_id = $1`,
          [id, api.f.teacherId],
        );
        await api.client.query(
          `UPDATE lesson_quizzes SET status = 'approved', approved_by = $2, approved_at = now() WHERE lesson_id = $1`,
          [id, api.f.teacherId],
        );
        await w.teacher.patch(`/lessons/${id}`, { body: `${LESSON} Još jedna rečenica.` });

        const response = await w.teacher.post(`/lessons/${id}/publish`);

        expect(response.status).toBe(409);
        expect(response.body.error.code).toBe('content_outdated');
      });
    });
  });

  it('keeps jobs in a BackgroundJobs object that the test can wait for', async () => {
    const jobs = new BackgroundJobs();
    let finished = false;

    jobs.run(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      finished = true;
    });
    await jobs.onIdle();

    expect(finished).toBe(true);
  });
});
