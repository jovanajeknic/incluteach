-- Up Migration

-- Students sign in with a code from their card and teachers/parents with email and
-- password, so email and password_hash are optional here. Roles are added in a later migration.
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text,
  password_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Case-insensitive uniqueness without needing the citext extension.
CREATE UNIQUE INDEX users_email_lower_key ON users (lower(email));

-- Down Migration

DROP TABLE users;
