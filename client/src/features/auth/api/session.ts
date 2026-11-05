import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/shared/api/apiClient';
import { clearServerData, SESSION_QUERY_KEY } from '@/shared/api/queryClient';
import { authApi, type AuthUser } from './authApi';

/**
 * Who is signed in. The session is a cookie the browser keeps (`httpOnly`), so the only way
 * to know is to ask the server; no token is ever stored here. `user` is `null` when nobody
 * is signed in, which is an answer, not an error.
 */
export function useSession() {
  const query = useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: async ({ signal }): Promise<AuthUser | null> => {
      try {
        return (await authApi.me(signal)).user;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    // The session changes only through the actions below, or through a 401 (see queryClient).
    staleTime: Infinity,
  });

  return {
    user: query.data ?? null,
    isLoading: query.isPending,
    isError: query.isError,
    retry: () => void query.refetch(),
  };
}

/** Shared by sign-in and activation: both answer with the user and leave a session cookie. */
function useStartSession<Request>(call: (request: Request) => Promise<{ user: AuthUser }>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: call,
    onSuccess: ({ user }) => {
      // A different person may have been signed in before: nothing of theirs may stay.
      clearServerData(client);
      client.setQueryData(SESSION_QUERY_KEY, user);
    },
  });
}

export const useLogin = () => useStartSession(authApi.login);
export const useActivate = () => useStartSession(authApi.activate);

export function useLogout() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      client.setQueryData(SESSION_QUERY_KEY, null);
      clearServerData(client);
    },
  });
}
