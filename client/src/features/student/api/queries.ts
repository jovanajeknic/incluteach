import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CATALOG_PAGE_SIZE, studentApi } from './studentApi';

// All keys start with "student", so signing out or a new person clears them together.
const key = (...parts: (string | number | undefined)[]) => ['student', ...parts] as const;

export const useCatalogClasses = () =>
  useQuery({ queryKey: key('catalog', 'classes'), queryFn: studentApi.catalogClasses });

export const useCatalogSubjects = (filters: { classId?: string; search?: string; limit: number }) =>
  useQuery({
    queryKey: key('catalog', 'subjects', filters.classId, filters.search, filters.limit),
    queryFn: () => studentApi.catalogSubjects(filters),
    // A new filter keeps the old list on screen until the new one arrives.
    placeholderData: keepPreviousData,
  });

/** All requests of the student: the joined subjects and the ones still waiting. */
export const useMyRequests = () =>
  useQuery({ queryKey: key('requests'), queryFn: studentApi.myRequests });

export const useSubjectProgress = (subjectId: string) =>
  useQuery({
    queryKey: key('progress', subjectId),
    queryFn: () => studentApi.progress(subjectId),
  });

export const useStudentLesson = (id: string) =>
  useQuery({
    queryKey: key('lesson', id),
    queryFn: () => studentApi.lesson(id),
    select: (answer) => answer.lesson,
  });

export const useSubjectLessons = (subjectId: string) =>
  useQuery({
    queryKey: key('lessons', subjectId),
    queryFn: () => studentApi.lessonsOf(subjectId),
  });

/** The stars of the student; the menu, the home page and the stars page share this request. */
export const useMyStars = () => useQuery({ queryKey: key('stars'), queryFn: studentApi.stars });

export function useRequestToJoin() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: studentApi.requestToJoin,
    // The catalog shows the new state of the request, and "Moji zahtjevi" the new line.
    onSuccess: () => client.invalidateQueries({ queryKey: key() }),
  });
}

export { CATALOG_PAGE_SIZE };
