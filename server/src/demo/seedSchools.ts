import { activateAccount, issueActivationToken } from '../auth/activation.ts';
import { hashPassword, type ScryptCost } from '../auth/password.ts';
import type { AuthUser } from '../auth/sessions.ts';
import { validateQuiz, validateSummary } from '../ai/validate.ts';
import { addMessage } from '../conversations/conversations.ts';
import type { Queryable } from '../db/pool.ts';
import { createEnrollment, decideEnrollment } from '../enrollments/enrollments.ts';
import { approveContent, saveQuiz, saveSummary } from '../lessons/editContent.ts';
import { createLesson, publishLesson } from '../lessons/lessons.ts';
import { answerQuestion, startAttempt } from '../quiz/attempts.ts';
import { completeLesson } from '../quiz/complete.ts';
import type { UserRole } from '../roles.ts';
import { createClass } from '../school/classes.ts';
import { createParentLink } from '../school/parentLinks.ts';
import { currentSchoolYear } from '../school/schoolYear.ts';
import { createSubject } from '../school/subjects.ts';
import { giveStar } from '../stars/stars.ts';
import { createUser } from '../users/createUser.ts';
import {
  BIOLOGY_LESSONS,
  HISTORY_LESSONS,
  MATH_LESSONS,
  SERBIAN_LESSONS,
  STAR_MESSAGES,
  TALKS,
  type LessonSpec,
  type QuizQuestionSpec,
} from './seedSchoolsContent.ts';

// Four schools with their admins, and one of them (the first) full of invented life: teachers,
// odeljenja, students with their parents, lessons, requests to join subjects, finished lessons,
// quiz tries, stars and conversations. The activity is heavy on two subjects (Matematika and
// Biologija) so that a presentation has plenty to show. Everything is made with the same
// functions the real application uses. The school names are real, every person is invented.

interface SchoolPlan {
  name: string;
  // The admin gets a name that is easy to type; the others get a name made from the person's.
  adminUsername: string;
  adminName: string;
}

const SCHOOLS: SchoolPlan[] = [
  {
    name: 'OŠ Dragiša Ivanović',
    adminUsername: 'admin_dragisa',
    adminName: 'Administrator Dragiša',
  },
  {
    name: 'OŠ Štampar Makarije',
    adminUsername: 'admin_stampar',
    adminName: 'Administrator Štampar',
  },
  { name: 'OŠ Maksim Gorki', adminUsername: 'admin_gorki', adminName: 'Administrator Gorki' },
  { name: 'OŠ Vladimir Nazor', adminUsername: 'admin_nazor', adminName: 'Administrator Nazor' },
];

const TEACHERS = [
  { key: 'math', subject: 'Matematika', name: 'Mirjana Kovačević' },
  { key: 'biology', subject: 'Biologija', name: 'Zoran Radunović' },
  { key: 'serbian', subject: 'Srpski jezik', name: 'Vesna Burić' },
  { key: 'history', subject: 'Istorija', name: 'Dragan Lakić' },
] as const;

type TeacherKey = (typeof TEACHERS)[number]['key'];

const CLASS_NAMES = ['6-1', '6-2', '7-1'];
const STUDENTS_PER_CLASS = 8;

