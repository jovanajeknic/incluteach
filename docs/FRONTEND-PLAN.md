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

## Current status

**First visual demo**: a public landing page at `/` and the start of the teacher area at `/teacher`. It is a demo with fictional data kept in memory, with no backend and no real sign-in.

| Task                            | Coverage                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FE-01                           | Done. Commands are in the root [README.md](../README.md).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| FE-02                           | Mostly done. Visual identity, logo and design tokens are defined in [DESIGN.md](DESIGN.md); Tailwind CSS and shadcn/ui use them. The teacher area has its own type, icons and motion (see DESIGN.md, "Teacher area").                                                                                                                                                                                                                                                                                                                           |
| FE-03                           | Partly done. Teacher layout (sidebar on desktop, top navigation on phones), skip link, not-found page and route error page are in place.                                                                                                                                                                                                                                                                                                                                                                                                        |
| FE-06                           | Partly done. A lesson list with status, plus counters computed from the data.                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| FE-07                           | Partly done. Text-only form; saves a local draft. No file upload and no AI request.                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| FE-09                           | Partly done. The shared `LessonContent` renderer and a read-only lesson view. No editing.                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Landing page                    | Done (not in the original task list). Public page at `/` in the shared design: header with section links, a hero with the classroom photo as a full background, "Za koga je" with a demo link for each role, and "Naša priča". "Prijavi se" and "Registruj se" lead to `/login` and `/register` (demo forms). The "Kako funkcioniše" section was removed at the owner's request.                                                                                                                                                                |
| Sign-in and activation          | Demo. Sign-in with two tabs (teacher or parent: email and password; student: the code from the QR card) and account activation from a school invitation, with React Hook Form + Zod validation and a separate demo auth service that sends and stores nothing. Camera scanning and real authentication wait for the backend (FE-05, FE-17).                                                                                                                                                                                                     |
| FE-11 to FE-14 (student)        | Demo done at `/student` in the teacher-area design: subjects with how many lessons are done, lessons per subject with progress and stars, the version the student's profile names, reading settings, step-by-step mode, glossary, read aloud (the approved audio script for students who receive audio), illustrations, "Označi kao pređeno", a quiz with feedback after every answer, and a "Moje zvjezdice" page. Mock data only; real data and progress need the backend.                                                                    |
| FE-15 (parent)                  | Demo done at `/parent` in the shared design: linked children only, each with lessons done, quizzes done, stars and questions to repeat; lessons by subject with progress and stars; the lesson as the child sees it (version name, illustrations), whether it is marked as done, the quiz date and questions missed on the first try, home guidance; free-text suggestions for the teacher, and a "Moji prijedlozi" page with every suggestion and what the teacher did with it. Mock data only.                                                |
| FE-06 to FE-10, FE-16 (teacher) | Demo done ("profesorski kutak"): "Moji predmeti" by subject or by class, a page per subject in a class with a status filter, adding a lesson that starts the simulated AI at once, a tab per AI version (shortened, easier, dyslexia-friendly text, audio script, illustrations) with editing, feedback to redo one version and approval, publishing once all are approved, a students page with lessons done, quizzes and stars, each student's version profile, and the parent-suggestion inbox. All three roles share one demo school store. |

Differences from this plan, all intentional for this step:

