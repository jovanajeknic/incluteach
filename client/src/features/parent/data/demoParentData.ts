import { demoStudent } from '@/features/student/data/demoStudentData';
import type { LessonProgress, PracticeRecord, StudentProfile } from '@/features/student/types';
import type { ParentProfile } from '../types';

/** A second fictional child, with fixed demo progress. */
export const demoSecondChild: StudentProfile = {
  id: 'demo-student-mia',
  firstName: 'Mia',
  lastName: 'Petrović',
  supportProfile: {
    preferSimplifiedText: false,
    preferStepByStep: true,
    readingPreset: 'standard',
  },
};

export const demoSecondChildProgress: Record<string, LessonProgress> = {
  'kruzenje-vode': 'completed',
  sabiranje: 'started',
};

export const demoSecondChildPractice: Record<string, PracticeRecord> = {
  'kruzenje-vode': { completedAt: '2026-11-02T15:30:00.000Z', difficultQuestionIds: ['q2'] },
};

/** Fictional parent linked to the demo student (live progress) and to the second child. */
export const demoParent: ParentProfile = {
  id: 'demo-parent-jelena',
  firstName: 'Jelena',
  lastName: 'Petrović',
  childIds: [demoStudent.id, demoSecondChild.id],
};
