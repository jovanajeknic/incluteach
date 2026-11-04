# IncluTeach server

Backend for IncluTeach (Node.js, TypeScript, Express, PostgreSQL). At this stage it contains only the database connection and migrations; the API itself comes in later steps.

## Requirements

- Node.js `^20.19.0` or `>=22.13.0`
- PostgreSQL 17 or newer (developed with 18)

## Database setup (once per machine)

1. Open a terminal and start `psql` as the PostgreSQL admin user. On Windows the program is usually at `C:\Program Files\PostgreSQL\<version>\bin\psql.exe`:

   ```sh
   psql -U postgres
   ```

2. Create a dedicated database user and the database. Choose your own password; do not reuse the `postgres` one:

   ```sql
   CREATE ROLE incluteach_app LOGIN PASSWORD 'choose-a-strong-password';
   CREATE DATABASE incluteach OWNER incluteach_app;
   ```

   (In PostgreSQL a "role" is a database user. It is not the same as the teacher/parent/student roles of the application.)

3. Create `server/.env` from the example and put your password in it:

   ```sh
   cp .env.example .env
   ```

   `.env` is ignored by Git and must never be committed.

## Install and check the connection

```sh
npm install
npm run db:check
```

`db:check` prints the database, the user and the PostgreSQL version, or a clear error if the connection fails.

## Migrations

The `dotenv` package is installed only so the migration command can read `DATABASE_URL` from `.env`.

A migration is a numbered SQL file in `migrations/` that changes the database structure one step at a time. Each file has an `-- Up Migration` part (apply) and a `-- Down Migration` part (undo).

| Command                                                          | What it does                                 |
| ---------------------------------------------------------------- | -------------------------------------------- |
| `npm run migrate:up`                                             | Applies all migrations that have not run yet |
| `npm run migrate:down`                                           | Undoes the last migration                    |
| `npm run migrate -- create <name> --migration-file-language sql` | Creates a new empty migration file           |

## Checks

Run these from `server/`:

| Command                | What it does                                                                 |
| ---------------------- | ---------------------------------------------------------------------------- |
| `npm test`             | Runs tests once (Vitest). Database tests run only when `DATABASE_URL` is set |
| `npm run lint`         | Checks code with ESLint                                                      |
| `npm run typecheck`    | Checks TypeScript types                                                      |
| `npm run format:check` | Checks formatting with Prettier                                              |
