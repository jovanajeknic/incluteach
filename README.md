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

## Live demo (free hosting)

| Part | Service | Address |
|---|---|---|
| Frontend | Netlify | _filled in after the first deploy_ |
| Backend | Render (Web Service, `server/`) | https://incluteach-api.onrender.com |
| Database | Neon (PostgreSQL) | not public |

The browser only ever talks to the Netlify address. `client/public/_redirects` forwards `/api/...` to the backend, so the session cookie works without CORS. The free Render service sleeps after 15 minutes without traffic, so the first request after a pause can take about a minute.

### Settings on the services

- **Render** (root directory `server`): build command `npm install --include=dev && npm run build` (with `NODE_ENV=production` a plain `npm install` skips TypeScript and the type packages the build needs), start command `npm start`, health check path `/health`. Environment: `DATABASE_URL` (the Neon connection string), `NODE_VERSION=22`, `NODE_ENV=production`, `PUBLIC_URL` (the Netlify address), `TRUST_PROXY=2`, `AI_PROVIDER=fake`.
- **Netlify** (base directory `client`): build command `npm run build`, publish directory `client/dist`.
- **Neon**: fill the database from a computer, because the seed scripts refuse to run with `NODE_ENV=production`. Put the Neon connection string in `DATABASE_URL` for that one terminal, then run `npm run migrate:up` and `npm run seed:schools -- --yes` in `server/` (set `SEED_PASSWORD` to choose the password).

## Demo accounts (OŠ Dragiša Ivanović)

All the people are invented. **Password of every account: `password`**

| Role | Username |
|---|---|
| Admin | `admin_dragisa` |
| Teacher, Matematika | `mirjana_kovacevic` |
| Teacher, Biologija | `zoran_radunovic` |
| Teacher, Srpski jezik | `vesna_buric` |
| Teacher, Istorija | `dragan_lakic` |

Students and their parents:

| Odeljenje | Student | Parents |
|---|---|---|
| 6-1 | `ana_vukovic` | `mihailo_vukovic`, `dragana_vukovic` |
| 6-1 | `luka_radovic` | `savo_radovic` |
| 6-1 | `milica_perovic` | `milan_perovic`, `jelena_perovic` |
| 6-1 | `nikola_jovanovic` | `boris_jovanovic`, `vesna_jovanovic` |
| 6-1 | `teodora_djurovic` | `tamara_djurovic` |
| 6-1 | `stefan_knezevic` | `aleksa_knezevic`, `visnja_knezevic` |
| 6-1 | `sara_bozovic` | `milos_bozovic`, `snezana_bozovic` |
| 6-1 | `vuk_rakocevic` | `dusan_rakocevic` |
| 6-2 | `nina_vujovic` | `vladimir_vujovic`, `ljiljana_vujovic` |
| 6-2 | `petar_gazivoda` | `marko_gazivoda`, `andjela_gazivoda` |
| 6-2 | `katarina_nikolic` | `biljana_nikolic` |
| 6-2 | `filip_stanisic` | `radoje_stanisic`, `mirjana_stanisic` |
| 6-2 | `jovana_mijuskovic` | `mihailo_mijuskovic`, `dragana_mijuskovic` |
| 6-2 | `andrija_pejovic` | `savo_pejovic` |
| 6-2 | `ivana_scepanovic` | `milan_scepanovic`, `jelena_scepanovic` |
| 6-2 | `lazar_raicevic` | `boris_raicevic`, `vesna_raicevic` |
| 7-1 | `mina_vucinic` | `tamara_vucinic` |
| 7-1 | `djordje_bulatovic` | `aleksa_bulatovic`, `visnja_bulatovic` |
| 7-1 | `lena_perovic` | `milan_perovic`, `jelena_perovic` (same parents as `milica_perovic`) |
| 7-1 | `ognjen_soskic` | `dusan_soskic` |
| 7-1 | `sofija_mirkovic` | `vladimir_mirkovic`, `ljiljana_mirkovic` |
| 7-1 | `danilo_gazivoda` | `marko_gazivoda`, `andjela_gazivoda` (same parents as `petar_gazivoda`) |
| 7-1 | `maja_cetkovic` | `biljana_cetkovic` |
| 7-1 | `jovan_martinovic` | `radoje_martinovic`, `mirjana_martinovic` |

The other three schools have their own admins (`admin_stampar`, `admin_gorki`, `admin_nazor`) with the same password.
