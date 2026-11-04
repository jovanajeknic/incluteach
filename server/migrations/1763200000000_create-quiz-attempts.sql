-- Up Migration

-- A child doing the quiz of a lesson, and finishing the lesson. See docs/LESSONS.md.
-- An attempt is one go through the whole quiz. The quiz is practice only (no score), but a lesson
-- is finished only when one attempt has every answer right.

CREATE TYPE quiz_attempt_status AS ENUM ('in_progress', 'completed', 'abandoned');

CREATE TABLE quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  lesson_id uuid NOT NULL,
  student_id uuid NOT NULL,
  -- Always 'student'; it exists only so the foreign key can check the child's role.
  student_role user_role NOT NULL DEFAULT 'student' CHECK (student_role = 'student'),
  status quiz_attempt_status NOT NULL DEFAULT 'in_progress',
  -- The order in which this attempt shows the questions and their answers. It is different
  -- every time, so the child learns the content and does not answer by remembering places.
  order_data jsonb NOT NULL,
  question_count integer NOT NULL CHECK (question_count >= 1),
  started_at timestamptz NOT NULL DEFAULT now(),
  -- The last answer, or the start. The wait before the next attempt counts from here.
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  all_correct boolean,
  FOREIGN KEY (lesson_id, school_id) REFERENCES lessons (id, school_id) ON DELETE CASCADE,
  FOREIGN KEY (student_id, student_role, school_id) REFERENCES users (id, role, school_id),
  CONSTRAINT quiz_attempts_completed_check CHECK (
    (status = 'completed' AND completed_at IS NOT NULL AND all_correct IS NOT NULL)
    OR (status <> 'completed' AND completed_at IS NULL AND all_correct IS NULL)
  )
);

CREATE INDEX quiz_attempts_student_lesson_idx ON quiz_attempts (student_id, lesson_id, started_at DESC);
CREATE INDEX quiz_attempts_lesson_idx ON quiz_attempts (lesson_id);

-- A child has at most one attempt in progress for a lesson.
CREATE UNIQUE INDEX quiz_attempts_one_open_key
  ON quiz_attempts (student_id, lesson_id)
  WHERE status = 'in_progress';

-- One answer to one question in an attempt. The question and the answers are copied here, so
-- the history stays the same even if a teacher later rewrites the quiz.
CREATE TABLE quiz_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES quiz_attempts (id) ON DELETE CASCADE,
  -- The place of the question in this attempt, starting at 1.
  position integer NOT NULL CHECK (position >= 1),
  question_id uuid REFERENCES quiz_questions (id) ON DELETE SET NULL,
  option_id uuid REFERENCES quiz_options (id) ON DELETE SET NULL,
  question_kind quiz_question_kind NOT NULL,
  question_prompt text NOT NULL,
  chosen_text text NOT NULL,
  correct_text text NOT NULL,
  explanation text,
  is_correct boolean NOT NULL,
  answered_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, position),
  -- A question is answered once per attempt.
  UNIQUE (attempt_id, question_id)
);

CREATE INDEX quiz_answers_question_idx ON quiz_answers (question_id);

-- A lesson a child has officially finished. Pressing "finish" is what finishes it, and for a
-- lesson with a quiz that is possible only after an attempt with every answer right.
CREATE TABLE lesson_completions (
  lesson_id uuid NOT NULL,
  school_id uuid NOT NULL,
  student_id uuid NOT NULL,
  student_role user_role NOT NULL DEFAULT 'student' CHECK (student_role = 'student'),
  -- The attempt that had every answer right; empty for a lesson without a quiz.
  attempt_id uuid REFERENCES quiz_attempts (id) ON DELETE SET NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (lesson_id, student_id),
  FOREIGN KEY (lesson_id, school_id) REFERENCES lessons (id, school_id) ON DELETE CASCADE,
  FOREIGN KEY (student_id, student_role, school_id) REFERENCES users (id, role, school_id)
);

CREATE INDEX lesson_completions_student_idx ON lesson_completions (student_id);

-- Down Migration

DROP TABLE lesson_completions;

DROP TABLE quiz_answers;

DROP TABLE quiz_attempts;

DROP TYPE quiz_attempt_status;
