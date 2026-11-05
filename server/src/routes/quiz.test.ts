import type pg from 'pg';
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

interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
}
interface Question {
  id: string;
  kind: string;
  prompt: string;
  options: Option[];
}

const question = (n: number) => ({
  kind: 'choice',
  prompt: `Pitanje ${n}?`,
  explanation: `Objašnjenje ${n}.`,
  options: [
    { text: `a${n}`, isCorrect: false },
    { text: `b${n}`, isCorrect: true },
    { text: `c${n}`, isCorrect: false },
  ],
});
const trueFalse = {
  kind: 'true_false',
  prompt: 'Biljke ispuštaju kisik.',
  options: [
    { text: 'Tačno', isCorrect: true },
    { text: 'Netačno', isCorrect: false },
  ],
};

// These tests talk to the real local database, so they run only when DATABASE_URL is set.
describe.skipIf(!process.env.DATABASE_URL)('the quiz for students', () => {
  let pool: pg.Pool;

  beforeAll(() => {
    pool = createPool();
  });

  afterAll(() => pool.end());

  const inApi = (run: (api: Api) => Promise<void>) => runWithApi(pool, run);

  interface World {
    subjectId: string;
    lessonId: string;
    teacher: Requests;
    student: Requests;
    parent: Requests;
    // The quiz as the teacher wrote it, with the right answers.
    questions: Question[];
  }

  // A published lesson with an approved quiz, in a subject the student has joined.
  async function setup(
    api: Api,
    quiz: object[] = [question(1), question(2), trueFalse],
  ): Promise<World> {
    const { client, f } = api;
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
    const lessonId = await insertLesson(client, {
      schoolId: f.schoolId,
      subjectId,
      createdBy: f.teacherId,
      body: 'Fotosinteza je proces u kojem biljke prave hranu uz pomoć svjetlosti.',
    });
    const teacher = await api.as('jovan_jovanovic');
    await teacher.put(`/lessons/${lessonId}/quiz`, { questions: quiz });
    await teacher.post(`/lessons/${lessonId}/quiz/approve`);
    expect((await teacher.post(`/lessons/${lessonId}/publish`)).status).toBe(200);
    const questions: Question[] = (await teacher.get(`/lessons/${lessonId}`)).body.lesson.quiz
      .questions;
    return {
      subjectId,
      lessonId,
      teacher,
      student: await api.as('ana_ivic'),
      parent: await api.as('petar_ivic'),
      questions,
    };
  }

  const start = (w: World) => w.student.post(`/lessons/${w.lessonId}/quiz/attempts`);
  const answer = (w: World, attemptId: string, questionId: string, optionId: string) =>
    w.student.post(`/lessons/${w.lessonId}/quiz/attempts/${attemptId}/answers`, {
      questionId,
      optionId,
    });
  const rightOf = (w: World, questionId: string) =>
    w.questions.find((q) => q.id === questionId)!.options.find((o) => o.isCorrect)!.id;
  const wrongOf = (w: World, questionId: string) =>
    w.questions.find((q) => q.id === questionId)!.options.find((o) => !o.isCorrect)!.id;

  // Answers every question of an attempt; `rightOnes` says which are answered correctly.
  async function answerAll(
    w: World,
    attempt: { id: string; questions: { id: string }[] },
    wrongAt: number[] = [],
  ) {
    let last = null;
    for (const [index, q] of attempt.questions.entries()) {
      const optionId = wrongAt.includes(index) ? wrongOf(w, q.id) : rightOf(w, q.id);
      last = await answer(w, attempt.id, q.id, optionId);
    }
    return last!;
  }

  // The test transaction never moves time, so "ten minutes later" is made by moving the past.
  const movePast = (api: Api, minutes: number) =>
    api.client.query(
      `UPDATE quiz_attempts SET last_activity_at = last_activity_at - make_interval(mins => $1),
         started_at = started_at - make_interval(mins => $1)`,
      [minutes],
    );

  describe('starting', () => {
    it('gives a new try with every question, and never says which answer is right', async () => {
      await inApi(async (api) => {
        const w = await setup(api);

        const response = await start(w);

        expect(response.status).toBe(201);
        const { attempt } = response.body;
        expect(attempt).toMatchObject({
          status: 'in_progress',
          completedAt: null,
          allCorrect: null,
        });
        expect(attempt.questions.map((q: { id: string }) => q.id).sort()).toEqual(
          w.questions.map((q) => q.id).sort(),
        );
        expect(attempt.questions.map((q: { position: number }) => q.position)).toEqual([1, 2, 3]);
        for (const q of attempt.questions) {
          expect(q.answer).toBeNull();
          for (const option of q.options) {
            expect(Object.keys(option).sort()).toEqual(['id', 'text']);
          }
        }
        expect(JSON.stringify(response.body)).not.toContain('Objašnjenje');
      });
    });

    it('keeps Tačno before Netačno in a true/false question', async () => {
      await inApi(async (api) => {
        const w = await setup(api, [trueFalse]);

        const { attempt } = (await start(w)).body;

        expect(attempt.questions[0].options.map((o: { text: string }) => o.text)).toEqual([
          'Tačno',
          'Netačno',
        ]);
      });
    });

    it('shuffles the questions and the answers of a choice question', async () => {
      await inApi(async (api) => {
        const many = Array.from({ length: 8 }, (_, n) => question(n + 1));
        const w = await setup(api, many);

        const { attempt } = (await start(w)).body;

        // With 8 questions the chance of the original order is 1 in 40320.
        expect(attempt.questions.map((q: { id: string }) => q.id)).not.toEqual(
          w.questions.map((q) => q.id),
        );
        for (const q of attempt.questions) {
          const original = w.questions.find((o) => o.id === q.id)!;
          expect(q.options.map((o: { id: string }) => o.id).sort()).toEqual(
            original.options.map((o) => o.id).sort(),
          );
        }
      });
    });

    it('continues the open try instead of starting another', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const first = (await start(w)).body.attempt;
        await answer(w, first.id, first.questions[0].id, rightOf(w, first.questions[0].id));

        const again = await start(w);

        expect(again.status).toBe(200);
        expect(again.body.attempt.id).toBe(first.id);
        expect(again.body.attempt.questions.map((q: { id: string }) => q.id)).toEqual(
          first.questions.map((q: { id: string }) => q.id),
        );
        expect(again.body.attempt.questions[0].answer).toMatchObject({ correct: true });
        expect(again.body.attempt.questions[1].answer).toBeNull();
      });
    });

    it('closes a try left open for hours and starts a new one, with no wait if nothing was answered', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const old = (await start(w)).body.attempt;
        await movePast(api, 180);

        const response = await start(w);

        expect(response.status).toBe(201);
        expect(response.body.attempt.id).not.toBe(old.id);
        const { rows } = await api.client.query('SELECT status FROM quiz_attempts WHERE id = $1', [
          old.id,
        ]);
        expect(rows[0].status).toBe('abandoned');
      });
    });

    it('is not possible for a lesson without an approved quiz, or one that is not published', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const noQuiz = await insertLesson(api.client, {
          schoolId: api.f.schoolId,
          subjectId: w.subjectId,
          createdBy: api.f.teacherId,
          status: 'published',
          publishedAt: new Date().toISOString(),
        });
        const draft = await insertLesson(api.client, {
          schoolId: api.f.schoolId,
          subjectId: w.subjectId,
          createdBy: api.f.teacherId,
        });

        for (const id of [noQuiz, draft, '00000000-0000-4000-8000-000000000000', 'nije-uuid']) {
          const response = await w.student.post(`/lessons/${id}/quiz/attempts`);
          expect(response.status, id).toBe(404);
        }
      });
    });

    it('is not possible after the teacher changed the quiz and did not approve it again', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        await w.teacher.post(`/lessons/${w.lessonId}/unpublish`);
        await w.teacher.put(`/lessons/${w.lessonId}/quiz`, { questions: [question(9)] });

        expect((await start(w)).status).toBe(404);
      });
    });

    it('is only for students of the subject', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const url = `/lessons/${w.lessonId}/quiz/attempts`;

        expect((await w.teacher.post(url)).status).toBe(403);
        expect((await w.parent.post(url)).status).toBe(403);
        expect((await api.post(url)).status).toBe(403);
        // A student who has not joined the subject sees no lesson, so no quiz.
        await api.client.query('DELETE FROM enrollments WHERE student_id = $1', [api.f.studentId]);
        expect((await w.student.post(url)).status).toBe(404);
      });
    });
  });

  describe('answering', () => {
    it('says at once if the answer is right, which one was right, and why', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const { attempt } = (await start(w)).body;
        const q = attempt.questions[0];

        const wrong = await answer(w, attempt.id, q.id, wrongOf(w, q.id));

        expect(wrong.status).toBe(200);
        expect(wrong.body.answer).toMatchObject({
          questionId: q.id,
          optionId: wrongOf(w, q.id),
          correct: false,
          correctOptionId: rightOf(w, q.id),
        });
        // Only the choice questions of this quiz have an explanation.
        expect(wrong.body.answer.explanation).toBe(
          q.kind === 'choice' ? `Objašnjenje ${q.prompt.match(/\d/)![0]}.` : null,
        );
        expect(wrong.body.attempt).toMatchObject({
          status: 'in_progress',
          answered: 1,
          total: 3,
          allCorrect: null,
        });
      });
    });

    it('refuses a second answer to the same question', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const { attempt } = (await start(w)).body;
        const q = attempt.questions[0];
        await answer(w, attempt.id, q.id, wrongOf(w, q.id));

        const again = await answer(w, attempt.id, q.id, rightOf(w, q.id));

        expect(again.status).toBe(409);
        expect(again.body.error.code).toBe('already_answered');
        const { rows } = await api.client.query('SELECT is_correct FROM quiz_answers');
        expect(rows).toEqual([{ is_correct: false }]);
      });
    });

    it('completes the try with the last answer, and says if everything was right', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const { attempt } = (await start(w)).body;

        const last = await answerAll(w, attempt);

        expect(last.body.attempt).toMatchObject({
          status: 'completed',
          answered: 3,
          total: 3,
          allCorrect: true,
        });
        const { rows } = await api.client.query(
          'SELECT status, all_correct, completed_at FROM quiz_attempts',
        );
        expect(rows[0]).toMatchObject({ status: 'completed', all_correct: true });
        expect(rows[0].completed_at).not.toBeNull();
      });
    });

    it('completes the try with a mistake as not all correct', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const { attempt } = (await start(w)).body;

        const last = await answerAll(w, attempt, [1]);

        expect(last.body.attempt).toMatchObject({ status: 'completed', allCorrect: false });
      });
    });

    it('refuses answers once the try is completed', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const { attempt } = (await start(w)).body;
        await answerAll(w, attempt);

        const q = attempt.questions[0];
        const response = await answer(w, attempt.id, q.id, rightOf(w, q.id));

        expect(response.status).toBe(409);
        expect(response.body.error.code).toBe('attempt_finished');
      });
    });

    it('refuses a question or an answer that does not belong', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const { attempt } = (await start(w)).body;
        const [first, second] = attempt.questions;
        const url = `/lessons/${w.lessonId}/quiz/attempts/${attempt.id}/answers`;

        const otherQuestion = await answer(
          w,
          attempt.id,
          '11111111-1111-4111-8111-111111111111',
          rightOf(w, first.id),
        );
        const otherOption = await answer(w, attempt.id, first.id, rightOf(w, second.id));
        const noBody = await w.student.post(url, {});
        const badIds = await w.student.post(url, { questionId: 'x', optionId: 5 });

        expect(otherQuestion.status).toBe(400);
        expect(otherQuestion.body.error.code).toBe('invalid_question');
        expect(otherOption.status).toBe(400);
        expect(otherOption.body.error.code).toBe('invalid_option');
        expect(noBody.body.error.code).toBe('invalid_question');
        expect(badIds.status).toBe(400);
        const { rows } = await api.client.query('SELECT 1 FROM quiz_answers');
        expect(rows).toHaveLength(0);
      });
    });

    it('is only possible in the own try of the student', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const { attempt } = (await start(w)).body;
        const q = attempt.questions[0];
        const url = `/lessons/${w.lessonId}/quiz/attempts/${attempt.id}/answers`;
        const body = { questionId: q.id, optionId: rightOf(w, q.id) };

        expect((await w.teacher.post(url, body)).status).toBe(403);
        expect((await w.parent.post(url, body)).status).toBe(403);
        // Another student of the same subject.
        await api.client.query(`UPDATE quiz_attempts SET student_id = $1 WHERE id = $2`, [
          api.f.notActivatedStudentId,
          attempt.id,
        ]);
        expect((await w.student.post(url, body)).status).toBe(404);
        expect((await w.student.post(url.replace(attempt.id, 'nije-uuid'), body)).status).toBe(404);
      });
    });

    it('refuses answers when the teacher changed the quiz after the try began', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const { attempt } = (await start(w)).body;
        const q = attempt.questions[0];
        await w.teacher.post(`/lessons/${w.lessonId}/unpublish`);
        await w.teacher.put(`/lessons/${w.lessonId}/quiz`, {
          questions: [question(7), question(8)],
        });
        await w.teacher.post(`/lessons/${w.lessonId}/quiz/approve`);
        await w.teacher.post(`/lessons/${w.lessonId}/publish`);

        const response = await answer(w, attempt.id, q.id, rightOf(w, q.id));

        expect(response.status).toBe(409);
        expect(response.body.error.code).toBe('quiz_changed');

        // Starting again leaves the old try behind and gives the new quiz.
        const fresh = await start(w);
        expect(fresh.status).toBe(201);
        expect(fresh.body.attempt.questions).toHaveLength(2);
        const { rows } = await api.client.query('SELECT status FROM quiz_attempts WHERE id = $1', [
          attempt.id,
        ]);
        expect(rows[0].status).toBe('abandoned');
      });
    });

    it('keeps the answers as they were when the quiz is rewritten later', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const { attempt } = (await start(w)).body;
        const q = attempt.questions[0];
        await answer(w, attempt.id, q.id, wrongOf(w, q.id));
        await w.teacher.post(`/lessons/${w.lessonId}/unpublish`);
        await w.teacher.put(`/lessons/${w.lessonId}/quiz`, { questions: [question(7)] });

        const { rows } = await api.client.query(
          'SELECT question_id, option_id, question_prompt, chosen_text, correct_text, is_correct FROM quiz_answers',
        );
        expect(rows).toHaveLength(1);
        expect(rows[0].question_id).toBeNull();
        expect(rows[0].option_id).toBeNull();
        expect(rows[0].question_prompt).toBe(q.prompt);
        expect(rows[0].is_correct).toBe(false);
      });
    });
  });

  describe('trying again', () => {
    it('makes the child wait 10 minutes after a try, and says when', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const { attempt } = (await start(w)).body;
        await answerAll(w, attempt, [0]);

        const response = await start(w);

        expect(response.status).toBe(409);
        expect(response.body.error.code).toBe('retry_later');
        const next = new Date(response.body.error.details.nextAttemptAt).getTime();
        const { rows } = await api.client.query<{ at: Date }>(
          'SELECT last_activity_at AS at FROM quiz_attempts',
        );
        expect(next).toBe(rows[0].at.getTime() + 10 * 60_000);
      });
    });

    it('allows a new try when 10 minutes have passed, with a different order', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const first = (await start(w)).body.attempt;
        await answerAll(w, first, [0]);
        await movePast(api, 9);
        expect((await start(w)).status).toBe(409);
        await movePast(api, 2);

        const response = await start(w);

        expect(response.status).toBe(201);
        expect(response.body.attempt.id).not.toBe(first.id);
        expect(
          response.body.attempt.questions.every((q: { answer: unknown }) => q.answer === null),
        ).toBe(true);
        // Both tries are kept.
        const { rows } = await api.client.query('SELECT count(*)::int AS n FROM quiz_attempts');
        expect(rows[0].n).toBe(2);
      });
    });

    it('also makes the child wait after a try that was answered in part and then left', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const first = (await start(w)).body.attempt;
        await answer(w, first.id, first.questions[0].id, rightOf(w, first.questions[0].id));
        await api.client.query(`UPDATE quiz_attempts SET status = 'abandoned'`);

        const response = await start(w);

        expect(response.status).toBe(409);
        expect(response.body.error.code).toBe('retry_later');
      });
    });

    it('has no wait after a try that nothing was answered in', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        await start(w);
        await api.client.query(`UPDATE quiz_attempts SET status = 'abandoned'`);

        expect((await start(w)).status).toBe(201);
      });
    });
  });

  describe('when a student is deleted', () => {
    it('their tries, answers and finished lessons are deleted too', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const { attempt } = (await start(w)).body;
        await answerAll(w, attempt);
        await api.client.query(
          `INSERT INTO lesson_completions (lesson_id, school_id, student_id) VALUES ($1, $2, $3)`,
          [w.lessonId, api.f.schoolId, api.f.studentId],
        );

        // Only a deactivated account can be deleted.
        await api.deactivate(api.f.studentId);
        const response = await api.post('/users/delete', { ids: [api.f.studentId] });

        expect(response.status).toBe(200);
        for (const table of ['quiz_attempts', 'quiz_answers', 'lesson_completions']) {
          const { rows } = await api.client.query(`SELECT 1 FROM ${table}`);
          expect(rows, table).toHaveLength(0);
        }
      });
    });
  });

  describe('finishing the lesson', () => {
    const complete = (w: World, lessonId = w.lessonId) =>
      w.student.post(`/lessons/${lessonId}/complete`);
    const progressOf = async (w: World) =>
      (await w.student.get(`/lessons/${w.lessonId}`)).body.lesson.myProgress;
    const publishedWithoutQuiz = (api: Api, w: World) =>
      insertLesson(api.client, {
        schoolId: api.f.schoolId,
        subjectId: w.subjectId,
        createdBy: api.f.teacherId,
        status: 'published',
        publishedAt: new Date().toISOString(),
      });

    it('lets the student finish a lesson without a quiz at any time, once', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await publishedWithoutQuiz(api, w);
        const view = await w.student.get(`/lessons/${id}`);
        expect(view.body.lesson.myProgress).toEqual({
          completed: false,
          completedAt: null,
          canFinish: true,
          quiz: null,
        });

        const first = await complete(w, id);
        const again = await complete(w, id);

        expect(first.status).toBe(200);
        expect(first.body.progress).toMatchObject({ completed: true, canFinish: false });
        expect(first.body.progress.completedAt).toEqual(expect.any(String));
        expect(again.body.progress.completedAt).toBe(first.body.progress.completedAt);
        const { rows } = await api.client.query('SELECT attempt_id FROM lesson_completions');
        expect(rows).toEqual([{ attempt_id: null }]);
      });
    });

    it('needs a try with every answer right when the lesson has a quiz', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        expect(await progressOf(w)).toEqual({
          completed: false,
          completedAt: null,
          canFinish: false,
          quiz: { openAttemptId: null, nextAttemptAt: null, passed: false },
        });
        expect((await complete(w)).body.error.code).toBe('quiz_not_passed');

        // A try with a mistake is not enough.
        const first = (await start(w)).body.attempt;
        expect(await progressOf(w)).toMatchObject({ quiz: { openAttemptId: first.id } });
        await answerAll(w, first, [0]);
        const failed = await progressOf(w);
        expect(failed).toMatchObject({ canFinish: false, quiz: { passed: false } });
        expect(failed.quiz.openAttemptId).toBeNull();
        expect(failed.quiz.nextAttemptAt).toEqual(expect.any(String));
        expect((await complete(w)).status).toBe(409);
        const noStar = await api.client.query('SELECT 1 FROM stars');
        expect(noStar.rows).toHaveLength(0);

        await movePast(api, 11);
        const second = (await start(w)).body.attempt;
        await answerAll(w, second);
        expect(await progressOf(w)).toMatchObject({
          completed: false,
          canFinish: true,
          quiz: { passed: true },
        });

        const done = await complete(w);

        expect(done.status).toBe(200);
        expect(done.body.progress).toMatchObject({ completed: true, canFinish: false });
        const { rows } = await api.client.query('SELECT attempt_id FROM lesson_completions');
        expect(rows).toEqual([{ attempt_id: second.id }]);
        expect((await complete(w)).body.progress.completed).toBe(true);
        // The automatic star came with it, and pressing the button again gives no second one.
        const stars = await api.client.query('SELECT source FROM stars');
        expect(stars.rows).toEqual([{ source: 'automatic' }]);
      });
    });

    it('does not count a try made for a quiz that was rewritten since', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const { attempt } = (await start(w)).body;
        await answerAll(w, attempt);
        await w.teacher.post(`/lessons/${w.lessonId}/unpublish`);
        await w.teacher.put(`/lessons/${w.lessonId}/quiz`, { questions: [question(7)] });
        await w.teacher.post(`/lessons/${w.lessonId}/quiz/approve`);
        await w.teacher.post(`/lessons/${w.lessonId}/publish`);

        expect(await progressOf(w)).toMatchObject({ canFinish: false, quiz: { passed: false } });
        expect((await complete(w)).body.error.code).toBe('quiz_not_passed');
      });
    });

    it('stays finished when the quiz is rewritten later', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const { attempt } = (await start(w)).body;
        await answerAll(w, attempt);
        const first = await complete(w);
        await w.teacher.post(`/lessons/${w.lessonId}/unpublish`);
        await w.teacher.put(`/lessons/${w.lessonId}/quiz`, { questions: [question(7)] });
        await w.teacher.post(`/lessons/${w.lessonId}/quiz/approve`);
        await w.teacher.post(`/lessons/${w.lessonId}/publish`);

        const again = await complete(w);

        expect(again.status).toBe(200);
        expect(again.body.progress.completedAt).toBe(first.body.progress.completedAt);
      });
    });

    it('is only for a student who can see the lesson', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const draft = await insertLesson(api.client, {
          schoolId: api.f.schoolId,
          subjectId: w.subjectId,
          createdBy: api.f.teacherId,
        });

        expect((await complete(w, draft)).status).toBe(404);
        expect((await complete(w, 'nije-uuid')).status).toBe(404);
        expect((await complete(w, '00000000-0000-4000-8000-000000000000')).status).toBe(404);
        expect((await w.teacher.post(`/lessons/${w.lessonId}/complete`)).status).toBe(403);
        expect((await w.parent.post(`/lessons/${w.lessonId}/complete`)).status).toBe(403);
        expect((await api.post(`/lessons/${w.lessonId}/complete`)).status).toBe(403);
        await api.client.query('DELETE FROM enrollments');
        expect((await complete(w)).status).toBe(404);
      });
    });

    it('shows the progress only to the student', async () => {
      await inApi(async (api) => {
        const w = await setup(api);

        for (const person of [w.teacher, w.parent]) {
          const lesson = (await person.get(`/lessons/${w.lessonId}`)).body.lesson;
          expect(lesson.myProgress).toBeNull();
        }
      });
    });
  });

  describe('the history of tries', () => {
    const history = (who: Requests, w: World, query = '') =>
      who.get(`/lessons/${w.lessonId}/quiz/attempts${query}`);
    const complete = (w: World) => w.student.post(`/lessons/${w.lessonId}/complete`);

    async function withTries(api: Api) {
      const w = await setup(api);
      const first = (await start(w)).body.attempt;
      await answerAll(w, first, [0]);
      await movePast(api, 11);
      const second = (await start(w)).body.attempt;
      await answerAll(w, second);
      await complete(w);
      return { w, first, second };
    }

    it('shows the student their tries, newest first, with every answer', async () => {
      await inApi(async (api) => {
        const { w, first, second } = await withTries(api);

        const response = await history(w.student, w);

        expect(response.status).toBe(200);
        expect(response.body.student).toEqual({ id: api.f.studentId, fullName: 'Ana Ivić' });
        expect(response.body.completedAt).toEqual(expect.any(String));
        const [newest, oldest] = response.body.attempts;
        expect([newest.id, oldest.id]).toEqual([second.id, first.id]);
        expect(newest).toMatchObject({ status: 'completed', allCorrect: true });
        expect(oldest).toMatchObject({ status: 'completed', allCorrect: false });
        expect(oldest.answers).toHaveLength(3);
        expect(oldest.answers.map((a: { position: number }) => a.position)).toEqual([1, 2, 3]);
        const wrong = oldest.answers.filter((a: { correct: boolean }) => !a.correct);
        expect(wrong).toHaveLength(1);
        expect(wrong[0]).toMatchObject({
          prompt: first.questions[0].prompt,
          chosenText: expect.any(String),
          correctText: expect.any(String),
        });
        expect(wrong[0].chosenText).not.toBe(wrong[0].correctText);
      });
    });

    it('stays the same when the quiz is rewritten', async () => {
      await inApi(async (api) => {
        const { w } = await withTries(api);
        const before = (await history(w.student, w)).body;
        await w.teacher.post(`/lessons/${w.lessonId}/unpublish`);
        await w.teacher.put(`/lessons/${w.lessonId}/quiz`, { questions: [question(7)] });

        expect((await history(w.teacher, w, `?studentId=${api.f.studentId}`)).body).toEqual(before);
      });
    });

    it('shows a parent the tries of their own child only', async () => {
      await inApi(async (api) => {
        const { w } = await withTries(api);
        await insertActivatedUser(api.client, api.f.schoolId, 'parent', {
          username: 'drugi_roditelj',
          email: 'drugi@example.com',
          password: PASSWORD,
        });
        const other = await api.as('drugi_roditelj');
        const childQuery = `?studentId=${api.f.studentId}`;

        const ok = await history(w.parent, w, childQuery);
        expect(ok.status).toBe(200);
        expect(ok.body.attempts).toHaveLength(2);
        expect((await history(w.parent, w)).body.error.code).toBe('invalid_student');
        expect((await history(other, w, childQuery)).status).toBe(403);
        const stranger = `?studentId=${api.f.otherSchoolStudentId}`;
        expect((await history(w.parent, w, stranger)).status).toBe(403);
        await api.client.query('DELETE FROM enrollments');
        expect((await history(w.parent, w, childQuery)).status).toBe(404);
      });
    });

    it('shows the teacher of the subject the tries of a student who joined it', async () => {
      await inApi(async (api) => {
        const { w } = await withTries(api);
        await insertActivatedUser(api.client, api.f.schoolId, 'teacher', {
          username: 'mira_miric',
          email: 'mira@example.com',
          password: PASSWORD,
        });
        const otherTeacher = await api.as('mira_miric');
        const studentQuery = `?studentId=${api.f.studentId}`;

        const ok = await history(w.teacher, w, studentQuery);
        expect(ok.status).toBe(200);
        expect(ok.body.attempts).toHaveLength(2);
        expect((await history(w.teacher, w)).body.error.code).toBe('invalid_student');
        expect((await history(w.teacher, w, '?studentId=x')).status).toBe(400);
        expect((await history(otherTeacher, w, studentQuery)).status).toBe(404);
        // A student who did not join the subject, and somebody who is not a student.
        const notJoined = `?studentId=${api.f.notActivatedStudentId}`;
        expect((await history(w.teacher, w, notJoined)).status).toBe(404);
        expect((await history(w.teacher, w, `?studentId=${api.f.parentId}`)).status).toBe(404);
      });
    });

    it('is not for the admin, and a student cannot ask about another student', async () => {
      await inApi(async (api) => {
        const { w } = await withTries(api);
        const other = `?studentId=${api.f.notActivatedStudentId}`;

        expect((await history(api, w)).status).toBe(403);
        expect((await history(w.student, w, other)).status).toBe(403);
        expect((await history(w.student, w, `?studentId=${api.f.studentId}`)).status).toBe(200);
        expect((await w.student.get('/lessons/nije-uuid/quiz/attempts')).status).toBe(404);
      });
    });
  });
});
