-- Up Migration

-- Lessons, and the summary and quiz that belong to them. See docs/LESSONS.md.
-- A lesson belongs to a subject. The teacher's text is kept as written; the summary and the
-- quiz are made by the AI or by the teacher and each must be approved by a teacher before
-- students see them. Students' quiz answers, comments and stars are added in later migrations.

CREATE TYPE lesson_status AS ENUM ('draft', 'processing', 'in_review', 'published');

-- How the text came about. The original file itself is not kept, only the text.
CREATE TYPE lesson_source AS ENUM ('pasted', 'docx', 'pdf');

CREATE TYPE content_status AS ENUM ('draft', 'approved');

-- Who wrote a summary or a quiz.
CREATE TYPE content_origin AS ENUM ('ai', 'teacher');

CREATE TYPE quiz_question_kind AS ENUM ('choice', 'true_false');

CREATE TABLE lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  subject_id uuid NOT NULL,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  -- The text of the lesson as the teacher corrected it. The API limits it to about 40,000
  -- characters; this larger limit is only a safety net.
  body text NOT NULL DEFAULT '' CHECK (char_length(body) <= 100000),
  -- Goes up by one whenever the text changes. A summary or a quiz made from an older
  -- revision is outdated and must be made or approved again.
  body_revision integer NOT NULL DEFAULT 1 CHECK (body_revision >= 1),
  source lesson_source NOT NULL DEFAULT 'pasted',
  source_file_name text CHECK (source_file_name IS NULL OR char_length(source_file_name) <= 255),
  status lesson_status NOT NULL DEFAULT 'draft',
  -- Why the last AI run failed, if it did.
  processing_error text,
  published_at timestamptz,
  created_by uuid NOT NULL,
  -- Always 'teacher'; the *_role columns with a fixed value exist only so the foreign keys
  -- can make the database check each user's role and school.
  created_by_role user_role NOT NULL DEFAULT 'teacher' CHECK (created_by_role = 'teacher'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (subject_id, school_id) REFERENCES subjects (id, school_id),
  FOREIGN KEY (created_by, created_by_role, school_id) REFERENCES users (id, role, school_id),
  UNIQUE (id, school_id),
  CONSTRAINT lessons_published_check CHECK (status <> 'published' OR published_at IS NOT NULL)
);

CREATE INDEX lessons_subject_id_idx ON lessons (subject_id);
CREATE INDEX lessons_school_status_idx ON lessons (school_id, status);

-- At most one summary per lesson: bullet points, each a short sentence.
CREATE TABLE lesson_summaries (
  lesson_id uuid PRIMARY KEY,
  school_id uuid NOT NULL,
  points text[] NOT NULL CHECK (cardinality(points) BETWEEN 1 AND 30),
  origin content_origin NOT NULL,
  status content_status NOT NULL DEFAULT 'draft',
  -- The revision of the lesson text this was made from.
  based_on_revision integer NOT NULL CHECK (based_on_revision >= 1),
  approved_by uuid,
  approved_by_role user_role NOT NULL DEFAULT 'teacher' CHECK (approved_by_role = 'teacher'),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (lesson_id, school_id) REFERENCES lessons (id, school_id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by, approved_by_role, school_id) REFERENCES users (id, role, school_id),
  -- Approved means a teacher of the school approved it, and when.
  CONSTRAINT lesson_summaries_approval_check CHECK (
    (status = 'draft' AND approved_by IS NULL AND approved_at IS NULL)
    OR (status = 'approved' AND approved_by IS NOT NULL AND approved_at IS NOT NULL)
  )
);

-- At most one quiz per lesson. Its questions are in quiz_questions.
CREATE TABLE lesson_quizzes (
  lesson_id uuid PRIMARY KEY,
  school_id uuid NOT NULL,
  origin content_origin NOT NULL,
  status content_status NOT NULL DEFAULT 'draft',
  based_on_revision integer NOT NULL CHECK (based_on_revision >= 1),
  approved_by uuid,
  approved_by_role user_role NOT NULL DEFAULT 'teacher' CHECK (approved_by_role = 'teacher'),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (lesson_id, school_id) REFERENCES lessons (id, school_id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by, approved_by_role, school_id) REFERENCES users (id, role, school_id),
  CONSTRAINT lesson_quizzes_approval_check CHECK (
    (status = 'draft' AND approved_by IS NULL AND approved_at IS NULL)
    OR (status = 'approved' AND approved_by IS NOT NULL AND approved_at IS NOT NULL)
  )
);

CREATE TABLE quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES lesson_quizzes (lesson_id) ON DELETE CASCADE,
  position integer NOT NULL CHECK (position >= 1),
  kind quiz_question_kind NOT NULL,
  prompt text NOT NULL CHECK (char_length(btrim(prompt)) BETWEEN 1 AND 500),
  -- Shown to the child after answering, to explain the right answer. Optional.
  explanation text CHECK (explanation IS NULL OR char_length(explanation) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Deferred, so that questions can swap places inside one transaction.
  UNIQUE (lesson_id, position) DEFERRABLE INITIALLY DEFERRED
);

-- The answers to choose from. A true/false question has two (true and false).
CREATE TABLE quiz_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES quiz_questions (id) ON DELETE CASCADE,
  position integer NOT NULL CHECK (position >= 1),
  text text NOT NULL CHECK (char_length(btrim(text)) BETWEEN 1 AND 300),
  is_correct boolean NOT NULL DEFAULT false,
  UNIQUE (question_id, position) DEFERRABLE INITIALLY DEFERRED
);

-- A question has at most one right answer (the API makes sure it has exactly one).
CREATE UNIQUE INDEX quiz_options_one_correct_key ON quiz_options (question_id) WHERE is_correct;

-- Down Migration

DROP TABLE quiz_options;

DROP TABLE quiz_questions;

DROP TABLE lesson_quizzes;

DROP TABLE lesson_summaries;

DROP TABLE lessons;

DROP TYPE quiz_question_kind;

DROP TYPE content_origin;

DROP TYPE content_status;

DROP TYPE lesson_source;

DROP TYPE lesson_status;
