import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { enrollmentsApi } from './enrollmentsApi';

const waitingKey = ['enrollments', 'awaiting_teacher'] as const;

/** Shared by the list and the number in the menu, so both come from one request. */
export const useWaitingRequests = () =>
  useQuery({ queryKey: waitingKey, queryFn: enrollmentsApi.waitingForTeacher });

/**
 * An answer changes the list, the number of students of the subject (the subjects list) and
 * the tables of students, so all of them are refreshed. A failed answer refreshes the list too:
 * the request may have been answered by someone else in the meantime.
 */
function useAnswer(call: (id: string) => Promise<unknown>) {
  const client = useQueryClient();
  const refresh = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ['enrollments'] }),
      client.invalidateQueries({ queryKey: ['subjects'] }),
      client.invalidateQueries({ queryKey: ['students'] }),
    ]);
  return useMutation({ mutationFn: call, onSettled: refresh });
}

export const useApproveRequest = () => useAnswer(enrollmentsApi.approve);
export const useRejectRequest = () => useAnswer(enrollmentsApi.reject);
