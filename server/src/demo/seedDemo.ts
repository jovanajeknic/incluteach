import { activateAccount, issueActivationToken } from '../auth/activation.ts';
import { hashPassword, type ScryptCost } from '../auth/password.ts';
import type { AuthUser } from '../auth/sessions.ts';
import { validateQuiz, validateSummary } from '../ai/validate.ts';
import type { Queryable } from '../db/pool.ts';
import { createEnrollment, decideEnrollment } from '../enrollments/enrollments.ts';
import { approveContent, saveQuiz, saveSummary } from '../lessons/editContent.ts';
import { createLesson, publishLesson } from '../lessons/lessons.ts';
import { completeLesson } from '../quiz/complete.ts';
import { addMessage } from '../conversations/conversations.ts';
import type { UserRole } from '../roles.ts';
import { createParentLink } from '../school/parentLinks.ts';
import { createClass } from '../school/classes.ts';
import { currentSchoolYear } from '../school/schoolYear.ts';
import { createSubject } from '../school/subjects.ts';
import { giveStar } from '../stars/stars.ts';
import { createUser } from '../users/createUser.ts';

// A small school with invented people, lessons and activity, so that every screen of the
// frontend has something to show. Everything is made with the same functions the real
// application uses. Nothing here is real: the names and the texts are made up.
export const DEMO_SCHOOL_NAME = 'Demo škola (izmišljeni podaci)';

export interface DemoAccount {
  username: string;
  fullName: string;
  role: UserRole;
  email: string;
  // What this person is for in the demo, for the list that is printed.
  note: string;
}

export interface DemoSeed {
  schoolId: string;
  password: string;
  accounts: DemoAccount[];
}

const PHOTOSYNTHESIS =
  'Fotosinteza je proces u kojem biljke prave hranu uz pomoć svjetlosti. ' +
  'Za to koriste vodu iz zemljišta i ugljen-dioksid iz vazduha. ' +
  'Proces se odvija u zelenim dijelovima biljke, najviše u lišću. ' +
  'Zelena boja potiče od hlorofila, koji hvata svjetlosnu energiju. ' +
  'Hlorofil se nalazi u sitnim ćelijskim organelama koje se zovu hloroplasti. ' +
  'Tokom fotosinteze nastaje glukoza, vrsta šećera koja biljci služi kao hrana. ' +
  'Pored glukoze, biljka ispušta kisik koji je potreban svim živim bićima. ' +
  'Bez fotosinteze na Zemlji ne bi bilo dovoljno kisika za disanje.';

const WATER_CYCLE =
  'Круг воде у природи\n' +
  'Вода у природи стално путује. Сунце загријава мора, ријеке и језера, па се дио воде претвара у водену пару. ' +
  'Тај процес се зове испаравање. Водена пара се диже високо у ваздух.\n' +
  'Горе је хладније, па се водена пара хлади и претвара у ситне капљице. Од капљица настају облаци. То се зове кондензација.\n' +
  'Када су капљице у облацима тешке, падају на земљу као киша, снијег или град. ' +
  'Те падавине се скупљају у рекама и морима, а круг почиње испочетка.';

const PLANTS_AND_WATER =
  'Biljke upijaju vodu korijenom. Voda putuje kroz stablo do lišća. ' +
  'Bez vode biljka vene i na kraju se osuši. Zato biljke treba redovno zalijevati.';

const CELL =
  'Ćelija je najmanji živi dio svakog bića. Sva živa bića se sastoje od ćelija. ' +
  'Neka bića imaju samo jednu ćeliju, a čovjek ih ima mnogo milijardi.';

const QUESTION = (
  kind: 'choice' | 'true_false',
  prompt: string,
  explanation: string,
  options: [string, boolean][],
) => ({
  kind,
  prompt,
  explanation,
  options: options.map(([text, isCorrect]) => ({ text, isCorrect })),
});

const PHOTOSYNTHESIS_SUMMARY = [
  'Biljke prave hranu uz pomoć svjetlosti. To se zove fotosinteza.',
  'Za fotosintezu biljke koriste vodu i ugljen-dioksid.',
  'Fotosinteza se najviše odvija u zelenom lišću.',
  'Zelenu boju daje hlorofil, koji hvata svjetlost.',
  'Biljka pravi glukozu, a ispušta kisik koji nam treba za disanje.',
];

const PHOTOSYNTHESIS_QUIZ = [
  QUESTION(
    'choice',
    'Gdje se najviše odvija fotosinteza?',
    'Odvija se u zelenim dijelovima, najviše u lišću.',
    [
      ['u lišću', true],
      ['u korijenu', false],
      ['u zemlji', false],
    ],
  ),
  QUESTION(
    'true_false',
    'Biljke ispuštaju kisik.',
    'Biljka ispušta kisik koji je potreban svim živim bićima.',
    [
      ['Tačno', true],
      ['Netačno', false],
    ],
  ),
  QUESTION('choice', 'Šta daje biljkama zelenu boju?', 'Zelena boja potiče od hlorofila.', [
    ['hlorofil', true],
    ['glukoza', false],
    ['kisik', false],
  ]),
  QUESTION(
    'true_false',
    'Vodu za fotosintezu biljka uzima iz vazduha.',
    'Vodu uzima iz zemljišta.',
    [
      ['Tačno', false],
      ['Netačno', true],
    ],
  ),
  QUESTION('choice', 'Šta nastaje tokom fotosinteze?', 'Nastaje glukoza, vrsta šećera, i kisik.', [
    ['glukoza', true],
    ['sladoled', false],
    ['plastika', false],
    ['so', false],
  ]),
];

