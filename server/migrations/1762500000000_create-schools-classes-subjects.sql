-- Up Migration

CREATE TABLE schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Every user (admin, teacher, student, parent) belongs to exactly one school.
-- The users table is still empty, so a NOT NULL column can be added without a default.
ALTER TABLE users ADD COLUMN school_id uuid NOT NULL REFERENCES schools (id);

CREATE INDEX users_school_id_idx ON users (school_id);

-- Lets other tables point at (user, role, school) together, so the database itself can
-- check that, for example, a subject's teacher really has the teacher role in the same school.
ALTER TABLE users ADD CONSTRAINT users_id_role_school_key UNIQUE (id, role, school_id);

CREATE TABLE classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools (id),
  name text NOT NULL,
  -- The year the school year starts in: 2026 means the 2026/27 school year.
  school_year integer NOT NULL CHECK (school_year BETWEEN 2000 AND 2100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, school_year, name),
  UNIQUE (id, school_id)
);

CREATE TABLE subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools (id),
  class_id uuid NOT NULL,
  teacher_id uuid NOT NULL,
  -- Always 'teacher'; it exists only so the foreign key below can check the teacher's role.
  teacher_role user_role NOT NULL DEFAULT 'teacher' CHECK (teacher_role = 'teacher'),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (class_id, school_id) REFERENCES classes (id, school_id),
  FOREIGN KEY (teacher_id, teacher_role, school_id) REFERENCES users (id, role, school_id),
  UNIQUE (id, school_id)
);

CREATE INDEX classes_school_id_idx ON classes (school_id);
CREATE INDEX subjects_school_id_idx ON subjects (school_id);
CREATE INDEX subjects_class_id_idx ON subjects (class_id);
CREATE INDEX subjects_teacher_id_idx ON subjects (teacher_id);

-- Down Migration

DROP TABLE subjects;

DROP TABLE classes;

ALTER TABLE users DROP CONSTRAINT users_id_role_school_key;

ALTER TABLE users DROP COLUMN school_id;

DROP TABLE schools;