- **No MSW yet (FE-04).** Demo data comes from an in-memory store behind a `LessonsStore` interface (`client/src/features/lessons/data/`). Screens use only that interface, so it can be replaced by API calls later.
- **React Hook Form and Zod** are now used by the sign-in and registration forms. The lesson form still uses its small validation function and can move to them with FE-07.
- **React Router 7, not 8.** Version 8 requires Node.js 22.22 or newer; the installed version is 22.18.0.
- **Approved visual identity**: see [DESIGN.md](DESIGN.md). Details will be refined after the owner reviews the screens.
- **`/` is a public landing page**, not a redirect. Signed-in users will reach their role's home page through sign-in (FE-05).
- **Student area decisions (owner)**: the school adds students (no self-registration); AI-adapted versions reach students only after teacher approval; the quiz is practice only, with feedback after every answer and no score. Stars are for effort: one when the student marks a lesson as done ("Označi kao pređeno") and one when they finish its quiz, so at most two per lesson. Teachers see lessons done, quizzes done and stars separately.
- **Support profile**: the frontend receives only needs (shorter text, step by step, easier-reading preset), never diagnoses. Mapping from what the school or parents record to these needs belongs to the backend.
- **Reading settings** start from the profile preset (for example the dyslexia-friendly font), can always be changed by the student and are remembered on the device (`localStorage`).
- **Audio** in the demo uses the browser's built-in voice (Serbian, or Croatian/Bosnian as a fallback). If a device has none, the lesson says so. A server-side voice remains an open question.
- **Parent area decisions (owner)**: parents see their linked children's lessons, practice dates and questions missed on the first try (no score), and short home guidance. They write free-text suggestions that go to the teacher; the teacher decides how the AI uses them, and the teacher still approves every adapted version. Suggestions are never shown to the child.
- **Teacher area decisions (owner)**: lesson input is text only for now (file upload waits for the backend). A teacher teaches subjects in classes (a class teacher teaches several subjects in one class; a subject teacher one subject in several classes), so the home page shows "Moji predmeti" with a switch between a view by subject and a view by class, and no statistics or greeting. Adding a lesson starts the AI at once; it prepares a shortened version, an easier (lower-level) version, a dyslexia-friendly text, an audio version and illustrations, plus glossary words and quiz questions. The teacher reviews each version separately, can edit it or give the AI a note to redo it, and approves each one; "Objavi učenicima" becomes available only when all are approved. A published lesson goes to its whole class, and every student automatically gets the versions named in their profile.
- **Student version profile (owner)**: replaces the earlier "needs". Teachers set, together with the parents, which text version a student reads (original, shortened, easier, dyslexia-friendly) and whether they also get audio. The profile is never shown to the student or to other pupils and is not labelled on the student's lesson page; it only lets the system send the right version. Illustrations go to every student. Parents see the version name, because they agreed to it.
- **Accounts and sign-in (owner, 2026-11-04)**: nobody registers on their own. A school joins IncluTeach once and gets its first administrator account. The administrator imports two lists each school year: students with their parents' contacts (the school already has them from enrolment, often in eDnevnik), and teachers with the subjects they teach in each class. The system then sends every parent and teacher an **invitation** (email, SMS, or a printed letter with a code for parents without email); they only **activate** the account by choosing a password, and parents give their consent for the lesson versions at that point. Students sign in with a **QR card** that the teacher prints; a lost card is replaced and the old one stops working. Both parents of a child can have their own accounts, and one parent account covers all their children. The public site therefore has only "Prijavi se" (teachers and parents with email and password, students with their card) and "Aktiviraj nalog" (`/activate`, optionally `?code=`); the registration page was removed. How invitations, card codes and sessions work technically is the backend developer's decision.
- **Accounts and sign-in, backend agreement (2026-11-04; replaces the item above where they differ)**: the admin creates every account one by one (full name and role); there is no list import yet. The system sends nothing by itself: for each account the admin asks for a **one-time activation link** (valid 7 days, drawn as a QR code by the frontend) and hands it to the person in their own way. Opening the link, the person chooses a password (at least 7 characters) and adds an email, and is signed in. **Everyone, students included, signs in with email or username plus password**; the QR is only a way to hand out the activation link, not a sign-in card. A forgotten password is handled by the admin issuing a new link. Usernames are generated as `ime_prezime` (a number is added when taken). Parent consent for lesson versions is **not** part of activation in the backend yet (open question). Each user has exactly one role and belongs to one school; a guardian is a normal parent account. The admin links a parent to a child (many to many). A student joins a subject by **request**: the student asks, a linked parent confirms, the subject's teacher approves or rejects. A subject is "name + class + teacher" assigned by the admin; the same name can have several teachers. Details: [DATABASE.md](DATABASE.md). The tasks this creates for the frontend are listed in "Backend API and frontend work" below.
- **Lessons and AI, agreement with the owner (2026-11-04; replaces the AI-version items above where they differ)**: the teacher's text is never rewritten; the student shapes its look with buttons and a Latin/Cyrillic switch, and has a read-aloud button (browser voice). The AI makes only a bullet-point **summary** and a **quiz** (choose one answer, true/false), and the teacher approves both. Dropped for now: the five versions, the version profile per student, illustrations and the glossary. Parents and the teacher see all quiz questions and all answers. Sources are Word, PDF with text and pasted text. The AI is a replaceable part and a fake one is used until a provider is chosen. Details: [LESSONS.md](LESSONS.md).
- **Publishing rules (owner, 2026-11-04)**: students and parents see a published copy of a lesson, never the teacher's working copy. Everything the AI prepares needs approval before publishing: the five versions and also the quiz questions and word explanations. Changes to a published lesson (a redone version, an edit, a full AI rerun) reach students only after "Objavi izmjene"; until then they keep the published copy. When the teacher changes the original text, the AI versions are marked as outdated and must be approved again. If the AI fails, nothing is lost and the teacher can try again.
- **Class teacher and subject teachers (owner)**: only the class teacher ("razredni starešina") changes which versions a student receives; other teachers see it read-only. A subject teacher sees a student's progress only in the subjects they teach; the class teacher sees all. A teacher can open only lessons of subjects they teach in that class.
- **Parents and the version profile (owner)**: parents see which versions their child receives (never shown to the child) and can send a suggestion to change it.
- **How a school joins (owner, 2026-11-04)**: a school sends a request from the landing page ("Prijavite školu", `/school-request`): school name, municipality, contact person and role, the school's official email, optional phone and message, and consent to be contacted. It creates no account. The IncluTeach team checks that the school exists and the email is official, signs a data processing agreement with the school (the school is the data controller, IncluTeach the processor), opens the school's space and invites the first administrator; a school can have two or three administrators, ideally with two-step sign-in. Administrators manage accounts and the timetable only (imports, classes, class teachers, teaching assignments, invitations, moving students, the year-end rollover); they do **not** see lessons, progress, version profiles or parent suggestions. In the demo the request form validates and sends nothing.
- **Second review (owner, 2026-11-04)**: everyone can sign out (a demo link to sign-in for now). Parent suggestions go to the teacher of the lesson's subject, or to the class teacher when general. The AI never gets a parent's text: the teacher writes a short instruction in their own words (`aiNote`), and only that is sent. Teachers can withdraw a published lesson or delete one that was never published. Students can undo "Označi kao pređeno". AI remarks are shown to the teacher beside the text, never inside it. Teachers do not reply to suggestions; parents see the status only.
- **Audio in the teacher area**: the AI writes a narration script; the teacher can listen to it with the browser voice. Students with audio hear that script; others hear the text on screen.
- **Illustrations in the demo** are prepared drawings; the real AI service on the backend will provide its own.

