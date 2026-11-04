# API contract

Agreement between the frontend (`client/`) and the backend (`server/`). Both sides build against this file.
Status values: `proposed` (written, not yet agreed with the teammate) -> `agreed` -> `implemented`.
Changing an `agreed` endpoint needs both developers' approval. Mocks in the frontend must follow this file.

**Where things stand:** every endpoint below exists in `server/` and has tests (595 tests at the time of writing), so all are `implemented`. The frontend developer has not reviewed them or agreed to them yet (the owner decided that no review is needed before they are used). If something does not fit the screens, the contract and the server are changed together and this file is updated. What the screens have to do for each endpoint is in `docs/FRONTEND-PLAN.md`, section "Backend API and frontend work". The rules and the reasons behind them are in `docs/DATABASE.md`.

## Common rules

- **Format of this contract**: Markdown (provisional - TBD whether to move to OpenAPI).
- **Base URL**: the server listens on `http://localhost:3000` and the paths below are relative to it (it has no `/api` prefix). During development the frontend calls `/api/...` and the Vite dev server forwards the call to the server with `/api` removed, so the browser sees one address and no CORS is needed. The exact setting is in `server/README.md`, section "Connect the frontend on this computer". The server runs on the owner's computer for now; hosting is not decided.
- **Authentication**: a cookie named `session`, set by `POST /auth/login` or `POST /auth/activate`. It is `httpOnly`, `SameSite=Lax`, `Secure` in production, and lasts 7 days. The browser keeps it; the frontend never reads it. Every request must be sent with credentials. Proposed by the backend developer; to be confirmed.
- **Roles**: one per user: `admin`, `teacher`, `student`, `parent`. Every user belongs to exactly one school, and every endpoint works only on the data of the caller's school. Something that belongs to another school looks exactly like something that does not exist (404).
- **Error format**: every error is `{ "error": { "code": "...", "message": "..." } }`. `message` is English and for developers; screens choose their own Serbian text from `code`.
- **Common errors** (not repeated below): `401 unauthenticated` (not signed in or session ended), `403 forbidden` (signed in, but the role may not do this), `400 invalid_request` (the body or query is not valid, or contains the NUL character, which cannot be stored), `400 bad_request` (the JSON cannot be read), `413 bad_request` (body above 256 kB), `404 not_found` (unknown path), `429 too_many_attempts` (sign-in and activation only), `500 internal_error`.
- **Ids** are UUIDs (text). A malformed id in a path gives 404. **Dates** are ISO 8601 text in UTC.
- **Paging**: lists accept `limit` (1 to 200, default 50) and `offset` (default 0) and answer with `total`.
- **Letter case**: usernames, emails, class names and subject names are compared ignoring letter case.
- **Language of text in requests**: names are free text; the server tidies spaces (`"  Ana   Ivić "` becomes `"Ana Ivić"`).
- **Terminology**: a **class** here is an *odeljenje* such as `5-2`; it belongs to one school year. Serbian screens say "odeljenje".
- Fictional data only in development.

## Common types

**AuthUser** (the signed-in user)

| Field      | Type           | Notes                                                |
| ---------- | -------------- | ---------------------------------------------------- |
| `id`       | uuid           |                                                      |
| `username` | string         | `ime_prezime`, lowercase letters, digits, underscore |
| `fullName` | string         |                                                      |
| `email`    | string or null | null until the account is activated                  |
| `role`     | string         | `admin`, `teacher`, `student` or `parent`            |
| `schoolId` | uuid           |                                                      |

**ManagedUser** (what an admin sees about a user; never contains a password)

| Field           | Type           | Notes                                                     |
| --------------- | -------------- | --------------------------------------------------------- |
| `id`            | uuid           |                                                           |
| `username`      | string         |                                                           |
| `fullName`      | string         | "Deleted user" for an erased account                      |
| `email`         | string or null |                                                           |
| `role`          | string         |                                                           |
| `activated`     | boolean        | true once the person chose a password                     |
| `deactivatedAt` | date or null   | set when the person left the school; they cannot sign in  |
| `createdAt`     | date           |                                                           |

