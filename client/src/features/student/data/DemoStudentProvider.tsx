import { useMemo, type ReactNode } from 'react';
import { demoStudent } from '@/features/school/demoSchoolData';
import { useSchool } from '@/features/school/schoolContext';
import { StudentContext, type StudentStore } from './studentContext';

interface DemoStudentProviderProps {
  children: ReactNode;
  /** Which demo student is "signed in". */
  studentId?: string;
}

/**
 * The student's view of the shared demo school: only lessons assigned to them with an
 * approved version, and only their own progress.
 */
export function DemoStudentProvider({
  children,
  studentId = demoStudent.id,
}: DemoStudentProviderProps) {
  const school = useSchool();
  const profile = school.getStudent(studentId);
  if (!profile) {
    throw new Error(`Unknown demo student: ${studentId}`);
  }

  const store = useMemo<StudentStore>(() => {
    const lessons = school.visibleLessonsFor(studentId);
    return {
      profile,
      subjects: school.subjects,
      lessons,
      getSubject: (id) => school.subjects.find((subject) => subject.id === id),
      getLesson: (id) => lessons.find((lesson) => lesson.id === id),
      lessonsForSubject: (subjectId) => lessons.filter((lesson) => lesson.subjectId === subjectId),
      progressOf: (lessonId) => school.progressOf(studentId, lessonId),
      practiceOf: (lessonId) => school.practiceOf(studentId, lessonId),
      markStarted: (lessonId) => school.markStarted(studentId, lessonId),
      markLessonDone: (lessonId) => school.markLessonDone(studentId, lessonId),
      recordPractice: (lessonId, difficult) =>
        school.recordPractice(studentId, lessonId, difficult),
      stars: school.starsOf(studentId),
      starsFor: (lessonId) => ({
        lesson: school.progressOf(studentId, lessonId) === 'completed',
        quiz: school.practiceOf(studentId, lessonId) !== undefined,
      }),
    };
  }, [school, studentId, profile]);

  return <StudentContext value={store}>{children}</StudentContext>;
}