## Backend API and frontend work

A living list. Whenever a backend endpoint is added, it is added here with what the frontend needs to do for it. The exact requests, answers and errors of every endpoint are in [API-CONTRACT.md](API-CONTRACT.md) (status `implemented`: built and tested on the server, not yet connected to the frontend); the rules and reasons behind them are in [DATABASE.md](DATABASE.md). This section only says what the screens must do. Status: **ready** means the endpoint exists and is tested; **planned** means it is agreed but not built.

### Terminology

In the API and the code a **class** is what Serbian schools call an **odeljenje**: "5-2" is the 5th grade (razred), 2nd section (odeljenje). The name is free text and the system does not know the grade number. In Serbian screens always write **odeljenje**, never "razred", for these. Several odeljenja of one grade have separate subjects, so for example Matematika in 5-1 and in 5-2 can have different teachers.

### Rules for every call

- Errors always look like `{ "error": { "code": "...", "message": "..." } }`. The `message` is English and for developers; the screen shows its own Serbian text chosen by `code`.
- Authentication is a cookie named `session` that the browser keeps by itself (`httpOnly`; the frontend cannot and must not read it). Every request must be sent **with credentials**. Call the API as `/api/...`: the Vite dev server forwards those calls to the backend (`http://localhost:3000`) and removes `/api`, so the browser sees one address and no CORS setup is needed. The proxy block to add to `client/vite.config.ts` is in `server/README.md`, section "Connect the frontend on this computer". This is part of FE-17.
- A `401` with code `unauthenticated` means the session ended: clear cached data and go to `/login`. A `403` with code `forbidden` shows the forbidden page. The frontend role checks stay for navigation only (AGENTS.md, section 8).
- The server limits failed sign-ins (`429`, code `too_many_attempts`): show a calm message asking to wait a few minutes.

### Endpoints

