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

## Run the server

```sh
npm run dev
```

The server restarts when files change. It listens on `PORT` from `.env` (default 3000). Open <http://localhost:3000/health>: it answers `{"status":"ok"}` when the database can be reached and `503` otherwise.

Every error response has the same shape, which the frontend relies on: `{ "error": { "code": "not_found", "message": "..." } }`.

## Run the built server

`npm run dev` is for working on the code. To run the server the normal way (compiled, no file watching):

```sh
npm run build
npm start
```

`build` compiles `src/` into `dist/` (both are ignored by Git). The server writes one line per request, for example `POST /auth/login 401 112ms`: the method, the path, the status and the time, and nothing else (no query string, body or cookies). Once an hour it removes ended sessions and activation links that expired more than 30 days ago.

## The AI for summaries and quizzes

The server makes summaries and quizzes through one replaceable part. `AI_PROVIDER` in `.env` chooses the service. `fake` (the default) makes invented but complete results from the text of the lesson and sends nothing anywhere, so everything can be built and tested for free. `groq` uses the free level of the Groq API: put your key in `.env` as `GROQ_API_KEY` (never in Git; `.env.example` lists the names) and set `AI_PROVIDER=groq`; `AI_MODEL` is optional and defaults to `openai/gpt-oss-120b`. Only the text of the lesson is sent to Groq, nothing about students. To plug in another service, write an object like `server/src/ai/fake.ts` (two functions that take the lesson text), add its name to `server/src/ai/index.ts`, and set `AI_PROVIDER`. Whatever a service returns is checked before it is stored. In a lesson text, `[[ai-fail]]` makes the fake AI fail on purpose and `[[ai-bad-output]]` makes it answer in an unusable form, for testing the error screens.

## Connect the frontend on this computer

The frontend (`http://localhost:5173`) and the server (`http://localhost:3000`) are two different addresses for the browser. The simplest way to make them one is a proxy in the Vite dev server (`client/vite.config.ts`):

```ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      // The server has no /api in its paths.
      rewrite: (path) => path.replace(/^\/api/, ''),
    },
  },
},
```

The frontend then calls `/api/auth/login`, `/api/users`, and so on, the session cookie works as usual, and the server needs no CORS settings. (For `npm run preview` the same block goes under `preview:`.)

## Back up the database

All the data lives in one database on this computer, so make backups.

```sh
npm run db:backup
```

It saves a compressed copy to `server/backups/incluteach-<date>-<time>.dump` (that folder is ignored by Git, because it holds real data). It needs PostgreSQL's `pg_dump` program, of the same version as the database server or newer; it looks in `PG_DUMP_PATH` from `.env`, on the PATH, and in the PostgreSQL folders in Program Files. **Copy the file somewhere other than this computer** (another drive, a cloud folder), otherwise one broken disk loses everything.

To restore, never write over the live database. Restore into a new one, look at it, and only then point `DATABASE_URL` at it. As the PostgreSQL admin:

```sh
psql -U postgres -c "CREATE DATABASE incluteach_restored OWNER incluteach_app;"
pg_restore -U postgres --no-owner --role=incluteach_app -d incluteach_restored backups/<file>.dump
```

What has been checked: the backup is made, lists every table, and its SQL recreates all 9 tables and their 110 constraints in a scratch schema. What has **not** been tried end to end: restoring the data into a new database with `pg_restore` (it needs the admin password), so try the two commands above once with real data before you rely on them.

## Create the first admin of a school

Nobody can create the first admin of a school from the app, so run this for each school (and again to add another admin to the same school):

```sh
npm run create-admin -- --school "School name" --name "Admin Full Name"
```

If a school with that name already exists, the new admin joins it (add `--new-school` to create a separate school with the same name). It prints the admin's username and a one-time link (valid 7 days). The admin opens the link and chooses a password and an email. See [docs/DATABASE.md](../docs/DATABASE.md) for how accounts, activation and sign-in work.

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
