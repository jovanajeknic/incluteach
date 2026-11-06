import { activateAccount, issueActivationToken } from '../auth/activation.ts';
import { hashPassword, type ScryptCost } from '../auth/password.ts';
import type { Queryable } from '../db/pool.ts';
import type { UserRole } from '../roles.ts';
import { createClass } from '../school/classes.ts';
import { createParentLink } from '../school/parentLinks.ts';
import { currentSchoolYear } from '../school/schoolYear.ts';
import { createSubject } from '../school/subjects.ts';
import { createUser } from '../users/createUser.ts';

// Six primary schools of Podgorica for trying the whole application: each has an admin, three
// teachers, four odeljenja in two grades with three students each, and one or two parents for
// every student. The school names are real, but every person is invented.
// Everything is made with the same functions the real application uses.

interface SchoolPlan {
  name: string;
  // The grades are firstGrade and the one after it.
  firstGrade: number;
  // What the third teacher teaches; the other two teach Matematika and Srpski jezik.
  thirdSubject: string;
}

const SCHOOLS: SchoolPlan[] = [
  { name: 'OŠ Maksim Gorki', firstGrade: 5, thirdSubject: 'Biologija' },
  { name: 'OŠ Oktoih', firstGrade: 6, thirdSubject: 'Geografija' },
  { name: 'OŠ Vuk Karadžić', firstGrade: 7, thirdSubject: 'Istorija' },
  { name: 'OŠ Štampar Makarije', firstGrade: 8, thirdSubject: 'Biologija' },
  { name: 'OŠ Marko Miljanov', firstGrade: 5, thirdSubject: 'Geografija' },
  { name: 'OŠ Pavle Rovinski', firstGrade: 7, thirdSubject: 'Istorija' },
];

const SECTIONS_PER_GRADE = 2;
const STUDENTS_PER_CLASS = 3;

const MALE_NAMES = [
  'Marko',
  'Luka',
  'Nikola',
  'Stefan',
  'Milan',
  'Vuk',
  'Petar',
  'Filip',
  'Andrija',
  'Novak',
  'Dušan',
  'Mihailo',
  'Aleksa',
  'Lazar',
  'Đorđe',
  'Nemanja',
  'Ognjen',
  'Boris',
  'Vladimir',
  'Danilo',
  'Jovan',
  'Savo',
  'Miloš',
  'Radoje',
];

const FEMALE_NAMES = [
  'Ana',
  'Jelena',
  'Milica',
  'Marija',
  'Teodora',
  'Sara',
  'Nina',
  'Katarina',
  'Jovana',
  'Ivana',
  'Tamara',
  'Anđela',
  'Mina',
  'Lena',
  'Dragana',
  'Sofija',
  'Maja',
  'Višnja',
  'Biljana',
  'Vesna',
  'Ljiljana',
  'Zorica',
  'Snežana',
  'Mirjana',
];

// Surnames that look the same for men and women, so a family shares one. The surnames of the
// small demo school (see seedDemo.ts) are left out so the two never fight over a username.
const SURNAMES = [
  'Vuković',
  'Radović',
  'Perović',
  'Jovanović',
  'Đurović',
  'Popović',
  'Knežević',
  'Božović',
  'Lakićević',
  'Rakočević',
  'Vujović',
  'Ivanović',
  'Nikolić',
  'Stanišić',
  'Mijušković',
  'Burić',
  'Pejović',
  'Kovačević',
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
  'Gazivoda',
  'Vlahović',
  'Lekić',
  'Todorović',
  'Pavićević',
  'Koprivica',
  'Jokić',
  'Dabović',
];

export interface SeededAccount {
  username: string;
  fullName: string;
  role: UserRole;
}

export interface SeededStudent extends SeededAccount {
  // One or two.
  parents: SeededAccount[];
}

export interface SeededClass {
  name: string;
  students: SeededStudent[];
  subjects: { name: string; teacher: SeededAccount }[];
}

export interface SeededSchool {
  id: string;
  name: string;
  admin: SeededAccount;
  teachers: SeededAccount[];
  classes: SeededClass[];
}

export interface PodgoricaSeed {
  password: string;
  schools: SeededSchool[];
}

export interface SeedPodgoricaOptions {
  // The password of every account. Chosen by the caller, so it is not kept in this file.
  password: string;
  // Only for tests, to keep them fast.
  cost?: ScryptCost;
}

function firstName(female: boolean, n: number): string {
  const names = female ? FEMALE_NAMES : MALE_NAMES;
  return names[n % names.length];
}

