import type {
  LessonVersion,
  ReadingVersionKind,
  StudentLesson,
  StudentProfile,
} from '@/features/student/types';
import { demoIllustrationsFor } from './demoIllustrations';
import { demoStudent, demoStudentLessons, demoSubjects } from './demoLessonContent';
import type { AdaptedKind, SchoolData, SchoolLesson } from './types';

export { demoStudent, demoSubjects };

const CLASS_4_2 = '4-2';
const CLASS_4_1 = '4-1';

const student = (
  id: string,
  firstName: string,
  lastName: string,
  readingVersion: ReadingVersionKind,
  audio = false,
): StudentProfile => ({ id, firstName, lastName, supportProfile: { readingVersion, audio } });

/** Fictional pupils. Profiles name the versions they receive, never a reason or diagnosis. */
const class42Students: StudentProfile[] = [
  demoStudent,
  student('demo-student-mia', 'Mia', 'Petrović', 'shortened'),
  student('demo-student-sara', 'Sara', 'Đukić', 'standard', true),
  student('demo-student-nikola', 'Nikola', 'Vuković', 'dyslexia', true),
  student('demo-student-lena', 'Lena', 'Popović', 'standard'),
  student('demo-student-petar', 'Petar', 'Radović', 'easier'),
];

const class41Students: StudentProfile[] = [
  student('demo-student-ema', 'Ema', 'Kovačević', 'standard'),
  student('demo-student-marko', 'Marko', 'Ilić', 'dyslexia', true),
  student('demo-student-tara', 'Tara', 'Jovanović', 'shortened'),
];

export const demoStudents: StudentProfile[] = [...class42Students, ...class41Students];

const teacherText = (content: string): LessonVersion => ({
  kind: 'standard',
  source: 'teacher',
  approvedByTeacher: true,
  content,
});

const aiText = (kind: AdaptedKind, content: string, approved: boolean): LessonVersion => ({
  kind,
  source: 'ai',
  approvedByTeacher: approved,
  content,
});

const aiIllustrations = (lesson: Pick<StudentLesson, 'id' | 'subjectId'>, approved: boolean) => ({
  kind: 'illustrations' as const,
  source: 'ai' as const,
  approvedByTeacher: approved,
  content: '',
  illustrations: demoIllustrationsFor(lesson.id, lesson.subjectId),
});

/** A narration script: a short spoken opening, then the lesson as it is read aloud. */
export function narrationScript(title: string, content: string): string {
  return `Slušaj lekciju „${title}“.\n\n${content}\n\nTo je kraj lekcije. Bravo!`;
}

/**
 * Lessons the students already have. They were published before the AI prepared every
 * version, so some versions are missing; students then fall back to the teacher's text.
 */
const publishedToClass42 = (lesson: (typeof demoStudentLessons)[number]): SchoolLesson => {
  const standard = lesson.versions.find((version) => version.kind === 'standard');
  return {
    ...lesson,
    classId: CLASS_4_2,
    status: 'assigned',
    adaptationCount: 1,
    versions: [
      ...lesson.versions,
      aiText('audio', narrationScript(lesson.title, standard?.content ?? ''), true),
      aiIllustrations(lesson, true),
    ],
  };
};

