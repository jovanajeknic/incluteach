import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { usersApi, type UsersFilter } from './usersApi';

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
