import { demoSchoolData } from '@/features/school/demoSchoolData';
import type { SchoolData, SchoolLesson } from '@/features/school/types';

const base = {
  glossary: [],
  quiz: [],
  assignedClassIds: [],
  assignedStudentIds: [],
} satisfies Partial<SchoolLesson>;

/** Small, fictional, test-only lesson set with known status counts. */
export const testLessons: SchoolLesson[] = [
  {
    ...base,
    id: 'test-1',
    title: 'Test lekcija jedan',
    subjectId: 'matematika',
    grade: 2,
    status: 'in_review',
    versions: [
      {
        kind: 'standard',
        source: 'teacher',
        approvedByTeacher: true,
        content: 'Prvi pasus.\n\nDrugi pasus.',
      },
      { kind: 'simplified', source: 'ai', approvedByTeacher: false, content: 'Kratko.' },
    ],
  },
  {
    ...base,
    id: 'test-2',
    title: 'Test lekcija dva',
    subjectId: 'priroda',
    grade: 4,
    status: 'assigned',
    assignedClassIds: ['4-2'],
    versions: [
      { kind: 'standard', source: 'teacher', approvedByTeacher: true, content: 'Sadržaj.' },
    ],
  },
  {
    ...base,
    id: 'test-3',
    title: 'Test lekcija tri',
    subjectId: 'jezik',
    grade: 3,
    status: 'draft',
    versions: [
      { kind: 'standard', source: 'teacher', approvedByTeacher: true, content: 'Sadržaj.' },
    ],
  },
];

/** The demo school with a custom set of lessons. */
export function schoolWithLessons(lessons: SchoolLesson[]): SchoolData {
  return { ...demoSchoolData, lessons };
}
