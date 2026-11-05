-- Up Migration

-- Messages between the parents of a child and the teacher of a subject. A conversation is not
-- a row of its own: it is all the messages about one student in one subject. The teacher of the
-- subject and every parent linked to the student can read it and write in it; nobody else.

CREATE TABLE conversation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Gives every message a place in the conversation even when two have the same time.
  seq bigint GENERATED ALWAYS AS IDENTITY,
  school_id uuid NOT NULL,
  student_id uuid NOT NULL,
  -- Always 'student'; the *_role columns with a fixed value exist only so the foreign keys
  -- can make the database check each user's role and school.
  student_role user_role NOT NULL DEFAULT 'student' CHECK (student_role = 'student'),
  subject_id uuid NOT NULL,
  author_id uuid NOT NULL,
  author_role user_role NOT NULL CHECK (author_role IN ('parent', 'teacher')),
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (student_id, student_role, school_id) REFERENCES users (id, role, school_id),
  FOREIGN KEY (subject_id, school_id) REFERENCES subjects (id, school_id),
  FOREIGN KEY (author_id, author_role, school_id) REFERENCES users (id, role, school_id)
);

CREATE INDEX conversation_messages_thread_idx ON conversation_messages (student_id, subject_id, seq);
CREATE INDEX conversation_messages_subject_idx ON conversation_messages (subject_id);
CREATE INDEX conversation_messages_author_idx ON conversation_messages (author_id);

-- Down Migration

DROP TABLE conversation_messages;
