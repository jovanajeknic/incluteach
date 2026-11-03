import type { Lesson } from '@/features/lessons/types';

/** Small, fictional, test-only lesson set with known status counts. */
export const testLessons: Lesson[] = [
  {
    id: 'test-1',
    title: 'Test lekcija jedan',
    subject: 'Matematika',
    grade: 2,
    status: 'in_review',
    content: 'Prvi pasus.\n\nDrugi pasus.',
  },
  {
    id: 'test-2',
    title: 'Test lekcija dva',
    subject: 'Priroda i društvo',
    grade: 4,
    status: 'assigned',
    content: 'Sadržaj.',
  },
  {
    id: 'test-3',
    title: 'Test lekcija tri',
    subject: 'Maternji jezik',
    grade: 3,
    status: 'draft',
    content: 'Sadržaj.',
  },
];
