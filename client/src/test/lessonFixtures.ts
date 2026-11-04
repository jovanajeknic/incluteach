import { demoSchoolData } from '@/features/school/demoSchoolData';
import { ADAPTED_KINDS, type SchoolData, type SchoolLesson } from '@/features/school/types';
import type { LessonVersion } from '@/features/student/types';

const base = { glossary: [], quiz: [] } satisfies Partial<SchoolLesson>;

const standard = (content: string): LessonVersion => ({
  kind: 'standard',
  source: 'teacher',
  approvedByTeacher: true,
  content,
});

/** Every AI version, each with a short recognizable text. */
const aiVersions = (approved: boolean): LessonVersion[] =>
  ADAPTED_KINDS.map((kind) => ({
    kind,
    source: 'ai',
    approvedByTeacher: approved,
    content: kind === 'illustrations' ? '' : `Tekst: ${kind}.`,
    illustrations:
      kind === 'illustrations'
        ? [{ id: 'img-1', src: '/illustrations/reading.svg', alt: 'Knjiga', caption: 'Opis.' }]
        : undefined,
  }));

/** Small, fictional, test-only lessons, one per status that matters on teacher screens. */
export const testLessons: SchoolLesson[] = [
  {
    ...base,
    id: 'test-1',
    title: 'Test lekcija jedan',
    subjectId: 'matematika',
    grade: 4,
    classId: '4-1',
    status: 'in_review',
    adaptationCount: 1,
    versions: [standard('Prvi pasus.\n\nDrugi pasus.'), ...aiVersions(false)],
  },
  {
    ...base,
    id: 'test-2',
    title: 'Test lekcija dva',
    subjectId: 'priroda',
    grade: 4,
    classId: '4-2',
    status: 'assigned',
    adaptationCount: 1,
    extrasApproved: true,
    versions: [standard('Sadržaj.'), ...aiVersions(true)],
    published: {
      versions: [standard('Sadržaj.'), ...aiVersions(true)],
      glossary: [],
      quiz: [],
    },
  },
  {
    ...base,
    id: 'test-3',
    title: 'Test lekcija tri',
    subjectId: 'matematika',
    grade: 4,
    classId: '4-2',
    status: 'draft',
    versions: [standard('Sadržaj.')],
  },
];

/** The demo school with a custom set of lessons. */
export function schoolWithLessons(lessons: SchoolLesson[]): SchoolData {
  return { ...demoSchoolData, lessons };
}