const WATER_CYCLE_SUMMARY = [
  'Вода у природи стално путује.',
  'Сунце загријава воду, она постаје водена пара. То је испаравање.',
  'Водена пара се хлади и прави облаке. То је кондензација.',
  'Из облака пада киша, снијег или град.',
];

const WATER_CYCLE_QUIZ = [
  QUESTION('choice', 'Како се зове претварање воде у водену пару?', 'То се зове испаравање.', [
    ['испаравање', true],
    ['кондензација', false],
    ['падавине', false],
  ]),
  QUESTION(
    'true_false',
    'Од капљица настају облаци.',
    'Када се водена пара хлади, настају капљице и облаци.',
    [
      ['Tačno', true],
      ['Netačno', false],
    ],
  ),
  QUESTION(
    'choice',
    'Шта пада из тешких облака?',
    'Тешке капљице падају као киша, снијег или град.',
    [
      ['киша, снијег или град', true],
      ['пијесак', false],
      ['лишће', false],
    ],
  ),
];

interface Person {
  key: string;
  fullName: string;
  role: UserRole;
  note: string;
}

const PEOPLE: Person[] = [
  { key: 'admin', fullName: 'Marija Demić', role: 'admin', note: 'administratorka škole' },
  { key: 'teacher1', fullName: 'Milica Petrović', role: 'teacher', note: 'nastavnica biologije' },
  { key: 'teacher2', fullName: 'Nenad Ilić', role: 'teacher', note: 'nastavnik geografije' },
  {
    key: 'ana',
    fullName: 'Ana Marković',
    role: 'student',
    note: 'učenica: lekcije, kviz, zvjezdice',
  },
  {
    key: 'luka',
    fullName: 'Luka Stanić',
    role: 'student',
    note: 'učenik: zahtjev za upis čeka roditelja',
  },
  { key: 'petar', fullName: 'Petar Marković', role: 'parent', note: 'roditelj Ane' },
  { key: 'jelena', fullName: 'Jelena Marković', role: 'parent', note: 'drugi roditelj Ane' },
  { key: 'dragana', fullName: 'Dragana Stanić', role: 'parent', note: 'roditeljka Luke' },
];

export interface SeedOptions {
  // The password of every demo account. Chosen by the caller, so it is never kept in the code.
  password: string;
  // Only for tests, to keep them fast.
  cost?: ScryptCost;
}

