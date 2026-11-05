import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { enrollmentsApi } from './enrollmentsApi';

export type WaitingStatus = 'awaiting_parent' | 'awaiting_teacher';

/** Shared by the list and the number in the menu, so both come from one request. */
export const useWaitingRequests = (status: WaitingStatus) =>
  useQuery({
    queryKey: ['enrollments', status],
    queryFn: () => enrollmentsApi.waiting(status),
  });

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
      // The requests and the progress of a child, which a parent also looks at.
      client.invalidateQueries({ queryKey: ['student'] }),
    ]);
  return useMutation({ mutationFn: call, onSettled: refresh });
}

export const useApproveRequest = () => useAnswer(enrollmentsApi.approve);
export const useRejectRequest = () => useAnswer(enrollmentsApi.reject);