// The surname of family number `family` in school number `school`. A school never uses one
// surname twice, because it has fewer families than there are surnames.
function surname(school: number, family: number): string {
  return SURNAMES[(school * 6 + family) % SURNAMES.length];
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

// Creates the schools. The caller should run this inside a transaction, on an empty database
// (see wipeAllData), because the schools are made again each time.
export async function seedPodgorica(
  db: Queryable,
  { password, cost }: SeedPodgoricaOptions,
): Promise<PodgoricaSeed> {
  // One hash for everybody: the same password gives a different hash only through the salt,
  // and hashing 200 times would take long for no gain.
  const passwordHash = await hashPassword(password, cost);
  const schools: SeededSchool[] = [];

  for (const [schoolIndex, plan] of SCHOOLS.entries()) {
    const { rows } = await db.query<{ id: string }>(
      'INSERT INTO schools (name) VALUES ($1) RETURNING id',
      [plan.name],
    );
    const schoolId = rows[0].id;
    let adminId = '';

    // Everybody gets an account and activates it with their own link, like in real life.
    async function addPerson(
      role: UserRole,
      fullName: string,
    ): Promise<SeededAccount & { id: string }> {
      const user = await createUser(db, { schoolId, role, fullName });
      adminId ||= user.id;
      const { token } = await issueActivationToken(db, {
        userId: user.id,
        schoolId,
        adminId,
      });
      const activated = await activateAccount(db, {
        token,
        passwordHash,
        email: `${user.username}@example.com`,
      });
      if (!activated) {
        throw new Error(`Could not activate the account ${user.username}.`);
      }
      return { id: user.id, username: user.username, fullName, role };
    }
    const plain = ({ username, fullName, role }: SeededAccount): SeededAccount => ({
      username,
      fullName,
      role,
    });

    // Families 0 to 3 are the school's staff, the next ones are the students' families.
    const admin = await addPerson(
      'admin',
      `${firstName(schoolIndex % 2 === 0, schoolIndex * 3)} ${surname(schoolIndex, 0)}`,
    );
    const teachers = [];
    for (const [i, female] of [true, false, true].entries()) {
      teachers.push(
        await addPerson(
          'teacher',
          `${firstName(female, schoolIndex * 5 + i * 4 + 1)} ${surname(schoolIndex, 1 + i)}`,
        ),
      );
    }
    const subjectNames = ['Matematika', 'Srpski jezik', plan.thirdSubject];

    const classes: SeededClass[] = [];
    let studentNumber = 0;
    for (const grade of [plan.firstGrade, plan.firstGrade + 1]) {
      for (let section = 1; section <= SECTIONS_PER_GRADE; section += 1) {
        const schoolClass = await createClass(db, {
          schoolId,
          name: `${grade}-${section}`,
          schoolYear: currentSchoolYear(),
        });
        const subjects = [];
        for (const [i, name] of subjectNames.entries()) {
          await createSubject(db, {
            schoolId,
            name,
            classId: schoolClass.id,
            teacherId: teachers[i].id,
          });
          subjects.push({ name, teacher: plain(teachers[i]) });
        }

        const students: SeededStudent[] = [];
        for (let i = 0; i < STUDENTS_PER_CLASS; i += 1) {
          const n = studentNumber;
          studentNumber += 1;
          const familyName = surname(schoolIndex, 4 + n);
          const studentFirstName = firstName(n % 2 === 0, schoolIndex * 5 + n);
          const student = await addPerson('student', `${studentFirstName} ${familyName}`);

          // Every third student has one parent, the others have two.
          const parentKinds = n % 3 === 1 ? [n % 2 === 0] : [false, true];
          const parents: SeededAccount[] = [];
          for (const female of parentKinds) {
            const seedNumber = schoolIndex * 7 + n * 3 + (female ? 2 : 1);
            // A parent does not share a first name with the child, which would be confusing.
            const parentFirstName =
              firstName(female, seedNumber) === studentFirstName
                ? firstName(female, seedNumber + 1)
                : firstName(female, seedNumber);
            const parent = await addPerson('parent', `${parentFirstName} ${familyName}`);
            await createParentLink(db, {
              schoolId,
              adminId,
              parentId: parent.id,
              studentId: student.id,
            });
            parents.push(plain(parent));
          }
          students.push({ ...plain(student), parents });
        }
        classes.push({ name: schoolClass.name, students, subjects });
      }
    }

    schools.push({
      id: schoolId,
      name: plan.name,
      admin: plain(admin),
      teachers: teachers.map(plain),
      classes,
    });
  }

  return { password, schools };
}
