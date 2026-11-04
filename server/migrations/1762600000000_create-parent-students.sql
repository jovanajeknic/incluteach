-- Up Migration

-- Links a parent to a child. A parent can have many children and a child many parents.
-- Only an admin of the same school creates these links, so a parent can never claim
-- someone else's child. The *_role columns always hold one fixed value; they exist only
-- so the foreign keys can make the database check each user's role and school.
CREATE TABLE parent_students (
  parent_id uuid NOT NULL,
  parent_role user_role NOT NULL DEFAULT 'parent' CHECK (parent_role = 'parent'),
  student_id uuid NOT NULL,
  student_role user_role NOT NULL DEFAULT 'student' CHECK (student_role = 'student'),
  school_id uuid NOT NULL,
  created_by uuid NOT NULL,
  created_by_role user_role NOT NULL DEFAULT 'admin' CHECK (created_by_role = 'admin'),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (parent_id, student_id),
  FOREIGN KEY (parent_id, parent_role, school_id) REFERENCES users (id, role, school_id),
  FOREIGN KEY (student_id, student_role, school_id) REFERENCES users (id, role, school_id),
  FOREIGN KEY (created_by, created_by_role, school_id) REFERENCES users (id, role, school_id)
);

-- The primary key already covers lookups by parent.
CREATE INDEX parent_students_student_id_idx ON parent_students (student_id);

-- Down Migration

DROP TABLE parent_students;
