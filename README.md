# incluteach
IncluTeach is an innovative AI-driven digital platform whose primary goal is to improve inclusive education. The main mission of the project is to facilitate the daily work of teachers, ensure equal and customized access to learning materials for every student, and establish a reliable bridge of cooperation between family and school.

## Repository layout

| Folder | Contents |
|---|---|
| `client/` | Frontend (React, TypeScript, Vite, Tailwind CSS, shadcn/ui) |
| `server/` | Backend (Node.js, TypeScript, Express, PostgreSQL); see [server/README.md](server/README.md) |
| `docs/` | Project documentation: the [frontend plan](docs/FRONTEND-PLAN.md), the [design system](docs/DESIGN.md) and the [database and access model](docs/DATABASE.md) |

Working rules for contributors and AI agents are in [AGENTS.md](AGENTS.md).

## Frontend

The frontend works with the real backend: sign-in, the teacher, student, parent and admin screens all call the API of `server/` (the Vite dev server forwards `/api` to `http://localhost:3000`). Start the server first, see [server/README.md](server/README.md). Only the school request form (`/school-request`) is still a demo and sends nothing.

## After you pull new changes

Do these in order. Skip a step if nothing in that folder changed.

1. `cd client && npm install` and `cd server && npm install` (new packages are added from time to time).
2. `cd server && npm run migrate:up` (applies new database migrations to the development tables).
3. **Once**, for the server tests: add the line `TEST_DB_SCHEMA=incluteach_test` to `server/.env`, then run `npm run migrate:test`. The tests then use their own empty tables and never see the demo data. After every new migration, run `npm run migrate:test` too. Details: "Tests need their own tables" in [server/README.md](server/README.md).
4. Start both: `cd server && npm run dev` and `cd client && npm run dev`. Open <http://localhost:5173/> and sign in.

Nothing else is needed in `server/.env`; the optional settings are listed in `server/.env.example`. For demo data and accounts run `npm run seed:demo` (teacher, student and parent) and `npm run create-admin` (an administrator) in `server/`.

### Requirements

- Node.js `^20.19.0` or `>=22.13.0` (developed with 22.18.0)
- npm (developed with 10.8.1)

### Install

```sh
cd client
npm install
```

### Run

```sh
npm run dev
```

Then open <http://localhost:5173/> in a browser for the landing page and sign in from there.

To try it on a phone in the same Wi-Fi network, run `npm run dev -- --host` and open the `Network` address that Vite prints.

### Checks

Run these from `client/`:

| Command | What it does |
|---|---|
| `npm test` | Runs unit and component tests once (Vitest) |
| `npm run test:watch` | Runs tests and re-runs them on file changes |
| `npm run lint` | Checks code with ESLint |
| `npm run typecheck` | Checks TypeScript types |
| `npm run format:check` | Checks formatting with Prettier |
| `npm run format` | Formats all files with Prettier |
| `npm run build` | Type-checks and builds the production version into `client/dist/` |
| `npm run preview` | Serves the production build locally |
