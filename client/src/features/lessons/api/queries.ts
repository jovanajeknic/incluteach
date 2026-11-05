import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { lessonsApi, type LessonFilters } from './lessonsApi';

// The first part of every key names the kind of data, so a change can refresh the right ones.
const subjectsKey = ['subjects', 'mine'] as const;
const lessonsKey = ['lessons'] as const;

/** How often to ask again while the AI works on a lesson (2 to 3 seconds, as agreed). */
const PROCESSING_POLL_MS = 2500;

export const useMySubjects = () =>
  useQuery({ queryKey: subjectsKey, queryFn: lessonsApi.mySubjects });

export const useLessons = (filters: LessonFilters) =>
  useQuery({
    queryKey: [...lessonsKey, 'list', filters],
    queryFn: () => lessonsApi.list(filters),
    // Changing the filter keeps the old list on screen until the new one arrives.
    placeholderData: keepPreviousData,
  });

export const useLesson = (id: string) =>
  useQuery({
    queryKey: [...lessonsKey, 'one', id],
    queryFn: ({ signal }) => lessonsApi.get(id, signal),
    select: (answer) => answer.lesson,
    // A lesson the AI is working on changes by itself; the others only change through us.
    refetchInterval: (query) =>
      query.state.data?.lesson.status === 'processing' ? PROCESSING_POLL_MS : false,
  });

/** Every lesson change moves the counters of its subject, so both kinds are refreshed. */
function useRefreshAfterChange() {
  const client = useQueryClient();
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: lessonsKey }),
      client.invalidateQueries({ queryKey: subjectsKey }),
    ]);
}

export function useCreateLesson() {
  const refresh = useRefreshAfterChange();
  return useMutation({ mutationFn: lessonsApi.create, onSuccess: refresh });
}

export function useUpdateLesson(id: string) {
  const refresh = useRefreshAfterChange();
  return useMutation({
    mutationFn: (input: { title?: string; body?: string }) => lessonsApi.update(id, input),
    onSuccess: refresh,
  });
}

export function useDeleteLesson(id: string) {
  const refresh = useRefreshAfterChange();
  return useMutation({ mutationFn: () => lessonsApi.remove(id), onSuccess: refresh });
}

/** The lesson id is a variable, because a new lesson gets its id only when it is created. */
export function useUploadSource() {
  const refresh = useRefreshAfterChange();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => lessonsApi.uploadSource(id, file),
    onSuccess: refresh,
  });
}

export function usePublishLesson(id: string) {
  const refresh = useRefreshAfterChange();
  return useMutation({ mutationFn: () => lessonsApi.publish(id), onSuccess: refresh });
}

export function useUnpublishLesson(id: string) {
  const refresh = useRefreshAfterChange();
  return useMutation({ mutationFn: () => lessonsApi.unpublish(id), onSuccess: refresh });
}
