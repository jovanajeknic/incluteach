import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { studentsApi } from './studentsApi';

const key = (...parts: string[]) => ['students', ...parts] as const;

export const useRanking = (subjectId: string) =>
  useQuery({
    queryKey: key('ranking', subjectId),
    queryFn: () => studentsApi.ranking(subjectId),
  });

export const useStudentProgress = (subjectId: string, studentId: string) =>
  useQuery({
    queryKey: key('progress', subjectId, studentId),
    queryFn: () => studentsApi.progress(subjectId, studentId),
  });

export const useStudentStars = (subjectId: string, studentId: string) =>
  useQuery({
    queryKey: key('stars', subjectId, studentId),
    queryFn: () => studentsApi.stars(subjectId, studentId),
  });

/** Loaded only when the teacher opens a lesson of the student (`enabled`). */
export const useQuizHistory = (lessonId: string, studentId: string, enabled: boolean) =>
  useQuery({
    queryKey: key('quiz', lessonId, studentId),
    queryFn: () => studentsApi.quizHistory(lessonId, studentId),
    enabled,
  });

/** A star changes the totals in the table and on the student's page, so all are refreshed. */
function useRefreshStudents() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: ['students'] });
}

export function useGiveStar() {
  const refresh = useRefreshStudents();
  return useMutation({ mutationFn: studentsApi.giveStar, onSuccess: refresh });
}

export function useTakeBackStar() {
  const refresh = useRefreshStudents();
  return useMutation({ mutationFn: studentsApi.takeBackStar, onSuccess: refresh });
}
