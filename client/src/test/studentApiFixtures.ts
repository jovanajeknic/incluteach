import type { Enrollment } from '@/features/subject-requests/api/enrollmentsApi';
import type { CatalogSubject, Star } from '@/features/student/api/studentApi';
import { testUsers } from './authFixtures';
import { biology5b } from './lessonApiFixtures';

// Fictional data in the shape the API answers a student with.

/** A request of the test student for a subject; approved unless said otherwise. */
export function enrollmentOf(overrides: Partial<Enrollment> = {}): Enrollment {
  return {
    id: 'e1',
    status: 'approved',
    student: { id: testUsers.student.id, fullName: testUsers.student.fullName },
    subject: {
      id: biology5b.id,
      name: 'Biologija',
      className: '5-2',
      schoolYear: 2026,
      teacher: { id: 't1', fullName: 'Milica Petrović', deleted: false },
    },
    requestedBy: 'student',
    parentDecidedAt: '2026-11-03T10:00:00.000Z',
    teacherDecidedAt: '2026-11-04T10:00:00.000Z',
    createdAt: '2026-11-02T10:00:00.000Z',
    ...overrides,
  };
}

export function catalogSubject(overrides: Partial<CatalogSubject> = {}): CatalogSubject {
  return {
    id: '10000000-0000-4000-8000-0000000000a1',
    name: 'Geografija',
    className: '5-2',
    schoolYear: 2026,
    teacher: { id: 't2', fullName: 'Nenad Ilić' },
    request: null,
    ...overrides,
  };
}

/** The progress of the student in a subject. */
export function progressOf(
  done: string[],
  all: { id: string; title: string }[],
  stars = { automatic: 0, teacher: 0 },
) {
  return {
    student: { id: testUsers.student.id, fullName: testUsers.student.fullName },
    subject: { id: biology5b.id, name: 'Biologija' },
    lessons: { published: all.length, completed: done.length },
    stars,
    items: all.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      completed: done.includes(lesson.id),
      completedAt: done.includes(lesson.id) ? '2026-11-04T10:00:00.000Z' : null,
    })),
  };
}

export const automaticStar: Star = {
  id: 's1',
  source: 'automatic',
  student: { id: testUsers.student.id, fullName: testUsers.student.fullName },
  subject: { id: biology5b.id, name: 'Biologija' },
  lesson: { id: 'l1', title: 'Fotosinteza' },
  message: null,
  givenBy: null,
  createdAt: '2026-11-04T10:00:00.000Z',
};

export const teacherStar: Star = {
  ...automaticStar,
  id: 's2',
  source: 'teacher',
  lesson: null,
  message: 'Lijepo si radila na času',
  givenBy: { id: 't1', fullName: 'Milica Petrović' },
};
