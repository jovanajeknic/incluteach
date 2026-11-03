import type { StudentProfile, SupportProfile } from '@/features/student/types';
import { demoStudent, demoStudentLessons, demoSubjects } from './demoLessonContent';
import type { AdaptedKind, SchoolData, SchoolLesson } from './types';

export { demoStudent, demoSubjects };

const DEMO_CLASS_ID = '4-2';

const needs = (overrides: Partial<SupportProfile>): SupportProfile => ({
  preferSimplifiedText: false,
  preferMoreExamples: false,
  preferStepByStep: false,
  readingPreset: 'standard',
  ...overrides,
});

const student = (
  id: string,
  firstName: string,
  lastName: string,
  support: Partial<SupportProfile>,
): StudentProfile => ({ id, firstName, lastName, supportProfile: needs(support) });

/** Fictional class with a mix of needs (needs only, never diagnoses). */
export const demoStudents: StudentProfile[] = [
  demoStudent,
  student('demo-student-mia', 'Mia', 'Petrović', { preferStepByStep: true }),
  student('demo-student-sara', 'Sara', 'Đukić', { preferMoreExamples: true }),
  student('demo-student-nikola', 'Nikola', 'Vuković', {
    preferStepByStep: true,
    readingPreset: 'easier-reading',
  }),
  student('demo-student-lena', 'Lena', 'Popović', {}),
  student('demo-student-petar', 'Petar', 'Radović', { preferSimplifiedText: true }),
];

const assignedToClass = (lesson: (typeof demoStudentLessons)[number]): SchoolLesson => ({
  ...lesson,
  status: 'assigned',
  assignedClassIds: [DEMO_CLASS_ID],
  assignedStudentIds: [],
});

/** Waiting for the teacher: AI suggestions are not approved yet. */
const fractionsInReview: SchoolLesson = {
  id: 'razlomci-uvod',
  subjectId: 'matematika',
  grade: 4,
  title: 'Razlomci – uvod',
  status: 'in_review',
  assignedClassIds: [],
  assignedStudentIds: [],
  versions: [
    {
      kind: 'standard',
      source: 'teacher',
      approvedByTeacher: true,
      content:
        'Razlomak pokazuje dio cjeline. Ako picu podijelimo na četiri jednaka dijela i uzmemo jedan, uzeli smo jednu četvrtinu.\n\nBroj ispod razlomačke crte kaže na koliko je jednakih dijelova cjelina podijeljena. Broj iznad crte kaže koliko smo dijelova uzeli.',
    },
    {
      kind: 'simplified',
      source: 'ai',
      approvedByTeacher: false,
      content:
        'Razlomak je dio nečega.\n\nPicu podijelimo na 4 jednaka dijela. Uzmemo 1 dio. To je jedna četvrtina.\n\nDonji broj kaže na koliko dijelova smo podijelili. Gornji broj kaže koliko dijelova smo uzeli.',
    },
    {
      kind: 'examples',
      source: 'ai',
      approvedByTeacher: false,
      content:
        'Razlomak pokazuje dio cjeline. Ako picu podijelimo na četiri jednaka dijela i uzmemo jedan, uzeli smo jednu četvrtinu.\n\nPrimjer iz svakodnevnog života: kad čokoladu od 8 kockica podijeliš sa drugom tako da svako dobije 4 kockice, svako ima polovinu čokolade.\n\nBroj ispod razlomačke crte kaže na koliko je jednakih dijelova cjelina podijeljena. Broj iznad crte kaže koliko smo dijelova uzeli.',
    },
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

/** Approved but not assigned yet. */
const seasonsApproved: SchoolLesson = {
  id: 'godisnja-doba',
  subjectId: 'priroda',
  grade: 4,
  title: 'Godišnja doba',
  status: 'approved',
  assignedClassIds: [],
  assignedStudentIds: [],
  versions: [
    {
      kind: 'standard',
      source: 'teacher',
      approvedByTeacher: true,
      content:
        'Godina ima četiri godišnja doba: proljeće, ljeto, jesen i zimu.\n\nU proljeće priroda se budi, a ljeti su dani najduži i najtopliji. U jesen lišće žuti i opada, a zimi je hladno i ponekad pada snijeg.',
    },
    {
      kind: 'simplified',
      source: 'ai',
      approvedByTeacher: true,
      content:
        'Godina ima četiri doba.\n\nProljeće, ljeto, jesen i zima.\n\nLjeti je toplo. Zimi je hladno.',
    },
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

/** Only the teacher's text: ready for the AI. */
const trafficDraft: SchoolLesson = {
  id: 'saobracaj',
  subjectId: 'priroda',
  grade: 4,
  title: 'Bezbjednost u saobraćaju',
  status: 'draft',
  assignedClassIds: [],
  assignedStudentIds: [],
  versions: [
    {
      kind: 'standard',
      source: 'teacher',
      approvedByTeacher: true,
      content:
        'Ulicu prelazimo samo na pješačkom prelazu. Prije prelaska pogledamo lijevo, pa desno, pa ponovo lijevo.\n\nNa semaforu čekamo zeleno svjetlo za pješake. Kada idemo pored puta, hodamo po trotoaru, a gdje trotoara nema, idemo uz lijevu ivicu puta.',
    },
  ],
  glossary: [],
  quiz: [],
};

/**
 * Hand-written "AI" results for demo lessons, so the simulated adaptation reads well.
 * Lessons without an entry get generic suggestions that the teacher is asked to edit.
 */
export const curatedAdaptations: Record<
  string,
  Partial<Record<AdaptedKind, string>> & Pick<SchoolLesson, 'glossary' | 'quiz'>
> = {
  saobracaj: {
    simplified:
      'Ulicu prelazimo na pješačkom prelazu.\n\nPogledaj lijevo. Pogledaj desno. Opet lijevo.\n\nČekaj zeleno svjetlo. Hodaj po trotoaru.',
    examples:
      'Ulicu prelazimo samo na pješačkom prelazu. Prije prelaska pogledamo lijevo, pa desno, pa ponovo lijevo.\n\nPrimjer: kad ujutru ideš u školu i dođeš do „zebre“ ispred škole, stani na ivicu trotoara i pogledaj lijevo, desno i opet lijevo.\n\nNa semaforu čekamo zeleno svjetlo za pješake. Primjer: čak i kad nema automobila, čekamo zelenog čovječuljka.',
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
    classIds: [DEMO_CLASS_ID],
  },
  parent: {
    id: 'demo-parent-jelena',
    firstName: 'Jelena',
    lastName: 'Petrović',
    childIds: [demoStudent.id, 'demo-student-mia'],
  },
  classes: [
    {
      id: DEMO_CLASS_ID,
      name: '4-2',
      grade: 4,
      studentIds: demoStudents.map((item) => item.id),
    },
  ],
  students: demoStudents,
  lessons: [
    ...demoStudentLessons.map(assignedToClass),
    fractionsInReview,
    seasonsApproved,
    trafficDraft,
  ],
  progress: {
    'demo-student-mia': { 'kruzenje-vode': 'completed', sabiranje: 'started' },
    'demo-student-sara': { 'kruzenje-vode': 'completed', imenice: 'started' },
    'demo-student-nikola': { sabiranje: 'completed' },
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
