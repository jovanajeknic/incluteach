# AGENTS.md

Shared working rules for everyone (people and AI coding agents) contributing to IncluTeach.
These rules apply to every task unless the project owner explicitly agrees otherwise.

## 1. Language

- Communicate with the project owner in Serbian, Latin script, ijekavian variant.
- Write code and all identifiers (variables, functions, classes, files, folders) in English.
- Write code comments, project documentation, commit messages and pull request descriptions in English.
- Write user interface text in Serbian (Latin script, ijekavian) for now.
- Keep UI text separate from business logic so it can be translated later.

## 2. Planning and scope

- Before starting, read the relevant files and check the current state of the project.
- For a new feature or a larger change, first present a short plan, assumptions and how it will be verified. Wait for the owner to approve the plan.
- Small, clear fixes do not need a separate plan.
- If an ambiguity affects functionality, data or architecture, ask before proceeding.
- Work in small, self-contained steps. Do not build the whole application at once.
- Do not add features or change unrelated parts without agreement.

## 3. Technology and code quality

- Technologies and project structure are agreed on before the first implementation.
- Once agreed, follow the existing conventions.
- Prefer simple, readable solutions and reusable components.
- Avoid code duplication and unnecessarily complex architecture.
- Add new dependencies only when there is a clear need, and explain what each one is for.
- Handle invalid input, errors, empty states and loading states.
- Comments explain the reason behind a decision, not what the code already says.

## 4. Verification

- Define concrete acceptance criteria for every feature.
- Add meaningful tests for important behaviour and edge cases.
- After changes, run the relevant tests, lint, type checking (if used) and the build when relevant.
- For UI work, check the layout on both phone and desktop, and basic accessibility.
- Do not claim something works without verifying it.
- If a check cannot be run, state clearly what remains unverified.
- Never remove tests or weaken checks just to get a passing result.

## 5. Git and teamwork

- Check the current branch and `git status` before making changes.
- Use a separate branch for each self-contained task.
- Never overwrite or discard existing changes, including a teammate's changes.
- No force push, destructive reset or branch deletion without the owner's approval.
- Before committing, show a summary of the changes and the verification results.
- Commit, push and merge into `main` only when the owner explicitly asks.
- Plan small, easy-to-review pull requests.

## 6. Security and data

- Never put passwords, API keys or other secrets in code, documentation or Git.
- Do not read or display the contents of local files that contain secrets (for example `.env`).
- `.env.example` lists only variable names and safe example values.
- API keys are used only on the backend.
- Access control is enforced on the backend, not only in the user interface.
- Use fictional student data during development.
- A parent may see only the data of their own linked children; a teacher may see only the data of students they are authorized to access.
- AI-generated content must be reviewed by a teacher before it is published to students.

## 7. Reporting

- After each task, briefly explain what was done, how it was verified and what is still missing.
- Clearly distinguish what is implemented, what is simulated (mocked) and what is planned.
- Explain decisions in a beginner-friendly way, with a short explanation of new terms.
- Record important agreements in the project documentation, not only in chat.

## 8. Frontend

The frontend lives in `client/` and is developed separately from the backend.
The plan, task list and open questions are in [docs/FRONTEND-PLAN.md](docs/FRONTEND-PLAN.md).

Agreed technologies (added as packages only when a task needs them):

- React + TypeScript with strict type checking
- Vite
- React Router
- Tailwind CSS and shadcn/ui
- React Hook Form and Zod for forms and validation
- TanStack Query for server data
- MSW for mocking the API during development and tests
- Vitest and React Testing Library for tests
- Playwright for the most important user flows
- ESLint, Prettier and npm

Do not add other libraries or another framework without a clear reason and agreement.

Responsibility boundary:

- The backend owns real authentication, access control, document processing, AI generation and data storage. Backend technologies and the authentication method are decided by the backend developer, not by frontend work.
- The frontend never holds secret API keys and never calls an AI service directly.
- Frontend role checks are for navigation only, not security.
- A demo role picker is not authentication and must be clearly labelled as demo mode.
- Mocked API responses must follow the same agreed format as the real API.