const multiplication: SchoolLesson = {
  id: 'mnozenje',
  subjectId: 'matematika',
  grade: 4,
  classId: CLASS_4_1,
  title: 'Množenje kao sabiranje',
  status: 'assigned',
  adaptationCount: 1,
  versions: [
    teacherText(
      'Množenje je kraći zapis sabiranja istih brojeva. Umjesto 3 + 3 + 3 + 3 pišemo 4 · 3.\n\nPrvi broj kaže koliko puta sabiramo, a drugi koji broj sabiramo. Zato je 4 · 3 = 12.',
    ),
    aiText(
      'shortened',
      'Množenje je brzo sabiranje istih brojeva.\n\n3 + 3 + 3 + 3 je isto što i 4 · 3 = 12.',
      true,
    ),
    aiText(
      'easier',
      'Imaš 4 tanjira. Na svakom su 3 jabuke.\n\nKoliko je jabuka? 3 + 3 + 3 + 3 = 12.\n\nKraće pišemo: 4 · 3 = 12. To je množenje.',
      true,
    ),
    aiText(
      'dyslexia',
      'Množenje je brzo sabiranje.\n\n3 + 3 + 3 + 3\n\nTo je 4 puta 3.\n\n4 · 3 = 12',
      true,
    ),
    aiText(
      'audio',
      narrationScript(
        'Množenje kao sabiranje',
        'Zamisli četiri tanjira. Na svakom tanjiru su tri jabuke. Kad saberemo tri, pa još tri, pa još tri i još tri, dobijemo dvanaest. Kraće kažemo: četiri puta tri je dvanaest.',
      ),
      true,
    ),
    aiIllustrations({ id: 'mnozenje', subjectId: 'matematika' }, true),
  ],
  glossary: [{ term: 'množenje', definition: 'Brzo sabiranje istih brojeva.' }],
  quiz: [
    {
      id: 'q1',
      question: 'Šta je isto što i 2 · 5?',
      options: ['5 + 5', '2 + 5', '5 + 5 + 5'],
      correctIndex: 0,
      explanation: '2 · 5 znači da broj 5 saberemo dva puta: 5 + 5 = 10.',
    },
  ],
};

/** Waiting for the teacher: every AI version is ready but none is approved yet. */
const fractionsInReview: SchoolLesson = {
  id: 'razlomci-uvod',
  subjectId: 'matematika',
  grade: 4,
  classId: CLASS_4_1,
  title: 'Razlomci – uvod',
  status: 'in_review',
  adaptationCount: 1,
  versions: [
    teacherText(
      'Razlomak pokazuje dio cjeline. Ako picu podijelimo na četiri jednaka dijela i uzmemo jedan, uzeli smo jednu četvrtinu.\n\nBroj ispod razlomačke crte kaže na koliko je jednakih dijelova cjelina podijeljena. Broj iznad crte kaže koliko smo dijelova uzeli.',
    ),
    aiText(
      'shortened',
      'Razlomak je dio cjeline.\n\nDonji broj: na koliko dijelova smo podijelili. Gornji broj: koliko dijelova smo uzeli.',
      false,
    ),
    aiText(
      'easier',
      'Razlomak je dio nečega.\n\nPicu podijelimo na 4 jednaka dijela. Uzmemo 1 dio. To je jedna četvrtina.\n\nDonji broj kaže na koliko dijelova smo podijelili. Gornji broj kaže koliko dijelova smo uzeli.',
      false,
    ),
    aiText(
      'dyslexia',
      'Razlomak je dio nečega.\n\nPica ima 4 dijela.\n\nUzmemo 1 dio.\n\nTo je 1/4.\n\nDonji broj: svi dijelovi.\n\nGornji broj: uzeti dijelovi.',
      false,
    ),
    aiText(
      'audio',
      narrationScript(
        'Razlomci – uvod',
        'Zamisli picu. Podijelimo je na četiri jednaka dijela. Jedan taj dio je jedna četvrtina pice. Kad pišemo razlomak, dolje pišemo na koliko smo dijelova podijelili, a gore koliko smo dijelova uzeli.',
      ),
      false,
    ),
    aiIllustrations({ id: 'razlomci-uvod', subjectId: 'matematika' }, false),
  ],
  glossary: [
    { term: 'razlomak', definition: 'Broj koji pokazuje dio cjeline, na primjer jedna četvrtina.' },
    { term: 'cjeline', definition: 'Cijela stvar, prije nego što je podijelimo.' },
  ],
  quiz: [
    {
      id: 'q1',
      question: 'Picu smo podijelili na 4 jednaka dijela i uzeli 1. Koliko smo uzeli?',
      options: ['Jednu polovinu', 'Jednu četvrtinu', 'Cijelu picu'],
      correctIndex: 1,
      explanation: 'Jedan od četiri jednaka dijela je jedna četvrtina.',
    },
  ],
  homeGuidance: ['Podijelite jabuku na jednake djelove i zajedno imenujte svaki dio.'],
};