// Creates the demo school. The caller should run this inside a transaction, and must make sure
// that no demo school exists yet (see removeDemo).
export async function seedDemo(db: Queryable, { password, cost }: SeedOptions): Promise<DemoSeed> {
  const { rows } = await db.query<{ id: string }>(
    'INSERT INTO schools (name) VALUES ($1) RETURNING id',
    [DEMO_SCHOOL_NAME],
  );
  const schoolId = rows[0].id;
  const passwordHash = await hashPassword(password, cost);

  // Everybody gets an account and activates it with their own link, like in real life.
  const users = new Map<string, AuthUser>();
  const accounts: DemoAccount[] = [];
  let adminId = '';
  for (const person of PEOPLE) {
    const user = await createUser(db, { schoolId, role: person.role, fullName: person.fullName });
    if (person.role === 'admin') {
      adminId = user.id;
    }
    const { token } = await issueActivationToken(db, {
      userId: user.id,
      schoolId,
      adminId: adminId || user.id,
    });
    const email = `${user.username}@example.com`;
    const activated = await activateAccount(db, { token, passwordHash, email });
    if (!activated) {
      throw new Error(`Could not activate the demo account ${user.username}.`);
    }
    users.set(person.key, { ...user, email });
    accounts.push({
      username: user.username,
      fullName: person.fullName,
      role: person.role,
      email,
      note: person.note,
    });
  }
  const get = (key: string) => users.get(key) as AuthUser;

  // Parents and children. Ana has two parents.
  for (const [parent, child] of [
    ['petar', 'ana'],
    ['jelena', 'ana'],
    ['dragana', 'luka'],
  ]) {
    await createParentLink(db, {
      schoolId,
      adminId,
      parentId: get(parent).id,
      studentId: get(child).id,
    });
  }

  const schoolClass = await createClass(db, {
    schoolId,
    name: '5-2',
    schoolYear: currentSchoolYear(),
  });
  const biology = await createSubject(db, {
    schoolId,
    name: 'Biologija',
    classId: schoolClass.id,
    teacherId: get('teacher1').id,
  });
  const geography = await createSubject(db, {
    schoolId,
    name: 'Geografija',
    classId: schoolClass.id,
    teacherId: get('teacher2').id,
  });

  // Ana and Luka are enrolled in Biology; Ana also in Geography. Luka's request for Geography
  // is left waiting for his parent, so the screens for deciding on it have something to show.
  async function enrol(student: string, parent: string, teacher: string, subjectId: string) {
    const request = await createEnrollment(db, {
      user: get(student),
      subjectId,
      studentId: get(student).id,
    });
    await decideEnrollment(db, {
      user: get(parent),
      enrollmentId: request.id,
      decision: 'approve',
    });
    await decideEnrollment(db, {
      user: get(teacher),
      enrollmentId: request.id,
      decision: 'approve',
    });
  }
  await enrol('ana', 'petar', 'teacher1', biology.id);
  await enrol('luka', 'dragana', 'teacher1', biology.id);
  await enrol('ana', 'petar', 'teacher2', geography.id);
  await createEnrollment(db, {
    user: get('luka'),
    subjectId: geography.id,
    studentId: get('luka').id,
  });

  // Lessons. Two are published with a summary and a quiz a teacher approved, one is published
  // as a summary only, and one is only a draft.
  async function lesson(
    teacher: string,
    subjectId: string,
    title: string,
    body: string,
    content: { summary?: string[]; quiz?: ReturnType<typeof QUESTION>[]; publish: boolean },
  ) {
    const user = get(teacher);
    const created = await createLesson(db, { user, subjectId, title, body });
    if (content.summary) {
      await saveSummary(db, {
        user,
        lessonId: created.id,
        content: validateSummary({ points: content.summary }),
      });
      await approveContent(db, { user, lessonId: created.id, part: 'summary' });
    }
    if (content.quiz) {
      await saveQuiz(db, {
        user,
        lessonId: created.id,
        content: validateQuiz({ questions: content.quiz }),
      });
      await approveContent(db, { user, lessonId: created.id, part: 'quiz' });
    }
    if (content.publish) {
      await publishLesson(db, { user, lessonId: created.id });
    }
    return created;
  }

  await lesson('teacher1', biology.id, 'Fotosinteza', PHOTOSYNTHESIS, {
    summary: PHOTOSYNTHESIS_SUMMARY,
    quiz: PHOTOSYNTHESIS_QUIZ,
    publish: true,
  });
  const plants = await lesson('teacher1', biology.id, 'Biljke i voda', PLANTS_AND_WATER, {
    summary: ['Biljke upijaju vodu korijenom.', 'Bez vode biljka vene.'],
    publish: true,
  });
  await lesson('teacher1', biology.id, 'Ćelija', CELL, { publish: false });
  await lesson('teacher2', geography.id, 'Круг воде у природи', WATER_CYCLE, {
    summary: WATER_CYCLE_SUMMARY,
    quiz: WATER_CYCLE_QUIZ,
    publish: true,
  });

  // Ana finished the lesson without a quiz (which gives her an automatic star), her teacher
  // gave her a star, and the teacher and Ana's parent have started a conversation.
  await completeLesson(db, { user: get('ana'), lessonId: plants.id });
  await giveStar(db, {
    user: get('teacher1'),
    studentId: get('ana').id,
    subjectId: biology.id,
    message: 'Bravo za trud na času!',
  });
  for (const [author, body] of [
    ['teacher1', 'Dobar dan, Ana je danas lijepo radila na času. Samo da znate.'],
    ['petar', 'Hvala na javljanju! Kod kuće joj fotosinteza ide dobro.'],
  ]) {
    await addMessage(db, {
      user: get(author),
      studentId: get('ana').id,
      subjectId: biology.id,
      body,
    });
  }

  return { schoolId, password, accounts };
}

// Deletes the demo school and everything in it, in an order the database accepts. Returns
// false when there was no demo school.
export async function removeDemo(db: Queryable): Promise<boolean> {
  const { rows } = await db.query<{ id: string }>('SELECT id FROM schools WHERE name = $1', [
    DEMO_SCHOOL_NAME,
  ]);
  for (const { id } of rows) {
    for (const sql of [
      'DELETE FROM conversation_messages WHERE school_id = $1',
      'DELETE FROM stars WHERE school_id = $1',
      // Takes the quiz tries, the answers and the finished lessons with it.
      'DELETE FROM lessons WHERE school_id = $1',
      'DELETE FROM enrollments WHERE school_id = $1',
      'DELETE FROM parent_students WHERE school_id = $1',
      'DELETE FROM activation_tokens WHERE school_id = $1',
      'DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE school_id = $1)',
      'DELETE FROM subjects WHERE school_id = $1',
      'DELETE FROM classes WHERE school_id = $1',
      'DELETE FROM users WHERE school_id = $1',
      'DELETE FROM schools WHERE id = $1',
    ]) {
      await db.query(sql, [id]);
    }
  }
  return rows.length > 0;
}

export async function demoExists(db: Queryable): Promise<boolean> {
  const { rows } = await db.query('SELECT 1 FROM schools WHERE name = $1', [DEMO_SCHOOL_NAME]);
  return rows.length > 0;
}