const GIRLS = [
  'Ana',
  'Milica',
  'Teodora',
  'Sara',
  'Nina',
  'Katarina',
  'Jovana',
  'Ivana',
  'Mina',
  'Lena',
  'Sofija',
  'Maja',
];
const BOYS = [
  'Luka',
  'Nikola',
  'Stefan',
  'Vuk',
  'Petar',
  'Filip',
  'Andrija',
  'Lazar',
  'Đorđe',
  'Ognjen',
  'Danilo',
  'Jovan',
];
const MOTHERS = [
  'Jelena',
  'Marija',
  'Dragana',
  'Višnja',
  'Biljana',
  'Vesna',
  'Ljiljana',
  'Zorica',
  'Snežana',
  'Mirjana',
  'Tamara',
  'Anđela',
];
const FATHERS = [
  'Marko',
  'Milan',
  'Dušan',
  'Mihailo',
  'Aleksa',
  'Nemanja',
  'Boris',
  'Vladimir',
  'Savo',
  'Miloš',
  'Radoje',
  'Zoran',
];
// Surnames that look the same for men and women, so a family shares one.
const SURNAMES = [
  'Vuković',
  'Radović',
  'Perović',
  'Jovanović',
  'Đurović',
  'Knežević',
  'Božović',
  'Rakočević',
  'Vujović',
  'Gazivoda',
  'Nikolić',
  'Stanišić',
  'Mijušković',
  'Pejović',
  'Šćepanović',
  'Raičević',
  'Vučinić',
  'Bulatović',
  'Drašković',
  'Šoškić',
  'Mirković',
  'Tomašević',
  'Ćetković',
  'Martinović',
];

// The second child of a family: student number -> the student whose parents they share.
const SIBLINGS: Record<number, number> = { 18: 2, 21: 9 };

// What the students do in the two main subjects.
const MAIN_SUBJECTS = [
  {
    name: 'Matematika',
    teacher: 'math',
    lessons: MATH_LESSONS,
    stars: STAR_MESSAGES.math,
    about: ['razlomcima', 'decimalnim brojevima', 'obimu i površini', 'procentima'],
  },
  {
    name: 'Biologija',
    teacher: 'biology',
    lessons: BIOLOGY_LESSONS,
    stars: STAR_MESSAGES.biology,
    about: ['ćeliji', 'fotosintezi', 'srcu i krvotoku', 'ishrani'],
  },
] as const;

export interface SeededStudent {
  user: AuthUser;
  parents: AuthUser[];
}

export interface SeededClass {
  name: string;
  students: SeededStudent[];
}

export interface SchoolsSeed {
  password: string;
  schools: { id: string; name: string; admin: AuthUser }[];
  // The school that has people and lessons.
  main: {
    id: string;
    teachers: Record<TeacherKey, AuthUser>;
    classes: SeededClass[];
  };
}

export interface SeedSchoolsOptions {
  // The password of every account. Chosen by the caller, so it is not kept in this file.
  password: string;
  // Only for tests, to keep them fast.
  cost?: ScryptCost;
}

// Deletes every school, person and lesson, in an order the database accepts. The tables stay.
// For a development database only.
export async function wipeAllData(db: Queryable): Promise<void> {
  for (const table of [
    'conversation_messages',
    'stars',
    // Takes the quiz tries, the answers and the finished lessons with it.
    'lessons',
    'enrollments',
    'parent_students',
    'activation_tokens',
    'sessions',
    'subjects',
    'classes',
    'users',
    'schools',
  ]) {
    await db.query(`DELETE FROM ${table}`);
  }
}

const pick = <T>(list: readonly T[], n: number): T =>
  list[((n % list.length) + list.length) % list.length];