**Class** (an odeljenje): `{ id, name, schoolYear, subjectCount, createdAt }`. `schoolYear` is the year the school year starts in (`2026` means 2026/27).

**Subject**: `{ id, name, classId, className, schoolYear, teacher: { id, fullName, deactivated, deleted }, createdAt }`. `teacher.deactivated` is true when the teacher left (the subject needs a new one); `teacher.deleted` is true when the teacher's data was erased (`fullName` is then a placeholder).

**Enrollment** (a request to join a subject)

| Field             | Type           | Notes                                                                           |
| ----------------- | -------------- | ------------------------------------------------------------------------------- |
| `id`              | uuid           |                                                                                 |
| `status`          | string         | `awaiting_parent`, `awaiting_teacher`, `approved` or `rejected`                 |
| `student`         | object         | `{ id, fullName }`                                                              |
| `subject`         | object         | `{ id, name, className, schoolYear, teacher: { id, fullName, deleted } }`       |
| `requestedBy`     | string         | `student` or `parent`                                                           |
| `parentDecidedAt` | date or null   | set when a parent confirmed or rejected (also for a request a parent sent)      |
| `teacherDecidedAt`| date or null   | set when the teacher approved or rejected                                       |
| `createdAt`       | date           |                                                                                 |

The status follows the people involved: the student asks (`awaiting_parent`), a parent confirms (`awaiting_teacher`), the teacher approves (`approved`). A parent or the teacher can reject at their step (`rejected`). A request a parent sends starts at `awaiting_teacher`. After a rejection a new request for the same subject is allowed; otherwise only one request per student and subject exists.

## Health

### GET /health

- **Status**: implemented
- **Purpose**: tells whether the server runs and can reach the database.
- **Who may call it**: anyone, no sign-in.
- **Request**: none.
- **Success response**: `200 { "status": "ok" }`.
- **Errors**: `503 { "status": "unavailable" }` when the database cannot be reached (no details are given).
- **Notes**: for monitoring and for checking the connection during setup.
- **Used by (frontend)**: none.

## Auth

### POST /auth/login

- **Status**: implemented
- **Purpose**: sign in with an email or a username and a password.
- **Who may call it**: anyone, no sign-in.
- **Request**: body `{ identifier: string, password: string }`. `identifier` is an email (it contains `@`) or a username, any letter case, up to 254 characters.
- **Success response**: `200 { user: AuthUser }` and the `session` cookie.
- **Errors**: `400 invalid_request` (missing or not text), `401 invalid_credentials` (wrong password, unknown account, account not activated yet or deactivated: all the same answer on purpose), `429 too_many_attempts` (more than 10 failed attempts in 15 minutes for the same account from the same address, or 100 from one address).
- **Notes**: successful sign-ins do not count towards the limit. The counters live in the server's memory, so a restart resets them.
- **Used by (frontend)**: sign-in page. One field "email or username"; there is no separate student card tab.

### GET /auth/me

- **Status**: implemented
- **Purpose**: who is signed in, for restoring the user after a page reload.
- **Who may call it**: any signed-in user.
- **Request**: none.
- **Success response**: `200 { user: AuthUser }`.
- **Errors**: `401 unauthenticated`.
- **Used by (frontend)**: app start (session state, role guard).

### POST /auth/logout

- **Status**: implemented
- **Purpose**: ends the session and clears the cookie.
- **Who may call it**: anyone (it works without a session too).
- **Request**: none.
- **Success response**: `204`, no body.
- **Errors**: none specific.
- **Used by (frontend)**: "Odjavi se".

### POST /auth/activate

