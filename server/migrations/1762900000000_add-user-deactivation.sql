-- Up Migration

-- Deactivated: the person can no longer sign in (for example a student who finished school),
-- but all their data stays and the account can be reactivated.
-- Deleted: the personal data was erased for good (an account created by mistake). The row
-- stays as an anonymous shell so records that point at it, such as enrollment decisions,
-- remain valid. A deleted account is always deactivated too.
ALTER TABLE users ADD COLUMN deactivated_at timestamptz;

ALTER TABLE users ADD COLUMN deleted_at timestamptz;

ALTER TABLE users
  ADD CONSTRAINT users_deleted_is_deactivated_check
  CHECK (deleted_at IS NULL OR deactivated_at IS NOT NULL);

-- Down Migration

ALTER TABLE users DROP CONSTRAINT users_deleted_is_deactivated_check;

ALTER TABLE users DROP COLUMN deleted_at;

ALTER TABLE users DROP COLUMN deactivated_at;