// Creates the schools. The caller should run this inside a transaction, on an empty database
// (see wipeAllData).
export async function seedSchools(
  db: Queryable,
  { password, cost }: SeedSchoolsOptions,
): Promise<SchoolsSeed> {
  // One hash for everybody: hashing every password again would take long for no gain.
  const passwordHash = await hashPassword(password, cost);

  // Everybody gets an account and activates it with their own link, like in real life.
  async function addPerson(
    schoolId: string,
    adminId: string | null,
    role: UserRole,
    fullName: string,
    username?: string,
  ): Promise<AuthUser> {
    const created = await createUser(db, { schoolId, role, fullName });
    if (username) {
      await db.query('UPDATE users SET username = $1 WHERE id = $2', [username, created.id]);
    }
    const user = { ...created, username: username ?? created.username };
    const { token } = await issueActivationToken(db, {
      userId: user.id,
      schoolId,
      adminId: adminId ?? user.id,
    });
    const email = `${user.username}@example.com`;
    const activated = await activateAccount(db, { token, passwordHash, email });
    if (!activated) {
      throw new Error(`Could not activate the account ${user.username}.`);
    }
    return { ...user, email };
  }

  const seed: SchoolsSeed = {
    password,
    schools: [],
    main: { id: '', teachers: {} as Record<TeacherKey, AuthUser>, classes: [] },
  };

  for (const [index, plan] of SCHOOLS.entries()) {
    const { rows } = await db.query<{ id: string }>(
      'INSERT INTO schools (name) VALUES ($1) RETURNING id',
      [plan.name],
    );
    const schoolId = rows[0].id;
    const admin = await addPerson(schoolId, null, 'admin', plan.adminName, plan.adminUsername);
    seed.schools.push({ id: schoolId, name: plan.name, admin });
    if (index > 0) {
      continue;
    }

    // --- The school that is full of life -------------------------------------------------
    seed.main.id = schoolId;
    for (const teacher of TEACHERS) {
      seed.main.teachers[teacher.key] = await addPerson(
        schoolId,
        admin.id,
        'teacher',
        teacher.name,
      );
    }

    // Odeljenja, with the four subjects in each.
    const subjectIds = new Map<string, string>();
    const classIds: string[] = [];
    for (const className of CLASS_NAMES) {
      const schoolClass = await createClass(db, {
        schoolId,
        name: className,
        schoolYear: currentSchoolYear(),
      });
      classIds.push(schoolClass.id);
      for (const teacher of TEACHERS) {
        const subject = await createSubject(db, {
          schoolId,
          name: teacher.subject,
          classId: schoolClass.id,
          teacherId: seed.main.teachers[teacher.key].id,
        });
        subjectIds.set(`${className}/${teacher.subject}`, subject.id);
      }
    }

    // Students and their parents.
    const students: SeededStudent[] = [];
    for (let n = 0; n < CLASS_NAMES.length * STUDENTS_PER_CLASS; n += 1) {
      const girl = n % 2 === 0;
      const sibling = SIBLINGS[n] === undefined ? null : students[SIBLINGS[n]];
      const surname = sibling
        ? (sibling.user.fullName.split(' ').pop() as string)
        : pick(SURNAMES, n);
      const firstName = pick(girl ? GIRLS : BOYS, Math.floor(n / 2));
      const user = await addPerson(schoolId, admin.id, 'student', `${firstName} ${surname}`);

      let parents: AuthUser[];
      if (sibling) {
        parents = sibling.parents;
      } else {
        // Every third student has one parent, the others have two.
        const kinds = n % 3 === 1 ? [n % 2 === 0 ? 'mother' : 'father'] : ['father', 'mother'];
        parents = [];
        for (const kind of kinds) {
          const names = kind === 'mother' ? MOTHERS : FATHERS;
          let parentName = pick(names, n * 5 + (kind === 'mother' ? 2 : 3));
          // A parent does not share a first name with the child, which would be confusing.
          if (parentName === firstName) parentName = pick(names, n * 5 + 4);
          parents.push(await addPerson(schoolId, admin.id, 'parent', `${parentName} ${surname}`));
        }
      }
      for (const parent of parents) {
        await createParentLink(db, {
          schoolId,
          adminId: admin.id,
          parentId: parent.id,
          studentId: user.id,
        });
      }
      students.push({ user, parents });
    }
    seed.main.classes = CLASS_NAMES.map((name, i) => ({
      name,
      students: students.slice(i * STUDENTS_PER_CLASS, (i + 1) * STUDENTS_PER_CLASS),
    }));

    // Lessons: the two main subjects in every odeljenje, and a lesson each of the other two in
    // the first one. A lesson that is not a draft gets a summary and a quiz a teacher approved.
    const lessonIds = new Map<string, { id: string; spec: LessonSpec }[]>();
    async function makeLessons(
      className: string,
      teacherKey: TeacherKey,
      subject: string,
      specs: readonly LessonSpec[],
    ) {
      const user = seed.main.teachers[teacherKey];
      const subjectId = subjectIds.get(`${className}/${subject}`) as string;
      const made: { id: string; spec: LessonSpec }[] = [];
      for (const spec of specs) {
        const lesson = await createLesson(db, {
          user,
          subjectId,
          title: spec.title,
          body: spec.body,
        });
        if (!spec.draft) {
          if (spec.summary) {
            await saveSummary(db, {
              user,
              lessonId: lesson.id,
              content: validateSummary({ points: spec.summary }),
            });
            await approveContent(db, { user, lessonId: lesson.id, part: 'summary' });
          }
          if (spec.quiz) {
            await saveQuiz(db, {
              user,
              lessonId: lesson.id,
              content: validateQuiz({ questions: spec.quiz }),
            });
            await approveContent(db, { user, lessonId: lesson.id, part: 'quiz' });
          }
          await publishLesson(db, { user, lessonId: lesson.id });
          made.push({ id: lesson.id, spec });
        }
      }
      lessonIds.set(`${className}/${subject}`, made);
    }
    for (const className of CLASS_NAMES) {
      for (const subject of MAIN_SUBJECTS) {
        await makeLessons(className, subject.teacher, subject.name, subject.lessons);
      }
    }
    await makeLessons('6-1', 'serbian', 'Srpski jezik', SERBIAN_LESSONS);
    await makeLessons('6-1', 'history', 'Istorija', HISTORY_LESSONS);

    // Requests to join subjects. The student asks, the parent confirms, the teacher decides.
    // The pattern differs from student to student so that every state is seen.
    const classOf = (n: number) => CLASS_NAMES[Math.floor(n / STUDENTS_PER_CLASS)];
    const enrolled: { n: number; subject: number; className: string }[] = [];

    async function request(
      n: number,
      subjectName: string,
      teacher: AuthUser,
      outcome:
        | 'approved'
        | 'awaiting_teacher'
        | 'awaiting_parent'
        | 'rejected_parent'
        | 'rejected_teacher',
      byParent: boolean,
    ) {
      const { user: student, parents } = students[n];
      const parent = parents[0];
      const subjectId = subjectIds.get(`${classOf(n)}/${subjectName}`) as string;
      const asked = byParent
        ? await createEnrollment(db, { user: parent, subjectId, studentId: student.id })
        : await createEnrollment(db, { user: student, subjectId, studentId: student.id });
      if (outcome === 'awaiting_parent') return false;
      if (!byParent) {
        await decideEnrollment(db, {
          user: parent,
          enrollmentId: asked.id,
          decision: outcome === 'rejected_parent' ? 'reject' : 'approve',
        });
      }
      if (outcome === 'awaiting_teacher' || outcome === 'rejected_parent') return false;
      await decideEnrollment(db, {
        user: teacher,
        enrollmentId: asked.id,
        decision: outcome === 'approved' ? 'approve' : 'reject',
      });
      return outcome === 'approved';
    }

    for (let n = 0; n < students.length; n += 1) {
      for (const [subjectIndex, subject] of MAIN_SUBJECTS.entries()) {
        const teacher = seed.main.teachers[subject.teacher];
        const roll = (n * 7 + subjectIndex * 3) % 20;
        // 60% approved, 15% wait for the teacher, 15% for the parent, 10% are rejected.
        const outcome =
          roll < 12
            ? 'approved'
            : roll < 15
              ? 'awaiting_teacher'
              : roll < 18
                ? 'awaiting_parent'
                : roll === 18
                  ? 'rejected_parent'
                  : 'rejected_teacher';
        // Sometimes the parent is the one who sends the request.
        const byParent =
          (outcome === 'approved' || outcome === 'awaiting_teacher') &&
          (n + subjectIndex) % 7 === 0;
        if (await request(n, subject.name, teacher, outcome, byParent)) {
          enrolled.push({ n, subject: subjectIndex, className: classOf(n) });
        }
      }
      // A few students ask for the other two subjects too.
      if (n % 4 === 0) {
        await request(
          n,
          'Srpski jezik',
          seed.main.teachers.serbian,
          n === 8 ? 'awaiting_parent' : 'approved',
          false,
        );
      }
      if (n % 5 === 0) {
        await request(
          n,
          'Istorija',
          seed.main.teachers.history,
          n === 15 ? 'awaiting_teacher' : 'approved',
          false,
        );
      }
    }

    // What the students with an approved request did: lessons they finished, quiz tries, stars
    // from the teacher and conversations.
    for (const { n, subject: subjectIndex, className } of enrolled) {
      const subject = MAIN_SUBJECTS[subjectIndex];
      const { user: student, parents } = students[n];
      const teacher = seed.main.teachers[subject.teacher];
      const subjectId = subjectIds.get(`${className}/${subject.name}`) as string;
      const lessons = lessonIds.get(`${className}/${subject.name}`) ?? [];
      // How far the student got: from none of the lessons to all five.
      const reached = (n * 3 + subjectIndex * 2) % 6;

      for (const [i, lesson] of lessons.slice(0, reached).entries()) {
        if (!lesson.spec.quiz) {
          await completeLesson(db, { user: student, lessonId: lesson.id });
          continue;
        }
        // 0: right at once, 1: wrong once and then right, 2: tried and gave up, 3: skipped.
        const how = (n + i) % 4;
        if (how === 3) continue;
        const wrong = 1 + (n % 3);
        if (how === 0) {
          await takeQuiz(db, student, lesson.id, lesson.spec.quiz, 0);
        } else {
          await takeQuiz(db, student, lesson.id, lesson.spec.quiz, wrong);
          if (how === 1) {
            // The next try is allowed only 10 minutes after the last one.
            await db.query(
              `UPDATE quiz_attempts SET last_activity_at = last_activity_at - interval '1 hour'
               WHERE student_id = $1 AND lesson_id = $2`,
              [student.id, lesson.id],
            );
            await takeQuiz(db, student, lesson.id, lesson.spec.quiz, 0);
          }
        }
        if (how !== 2) {
          await completeLesson(db, { user: student, lessonId: lesson.id });
        }
      }

      // Stars from the teacher for those who did well.
      if ((n + subjectIndex) % 2 === 0 && reached >= 2) {
        for (let s = 0; s < (reached >= 4 ? 2 : 1); s += 1) {
          await giveStar(db, {
            user: teacher,
            studentId: student.id,
            subjectId,
            message: pick(subject.stars, n + s * 3 + subjectIndex),
          });
        }
      }

      // A conversation between the teacher and a parent about the student.
      if ((n + subjectIndex) % 2 === 1) {
        const context = {
          name: student.fullName.split(' ')[0],
          girl: n % 2 === 0,
          about: pick(subject.about, n),
        };
        const parent = pick(parents, n);
        for (const line of pick(TALKS, n + subjectIndex * 2)) {
          await addMessage(db, {
            user: line.by === 'teacher' ? teacher : parent,
            studentId: student.id,
            subjectId,
            body: line.say(context),
          });
        }
      }
    }
  }

  await spreadInTime(db);
  return seed;
}