/** Every version approved, not published yet. */
const seasonsApproved: SchoolLesson = {
  id: 'godisnja-doba',
  subjectId: 'priroda',
  grade: 4,
  classId: CLASS_4_2,
  title: 'Godišnja doba',
  status: 'approved',
  adaptationCount: 1,
  versions: [
    teacherText(
      'Godina ima četiri godišnja doba: proljeće, ljeto, jesen i zimu.\n\nU proljeće priroda se budi, a ljeti su dani najduži i najtopliji. U jesen lišće žuti i opada, a zimi je hladno i ponekad pada snijeg.',
    ),
    aiText('shortened', 'Godina ima četiri doba: proljeće, ljeto, jesen i zimu.', true),
    aiText(
      'easier',
      'Godina ima četiri doba.\n\nProljeće, ljeto, jesen i zima.\n\nLjeti je toplo. Zimi je hladno.',
      true,
    ),
    aiText('dyslexia', 'Četiri doba:\n\nproljeće\n\nljeto\n\njesen\n\nzima', true),
    aiText(
      'audio',
      narrationScript(
        'Godišnja doba',
        'Godina ima četiri godišnja doba. U proljeće sve cvjeta. Ljeti je toplo i dani su dugi. U jesen lišće opada. Zimi je hladno i pada snijeg.',
      ),
      true,
    ),
    aiIllustrations({ id: 'godisnja-doba', subjectId: 'priroda' }, true),
  ],
  glossary: [],
  quiz: [
    {
      id: 'q1',
      question: 'Koliko godišnjih doba ima godina?',
      options: ['Dva', 'Četiri', 'Šest'],
      correctIndex: 1,
      explanation: 'Proljeće, ljeto, jesen i zima: četiri godišnja doba.',
    },
  ],
};

/** Only the teacher's text: the AI has not run yet. */
const trafficDraft: SchoolLesson = {
  id: 'saobracaj',
  subjectId: 'priroda',
  grade: 4,
  classId: CLASS_4_2,
  title: 'Bezbjednost u saobraćaju',
  status: 'draft',
  versions: [
    teacherText(
      'Ulicu prelazimo samo na pješačkom prelazu. Prije prelaska pogledamo lijevo, pa desno, pa ponovo lijevo.\n\nNa semaforu čekamo zeleno svjetlo za pješake. Kada idemo pored puta, hodamo po trotoaru, a gdje trotoara nema, idemo uz lijevu ivicu puta.',
    ),
  ],
  glossary: [],
  quiz: [],
};

type TextKind = Exclude<AdaptedKind, 'illustrations'>;

/**
 * Hand-written "AI" results for demo lessons, so the simulated generation reads well.
 * Lessons without an entry get generic results that the teacher is asked to edit.
 */
export const curatedAdaptations: Record<
  string,
  Partial<Record<TextKind, string>> & Pick<SchoolLesson, 'glossary' | 'quiz'>
