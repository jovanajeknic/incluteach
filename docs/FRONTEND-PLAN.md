# Frontend Plan

Plan for the first version (v1) of the IncluTeach frontend. The frontend lives in `client/` and talks to a separate backend owned by a teammate.

Working rules for all contributors are in [AGENTS.md](../AGENTS.md). This document does not repeat them.

## How to read this document

Every item is one of:

- **Decided**: agreed with the project owner. Change only with explicit agreement.
- **Proposal**: a suggestion from this plan. It may change without breaking any agreement, but should be confirmed before it is relied on widely.
- **Open question**: needs a decision from the owner, the backend developer or both. See [Open questions](#10-open-questions).

Unless marked otherwise, sections 1 to 4 are **Decided** (the reasons in section 3 are explanations, not separate decisions), and sections 5 to 9 are **Proposals**.

Each task states which API it works against:

- **No API**: pure frontend work.
- **Mock API**: works against MSW (Mock Service Worker), which intercepts network requests in the browser and in tests and returns fictional data. No backend needed.
- **Real backend**: needs the backend developer's running API.

## 1. Goal and scope of v1

IncluTeach helps a teacher prepare adapted lessons, helps a student use them, and lets a parent follow their child's activity.

### Main flow

```
Teacher enters material → requests AI adaptation → reviews and edits the result
→ approves and assigns the lesson → student reads and takes the quiz
→ parent sees the activity and home guidance
```

### In scope

- **All roles**: sign in, sign out, role-based navigation.
- **Teacher**:
  - list of lessons;
  - lesson input as text or a PDF/DOCX file;
  - processing status;
  - review and editing of versions;
  - approval and assignment;
  - basic class and student overview.
- **Student**:
  - assigned lessons and reading;
  - reading preferences: text size, line spacing, contrast, reduced motion;
  - quiz and result;
  - audio controls when audio is available (the speech solution itself is an open question).
- **Parent**: linked children, their lessons, results and home guidance.
- **Every screen**: loading, empty, error, forbidden (no access) and not-found states.

### Out of scope for v1

Self-registration, password recovery, chat, team games, leaderboards, advanced gamification, OCR, advanced administration and complex reports.

## 2. Key constraints

- **Adaptation and presentation are separate.** Content adaptation (an AI-generated, teacher-approved version of the text) is lesson data. Reading preferences (size, spacing, contrast, motion) only change how any content is displayed. Neither replaces the other.
- **No diagnoses in the student experience.** Diagnoses are never shown to students or to their peers.
- **Teacher review is mandatory.** AI content reaches students only after a teacher approves it. The UI must make this step explicit and must not offer a shortcut around it.
- **No secrets in the frontend.** The frontend never holds secret API keys and never calls an AI service directly. Everything goes through the backend.
- **The backend owns** real authentication, access control, document processing, AI generation and data storage. Frontend role checks only improve navigation; they are not security.
- **Demo mode is not authentication.** Any demo role picker must be clearly labelled as demo on every screen.
- **Fictional data only** in development, mocks and tests.
- **Mocks match the contract.** The mock API must use the same agreed request and response format as the real API.
- **One lesson renderer.** The student reading view and the teacher review use the same shared component.
- **Accessible and responsive.** The UI works on phone and desktop, with keyboard only and with enlarged text. Fields have clear labels and focus is always visible.

## 3. Technologies

The binding list of agreed technologies is in [AGENTS.md](../AGENTS.md#8-frontend). Below is a short reason for each.

| Technology | Why |
|---|---|
| React + TypeScript (strict) | Component model fits a UI with many reusable parts. Strict types catch mistakes early, especially around API data. |
| Vite | Fast development server and simple build for a single-page app. |
| React Router | Standard routing for React. Supports nested layouts per role and route-level error handling. |
| Tailwind CSS | Utility classes keep styling consistent and make spacing and contrast variants easy to apply. |
| shadcn/ui | Accessible building blocks (based on Radix UI) copied into the project, so they can be adapted instead of fought. |
| React Hook Form + Zod | Forms with little boilerplate. Zod schemas give one source of truth for validation rules and TypeScript types. |
| TanStack Query | Handles loading, error, caching and refetching of server data, so screens do not reimplement it. |
| MSW | Lets the frontend be built and tested before the backend is ready, using the same request format as the real API. |
| Vitest + React Testing Library | Fast unit and component tests that check behaviour the way a user experiences it. |
| Playwright | End-to-end tests for the most important user flows in a real browser. |
| ESLint + Prettier | Consistent code style and early detection of common mistakes. |
| npm | Already installed (npm 10.8.1, Node.js 22.18.0). No extra tool needed. |

Packages are added only when a task needs them. Version compatibility (for example with Node.js 22.18.0) is checked at install time. No other libraries or frameworks are added without a clear reason and agreement.

## 4. Responsibility boundary with the backend

| Area | Frontend | Backend |
|---|---|---|
| Authentication | Sign-in form, session state in the UI, sign-out | Verifying identity, issuing and ending sessions |
| Access control | Hiding navigation the role cannot use; showing a forbidden page | Enforcing who can see and change what |
| Documents | File picker; client-side type and size check for quick feedback | Storing, validating and extracting text from PDF/DOCX |
| AI adaptation | Requesting it, showing status, editing the result | Calling the AI service, holding API keys |
| Data | Display, forms, validation for user feedback | Storage, validation as source of truth |
| Contract | Typed client and MSW mocks that follow the contract | Implementing the contract |

## 5. Proposed `client/src/` structure

*Proposal.* Organized by feature, so each feature keeps its screens, components, data hooks and schemas together.

```
client/src/
  app/                    # App entry, providers, router, role layouts
  features/
    auth/                 # Sign-in, sign-out, session, role guard, demo mode
    teacher-lessons/      # Lesson list, create, status, review, approve, assign
    lesson-content/       # Shared lesson renderer (teacher review + student reading)
    reading-preferences/  # Text size, line spacing, contrast, reduced motion
    student-lessons/      # Assigned lessons and reading view
    quiz/                 # Quiz taking and result
    parent/               # Linked children, activity, home guidance
    class-overview/       # Teacher's classes and students
  shared/
    ui/                   # shadcn/ui primitives (Button, Input, Dialog...)
    components/           # App-level reusable components (state views, FormField...)
    api/                  # HTTP client, query client, error mapping
    lib/                  # Small generic helpers
  text/
    sr-Latn.ts            # All UI text (Serbian, Latin, ijekavian), kept out of logic
  mocks/
    handlers/             # MSW request handlers per feature
    fixtures/             # Fictional data
  test/                   # Test setup and helpers
```

Within a feature (only the parts it needs):

```
features/<name>/
  pages/       # Route-level screens
  components/  # Feature-specific components
  api.ts       # TanStack Query hooks for this feature
  schemas.ts   # Zod schemas and derived types
```

Notes:

- UI text lives in `text/sr-Latn.ts` as a typed object. No translation library for now, to avoid a dependency we do not need yet. Swapping to one later only touches the lookup.
- shadcn/ui is configured to place its components in `shared/ui/` instead of its default `components/ui/`.

## 6. Screen and route map

*Proposal.* Route names, parameters and nesting may change when the API contract is agreed.

### Public and shared

| Route | Screen | Notes |
|---|---|---|
| `/login` | Sign-in | In demo mode, also a clearly labelled role picker |
| `/` | Redirect | To the signed-in user's home page by role, otherwise to `/login` |
| `/forbidden` | Forbidden | Shown when a role opens a page it cannot use |
| `*` | Not found | Any unknown route |

### Teacher (`/teacher`)

| Route | Screen |
|---|---|
| `/teacher/lessons` | Lesson list with status per lesson |
| `/teacher/lessons/new` | New lesson: text input or PDF/DOCX upload |
| `/teacher/lessons/:lessonId` | Lesson detail: processing status and list of versions |
| `/teacher/lessons/:lessonId/versions/:versionId` | Review and edit a version, then approve it |
| `/teacher/lessons/:lessonId/assign` | Assign an approved version to students or a class |
| `/teacher/classes` | List of the teacher's classes |
| `/teacher/classes/:classId` | Class overview: students and their lesson activity |
| `/teacher/classes/:classId/students/:studentId` | Basic student overview |

### Student (`/student`)

| Route | Screen |
|---|---|
| `/student/lessons` | Assigned lessons |
| `/student/lessons/:assignmentId` | Reading view, with reading preferences and audio controls |
| `/student/lessons/:assignmentId/quiz` | Quiz |
| `/student/lessons/:assignmentId/result` | Quiz result |

Reading preferences open as a panel from the reading view and the header, not as a separate page.

### Parent (`/parent`)

| Route | Screen |
|---|---|
| `/parent/children` | Linked children |
| `/parent/children/:childId` | Child's lessons and results |
| `/parent/children/:childId/lessons/:assignmentId` | Lesson activity and home guidance |

## 7. Shared UI components

*Proposal.* Built once and reused across features.

**Primitives** (from shadcn/ui, added only when first needed): Button, Input, Textarea, Label, Select, Checkbox, RadioGroup, Dialog, Tabs, Card, Badge, Alert, Progress, Skeleton.

**App components:**

| Component | Purpose |
|---|---|
| `AppShell` / role layouts | Header, navigation for the role, main area, sign-out |
| `SkipLink` | "Skip to content" link for keyboard users |
| `DemoModeBanner` | Always-visible label while demo mode is active |
| `PageHeader` | Page title and optional actions, sets the document title |
| `LoadingState` | Consistent loading indicator, announced to screen readers |
| `EmptyState` | Message and optional action when a list is empty |
| `ErrorState` | Error message with a retry action |
| `ForbiddenPage`, `NotFoundPage` | Full-page states for 403 and 404 |
| `QueryBoundary` | Picks loading, error, empty or content for a TanStack Query result |
| `RequireRole` | Route guard: redirects to sign-in or to the forbidden page |
| `FormField` | Label, hint and error message wired to the input for screen readers |
| `FileUpload` | Accessible PDF/DOCX picker with type and size feedback |
| `StatusBadge` | Lesson processing and approval status with text, not only colour |
| `ConfirmDialog` | Confirmation for important actions such as approve and assign |
| `LessonContent` | **Shared** lesson renderer used by teacher review and student reading |
| `ReadingPreferencesPanel` | Controls for text size, line spacing, contrast and reduced motion |
| `AudioControls` | Play, pause and speed, shown only when audio is available |

## 8. Mock and real API approach

*Proposal.*

- All network calls go through `shared/api/`. Screens never call `fetch` directly.
- Request and response shapes are defined once as Zod schemas. Both the API client and the MSW handlers use them, so mocks cannot drift from the types the screens rely on.
- Until the API contract is agreed, these schemas are marked **provisional** in code. When the contract exists, they are updated to match it, and the mocks follow automatically.
- MSW runs in development and in tests. In development it is switched on and off with an environment variable. It is never active in a production build.
- Demo mode (role picker) works only while mocks are active. It is not available against the real backend unless explicitly agreed.

## 9. Tasks

Order: project foundation → shared design and layouts → sign-in and navigation → teacher lesson flow → student reading → quiz → parent overview → class overview → integration and final checks.

Every task also follows the verification rules in [AGENTS.md](../AGENTS.md#4-verification): lint, type check, tests and build pass, and UI work is checked on phone and desktop, with keyboard, and with enlarged text.

---

### FE-01 Project foundation

- **API**: No API
- **Depends on**: none
- **Result**: an empty but working React + TypeScript app in `client/`, with Vite, strict TypeScript, ESLint, Prettier, Vitest + React Testing Library, and npm scripts.
- **Acceptance criteria**:
  - `npm run dev` starts the app and shows a placeholder page with Serbian text taken from `text/sr-Latn.ts`.
  - `npm run build`, `npm run lint`, `npm run typecheck` and `npm test` all pass.
  - `tsconfig` has `strict: true`.
  - At least one component test runs and passes.
  - `client/README.md` explains how to install and run the scripts.
  - No secrets and no `.env` file are committed. `.env.example` exists if any variable is used.

### FE-02 Shared design foundation

- **API**: No API
- **Depends on**: FE-01
- **Result**: Tailwind CSS and shadcn/ui set up, with basic design tokens (colours, spacing, typography, focus style) and the first primitives.
- **Acceptance criteria**:
  - Button, Input, Label and Card render on a temporary preview page.
  - The focus outline is visible on every interactive element.
  - Text and background colours meet WCAG AA contrast (4.5:1 for normal text).
  - Layout does not break at 200% browser zoom or at 360 px width.
  - Design direction (colours, font) is marked as a proposal until the owner approves it.

### FE-03 Layouts, routing and state views

- **API**: No API
- **Depends on**: FE-02
- **Result**: React Router with role layouts (`AppShell`), `SkipLink`, `PageHeader`, `LoadingState`, `EmptyState`, `ErrorState`, `ForbiddenPage` and `NotFoundPage`.
- **Acceptance criteria**:
  - An unknown URL shows the not-found page.
  - An error thrown inside a route shows `ErrorState`, not a blank screen.
  - The skip link is the first focusable element and moves focus to the main content.
  - Navigation is usable with keyboard only.
  - Each state view has a component test.

### FE-04 API layer and mock setup

- **API**: Mock API
- **Depends on**: FE-03
- **Result**: HTTP client in `shared/api/`, TanStack Query provider, MSW for development and tests, fictional data fixtures, and `QueryBoundary`.
- **Acceptance criteria**:
  - A sample request is served by MSW in the browser and in tests.
  - Network errors and 401, 403, 404 and 500 responses map to clear UI states.
  - MSW is off in the production build (verified by building and checking that the worker is not registered).
  - Fixtures contain only fictional people.
  - Provisional schemas are clearly marked.

### FE-05 Sign-in, sign-out and role navigation

- **API**: Mock API (real authentication is FE-17)
- **Depends on**: FE-04
- **Result**: sign-in page, sign-out, session state, `RequireRole` guard, role-based redirect and navigation, demo mode with `DemoModeBanner`.
- **Acceptance criteria**:
  - The sign-in form validates required fields with React Hook Form + Zod and shows errors next to the fields.
  - After sign-in, each role lands on its own home page and sees only its own navigation.
  - Opening another role's route shows the forbidden page.
  - Sign-out clears the session and cached data, and returns to `/login`.
  - In demo mode the banner is visible on every page.
  - Tests cover each role's redirect, the forbidden case and sign-out.

### FE-06 Teacher: lesson list

- **API**: Mock API
- **Depends on**: FE-05
- **Result**: `/teacher/lessons` with title, status (`StatusBadge`) and a link to each lesson; button to create a new lesson.
- **Acceptance criteria**:
  - Loading, empty ("no lessons yet") and error states are shown correctly.
  - Status is conveyed by text, not colour alone.
  - The list works at 360 px width.

### FE-07 Teacher: create lesson (text or file)

- **API**: Mock API
- **Depends on**: FE-06
- **Result**: `/teacher/lessons/new` with title, text input or PDF/DOCX upload (`FileUpload`, `FormField`), and a request for AI adaptation.
- **Acceptance criteria**:
  - Exactly one source is required: text or a file.
  - Wrong file types and files over the size limit are rejected with a clear message (the limit is an open question; a provisional value is used until agreed).
  - The submit button is disabled while sending, and errors from the server are shown without losing the entered data.
  - After success, the user is taken to the lesson detail page.
  - Tests cover validation, the error case and success.

### FE-08 Teacher: processing status

- **API**: Mock API
- **Depends on**: FE-07
- **Result**: `/teacher/lessons/:lessonId` shows processing status and, when ready, the list of versions.
- **Acceptance criteria**:
  - The status updates without a manual page reload (mechanism is an open question; polling is the proposal).
  - A failed processing state explains what happened and offers a retry if the API supports it.
  - Status changes are announced to screen readers.

### FE-09 Shared lesson renderer and teacher review

- **API**: Mock API
- **Depends on**: FE-08
- **Result**: `LessonContent` component, and `/teacher/lessons/:lessonId/versions/:versionId` for reviewing and editing a version and saving changes.
- **Acceptance criteria**:
  - `LessonContent` is the only component that renders lesson content (checked in code review), and it will be reused by FE-11.
  - The teacher can edit and save a version; unsaved changes are not lost silently when leaving the page.
  - AI-generated content is clearly labelled as such until approved.
  - Tests cover rendering, editing and the save error case.

### FE-10 Teacher: approve and assign

- **API**: Mock API
- **Depends on**: FE-09
- **Result**: approving a version (with `ConfirmDialog`), and `/teacher/lessons/:lessonId/assign` for assigning an approved version.
- **Acceptance criteria**:
  - Only an approved version can be assigned; the UI does not offer assignment otherwise.
  - Approval and assignment require explicit confirmation.
  - After assignment, the lesson status reflects it in the lesson list.
  - Mocked backend also rejects assignment of an unapproved version, and the UI shows that error.

### FE-11 Student: assigned lessons and reading

- **API**: Mock API
- **Depends on**: FE-10
- **Result**: `/student/lessons` and the reading view `/student/lessons/:assignmentId` using `LessonContent`.
- **Acceptance criteria**:
  - Only lessons assigned to the signed-in student appear.
  - The reading view uses the same `LessonContent` as teacher review.
  - No diagnosis or diagnosis-related label appears anywhere in the student UI, and the mock data for student screens contains no such fields.
  - Loading, empty and error states work.

### FE-12 Student: reading preferences

- **API**: Mock API, or No API if preferences are stored only on the device (open question)
- **Depends on**: FE-11
- **Result**: `ReadingPreferencesPanel` for text size, line spacing, contrast and reduced motion.
- **Acceptance criteria**:
  - Each preference changes only presentation and never the lesson content.
  - Preferences persist after a page reload.
  - Reduced motion is on by default when the operating system requests it (`prefers-reduced-motion`).
  - High-contrast mode meets WCAG AA contrast.
  - All controls work with keyboard and have clear labels.

### FE-13 Student: audio controls

- **API**: Mock API
- **Depends on**: FE-11
- **Result**: `AudioControls` shown only when the lesson has audio.
- **Acceptance criteria**:
  - No audio controls appear when audio is not available.
  - Play, pause and speed controls work with keyboard and have labels.
  - Audio never starts automatically.
  - The actual speech solution remains an open question; this task only builds the controls against a mocked audio source.

### FE-14 Quiz and result

- **API**: Mock API
- **Depends on**: FE-11
- **Result**: `/student/lessons/:assignmentId/quiz` and `/result`.
- **Acceptance criteria**:
  - Questions are answerable with keyboard and screen reader.
  - Unanswered questions are pointed out before submission.
  - The result page shows what the backend returns; the frontend does not compute an authoritative score (scoring rules are an open question).
  - The result wording is encouraging and does not compare the student with others.
  - Tests cover answering, submitting, and the error case.

### FE-15 Parent overview

- **API**: Mock API
- **Depends on**: FE-14
- **Result**: `/parent/children`, child detail, and lesson activity with home guidance.
- **Acceptance criteria**:
  - Only children linked to the signed-in parent appear.
  - Opening an unlinked child's URL shows the forbidden page (mock returns 403).
  - Empty states cover "no linked children" and "no lessons yet".
  - Home guidance is shown in plain language.

### FE-16 Teacher: class overview

- **API**: Mock API
- **Depends on**: FE-10
- **Result**: `/teacher/classes`, class overview and basic student overview.
- **Acceptance criteria**:
  - Only classes and students the teacher may access appear; other IDs show the forbidden page.
  - Lesson activity per student matches the mock data.
  - Tables or lists remain usable at 360 px width.

### FE-17 Real backend integration

- **API**: Real backend
- **Depends on**: FE-05 to FE-16, the agreed API contract, the backend's running API
- **Result**: frontend runs against the real API with real authentication; mocks remain for tests.
- **Acceptance criteria**:
  - Schemas match the agreed contract; provisional markers are removed.
  - The main flow works end to end against the backend.
  - Access rules are confirmed to be enforced by the backend (for example, a parent requesting an unlinked child gets 403 from the API, not only from the UI).
  - Demo mode is unavailable against the real backend unless agreed.
  - Mismatches found are recorded and resolved with the backend developer.

### FE-18 End-to-end tests and final checks

- **API**: Mock API for most tests, Real backend for a final run
- **Depends on**: FE-17
- **Result**: Playwright tests for the main flow, and a final accessibility and responsiveness pass.
- **Acceptance criteria**:
  - Playwright covers: teacher creates, reviews, approves and assigns a lesson; student reads and completes the quiz; parent sees the activity.
  - All tests, lint, type check and build pass.
  - Manual check at 360 px and desktop width, keyboard only, and 200% zoom has no blocking issues.
  - Anything not verified is listed explicitly.

## 10. Open questions

### For the project owner

1. **Design direction**: colours, font, logo and overall style. Needed before FE-02 is finished.
2. **Reading preferences storage**: only on the device, or saved to the student's profile so they follow the student across devices?
3. **Demo mode**: only during development, or also in a public demo build?
4. **Teacher view of support needs**: may the teacher UI show any information about a student's needs, and in what wording? (Students and peers never see diagnoses.)
5. **Quiz rules**: question types, whether retries are allowed, and how results are described to students and parents.

### For the backend developer

1. **API contract**: format (for example OpenAPI), base URL, error format, and who maintains it.
2. **Authentication**: mechanism (for example httpOnly cookie session or tokens), session lifetime, and what the frontend receives about the signed-in user and role.
3. **Lesson model**: what a "version" is (per student, per group or per adaptation profile), status values, and how an approved version is assigned.
4. **Processing status updates**: polling, or push (for example Server-Sent Events)?
5. **File upload**: allowed types, maximum size, and whether upload is a separate step from lesson creation.
6. **Quiz**: who creates questions (AI, teacher or both), and where the score is calculated.
7. **Audio**: generated by the backend, or produced in the browser?

### Joint

1. **Shared types**: is the contract the single source of truth that both sides generate or check types from?
2. **Fictional seed data**: one shared set for mocks and the backend's development database?

## 11. Documents to prepare later

| Document | When |
|---|---|
| `client/README.md` | In FE-01, when there is something to run |
| `docs/API-CONTRACT.md` (or an OpenAPI file) | With the backend developer, before FE-04 schemas stop being provisional and before FE-17 |
| `docs/DESIGN.md` | When the owner approves the design direction (during FE-02) |
| `docs/ARCHITECTURE.md` | When backend technologies and authentication are decided |
| Accessibility checklist | During FE-02/FE-03, as a short reusable checklist for UI tasks |
