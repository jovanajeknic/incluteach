import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiError } from './apiClient';

/** The query that holds the signed-in user (or `null`). Everything else is cleared with it. */
export const SESSION_QUERY_KEY = ['session'] as const;

/** Forgets every cached answer except the session, which the caller sets itself. */
export function clearServerData(client: QueryClient) {
  client.removeQueries({ predicate: (query) => query.queryKey[0] !== SESSION_QUERY_KEY[0] });
}

export function createQueryClient(): QueryClient {
  // A 401 `unauthenticated` from any call means the session ended (it lasts 7 days). Dropping
  // the session sends the guards to the sign-in page, and the data of that person goes too.
  const handleError = (error: unknown) => {
    if (error instanceof ApiError && error.status === 401 && error.code === 'unauthenticated') {
      client.setQueryData(SESSION_QUERY_KEY, null);
      clearServerData(client);
    }
  };

  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({ onError: handleError }),
    mutationCache: new MutationCache({ onError: handleError }),
    defaultOptions: {
      // A failed request is shown to the person, who decides to try again.
      queries: { retry: false, refetchOnWindowFocus: false },
    },
  });
  return client;
}
