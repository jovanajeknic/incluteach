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

The frontend is currently a **demo**: it uses fictional data kept in browser memory, has no backend and no real sign-in. Changes are lost when the page is reloaded.

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

Then open <http://localhost:5173/> in a browser for the landing page, or <http://localhost:5173/teacher> for the teacher demo.

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
