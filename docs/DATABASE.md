# Database and Access Model

Summary of the backend database work and the agreements behind it. Working rules for all contributors are in [AGENTS.md](../AGENTS.md); setup and commands are in [server/README.md](../server/README.md). The structure lives in `server/migrations/`; this document explains the decisions, not every column.

## Status

| Part                                                                   | State                                |
| ---------------------------------------------------------------------- | ------------------------------------ |
| PostgreSQL connection, migrations, `db:check`                          | Done                                 |
| Schools, users with one role, classes, subjects, parent links, enrollments | Done (database only, with tests) |
| Express app, API endpoints, `requireRole` middleware                   | Not started                          |
| Sign-in: accounts, activation by QR, passwords, sessions, first admin  | **Next**                             |

Everything built so far is the database. No API or sign-in exists yet.

## Agreements

1. **One role per user**: `admin`, `teacher`, `student` or `parent`. A guardian is a normal `parent` account linked to the student.
2. **Every user belongs to exactly one school.** There are several admins, each one for their own school. Data of one school is never visible to another.
3. **The admin creates everything**: teacher, student and parent accounts, the links between parents and children, and the subjects with their teachers. Nobody else can create these. Parent-child links are never deleted.
4. **A student is not tied to a class.** A student is connected to the school only through approved enrollments in subjects.
5. **A subject is "name + class + teacher"**, assigned by the admin. The same name (for example Matematika) can have several rows, with different teachers in one class or in different classes. A student who searches for a subject sees, for example, "Matematika, teacher X". Only subjects of the student's own school are shown.
6. **A class has a school year**, stored as the starting year (`2026` means 2026/27).
7. **Enrollment flow**: the student asks, one linked parent confirms, then the teacher of that subject approves or rejects. A parent can ask for their child, which counts as the confirmation. After a rejection a new request is allowed. A student without a parent in the system is not allowed to skip the parent step; the admin links a guardian first.
8. **Accounts are activated with a QR code** (planned): the admin generates it and sends it by their own means, nothing is sent automatically. The QR is single-use and expires. After scanning, the user is asked to set a password.

## Tables

| Table              | Purpose                                                                 |
| ------------------ | ----------------------------------------------------------------------- |
| `schools`          | A school                                                                |
| `users`            | All accounts: `role`, `school_id`; `email` and `password_hash` are optional because accounts exist before activation |
| `classes`          | A class of a school in one school year                                  |
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

Open decisions for the sign-in step:

- What a student uses to sign in after activation (students may have no email, so probably a username).
- How sessions work (cookie or token).
- How the first admin of a school is created (a script run once, such as `npm run create-admin`).
- Activation QR details: lifetime, and what happens when it expires.

Express, password hashing and the `requireRole` middleware are added in this step, together with the first endpoints.
