import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { classesApi } from './classesApi';
import { subjectsApi, type SubjectsFilter } from './subjectsApi';
import { usersApi, type BulkAction, type UsersFilter } from './usersApi';

export const USERS_PAGE_SIZE = 25;

/**
 * The users of the school. The previous list stays on the screen while a new filter loads, so
 * typing in the search box does not flash the whole table away.
 */
export const useUsers = (filter: UsersFilter) =>
  useQuery({
    queryKey: ['admin', 'users', filter],
    queryFn: () => usersApi.list(filter),
    placeholderData: keepPreviousData,
  });

export function useCreateUser() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export const useIssueActivation = () => useMutation({ mutationFn: usersApi.issueActivation });

/** Both change who is in the list, so the list is loaded again, also after a failure. */
function useRefreshingUsersMutation<Variables, Result>(
  call: (variables: Variables) => Promise<Result>,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: call,
    onSettled: () => client.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export const useRenameUser = () =>
  useRefreshingUsersMutation(({ id, fullName }: { id: string; fullName: string }) =>
    usersApi.rename(id, fullName),
  );

export const useChangeUsers = () =>
  useRefreshingUsersMutation(({ action, ids }: { action: BulkAction; ids: string[] }) =>
    usersApi.change(action, ids),
  );

export const useClasses = (schoolYear: number) =>
  useQuery({
    queryKey: ['admin', 'classes', schoolYear],
    queryFn: () => classesApi.list(schoolYear),
    placeholderData: keepPreviousData,
  });

/** A change of a class reloads the lists of all school years. */
function useClassesMutation<Variables, Result>(call: (variables: Variables) => Promise<Result>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: call,
    onSettled: () => client.invalidateQueries({ queryKey: ['admin', 'classes'] }),
  });
}

export const useCreateClass = () => useClassesMutation(classesApi.create);
export const useRenameClass = () =>
  useClassesMutation(({ id, name }: { id: string; name: string }) => classesApi.rename(id, name));
export const useDeleteClass = () => useClassesMutation(classesApi.remove);

export const SUBJECTS_PAGE_SIZE = 25;

export const useSubjects = (filter: SubjectsFilter) =>
  useQuery({
    queryKey: ['admin', 'subjects', filter],
    queryFn: () => subjectsApi.list(filter),
    placeholderData: keepPreviousData,
  });

/** The teachers of the school, also those who left (their subjects need a new one). */
export const useTeachers = () => useUsers({ role: 'teacher', status: 'all', limit: 200 });

/** Classes show how many subjects they have, so a change of a subject reloads them too. */
function useSubjectsMutation<Variables, Result>(call: (variables: Variables) => Promise<Result>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: call,
    onSettled: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: ['admin', 'subjects'] }),
        client.invalidateQueries({ queryKey: ['admin', 'classes'] }),
      ]),
  });
}

export const useCreateSubject = () => useSubjectsMutation(subjectsApi.create);
export const useUpdateSubject = () =>
  useSubjectsMutation(({ id, ...changes }: { id: string; name?: string; teacherId?: string }) =>
    subjectsApi.update(id, changes),
  );
export const useDeleteSubject = () => useSubjectsMutation(subjectsApi.remove);
