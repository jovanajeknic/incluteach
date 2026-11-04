-- Up Migration

-- A student's request to join a subject. Flow: the student asks, one linked parent
-- (or guardian) confirms, then the subject's teacher approves or rejects.
-- A parent who sends the request for their child counts as the parent's confirmation.
CREATE TYPE enrollment_status AS ENUM (
  'awaiting_parent',
  'awaiting_teacher',
  'approved',
  'rejected'
);

CREATE TABLE enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  student_id uuid NOT NULL,
  -- Always 'student'; the *_role columns with a fixed value exist only so the foreign
  -- keys can make the database check each user's role and school.
  student_role user_role NOT NULL DEFAULT 'student' CHECK (student_role = 'student'),
  subject_id uuid NOT NULL,
  status enrollment_status NOT NULL DEFAULT 'awaiting_parent',

  requested_by uuid NOT NULL,
  requested_by_role user_role NOT NULL CHECK (requested_by_role IN ('student', 'parent')),

  -- The parent's decision, either confirming or rejecting. The foreign key to
  -- parent_students means only a parent linked to this very student can decide.
  -- It is skipped while the decision is still empty.
  parent_decided_by uuid,
  parent_decided_at timestamptz,

  -- The teacher's decision. The API checks that this is the teacher of the subject;
  -- it is not a foreign key to subjects so a teacher can be replaced later without
  -- rewriting history.
  teacher_decided_by uuid,
  teacher_role user_role NOT NULL DEFAULT 'teacher' CHECK (teacher_role = 'teacher'),
  teacher_decided_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  FOREIGN KEY (student_id, student_role, school_id) REFERENCES users (id, role, school_id),
  FOREIGN KEY (subject_id, school_id) REFERENCES subjects (id, school_id),
  FOREIGN KEY (requested_by, requested_by_role, school_id) REFERENCES users (id, role, school_id),
  FOREIGN KEY (parent_decided_by, student_id) REFERENCES parent_students (parent_id, student_id),
  FOREIGN KEY (teacher_decided_by, teacher_role, school_id) REFERENCES users (id, role, school_id),

  -- A student can only ask for themselves. A parent's own request is also their confirmation.
  CONSTRAINT enrollments_requester_check CHECK (
    (requested_by_role = 'student' AND requested_by = student_id)
    OR (requested_by_role = 'parent' AND parent_decided_by IS NOT DISTINCT FROM requested_by)
  ),

  -- Each decision always comes with its time.
  CONSTRAINT enrollments_parent_decision_check CHECK (
    (parent_decided_by IS NULL) = (parent_decided_at IS NULL)
  ),
  CONSTRAINT enrollments_teacher_decision_check CHECK (
    (teacher_decided_by IS NULL) = (teacher_decided_at IS NULL)
  ),

  -- The status must match who has decided so far. A rejection without a teacher
  -- decision is a rejection by the parent.
  CONSTRAINT enrollments_status_check CHECK (
    (status = 'awaiting_parent' AND parent_decided_by IS NULL AND teacher_decided_by IS NULL)
    OR (status = 'awaiting_teacher' AND parent_decided_by IS NOT NULL AND teacher_decided_by IS NULL)
    OR (status = 'approved' AND parent_decided_by IS NOT NULL AND teacher_decided_by IS NOT NULL)
    OR (status = 'rejected' AND parent_decided_by IS NOT NULL)
  )
);

-- Only one live request per student and subject. After a rejection a new one is allowed.
CREATE UNIQUE INDEX enrollments_active_request_key
  ON enrollments (student_id, subject_id)
  WHERE status <> 'rejected';

CREATE INDEX enrollments_subject_status_idx ON enrollments (subject_id, status);
CREATE INDEX enrollments_student_id_idx ON enrollments (student_id);

-- Down Migration

DROP TABLE enrollments;

DROP TYPE enrollment_status;