| Endpoint | Status | What the frontend does |
| -------- | ------ | ---------------------- |
| `POST /auth/login` | ready | Sign-in form: one field "email or username" and a password. Remove the separate student card tab. Show the same message for every `invalid_credentials`. On success go to the home page of `user.role`. |
| `GET /auth/me` | ready | Ask on every page load whether a session exists, to restore the signed-in user (and role) after a refresh. |
| `POST /auth/logout` | ready | "Odjavi se": call it, clear cached data, go to `/login`. |
| `POST /auth/activate` | ready | The `/activate` page reads `?token=` from the link (not `?code=`), asks for a new password, its confirmation and an **email**, and shows errors by `code`: `invalid_activation_link` (explain that the link was used or has expired and to ask the school admin), `invalid_email`, `password_too_short` (minimum 7), `password_too_long` (maximum 128), `email_taken`. On success the user is already signed in: go to their home page. Replace the temporary 12-character rule and the 8-letter code field. |
| `POST /users` | ready | Admin screen "Novi nalog": full name and role (teacher, student or parent). Show the generated username from the answer (it has the same shape as a user in the list). Errors: `invalid_full_name`, `invalid_role`. |
| `GET /users` | ready | Admin screen "Korisnici": a table of the school's users with filters (role, active or deactivated, search) and paging (`limit`, `offset`, `total`). Show who has not activated yet (`activated: false`) with a quick "Novi link". Deactivated users are hidden unless the filter asks for them. |
| `PATCH /users/:id` | ready | Edit the name of a user (the username cannot change). |
| `POST /users/deactivate` and `/reactivate` | ready | Select one or many users (for example a whole class at the end of the school year) and deactivate or bring them back. Send the ids in one request (at most 200) and show `skippedIds` if there are any. An admin cannot select their own account (`cannot_change_self`). Say clearly that deactivation keeps all data and can be undone. |
| `POST /users/delete` | ready | A separate, clearly dangerous action "Obriši zauvijek", offered only for deactivated users, with a confirmation that says it erases personal data and cannot be undone. Meant for accounts created by mistake. A deleted user disappears from every list. |
| `GET /catalog/classes` | ready | The "Odeljenje" filter on the student screen: a list of the classes (odeljenja, for example 5-2) that have subjects to join for the current school year. The student picks their odeljenje and the subject list is narrowed with `classId`. Students are not tied to a class, so nothing is pre-selected. |
| `GET /catalog/subjects` | ready | Student screen "Prijava na predmet": a class filter (`classId`), a search box (subject, class or teacher) and a list "Matematika, nastavnik X". Each row shows the status of the child's request (`request.status`): none, `awaiting_parent` ("Čeka roditelja"), `awaiting_teacher` ("Čeka nastavnika"), `approved`, `rejected` (the child may ask again). A parent first picks the child and sends `studentId`. The current school year is chosen by the backend (it starts on 1 September); `schoolYear` is returned. |
| `POST /enrollments` | ready | Button "Prijavi se" on a subject. A student's request waits for a parent; a parent's request goes straight to the teacher. Show errors by `code`: `no_parent` (the student has no parent or guardian linked: tell them to ask the school), `request_exists`, `invalid_subject`, `invalid_student`. |
| `GET /enrollments` | ready | Student: "Moji zahtjevi". Parent: requests of the children (filter `status=awaiting_parent` for the inbox of requests to confirm; `studentId` narrows to one child). Teacher: requests for their subjects (`status=awaiting_teacher` for the inbox). Approve and reject buttons come with the next step. |
| `GET /lessons`, `POST /lessons`, `GET /lessons/:id`, `PATCH /lessons/:id`, `DELETE /lessons/:id` | ready | **Teacher**: "Moje lekcije" (filter by subject and status), "Nova lekcija" with a title and a big text field to paste into (up to 40,000 characters; show a counter), an editor that saves changes; deleting only a draft. A published lesson cannot be changed (`lesson_published`): offer "Vrati u nacrt" first. **Student and parent**: a list of the published lessons of the subjects the student joined, and the reading screen. The text keeps its line breaks; the display buttons (size, spacing, contrast, font, reduced motion), the Latin/Cyrillic switch and read-aloud are done in the browser and never change the stored text. Handle `invalid_title`, `invalid_body`, `invalid_subject`, `lesson_busy`. File upload, the summary and the quiz come in later steps. |
| `POST /lessons/:id/source` | ready | "Nova lekcija" and the editor offer a **file** (Word `.docx` or a PDF that has text) next to pasting. Send the file as the plain body of the request (not a form) with the name in `X-File-Name` (see the contract); show a progress state, because reading a PDF can take a few seconds. Then show the extracted text for the teacher to **read and correct** before going on; a PDF's paragraphs and lists may need small fixes. The answer has `warnings`: when it has `images_not_included` (with `count`), show a visible but calm note above the text, such as "Dokument ima {count} slika koje nisu uključene u tekst. Ako su važne, opiši ih u tekstu." (the AI does not see pictures either). Handle by `code`: `unsupported_file` (say what is supported, and for an old `.doc` to save it as `.docx`), `no_text_in_file` (a scanned PDF: offer to paste the text), `unreadable_file`, `text_too_long` (send a shorter part), `file_too_large` (10 MB), `lesson_published`. Check the file size in the browser too, before sending. |
| `POST /lessons/:id/generate` | ready | Teacher button "Napravi sažetak i kviz" (the summary, the quiz, or both). The answer is `202` with the lesson `processing`: show a waiting state and **ask `GET /lessons/:id` every 2 to 3 seconds** until `status` is no longer `processing` (announce the change to screen readers). `in_review`: show what the AI made, clearly labelled "Napravio AI, čeka odobrenje" (`summary.origin`, `status: draft`). `draft` with `processingError`: show the message and offer to try again. If a summary or quiz already exists, ask for confirmation first, because asking again replaces them and the teacher's edits. The new fields `summary`, `quiz` (teachers also get `isCorrect`, `explanation`) are in the lesson; show a warning when `outdated` is true. Editing and approving are in the next row. A fake AI is used for now: `GET /health` says `ai: "fake"`, so **show a clear "test AI" label** on these screens when it does. The text `[[ai-fail]]` in a lesson makes it fail on purpose, for testing the error screen. With a real AI (`ai: "groq"`) a run takes a few seconds and can fail with a `processingError` about a text that is too long, a busy service or a daily limit: show your own Serbian message and a "Pokušaj ponovo" button, and tell the teacher to read what the AI made carefully (Cyrillic especially). |
| `PUT /lessons/:id/summary`, `PUT /lessons/:id/quiz`, `DELETE ...`, `POST .../approve` | ready | The **review screen** after the AI worked (or for a teacher who writes it alone): the summary as a list of points the teacher can **edit, delete, add and reorder**, and the quiz as a list of questions with their answers, a mark on the right one, and the explanation; deleting, rewording or adding a question. Saving sends the **whole** list (one `PUT`), not single changes. Two buttons per part, "Sačuvaj" and "Odobri" (`approve`); show the label "Napravio AI, čeka odobrenje" while `status` is `draft`, and a warning when `outdated` is true. Any save makes the part a draft again, so approve after saving. A true/false question has only the answers Tačno and Netačno (a toggle for which is right); a choice question has 3 or 4 answers, all different. Errors `invalid_summary` and `invalid_quiz` carry a message in English for the developer; show the teacher your own Serbian text, naming the field if you can. When both parts the lesson has are approved, "Objavi" works (`needs_approval` otherwise). |
| `POST /lessons/:id/quiz/attempts`, `POST /lessons/:id/quiz/attempts/:attemptId/answers` | ready | The **student's quiz screen**: one question at a time, in the order the server sends; after a tap show green or red, the right answer and the `explanation`, then "Dalje". Do not shuffle on the client and do not show a score or percent. Continue an open try when the student comes back (the same call returns it with the answered questions). After the last answer: `allCorrect` true means a celebration and the "Završi lekciju" button (next step), otherwise a calm message that the quiz can be tried again later. `409 retry_later` carries `details.nextAttemptAt`: show a countdown and a hint to read the lesson again. A true/false question has the answers in the order Tačno, Netačno. `409 quiz_changed`: say that the teacher changed the quiz and start again. Make it work with large text and the read-aloud button. |
| `POST /lessons/:id/complete`, `lesson.myProgress`, `GET /lessons/:id/quiz/attempts` | ready | **Finishing a lesson.** On the student's lesson screen show the "Završi lekciju" button when `myProgress.canFinish` is true: for a lesson without a quiz it is there from the start; for a lesson with a quiz it appears at the end of the quiz when `attempt.allCorrect` is true (and on the lesson screen afterwards, as `canFinish` stays true until it is pressed). Do not decide this on the client: use `canFinish`. After pressing it show the lesson as finished (`completed`, `completedAt`). `myProgress.quiz.openAttemptId` says that a try can be continued, `nextAttemptAt` that the quiz is waiting (show a countdown). `409 quiz_not_passed` should not happen if the button follows `canFinish`. **History**: `GET /lessons/:id/quiz/attempts` (a parent and the teacher add `?studentId=`) gives every try with each question, the chosen and the right answer, and the explanation: use it for "Moji pokušaji" (student), the child's lesson (parent) and the student detail (teacher). |
| `GET /stars`, `POST /stars`, `DELETE /stars/:id` | ready | **Stars for effort.** Two kinds, `source: "automatic"` (the student finished a lesson; shows the lesson title) and `source: "teacher"` (shows the teacher's message and name). They must look clearly different: another icon and color, and a label such as "Završena lekcija" and "Od nastavnika". Show `counts` as the totals. A student sees their own (no `studentId`), a parent adds `?studentId=` of the chosen child and sees the teacher's message too. The teacher gets a "Daj zvjezdicu" button next to each student of the subject with a one line field (1 to 200 characters) and can take back a star they gave (`DELETE`); automatic stars cannot be taken back. The automatic star comes from `POST /lessons/:id/complete`, so refresh the stars after it. |
| `GET /conversations`, `GET /conversations/messages`, `POST /conversations/messages` | ready | **Conversation between parents and the teacher.** One conversation for each child and subject. The teacher and **all parents of the child** see the same messages and can write; the child never sees it, so do not show it in the student's view. A parent opens it from the child's subject ("Razgovor sa nastavnikom"); the teacher from a student of the subject or from the inbox (`GET /conversations`, newest first, shows the last message and the number of messages). Show the writer's name and role (`parent`/`teacher`) on every message, oldest first, with a field below (1 to 1000 characters, line breaks allowed). No editing, deleting or "read" marks yet, and no push: reload when the screen opens and every few seconds while it is open. Errors: `404` if the child has not joined the subject, `403` for a child that is not the parent's. |
| `GET /subjects/:id/progress`, `GET /subjects/:id/progress/students` | ready | **Progress per subject.** For a student, a parent (add `?studentId=`) and the teacher (also `?studentId=`): "4 od 7 lekcija", the two star counts (shown differently, like on the stars screen) and the list `items` with a done mark per lesson. For the teacher only, a **table of the whole subject**, already sorted: rank, name, finished lessons out of `publishedLessons`, stars. Students and parents must never see this table or other students' numbers, so do not build it into their views. A lesson counts only after "Završi lekciju" was pressed. |
| Printing a lesson (no new endpoint) | frontend only | **"Štampaj" button** on the lesson screen for a **student and a parent** (not decided for the teacher yet). It opens a print view of the lesson, with the **same display settings the student chose** (font, size, spacing, contrast, Latin or Cyrillic), and calls `window.print()`; the browser dialog then offers both a printer and "Sačuvaj kao PDF", so one button covers printing and a PDF. What is printed: the **original text** and the **summary** (if there is an approved one), with the title, subject and date. The **quiz is not printed.** Hide everything that is not the lesson (menus, buttons, stars) with a print stylesheet (`@media print`), use a readable page margin, avoid page breaks inside a paragraph, and make sure the chosen font is the one that is printed (check Cyrillic too). The settings are not saved on the server for now; they stay in the browser. Nothing to do on the backend. |
| `POST /lessons/:id/publish` and `/unpublish` | ready | Teacher buttons "Objavi" and "Vrati u nacrt". Publishing can fail with `lesson_has_no_text` (add the text first), `needs_approval` and `content_outdated` (a summary or quiz is not approved or is out of date; these appear once the AI step exists), `lesson_busy`, `wrong_state`. After publishing, students who joined the subject see the lesson. |
| `POST /enrollments/:id/approve` and `/reject` | ready | Parent: in "Zahtjevi za potvrdu" (`GET /enrollments?status=awaiting_parent`) buttons "Potvrdi" and "Odbij" for each request of their child; either parent can answer and the first answer counts, so handle `409 wrong_state` by refreshing the list ("Zahtjev je već obrađen"). Teacher: in "Zahtjevi za predmete" (`GET /enrollments?status=awaiting_teacher`) buttons "Odobri" and "Odbij". The answer returns the updated request. After approval the student sees the subject as joined (`status: approved`). A rejected request can be sent again by the student. |
| Admin: set up a new school year (copy classes and subjects from the previous year) | planned | Classes and subjects belong to one school year, so the admin prepares them again each year before 1 September. A copy helper may come later; until then the admin creates them with the existing screens. |
| Removing a student from a subject at the end of the school year | planned | Not defined yet. The idea: the teacher or admin removes students at the end of the year and they enroll in the new subjects. |
| `GET /parent-students`, `POST /parent-students` | ready | Admin screen "Porodice": pick a child (search in `GET /users?role=student`) to see their parents and add one more (pick from `GET /users?role=parent`), or pick a parent to see their children. A parent can have several children and a child several parents; a guardian is a parent account. There is no way to remove a link (agreed), so ask for confirmation before adding. Errors: `invalid_parent`, `invalid_student`, `link_exists`. Show a child with no parent as needing attention, because enrollment requests need a parent to confirm. |
| `GET /classes`, `POST /classes`, `PATCH /classes/:id`, `DELETE /classes/:id` | ready | Admin screen "Odeljenja": classes (odeljenja, for example 5-2) of a school year with a year switch (`schoolYear`), adding a class (its name, such as 5-2, and the year it starts in, for example 2026 for 2026/27), renaming, and deleting. Show `subjectCount`; deleting is possible only while it is 0 (`class_not_empty`). Show `class_exists` next to the name field. |
| `GET /subjects`, `POST /subjects`, `PATCH /subjects/:id`, `DELETE /subjects/:id` | ready | Admin screen "Predmeti": a table (subject, class, teacher) with filters by class, teacher and school year, and paging. Add form: name, class and an **active teacher** picked from `GET /users?role=teacher`. The same name may appear several times with different teachers or classes. If `teacher.deactivated` is true, show a warning and offer "Promijeni nastavnika"; if `teacher.deleted` is true, show "Obrisan korisnik" instead of the name. Deleting works only while nobody has requested the subject (`subject_has_enrollments`). Errors: `invalid_teacher`, `invalid_class`, `invalid_subject_name`, `subject_exists`. |
| `POST /users/:id/activation` | ready | Admin screen: after creating an account, or on "Novi link" for an existing one (forgotten password), call it and show the link as a **QR code** drawn in the browser (a small library such as `qrcode`; never send the link to an outside QR service) plus "Kopiraj link" and "Preuzmi sliku". Show the expiry date. The link appears only in this answer; asking again cancels the old one. A deactivated user gets `409 user_deactivated`: reactivate first. |

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

| Technology                     | Why                                                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| React + TypeScript (strict)    | Component model fits a UI with many reusable parts. Strict types catch mistakes early, especially around API data. |
| Vite                           | Fast development server and simple build for a single-page app.                                                    |
| React Router                   | Standard routing for React. Supports nested layouts per role and route-level error handling.                       |
| Tailwind CSS                   | Utility classes keep styling consistent and make spacing and contrast variants easy to apply.                      |
| shadcn/ui                      | Accessible building blocks (based on Radix UI) copied into the project, so they can be adapted instead of fought.  |
| React Hook Form + Zod          | Forms with little boilerplate. Zod schemas give one source of truth for validation rules and TypeScript types.     |
| TanStack Query                 | Handles loading, error, caching and refetching of server data, so screens do not reimplement it.                   |
| MSW                            | Lets the frontend be built and tested before the backend is ready, using the same request format as the real API.  |
| Vitest + React Testing Library | Fast unit and component tests that check behaviour the way a user experiences it.                                  |
| Playwright                     | End-to-end tests for the most important user flows in a real browser.                                              |
| ESLint + Prettier              | Consistent code style and early detection of common mistakes.                                                      |
| npm                            | Already installed (npm 10.8.1, Node.js 22.18.0). No extra tool needed.                                             |

Packages are added only when a task needs them. Version compatibility (for example with Node.js 22.18.0) is checked at install time. No other libraries or frameworks are added without a clear reason and agreement.

## 4. Responsibility boundary with the backend

| Area           | Frontend                                                        | Backend                                               |
| -------------- | --------------------------------------------------------------- | ----------------------------------------------------- |
| Authentication | Sign-in form, session state in the UI, sign-out                 | Verifying identity, issuing and ending sessions       |
| Access control | Hiding navigation the role cannot use; showing a forbidden page | Enforcing who can see and change what                 |
| Documents      | File picker; client-side type and size check for quick feedback | Storing, validating and extracting text from PDF/DOCX |
| AI adaptation  | Requesting it, showing status, editing the result               | Calling the AI service, holding API keys              |
| Data           | Display, forms, validation for user feedback                    | Storage, validation as source of truth                |
| Contract       | Typed client and MSW mocks that follow the contract             | Implementing the contract                             |

## 5. Proposed `client/src/` structure

_Proposal._ Organized by feature, so each feature keeps its screens, components, data hooks and schemas together.

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

_Proposal._ Route names, parameters and nesting may change when the API contract is agreed.

### Public and shared

| Route        | Screen       | Notes                                                                         |
| ------------ | ------------ | ----------------------------------------------------------------------------- |
| `/login`     | Sign-in      | Demo form (email, password); validates only, no real sign-in yet              |
| `/register`  | Registration | Demo form for teachers and parents; validates only, no account is created yet |
| `/`          | Landing page | Public page that explains the platform (decided by the owner)                 |
| `/forbidden` | Forbidden    | Shown when a role opens a page it cannot use                                  |
| `*`          | Not found    | Any unknown route                                                             |

### Teacher (`/teacher`)

| Route                                            | Screen                                                |
| ------------------------------------------------ | ----------------------------------------------------- |
| `/teacher/lessons`                               | Lesson list with status per lesson                    |
| `/teacher/lessons/new`                           | New lesson: text input or PDF/DOCX upload             |
| `/teacher/lessons/:lessonId`                     | Lesson detail: processing status and list of versions |
| `/teacher/lessons/:lessonId/versions/:versionId` | Review and edit a version, then approve it            |
| `/teacher/lessons/:lessonId/assign`              | Assign an approved version to students or a class     |
| `/teacher/classes`                               | List of the teacher's classes                         |
| `/teacher/classes/:classId`                      | Class overview: students and their lesson activity    |
| `/teacher/classes/:classId/students/:studentId`  | Basic student overview                                |

The demo implements these teacher routes instead: `/teacher` ("Moji predmeti"), `/teacher/subjects/:subjectId/classes/:classId` (lessons of one subject in one class), `/teacher/lessons/new` (optionally `?subject=&class=`), `/teacher/lessons/:lessonId` (AI progress, a tab per version, publishing), `/teacher/class` (students per class), `/teacher/students/:studentId` and `/teacher/suggestions`.

### Student (`/student`)

| Route                                   | Screen                                                    |
| --------------------------------------- | --------------------------------------------------------- |
| `/student/lessons`                      | Assigned lessons                                          |
| `/student/lessons/:assignmentId`        | Reading view, with reading preferences and audio controls |
| `/student/lessons/:assignmentId/quiz`   | Quiz                                                      |
| `/student/lessons/:assignmentId/result` | Quiz result                                               |

Reading preferences open as a panel from the reading view and the header, not as a separate page.

### Parent (`/parent`)

| Route                                             | Screen                            |
| ------------------------------------------------- | --------------------------------- |
| `/parent/children`                                | Linked children                   |
| `/parent/children/:childId`                       | Child's lessons and results       |
| `/parent/children/:childId/lessons/:assignmentId` | Lesson activity and home guidance |

### Admin (`/admin`)

_Proposal, to be confirmed when the admin endpoints exist._ The admin manages accounts and the timetable only and does not see lessons, progress, version profiles or parent suggestions.

| Route                       | Screen                                                                      |
| --------------------------- | --------------------------------------------------------------------------- |
| `/admin/users`              | Users of the school, by role, with "Novi link" for each                     |
| `/admin/users/new`          | New account (full name, role); then the activation link and QR              |
| `/admin/classes`            | Odeljenja (classes such as 5-2) of a school year                            |
| `/admin/subjects`           | Subjects: name, class and teacher                                           |
| `/admin/families`           | Link parents to children                                                    |

## 7. Shared UI components

_Proposal._ Built once and reused across features.

**Primitives** (from shadcn/ui, added only when first needed): Button, Input, Textarea, Label, Select, Checkbox, RadioGroup, Dialog, Tabs, Card, Badge, Alert, Progress, Skeleton.

**App components:**

| Component                       | Purpose                                                               |
| ------------------------------- | --------------------------------------------------------------------- |
| `AppShell` / role layouts       | Header, navigation for the role, main area, sign-out                  |
| `SkipLink`                      | "Skip to content" link for keyboard users                             |
| `DemoModeBanner`                | Always-visible label while demo mode is active                        |
| `PageHeader`                    | Page title and optional actions, sets the document title              |
| `LoadingState`                  | Consistent loading indicator, announced to screen readers             |
| `EmptyState`                    | Message and optional action when a list is empty                      |
| `ErrorState`                    | Error message with a retry action                                     |
| `ForbiddenPage`, `NotFoundPage` | Full-page states for 403 and 404                                      |
| `QueryBoundary`                 | Picks loading, error, empty or content for a TanStack Query result    |
| `RequireRole`                   | Route guard: redirects to sign-in or to the forbidden page            |
| `FormField`                     | Label, hint and error message wired to the input for screen readers   |
| `FileUpload`                    | Accessible PDF/DOCX picker with type and size feedback                |
| `StatusBadge`                   | Lesson processing and approval status with text, not only colour      |
| `ConfirmDialog`                 | Confirmation for important actions such as approve and assign         |
| `LessonContent`                 | **Shared** lesson renderer used by teacher review and student reading |
| `ReadingPreferencesPanel`       | Controls for text size, line spacing, contrast and reduced motion     |
| `AudioControls`                 | Play, pause and speed, shown only when audio is available             |

## 8. Mock and real API approach

_Proposal._

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
  - The root `README.md` explains how to install and run the scripts.
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

1. **Design details**: the visual identity is approved as a starting point (see [DESIGN.md](DESIGN.md)); refinements are expected after review.
2. **Reading preferences storage**: stored on the device for now. Should they also follow the student across devices (saved on the backend)?
3. **Demo mode**: only during development, or also in a public demo build?
4. **Teacher view of support needs**: may the teacher UI show any information about a student's needs, and in what wording? (Students and peers never see diagnoses.)
5. **Quiz rules**: decided: practice only, no score. Still open: what parents and teachers see about practice activity.
6. **Registration**: decided by the owner: teachers and parents register themselves through the public form; students do not (the school adds them). Still to agree with the backend developer: the password policy (the frontend uses a temporary 12-character minimum), email verification and how a parent is linked to a child. **Answered by the backend (2026-11-04)**: there is no self-registration; password minimum is 7 characters; the email is added at activation (not verified yet); an admin links a parent to a child.

### For the backend developer

1. **API contract**: format (for example OpenAPI), base URL, error format, and who maintains it. **Proposed** in [API-CONTRACT.md](API-CONTRACT.md): Markdown for now, one address for frontend and API (Vite proxy in development), error format `{ error: { code, message } }`.
2. **Authentication**: mechanism (for example httpOnly cookie session or tokens), session lifetime, and what the frontend receives about the signed-in user and role. The owner chose QR cards for students and school-created accounts for teachers and parents (see "Accounts and sign-in" above): how a card is issued, what it encodes, and how a lost card is revoked. **Answered (2026-11-04)**: cookie session of 7 days; no student cards for sign-in, only a one-time activation link per account that the admin hands out. See "Backend API and frontend work".
3. **School import**: the format of the class-list import (columns, encoding) and whether eDnevnik export can be used.
4. **Lesson model**: what a "version" is (per student, per group or per adaptation profile), status values, and how an approved version is assigned. **Answered (2026-11-04)**: there are no versions; a lesson has the text, a summary and a quiz, all approved by the teacher. See [LESSONS.md](LESSONS.md).
5. **Processing status updates**: polling, or push (for example Server-Sent Events)? **Proposed**: polling.
6. **File upload**: allowed types, maximum size, and whether upload is a separate step from lesson creation. **Proposed** in [LESSONS.md](LESSONS.md): Word, PDF with text, pasted text; 10 MB.
7. **Quiz**: who creates questions (AI, teacher or both), and where the score is calculated. **Answered**: the AI makes them, the teacher edits and approves; no score. See [LESSONS.md](LESSONS.md).
8. **Audio**: generated by the backend, or produced in the browser? **Answered**: the browser voice in the first version.

### Joint

1. **Shared types**: is the contract the single source of truth that both sides generate or check types from?
2. **Fictional seed data**: one shared set for mocks and the backend's development database?

## 11. Documents to prepare later

| Document                                    | When                                                                                     |
| ------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `docs/API-CONTRACT.md` (or an OpenAPI file) | **Written**, status `implemented`: [API-CONTRACT.md](API-CONTRACT.md) covers every endpoint of the backend so far. They are built and tested on the server; check them against the screens before FE-04 schemas stop being provisional and before FE-17 |
| `docs/ARCHITECTURE.md`                      | When backend technologies and authentication are decided                                 |
| Accessibility checklist                     | During FE-02/FE-03, as a short reusable checklist for UI tasks                           |

## Next steps noted

- **Bundle size**: the teacher, student and parent areas are lazy routes (`client/src/app/areas/`), so the main bundle is about 480 KB (150 KB gzipped) instead of about 830 KB. Tests load the areas up front through the same `lazy` functions (`src/test/eagerRoutes.ts`).
- **Sign-in pages**: they still use their own look; decide with the owner whether they should follow the rest of the site.
- **Real backend**: AI adaptation, file upload (PDF/DOCX), authentication, access control and storage all wait for the agreed API contract (FE-17).