> = {
  saobracaj: {
    shortened:
      'Ulicu prelazimo na pješačkom prelazu, kad je zeleno.\n\nPrije prelaska gledamo lijevo, desno i opet lijevo.',
    easier:
      'Ulicu prelazimo na pješačkom prelazu.\n\nPogledaj lijevo. Pogledaj desno. Opet lijevo.\n\nČekaj zeleno svjetlo. Hodaj po trotoaru.',
    dyslexia:
      'Prelazi na zebri.\n\nGledaj lijevo.\n\nGledaj desno.\n\nOpet lijevo.\n\nČekaj zeleno.',
    audio: narrationScript(
      'Bezbjednost u saobraćaju',
      'Kad želiš da pređeš ulicu, idi do pješačkog prelaza, to je zebra. Stani na ivicu trotoara. Pogledaj lijevo, pa desno, pa opet lijevo. Na semaforu sačekaj zelenog čovječuljka. Tek onda pređi.',
    ),
    glossary: [
      {
        term: 'pješačkom prelazu',
        definition: 'Mjesto na ulici sa bijelim prugama gdje pješaci prelaze.',
      },
      { term: 'trotoaru', definition: 'Uzdignuti dio pored ulice po kojem hodaju pješaci.' },
    ],
    quiz: [
      {
        id: 'q1',
        question: 'Gdje prelazimo ulicu?',
        options: ['Bilo gdje', 'Na pješačkom prelazu', 'Između parkiranih auta'],
        correctIndex: 1,
        explanation: 'Ulicu prelazimo samo na pješačkom prelazu.',
      },
      {
        id: 'q2',
        question: 'Na koju stranu prvo gledamo prije prelaska?',
        options: ['Lijevo', 'Gore', 'Nigdje'],
        correctIndex: 0,
        explanation: 'Pogledamo lijevo, pa desno, pa ponovo lijevo.',
      },
    ],
  },
};

export const demoSchoolData: SchoolData = {
  teacher: {
    id: 'demo-teacher-ana',
    firstName: 'Ana',
    lastName: 'Marković',
    // A class teacher of 4-2 who also teaches mathematics in 4-1.
    teaching: [
      { subjectId: 'priroda', classId: CLASS_4_2 },
      { subjectId: 'matematika', classId: CLASS_4_2 },
      { subjectId: 'jezik', classId: CLASS_4_2 },
      { subjectId: 'engleski', classId: CLASS_4_2 },
      { subjectId: 'likovno', classId: CLASS_4_2 },
      { subjectId: 'matematika', classId: CLASS_4_1 },
    ],
  },
  parent: {
    id: 'demo-parent-jelena',
    firstName: 'Jelena',
    lastName: 'Petrović',
    childIds: [demoStudent.id, 'demo-student-mia'],
  },
  classes: [
    {
      id: CLASS_4_2,
      name: '4-2',
      grade: 4,
      studentIds: class42Students.map((item) => item.id),
    },
    {
      id: CLASS_4_1,
      name: '4-1',
      grade: 4,
      studentIds: class41Students.map((item) => item.id),
    },
  ],
  students: demoStudents,
  lessons: [
    ...demoStudentLessons.map(publishedToClass42),
    multiplication,
    fractionsInReview,
    seasonsApproved,
    trafficDraft,
  ],
  progress: {
    'demo-student-mia': { 'kruzenje-vode': 'completed', sabiranje: 'started' },
    'demo-student-sara': { 'kruzenje-vode': 'completed', imenice: 'started' },
    'demo-student-nikola': { sabiranje: 'completed' },
    'demo-student-ema': { mnozenje: 'completed' },
    'demo-student-tara': { mnozenje: 'started' },
  },
  practice: {
    'demo-student-mia': {
      'kruzenje-vode': { completedAt: '2026-11-02T15:30:00.000Z', difficultQuestionIds: ['q2'] },
    },
    'demo-student-sara': {
      'kruzenje-vode': { completedAt: '2026-11-01T11:00:00.000Z', difficultQuestionIds: [] },
    },
    'demo-student-nikola': {
      sabiranje: { completedAt: '2026-11-02T09:15:00.000Z', difficultQuestionIds: ['q2'] },
    },
    'demo-student-ema': {
      mnozenje: { completedAt: '2026-11-03T10:00:00.000Z', difficultQuestionIds: [] },
    },
  },
  suggestions: [
    {
      id: 'demo-suggestion-1',
      childId: demoStudent.id,
      text: 'Luka lakše prati lekciju kad uz tekst ima sliku ili crtež.',
      createdAt: '2026-11-01T17:00:00.000Z',
      status: 'pending-teacher',
    },
  ],
};
