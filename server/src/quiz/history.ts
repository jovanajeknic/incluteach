import type { AuthUser } from '../auth/sessions.ts';
import type { Queryable } from '../db/pool.ts';
import { resolveChild } from '../enrollments/enrollments.ts';
import { HttpError } from '../http/errors.ts';
import { getLesson } from '../lessons/lessons.ts';

export interface HistoryAnswer {
  position: number;
  kind: 'choice' | 'true_false';
  prompt: string;
  chosenText: string;
  correctText: string;
  explanation: string | null;
  correct: boolean;
}

export interface HistoryAttempt {
  id: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  startedAt: string;
  completedAt: string | null;
  allCorrect: boolean | null;
  answers: HistoryAnswer[];
}

export interface AttemptHistory {
  student: { id: string; fullName: string };
  // When the student officially finished the lesson; null if they have not.
  completedAt: string | null;
  attempts: HistoryAttempt[];
}

// The newest tries only; a child can try about every 10 minutes, so this is far more than
// anyone reads.
const MAX_ATTEMPTS = 100;

const notFound = () => new HttpError(404, 'not_found', 'Lesson not found.');

// The tries of one student at the quiz of a lesson, newest first, with every question and
// answer as the student saw it then (so it stays the same when the quiz is rewritten).
// - a student sees their own;
// - a parent sees those of one of their linked children;
// - the teacher of the subject sees those of any student who joined the subject.
export async function attemptHistory(
  pool: Queryable,
  { user, lessonId, studentId }: { user: AuthUser; lessonId: string; studentId?: string },
): Promise<AttemptHistory> {
  let childId: string;
  let subjectId: string;

  if (user.role === 'teacher') {
    // getLesson only finds lessons of the teacher's own subjects.
    subjectId = (await getLesson(pool, { user, lessonId })).subject.id;
    if (!studentId) {
      throw new HttpError(400, 'invalid_student', 'Choose a student.');
    }
    childId = studentId;
  } else if (user.role === 'student' || user.role === 'parent') {
    childId = await resolveChild(pool, user, studentId);
    subjectId = (await getLesson(pool, { user, lessonId })).subject.id;
  } else {
    throw new HttpError(403, 'forbidden', 'You are not allowed to do this.');
  }

  // The student must have joined the subject. This also keeps a teacher from reading about
  // students of other teachers, and a parent from a child who has not joined this subject.
  const { rows: students } = await pool.query<{ id: string; full_name: string }>(
    `SELECT u.id, u.full_name FROM users u
     JOIN enrollments e ON e.student_id = u.id AND e.subject_id = $3 AND e.status = 'approved'
     WHERE u.id = $1 AND u.school_id = $2 AND u.role = 'student'`,
    [childId, user.schoolId, subjectId],
  );
  if (!students[0]) {
    throw notFound();
  }

  const { rows: attempts } = await pool.query<{
    id: string;
    status: HistoryAttempt['status'];
    started_at: Date;
    completed_at: Date | null;
    all_correct: boolean | null;
  }>(
    `SELECT id, status, started_at, completed_at, all_correct FROM quiz_attempts
     WHERE student_id = $1 AND lesson_id = $2 AND school_id = $3
     ORDER BY started_at DESC, id LIMIT ${MAX_ATTEMPTS}`,
    [childId, lessonId, user.schoolId],
  );
  const { rows: answers } = await pool.query<{
    attempt_id: string;
    position: number;
    question_kind: HistoryAnswer['kind'];
    question_prompt: string;
    chosen_text: string;
    correct_text: string;
    explanation: string | null;
    is_correct: boolean;
  }>(
    `SELECT attempt_id, position, question_kind, question_prompt, chosen_text, correct_text,
            explanation, is_correct
     FROM quiz_answers WHERE attempt_id = ANY($1::uuid[]) ORDER BY attempt_id, position`,
    [attempts.map((attempt) => attempt.id)],
  );
  const { rows: done } = await pool.query<{ completed_at: Date }>(
    'SELECT completed_at FROM lesson_completions WHERE lesson_id = $1 AND student_id = $2',
    [lessonId, childId],
  );

  return {
    student: { id: students[0].id, fullName: students[0].full_name },
    completedAt: done[0]?.completed_at.toISOString() ?? null,
    attempts: attempts.map((attempt) => ({
      id: attempt.id,
      status: attempt.status,
      startedAt: attempt.started_at.toISOString(),
      completedAt: attempt.completed_at?.toISOString() ?? null,
      allCorrect: attempt.all_correct,
      answers: answers
        .filter((answer) => answer.attempt_id === attempt.id)
        .map((answer) => ({
          position: answer.position,
          kind: answer.question_kind,
          prompt: answer.question_prompt,
          chosenText: answer.chosen_text,
          correctText: answer.correct_text,
          explanation: answer.explanation,
          correct: answer.is_correct,
        })),
    })),
  };
}
