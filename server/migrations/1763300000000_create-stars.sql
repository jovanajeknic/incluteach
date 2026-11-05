-- Up Migration

-- Stars are for effort, not for grades. There are two kinds that must never be mixed up:
-- an automatic star, which a student gets for finishing a lesson (one per lesson), and a star
-- from a teacher, who gives it to a student of the subject with a short message.

CREATE TYPE star_source AS ENUM ('automatic', 'teacher');

CREATE TABLE stars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  student_id uuid NOT NULL,
  -- Always 'student'; the *_role columns with a fixed value exist only so the foreign keys
  -- can make the database check each user's role and school.
  student_role user_role NOT NULL DEFAULT 'student' CHECK (student_role = 'student'),
  subject_id uuid NOT NULL,
  source star_source NOT NULL,
  -- The lesson that was finished (automatic stars only). If the lesson is deleted, so is
  -- its star.
  lesson_id uuid,
  -- The teacher who gave the star and why (teacher stars only).
  given_by uuid,
  given_by_role user_role CHECK (given_by_role = 'teacher'),
  message text CHECK (message IS NULL OR char_length(message) BETWEEN 1 AND 200),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (student_id, student_role, school_id) REFERENCES users (id, role, school_id),
  FOREIGN KEY (subject_id, school_id) REFERENCES subjects (id, school_id),
  FOREIGN KEY (lesson_id, school_id) REFERENCES lessons (id, school_id) ON DELETE CASCADE,
  FOREIGN KEY (given_by, given_by_role, school_id) REFERENCES users (id, role, school_id),
  CONSTRAINT stars_source_check CHECK (
    (source = 'automatic' AND lesson_id IS NOT NULL AND given_by IS NULL
      AND given_by_role IS NULL AND message IS NULL)
    OR (source = 'teacher' AND lesson_id IS NULL AND given_by IS NOT NULL
      AND given_by_role IS NOT NULL AND message IS NOT NULL)
  )
);

-- A lesson gives a student at most one automatic star.
CREATE UNIQUE INDEX stars_one_per_lesson_key
  ON stars (student_id, lesson_id)
  WHERE source = 'automatic';

CREATE INDEX stars_student_idx ON stars (student_id, created_at DESC);
CREATE INDEX stars_subject_idx ON stars (subject_id, created_at DESC);

-- Down Migration

DROP TABLE stars;

DROP TYPE star_source;
