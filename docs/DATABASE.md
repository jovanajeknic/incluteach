# Database and Access Model

Summary of the backend database work and the agreements behind it. Working rules for all contributors are in [AGENTS.md](../AGENTS.md); setup and commands are in [server/README.md](../server/README.md). The structure lives in `server/migrations/`; this document explains the decisions, not every column.

## Status

| Part                                                                                      | State       |
| ----------------------------------------------------------------------------------------- | ----------- |
| PostgreSQL connection, migrations, `db:check`                                             | Done        |
| Database: schools, users with one role, classes, subjects, parent links, enrollments, sign-in tables | Done |
| Sign-in: login, logout, activation links, passwords, sessions, role checks, first admin script | Done   |
| Admin API: users (create, list, rename, deactivate, delete), classes, subjects, parent links | Done     |
| Enrollment API: subject catalog, requests, parent and teacher decisions                   | Done        |
| Lessons and AI adaptation (upload, versions, quiz, audio), reading and progress           | Not started |
| Not built yet, smaller: removing students from subjects at the end of a school year, copying classes and subjects to a new school year, changing one's own password, verifying emails and sending messages, the school request form of the landing page, production setup | Open |

The backend covers accounts, sign-in, the school structure and enrollments, all with tests. The frontend still uses demo data and is connected to this API step by step (see `docs/FRONTEND-PLAN.md`, "Backend API and frontend work").

## Agreements

1. **One role per user**: `admin`, `teacher`, `student` or `parent`. A guardian is a normal `parent` account linked to the student.
2. **Every user belongs to exactly one school.** There are several admins, each one for their own school. Data of one school is never visible to another.
3. **The admin creates everything**: teacher, student and parent accounts, the links between parents and children, and the subjects with their teachers. Nobody else can create these. A parent-child link is never deleted on its own; it disappears only when a person's data is erased for good (see agreement 11).
4. **A student is not tied to a class.** A student is connected to the school only through approved enrollments in subjects.
5. **A subject is "name + class + teacher"**, assigned by the admin. The same name (for example Matematika) can have several rows, with different teachers in one class or in different classes. A student who searches for a subject sees, for example, "Matematika, teacher X". Only subjects of the student's own school are shown.
6. **Classes and subjects belong to one school year**, so the admin sets them up again for each new school year, before 1 September (a copy from the previous year is a possible later helper). Students do not belong to a class: they pick an odeljenje in the filter and see its subjects. The name of a class is free text ("5-2"); the system does not know the grade number, so a new school year is set up by creating the classes again (a grade and section as separate fields would be needed to move 5-2 to 6-2 automatically).
   **A class (srp. odeljenje, such as 5-2: grade 5, section 2) has a school year**, stored as the starting year (`2026` means 2026/27). Class names are unique within a school year, ignoring letter case. A class is deleted only while it has no subjects; a subject only while nobody has asked to join it. When a teacher leaves, their subjects stay and are marked (`teacher.deactivated`) until the admin gives them a new teacher.
