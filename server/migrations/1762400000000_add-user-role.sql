-- Up Migration

-- Every user has exactly one role. An ENUM lets the database itself reject unknown values.
-- The users table is still empty, so a NOT NULL column can be added without a default.
CREATE TYPE user_role AS ENUM ('admin', 'teacher', 'student', 'parent');

ALTER TABLE users ADD COLUMN role user_role NOT NULL;

-- Down Migration

ALTER TABLE users DROP COLUMN role;

DROP TYPE user_role;
