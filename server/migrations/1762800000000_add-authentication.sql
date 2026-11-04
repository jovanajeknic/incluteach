-- Up Migration

-- The admin creates the username (like ime_prezime, with a number added when it is taken).
-- It is unique across all schools, so a username alone identifies one account at sign-in.
-- The users table is still empty, so a NOT NULL column can be added without a default.
ALTER TABLE users ADD COLUMN username text NOT NULL;

ALTER TABLE users ADD CONSTRAINT users_username_format_check CHECK (username ~ '^[a-z0-9_]{3,40}$');

CREATE UNIQUE INDEX users_username_key ON users (username);

-- An account exists before it is activated (no password yet). Activation sets the
-- password and the email together, so an account with a password always has an email.
ALTER TABLE users
  ADD CONSTRAINT users_active_has_email_check CHECK (password_hash IS NULL OR email IS NOT NULL);

-- Lets other tables point at (user, school) together, so the database can check
-- that a token belongs to a user of the same school as the admin who issued it.
ALTER TABLE users ADD CONSTRAINT users_id_school_key UNIQUE (id, school_id);

-- One-time link/QR that an admin gives to a user. Only a hash of the token is stored,
-- so a leaked database does not leak working links.
CREATE TABLE activation_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  school_id uuid NOT NULL,
  token_hash text NOT NULL UNIQUE,
  created_by uuid NOT NULL,
  -- Always 'admin'; it exists only so the foreign key can check the creator's role.
  created_by_role user_role NOT NULL DEFAULT 'admin' CHECK (created_by_role = 'admin'),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  revoked_at timestamptz,
  FOREIGN KEY (user_id, school_id) REFERENCES users (id, school_id),
  FOREIGN KEY (created_by, created_by_role, school_id) REFERENCES users (id, role, school_id),
  CONSTRAINT activation_tokens_expiry_check CHECK (expires_at > created_at),
  CONSTRAINT activation_tokens_single_end_check CHECK (used_at IS NULL OR revoked_at IS NULL)
);

-- A user has at most one unused, unrevoked token. Issuing a new token must revoke the
-- old one first, so the old QR stops working.
CREATE UNIQUE INDEX activation_tokens_one_live_per_user_key
  ON activation_tokens (user_id)
  WHERE used_at IS NULL AND revoked_at IS NULL;

CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  -- Only a hash of the cookie value is stored.
  token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  CONSTRAINT sessions_expiry_check CHECK (expires_at > created_at)
);

CREATE INDEX sessions_user_id_idx ON sessions (user_id);
CREATE INDEX sessions_expires_at_idx ON sessions (expires_at);

-- Down Migration

DROP TABLE sessions;

DROP TABLE activation_tokens;

ALTER TABLE users DROP CONSTRAINT users_id_school_key;

ALTER TABLE users DROP CONSTRAINT users_active_has_email_check;

DROP INDEX users_username_key;

ALTER TABLE users DROP CONSTRAINT users_username_format_check;

ALTER TABLE users DROP COLUMN username;