7. **Enrollment flow**: the student asks, one linked parent confirms, then the teacher of that subject approves or rejects. A parent can ask for their child, which counts as the confirmation. After a rejection a new request is allowed. A student without a parent in the system is not allowed to skip the parent step; the admin links a guardian first.
8. **Accounts are activated with a QR code**: the admin generates it and sends it by their own means, nothing is sent automatically. The QR is single-use and valid for 7 days; a new QR cancels the previous one. After scanning, the user sets a password (at least 7 characters) and adds an email, which is also used for future notifications about subjects. A lost password is handled the same way: the admin issues a new QR.
9. **Usernames are created by the admin** as `ime_prezime` (lowercase letters, digits and underscore, 3 to 40 characters). When a name is taken, a number is added at the end. A username is unique across all schools and is how a user signs in; the email is added at activation.
10. **Sessions** are kept in the database and tied to a cookie; only hashes of tokens (sessions and QR codes) are stored.
11. **Deactivating and deleting accounts** (admin only, one or many at a time, never one's own account). *Deactivate* is for people who leave the school, such as students who finished it: they can no longer sign in and their sessions end, but all data stays and the account can be reactivated. *Delete* is for accounts created by mistake and erases the personal data for good; it works only on deactivated accounts. The row stays as an anonymous shell ("Deleted user", no email, no password, no sign-in), because other records may point at it, such as a parent's confirmation of an enrollment or the teacher of a subject. The username and email become free again. Sessions, activation links, a student's own enrollment requests and family links are removed (a link that a remaining enrollment depends on stays, holding only ids).

## Tables

| Table              | Purpose                                                                 |
| ------------------ | ----------------------------------------------------------------------- |
| `schools`          | A school                                                                |
| `users`            | All accounts: `username`, `role`, `school_id`; `email` and `password_hash` stay empty until activation, and an account with a password always has an email; `deactivated_at` and `deleted_at` mark deactivated and erased accounts |
| `activation_tokens` | One-time QR/link for a user, issued by an admin of the same school; has an expiry, and is used or revoked |
| `sessions`         | Signed-in sessions (hash of the cookie value, expiry)                   |
| `classes`          | A class of a school in one school year (unique name per school year, any letter case) |
| `subjects`         | A subject in a class, taught by one teacher                             |
| `parent_students`  | Parent-child link (many to many), created by an admin of the same school |
| `enrollments`      | A student's request to join a subject, with parent and teacher decisions |

## Who enforces what

The database refuses invalid data on its own. The API must still check **who is allowed to do an action**.

| Enforced by the database                                                       | Must be enforced by the API (not built yet)                          |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| A subject's teacher has the `teacher` role and is in the subject's school      | Only an admin of the school creates users, subjects and parent links |
| A parent link joins a `parent` and a `student` of the same school, made by an `admin` of that school | Search shows only subjects of the student's school       |
| Only a parent linked to the student can confirm or send a request for them     | Only the teacher of the subject decides that subject's requests (compare with `subjects.teacher_id`) |
| A student can only ask for themselves                                          | A parent sees only their own linked children                         |
| Status matches the decisions made (no "approved" without parent and teacher)   | A teacher sees only students enrolled in their subjects              |
| One live request per student and subject                                       | AI content is reviewed by a teacher before students see it           |

`enrollments` does not point to the subject's current teacher on purpose, so replacing a teacher later does not rewrite history.

## Next: sign-in

Steps, each with tests:

1. Sign-in tables (done).
2. Express app skeleton and `/health` (done).
3. Password hashing (done): Node's built-in `crypto.scrypt`, minimum 7 and maximum 128 characters, letters typed in different ways (such as "č") count as the same password.
4. Login, logout, "who am I" and the `requireRole` middleware, with a login attempt limit (done): see "Sign-in API" below.
5. Activation (done): an admin issues a link for a user of their school; opening it sets the password and email. The QR image is drawn by the frontend from that link.
6. An admin creates accounts and the username is generated (done): see `POST /users` below.
7. A script for the first admin of a school (done): `npm run create-admin`, see "First admin of a school" below.

## Sign-in API

The exact requests, answers and errors of every endpoint are in [API-CONTRACT.md](API-CONTRACT.md); the tables below are a summary with the reasons.

| Endpoint            | What it does                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| `POST /auth/login`  | Body `{ identifier, password }`. The identifier is an email or a username (told apart by `@`), in any letter case. Returns `{ user }` and sets the `session` cookie |
| `POST /auth/logout` | Ends the session and clears the cookie; always answers 204                                       |
| `GET /auth/me`      | Returns `{ user }` for the signed-in user, or 401                                                |
| `GET /users` | Admin only. Query: `role`, `status` (`active` by default, `deactivated` or `all`), `search` (part of the name or username, any letter case), `limit` (1 to 200, default 50) and `offset`. Answers `{ users, total }`; a user is `{ id, username, fullName, email, role, activated, deactivatedAt, createdAt }`. Only the admin's school; erased users are never listed |
| `PATCH /users/:id` | Admin only. Body `{ fullName }`. Fixes the name; the username stays. Answers `{ user }`. 404 for another school's user |
| `POST /users/deactivate` | Admin only. Body `{ ids }` (1 to 200 ids). Answers `{ affectedIds, skippedIds }`: skipped are ids of another school, unknown ids and users already in that state. Cannot include the admin's own id (400 `cannot_change_self`) |
| `POST /users/reactivate` | Same shape. Lets deactivated users sign in again (not erased ones) |
| `POST /users/delete` | Same shape. Erases personal data for good; only for deactivated users |
| `POST /users` | Admin only. Body `{ fullName, role }` with `role` one of `teacher`, `student`, `parent`. Creates the account in the admin's school and returns `{ user }` (status 201, same shape as in the list) with the generated username (`ime_prezime`, a number is added when it is taken). The account cannot sign in until it is activated. Errors: `invalid_full_name`, `invalid_role` |
| `GET /catalog/classes` | Student or parent. Optional `schoolYear` (default: the current one). Answers `{ classes, schoolYear }`: the classes of the user's school and that school year that have at least one subject with an active teacher, each `{ id, name, schoolYear, subjectCount }`. Used for the class filter of `GET /catalog/subjects` |
| `GET /catalog/subjects` | Student or parent. Query: `studentId` (a parent names one of their own children; 403 for another child), `classId` (only the subjects of that class), `search` (part of the subject, class or teacher name), `schoolYear` (default: the current one, the year starting on 1 September), `limit`, `offset`. Answers `{ subjects, total, schoolYear }`: the subjects of the user's own school whose teacher is still active, each `{ id, name, className, schoolYear, teacher: { id, fullName }, request: { id, status } or null }` where `request` is the child's newest request for it |
| `POST /enrollments` | Student (body `{ subjectId }`) or parent (body `{ subjectId, studentId }` for their own child). A student's request starts as `awaiting_parent`; a parent's goes straight to `awaiting_teacher`, because it counts as the parent's confirmation. Errors: `invalid_subject`, `invalid_student`, `no_parent` (409: the student has no active parent or guardian linked), `request_exists` (409: a request that is not rejected already exists). Answers 201 `{ enrollment }` |
| `GET /enrollments` | Student, parent or teacher. Query: `status`, `subjectId`, `studentId` (parents only), `limit`, `offset`. A student sees their own requests, a parent their children's, a teacher the requests for subjects they teach **once the parent has passed them on** (never those still waiting for the parent or rejected by the parent). Newest first. Answers `{ enrollments, total }`; an enrollment is `{ id, status, student, subject, requestedBy, parentDecidedAt, teacherDecidedAt, createdAt }` |
| `POST /enrollments/:id/approve` and `POST /enrollments/:id/reject` | Parent or teacher. A **parent** answers a request that waits for a parent (`awaiting_parent`), for one of their own linked children: approving passes it to the teacher (`awaiting_teacher`), rejecting ends it (`rejected`). Either parent of the child can answer; the first answer counts. The **teacher of the subject** answers a request the parent has passed on: approving enrols the student (`approved`), rejecting ends it. Answers `{ enrollment }`. 409 `wrong_state` when the request is not waiting for that person any more; 404 for a request the person may not see (another family's, another teacher's, or one that still waits for the parent). If the admin gives the subject a new teacher, the new teacher answers the pending requests |
| `GET /parent-students` | Admin only. Query: `studentId` (the parents of one child), `parentId` (the children of one parent), `limit`, `offset`. Answers `{ links, total }`; a link is `{ parent, student, createdAt }` where each person is `{ id, fullName, username, deactivated, deleted }`. Sorted by the child's name, then the parent's |
| `POST /parent-students` | Admin only. Body `{ parentId, studentId }`: links an active parent to an active student of the school (400 `invalid_parent` / `invalid_student` otherwise; 409 `link_exists` if already linked). A parent can have several children and a child several parents (also a guardian: a normal parent account). There is no endpoint to remove a link by agreement |
| `GET /classes` | Admin only. Optional `schoolYear` (the year it starts in). Answers `{ classes }`, newest school year first, each `{ id, name, schoolYear, subjectCount, createdAt }` |
| `POST /classes` | Admin only. Body `{ name, schoolYear }` (name 1 to 50 characters, year 2000 to 2100). The same name cannot repeat in one school year, whatever the letter case (409 `class_exists`). Errors: `invalid_class_name`, `invalid_school_year` |
| `PATCH /classes/:id` | Admin only. Body `{ name }`; the school year cannot change |
| `DELETE /classes/:id` | Admin only. 204. Only a class without subjects (409 `class_not_empty`) |
| `GET /subjects` | Admin only. Query: `classId`, `teacherId`, `schoolYear`, `limit`, `offset`. Answers `{ subjects, total }`; a subject is `{ id, name, classId, className, schoolYear, teacher: { id, fullName, deactivated, deleted }, createdAt }` |
| `POST /subjects` | Admin only. Body `{ name, classId, teacherId }`. The teacher must be an active teacher of the school (400 `invalid_teacher`), the class one of the school (400 `invalid_class`). The same teacher cannot teach the same name twice in one class (409 `subject_exists`); different teachers can |
| `PATCH /subjects/:id` | Admin only. Body `{ name }`, `{ teacherId }` or both; the class cannot change |
| `DELETE /subjects/:id` | Admin only. 204. Only a subject without enrollment requests (409 `subject_has_enrollments`) |
| `POST /users/:id/activation` | Admin only, for a user of the admin's school (otherwise 404; 409 `user_deactivated` for a deactivated user). Returns `{ activation: { url, expiresAt } }` with a one-time link valid for 7 days; a new link cancels the previous one, so it also serves as "forgot my password" |
| `POST /auth/activate` | Public. Body `{ token, password, email }`. Sets the password and email, uses up the link, ends the user's older sessions and signs the user in. Errors: `invalid_activation_link`, `invalid_email`, `password_too_short`, `password_too_long`, `email_taken` (409) |

- The cookie is `httpOnly`, `SameSite=Lax`, `Secure` in production, and lasts 7 days. Only a hash of its value is stored.
- A wrong password, an unknown account and an account that is not activated yet all give the same 401 `invalid_credentials`, and take about the same time.
- At most 10 failed attempts per account and address in 15 minutes (then 429 `too_many_attempts`), and at most 100 per address. Counters live in the server's memory, so a restart resets them.
- On the backend, `requireAuth` answers 401 without a session and `requireRole('admin', ...)` also answers 403 for another role. The signed-in user is available as `req.user`.
- Every error has the shape `{ "error": { "code", "message" } }`. Messages are for developers; the frontend shows its own Serbian text based on `code`.

Usernames are made from the name: the first and the last word, in lowercase letters without accents (`Đorđe Đurđević` gives `djordje_djurdjevic`, Cyrillic is converted too). When the username already exists anywhere, a number is added: `ana_ivic`, `ana_ivic2`, `ana_ivic3`. A name that gives fewer than two letters or digits (for example one written in Chinese) is refused with `invalid_full_name`.

## First admin of a school

Nobody can create the first admin through the app, so a script does it once per school:

```sh
npm run create-admin -- --school "School name" --name "Admin Full Name"
```

It creates the school (or finds it) and the admin, and prints the username and an activation link (valid 7 days). The admin opens the link and chooses a password and email, so no password passes through the terminal. If a school with that name already exists (letter case does not matter), the new admin is added to it instead of a second school being created, so several admins can share one school. Add `--new-school` to create a separate school with the same name anyway, for example for a school with the same name in another town. If several schools already share the name, the script stops and asks for a more precise name.

The link looks like `PUBLIC_URL/activate?token=...` (`PUBLIC_URL` is set in `server/.env`). A link that was used, cancelled or has expired always gives the same `invalid_activation_link` error. The token is shown only once, when the admin asks for it.

The frontend sign-in is still a demo: students currently sign in with "the code from the QR card". It will change to username and password when the frontend is connected to the API.