- **Status**: implemented
- **Purpose**: a person opens the activation link they received, chooses a password and adds an email, and is signed in.
- **Who may call it**: anyone with a valid link, no sign-in.
- **Request**: body `{ token: string, password: string, email: string }`. `token` comes from the link `PUBLIC_URL/activate?token=...`. The password has 7 to 128 characters (the same letter typed in two ways, such as "č", counts the same). The email is trimmed and must look like an address.
- **Success response**: `200 { user: AuthUser }` and the `session` cookie.
- **Errors**: `400 invalid_request`, `400 invalid_email`, `400 password_too_short`, `400 password_too_long`, `400 invalid_activation_link` (used, cancelled, expired or unknown: always the same answer), `409 email_taken` (another account has this email; the link stays valid), `429 too_many_attempts` (30 failed attempts per address in 15 minutes).
- **Notes**: a link works once and for 7 days. Using it for an account that already has a password replaces the password and ends the person's other sessions (this is how a forgotten password is handled). The answer is not cached.
- **Used by (frontend)**: `/activate` page. It reads `?token=` (not `?code=`) and asks for password, confirmation and email.

## Users (admin)

All endpoints in this group are for `admin` only and work on the admin's school.

### GET /users

- **Status**: implemented
- **Purpose**: the users of the school.
- **Request**: query `role` (`admin`, `teacher`, `student`, `parent`), `status` (`active` by default, `deactivated` or `all`), `search` (part of the name or username, up to 100 characters), `limit`, `offset`.
- **Success response**: `200 { users: ManagedUser[], total }`, sorted by name. Users whose data was erased are never listed.
- **Errors**: `400 invalid_request`.
- **Used by (frontend)**: admin screen "Korisnici"; also the pickers for a teacher, a parent or a student on other admin screens.

### POST /users

- **Status**: implemented
- **Purpose**: create an account that the person activates later.
- **Request**: body `{ fullName: string, role: "teacher" | "student" | "parent" }`. `fullName` has 2 to 100 characters.
- **Success response**: `201 { user: ManagedUser }`. The username is generated from the name: first and last word without accents (`Đorđe Đurđević` gives `djordje_djurdjevic`; Cyrillic is converted), with a number added when taken (`ana_ivic2`).
- **Errors**: `400 invalid_full_name` (also when the name gives fewer than two letters or digits), `400 invalid_role`, `409 username_conflict` (very rare; try again).
- **Notes**: another admin cannot be created here (`npm run create-admin` does that). The account cannot sign in until it is activated.
- **Used by (frontend)**: admin screen "Novi nalog"; the generated username is shown from the answer.

### PATCH /users/{id}

- **Status**: implemented
- **Purpose**: fix a name. The username does not change.
- **Request**: body `{ fullName: string }`.
- **Success response**: `200 { user: ManagedUser }`.
- **Errors**: `400 invalid_full_name`, `404 not_found` (unknown, another school, or erased).
- **Used by (frontend)**: admin screen "Korisnici".

### POST /users/{id}/activation

- **Status**: implemented
- **Purpose**: gives the admin the one-time link (and so the QR code) for a user to choose a password. Issuing a new one cancels the previous one, so it is also the answer to a forgotten password.
- **Request**: none.
- **Success response**: `201 { activation: { url: string, expiresAt: date } }`. The link is valid for 7 days.
- **Errors**: `404 not_found`, `409 user_deactivated` (reactivate the user first).
- **Notes**: the link is shown only in this answer (the server keeps just a hash). The answer is not cached. The QR image is drawn by the frontend in the browser from `url`; the link must never be sent to an outside QR service. The system sends nothing by itself; the admin hands the link over.
- **Used by (frontend)**: admin screens "Novi nalog" and "Novi link".

### POST /users/deactivate