// One try of a quiz by a student, with the given number of wrong answers.
async function takeQuiz(
  db: Queryable,
  user: AuthUser,
  lessonId: string,
  quiz: readonly QuizQuestionSpec[],
  wrong: number,
): Promise<void> {
  const { attempt } = await startAttempt(db, { user, lessonId });
  let missed = 0;
  for (const question of attempt.questions) {
    const spec = quiz.find((item) => item.prompt === question.prompt);
    const right = spec?.options.find((option) => option.isCorrect)?.text;
    const wantWrong = missed < wrong;
    const option = question.options.find((item) => (item.text === right) === !wantWrong);
    if (!option) {
      throw new Error(`Could not answer "${question.prompt}".`);
    }
    if (wantWrong) missed += 1;
    await answerQuestion(db, {
      user,
      lessonId,
      attemptId: attempt.id,
      questionId: question.id,
      optionId: option.id,
    });
  }
}

// Everything is made in the same second, so a presentation would show one date everywhere. This
// moves it back over the last weeks: the lessons first, then the requests, then the activity.
// Each row keeps the order of its own times, and nothing ends up in the future.
async function spreadInTime(db: Queryable): Promise<void> {
  // A number that is always the same for the same text, from 0 up.
  const h = (text: string) => `abs(hashtext(${text})::bigint)`;
  const days = (from: number, count: number, text: string) =>
    `make_interval(days => ${from} + (${h(text)} % ${count})::int, mins => (${h(`${text} || 'm'`)} % 600)::int)`;

  for (const [table, columns] of [
    ['lessons', ['created_at', 'updated_at', 'published_at']],
    ['lesson_summaries', ['created_at', 'updated_at', 'approved_at']],
    ['lesson_quizzes', ['created_at', 'updated_at', 'approved_at']],
  ] as const) {
    const shift = 'make_interval(days => 45)';
    await db.query(
      `UPDATE ${table} SET ${columns.map((c) => `${c} = ${c} - ${shift}`).join(', ')}`,
    );
  }

  // Requests that have been decided are old; those still waiting are recent.
  await db.query(
    `UPDATE enrollments e SET
       created_at = created_at - s.shift, updated_at = updated_at - s.shift,
       parent_decided_at = parent_decided_at - s.shift,
       teacher_decided_at = teacher_decided_at - s.shift
     FROM (
       SELECT id, CASE WHEN status IN ('awaiting_parent', 'awaiting_teacher')
                       THEN ${days(1, 9, 'id::text')} ELSE ${days(30, 7, 'id::text')} END AS shift
       FROM enrollments
     ) s WHERE e.id = s.id`,
  );

  // What a student did in one lesson happens on one day.
  const lessonDay = days(1, 28, 'student_id::text || lesson_id::text');
  await db.query(
    `UPDATE quiz_attempts a SET started_at = started_at - s.shift,
       last_activity_at = last_activity_at - s.shift, completed_at = completed_at - s.shift
     FROM (SELECT id, ${lessonDay} AS shift FROM quiz_attempts) s WHERE a.id = s.id`,
  );
  await db.query(
    `UPDATE quiz_answers w SET answered_at = answered_at - s.shift
     FROM (SELECT w2.id, ${days(1, 28, 'a.student_id::text || a.lesson_id::text')} AS shift
           FROM quiz_answers w2 JOIN quiz_attempts a ON a.id = w2.attempt_id) s WHERE w.id = s.id`,
  );
  await db.query(
    `UPDATE lesson_completions c SET completed_at = completed_at - s.shift
     FROM (SELECT student_id AS sid, lesson_id AS lid, ${lessonDay} AS shift FROM lesson_completions) s
     WHERE c.student_id = s.sid AND c.lesson_id = s.lid`,
  );
  await db.query(
    `UPDATE stars t SET created_at = created_at - s.shift
     FROM (SELECT id, CASE WHEN source = 'automatic' THEN ${lessonDay} ELSE ${days(1, 28, 'id::text')} END AS shift
           FROM stars) s WHERE t.id = s.id`,
  );

  // A conversation starts some days ago and goes on for a few hours.
  await db.query(
    `UPDATE conversation_messages m SET created_at = now() - s.started + make_interval(hours => 3 * (s.place - 1)::int)
     FROM (
       SELECT id, ${days(3, 26, 'student_id::text || subject_id::text')} AS started,
              row_number() OVER (PARTITION BY student_id, subject_id ORDER BY seq) AS place
       FROM conversation_messages
     ) s WHERE m.id = s.id`,
  );
}
