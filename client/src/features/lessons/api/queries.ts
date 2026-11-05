import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { lessonsApi, type Lesson, type LessonFilters, type QuizQuestionInput } from './lessonsApi';

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

/** Asked once: which AI is set up does not change while the page is open. */
export const useAiName = () =>
  useQuery({
    queryKey: ['health'],
    queryFn: lessonsApi.health,
    select: (health) => health.ai ?? null,
    staleTime: Infinity,
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

/**
 * A call about the summary or the quiz answers with the whole lesson; it replaces the one on
 * screen at once (no wait for a new request) and refreshes the lists and counters.
 */
function useLessonCall<Variables>(
  id: string,
  call: (variables: Variables) => Promise<{ lesson: Lesson }>,
) {
  const client = useQueryClient();
  const refresh = useRefreshAfterChange();
  return useMutation({
    mutationFn: call,
    onSuccess: (answer) => {
      client.setQueryData([...lessonsKey, 'one', id], { lesson: answer.lesson });
      return refresh();
    },
  });
}

export const useGenerate = (id: string) =>
  useLessonCall(id, (parts: { summary: boolean; quiz: boolean }) => lessonsApi.generate(id, parts));
export const useSaveSummary = (id: string) =>
  useLessonCall(id, (points: string[]) => lessonsApi.saveSummary(id, points));
export const useDeleteSummary = (id: string) =>
  useLessonCall(id, () => lessonsApi.deleteSummary(id));
export const useApproveSummary = (id: string) =>
  useLessonCall(id, () => lessonsApi.approveSummary(id));
export const useSaveQuiz = (id: string) =>
  useLessonCall(id, (questions: QuizQuestionInput[]) => lessonsApi.saveQuiz(id, questions));
export const useDeleteQuiz = (id: string) => useLessonCall(id, () => lessonsApi.deleteQuiz(id));
export const useApproveQuiz = (id: string) => useLessonCall(id, () => lessonsApi.approveQuiz(id));

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