- **Status**: implemented
- **Purpose**: users who leave the school (for example students who finished it) can no longer sign in, and their sessions end. All data stays and it can be undone.
- **Request**: body `{ ids: uuid[] }`, 1 to 200 ids.
- **Success response**: `200 { affectedIds: uuid[], skippedIds: uuid[] }`. Skipped are ids of another school, unknown ids and users already deactivated.
- **Errors**: `400 invalid_request`, `400 cannot_change_self` (the list contains the admin's own id; nobody is changed).
- **Used by (frontend)**: admin screen "Korisnici", selecting a whole class at the end of the school year.

### POST /users/reactivate

- **Status**: implemented
- **Purpose**: undoes a deactivation.
- **Request / Success response / Errors**: same as `POST /users/deactivate`. Erased users are skipped.
- **Used by (frontend)**: admin screen "Korisnici".

### POST /users/delete

- **Status**: implemented
- **Purpose**: erases a person's data for good (for an account created by mistake). Only deactivated users are deleted.
- **Request / Success response / Errors**: same as `POST /users/deactivate`. Users that are not deactivated are skipped.
- **Notes**: name, username, email and password are erased and the user becomes an anonymous "Deleted user", so records that point at it (for example an enrollment a parent confirmed, or a subject's teacher) stay valid. The username and email become free again. Sessions, activation links, the student's own requests and the family links are removed (a link that a remaining enrollment depends on stays, holding only ids). It cannot be undone.
- **Used by (frontend)**: admin screen "Korisnici", a separate dangerous action with a confirmation.

## Classes (admin)

All endpoints in this group are for `admin` only and work on the admin's school.

### GET /classes

- **Status**: implemented
- **Purpose**: the classes (odeljenja) of the school.
- **Request**: query `schoolYear` (2000 to 2100) to see one school year.
- **Success response**: `200 { classes: Class[] }`, newest school year first, then by name.
- **Errors**: `400 invalid_request`.
- **Used by (frontend)**: admin screen "Odeljenja".

### POST /classes

- **Status**: implemented
- **Purpose**: create a class for a school year.
- **Request**: body `{ name: string, schoolYear: integer }`. `name` has 1 to 50 characters; `schoolYear` is 2000 to 2100.
- **Success response**: `201 { class: Class }`.
- **Errors**: `400 invalid_class_name`, `400 invalid_school_year`, `409 class_exists` (same name in the same school year).
- **Used by (frontend)**: admin screen "Odeljenja".

### PATCH /classes/{id}

- **Status**: implemented
- **Purpose**: rename a class. The school year cannot change.
- **Request**: body `{ name: string }`.
- **Success response**: `200 { class: Class }`.
- **Errors**: `400 invalid_class_name`, `404 not_found`, `409 class_exists`.

### DELETE /classes/{id}

- **Status**: implemented
- **Purpose**: delete a class that has no subjects.
- **Success response**: `204`.
- **Errors**: `404 not_found`, `409 class_not_empty`.

## Subjects (admin)

A subject is a name in one class taught by one teacher. The same name can appear several times, with different teachers or in different classes. All endpoints in this group are for `admin` only and work on the admin's school.

### GET /subjects

- **Status**: implemented
- **Purpose**: the subjects of the school.
- **Request**: query `classId`, `teacherId`, `schoolYear`, `limit`, `offset`.
- **Success response**: `200 { subjects: Subject[], total }`, newest school year first, then by class, subject and teacher.
- **Errors**: `400 invalid_request`.
- **Used by (frontend)**: admin screen "Predmeti".

### POST /subjects

- **Status**: implemented
- **Purpose**: create a subject.
- **Request**: body `{ name: string, classId: uuid, teacherId: uuid }`. `name` has 1 to 100 characters. The teacher must be an active teacher of the school.
- **Success response**: `201 { subject: Subject }`.
- **Errors**: `400 invalid_subject_name`, `400 invalid_class`, `400 invalid_teacher`, `409 subject_exists` (this teacher already teaches this name in this class).
- **Used by (frontend)**: admin screen "Predmeti".

### PATCH /subjects/{id}

- **Status**: implemented
- **Purpose**: change the name, the teacher, or both. The class cannot change.
- **Request**: body `{ name?: string, teacherId?: uuid }`, at least one.
- **Success response**: `200 { subject: Subject }`.
- **Errors**: `400 invalid_request` (neither sent), `400 invalid_subject_name`, `400 invalid_teacher`, `404 not_found`, `409 subject_exists`.
- **Notes**: requests that are still waiting for the teacher go to the new teacher; decisions already made stay as they were. A subject whose teacher left can still be renamed.

### DELETE /subjects/{id}

- **Status**: implemented
- **Purpose**: delete a subject nobody has asked to join and that has no lessons.
- **Success response**: `204`.
- **Errors**: `404 not_found`, `409 subject_has_enrollments`, `409 subject_has_lessons`.

## Parent-child links (admin)

A parent can have several children and a child several parents (a guardian is a normal parent account). Only an admin makes links, so a parent can never claim somebody else's child. There is no endpoint to remove a link by agreement; links go away only when a person's data is erased. All endpoints in this group are for `admin` only.

### GET /parent-students

- **Status**: implemented
- **Purpose**: the links of the school, or the parents of one child, or the children of one parent.
- **Request**: query `studentId`, `parentId`, `limit`, `offset`.
- **Success response**: `200 { links, total }`. A link is `{ parent, student, createdAt }` and each person is `{ id, fullName, username, deactivated, deleted }`. Sorted by the child's name, then the parent's.
- **Errors**: `400 invalid_request`.
- **Used by (frontend)**: admin screen "Porodice".

### POST /parent-students

- **Status**: implemented
- **Purpose**: link an active parent to an active student of the school.
- **Request**: body `{ parentId: uuid, studentId: uuid }`.
- **Success response**: `201 { link }`.
- **Errors**: `400 invalid_parent`, `400 invalid_student` (wrong role, another school, left the school, erased or unknown), `409 link_exists`.
- **Used by (frontend)**: admin screen "Porodice".

## Subject catalog (student and parent)

Where a student or a parent looks for subjects to join. Only the subjects of their own school are offered.

### GET /catalog/classes

- **Status**: implemented
- **Purpose**: the classes to choose from in the filter.
- **Who may call it**: `student`, `parent`.
- **Request**: query `schoolYear` (default: the current school year, which starts on 1 September).
- **Success response**: `200 { classes: [{ id, name, schoolYear, subjectCount }], schoolYear }`. Only classes with at least one subject that has an active teacher; `subjectCount` counts those subjects.
- **Errors**: `400 invalid_request`.
- **Used by (frontend)**: the "Odeljenje" filter on the student screen. Students are not tied to a class, so nothing is pre-selected.

### GET /catalog/subjects

- **Status**: implemented
- **Purpose**: search the subjects a child can ask to join.
- **Who may call it**: `student` (for themselves), `parent` (for one of their own children).
- **Request**: query `studentId` (a parent must name a child), `classId`, `search` (part of the subject, class or teacher name, up to 100 characters), `schoolYear` (default: current), `limit`, `offset`.
- **Success response**: `200 { subjects, total, schoolYear }`. A subject is `{ id, name, className, schoolYear, teacher: { id, fullName }, request: { id, status } | null }`, where `request` is the child's newest request for it (a live one is preferred over a rejected one). Subjects whose teacher left are not offered.
- **Errors**: `400 invalid_student` (a parent did not name a child), `400 invalid_request`, `403 forbidden` (the child is not the caller's own).
- **Used by (frontend)**: student screen "Prijava na predmet", and a parent acting for a child.

## Enrollment requests

### POST /enrollments

- **Status**: implemented
- **Purpose**: ask to join a subject.
- **Who may call it**: `student` (for themselves) or `parent` (for one of their own children).
- **Request**: body `{ subjectId: uuid, studentId?: uuid }`. A student sends only `subjectId`; a parent also sends `studentId`.
- **Success response**: `201 { enrollment: Enrollment }`. A student's request starts as `awaiting_parent`. A parent's request starts as `awaiting_teacher`, because it counts as the parent's confirmation.
- **Errors**: `400 invalid_subject` (another school, unknown, or its teacher left), `400 invalid_student`, `403 forbidden` (a student names somebody else, or a parent names a child that is not theirs), `409 no_parent` (the student has no active parent or guardian linked; the school admin must link one), `409 request_exists` (a request that is not rejected already exists).
- **Used by (frontend)**: button "Prijavi se" on a subject.

### GET /enrollments

- **Status**: implemented
- **Purpose**: the requests the caller may see.
- **Who may call it**: `student`, `parent`, `teacher`.
- **Request**: query `status`, `subjectId`, `studentId` (parents only: one child), `limit`, `offset`.
- **Success response**: `200 { enrollments: Enrollment[], total }`, newest first. A student sees their own requests, a parent the requests of their children, and a teacher the requests for the subjects they teach **after the parent has passed them on** (never one still waiting for the parent or rejected by the parent).
- **Errors**: `400 invalid_request`, `403 forbidden` (a parent names a child that is not theirs; also admins).
- **Used by (frontend)**: student "Moji zahtjevi", parent inbox (`status=awaiting_parent`), teacher inbox (`status=awaiting_teacher`).

### POST /enrollments/{id}/approve

- **Status**: implemented
- **Purpose**: a parent confirms a request, or the teacher of the subject approves it.
- **Who may call it**: `parent` (a request that waits for a parent, for their own child) or `teacher` (a request the parent passed on, for a subject they teach).
- **Request**: none.
- **Success response**: `200 { enrollment: Enrollment }`: `awaiting_teacher` after a parent, `approved` after the teacher.
- **Errors**: `404 not_found` (unknown, or a request the caller may not see: another family's, another teacher's, another school's, or one that still waits for the parent when the caller is the teacher), `409 wrong_state` (the request is not waiting for the caller any more, for example the other parent already answered).
- **Notes**: only the first answer counts. If the admin gives the subject a new teacher, the new teacher answers pending requests.
- **Used by (frontend)**: parent "Potvrdi", teacher "Odobri"; handle `409 wrong_state` by refreshing the list.

### POST /enrollments/{id}/reject

- **Status**: implemented
- **Purpose**: a parent or the teacher of the subject rejects a request.
- **Request / Success response / Errors**: same as `POST /enrollments/{id}/approve`; the new status is `rejected`.
- **Notes**: after a rejection the student may send a new request for the same subject.
- **Used by (frontend)**: parent "Odbij", teacher "Odbij".

## Lessons

A lesson belongs to a subject and holds the text of the teacher, as written. See `docs/LESSONS.md` for the whole idea. At this stage a lesson is made from **pasted text**; files, the AI summary and the quiz come in later steps and will add fields (the summary and the quiz will appear in the lesson, approved ones only for students).

**LessonListItem**: `{ id, title, status, subject: { id, name, className, schoolYear }, publishedAt, createdAt, updatedAt }`. `status` is `draft`, `processing`, `in_review` or `published`.

**Lesson** (the whole lesson): a LessonListItem plus `body` (the text, line breaks kept), `source` (`pasted`, later `docx` or `pdf`), `bodyRevision` (goes up by one whenever the text really changes) and `subject.teacher: { id, fullName }`.

**Who sees what**: the teacher of a subject sees all its lessons in every state. A student sees the **published** lessons of the subjects they joined (an approved enrollment). A parent sees the published lessons of the subjects any of their children joined. The school admin sees no lessons. Anything a person may not see looks like it does not exist (404). If the admin gives the subject a new teacher, the lessons go to the new teacher.

### GET /lessons

- **Status**: implemented
- **Purpose**: the lessons the caller may see.
- **Who may call it**: `teacher`, `student`, `parent`.
- **Request**: query `subjectId`, `status` (`draft`, `processing`, `in_review`, `published`), `studentId` (a parent narrows to one of their own children; 403 otherwise), `limit`, `offset`.
- **Success response**: `200 { lessons: LessonListItem[], total }`, the newest published or changed first. The text is not included.
- **Errors**: `400 invalid_request`, `403 forbidden`.
- **Used by (frontend)**: teacher "Moje lekcije", student and parent lesson lists.

### POST /lessons

- **Status**: implemented
- **Purpose**: a teacher starts a lesson for a subject they teach, from pasted text.
- **Who may call it**: `teacher`.
- **Request**: body `{ subjectId: uuid, title: string, body?: string }`. `title` has 1 to 200 characters. `body` is at most 40,000 characters (about 15 pages) and may be left out and added later; line breaks are kept and `\r\n` becomes `\n`.
- **Success response**: `201 { lesson: Lesson }`, a `draft`.
- **Errors**: `400 invalid_subject` (not one of the caller's subjects, another school, unknown), `400 invalid_title`, `400 invalid_body`.
- **Used by (frontend)**: teacher "Nova lekcija".

### GET /lessons/{id}

- **Status**: implemented
- **Purpose**: one whole lesson, for editing or for reading.
- **Who may call it**: `teacher`, `student`, `parent`, as described above.
- **Success response**: `200 { lesson: Lesson }`.
- **Errors**: `404 not_found` (unknown, or the caller may not see it).
- **Used by (frontend)**: teacher editor, student reading view (the text is shaped by the display buttons, the Latin/Cyrillic switch and read-aloud in the browser).

### PATCH /lessons/{id}

- **Status**: implemented
- **Purpose**: change the title, the text, or both.
- **Who may call it**: `teacher` of the subject.
- **Request**: body `{ title?: string, body?: string }`, at least one, same rules as when creating.
- **Success response**: `200 { lesson: Lesson }`.
- **Errors**: `400 invalid_request` (neither sent), `400 invalid_title`, `400 invalid_body`, `404 not_found`, `409 lesson_published` (take it back first), `409 lesson_busy` (the AI is working on it).
- **Notes**: `bodyRevision` goes up only if the text is really different. A summary or a quiz made from an older revision becomes outdated and must be made or approved again before publishing.

### DELETE /lessons/{id}

- **Status**: implemented
- **Purpose**: delete a lesson, with everything that belongs to it.
- **Who may call it**: `teacher` of the subject.
- **Success response**: `204`.
- **Errors**: `404 not_found`, `409 lesson_published`, `409 lesson_busy`.

### POST /lessons/{id}/publish

- **Status**: implemented
- **Purpose**: make the lesson visible to the students who joined the subject.
- **Who may call it**: `teacher` of the subject.
- **Request**: none.
- **Success response**: `200 { lesson: Lesson }` with `status: "published"` and `publishedAt`.
- **Errors**: `404 not_found`, `409 lesson_has_no_text` (empty or only blank lines), `409 lesson_busy`, `409 wrong_state` (already published), `409 needs_approval` (a summary or a quiz exists and a teacher has not approved it), `409 content_outdated` (the text changed after the summary or the quiz was made).
- **Notes**: nothing the AI made reaches students without the teacher's approval. A lesson with no summary and no quiz can be published as plain text.
- **Used by (frontend)**: teacher button "Objavi".

### POST /lessons/{id}/unpublish

- **Status**: implemented
- **Purpose**: take a published lesson back to a draft, so students no longer see it and the teacher can change it.
- **Who may call it**: `teacher` of the subject.
- **Success response**: `200 { lesson: Lesson }` with `status: "draft"`.
- **Errors**: `404 not_found`, `409 wrong_state` (not published).
- **Used by (frontend)**: teacher button "Vrati u nacrt".

## Not defined yet

File upload, the AI summary and quiz, the quiz for students, comments, stars, progress, removing a student from a subject at the end of the year, copying classes and subjects to a new school year, changing one's own password, the school request form of the landing page.
