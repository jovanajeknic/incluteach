import type { Role } from '@/features/auth/api/authApi';
import { apiRequest } from '@/shared/api/apiClient';

/** What an admin sees about a user (see API-CONTRACT.md, "ManagedUser"). */
export interface ManagedUser {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  role: Role;
  /** True once the person chose a password. */
  activated: boolean;
  /** Set when the person left the school; they cannot sign in. */
  deactivatedAt: string | null;
  createdAt: string;
}

/** The roles an admin can create here; another admin is made on the server. */
export type NewUserRole = 'teacher' | 'student' | 'parent';

/** The one-time link a person opens to choose a password. */
export interface Activation {
  url: string;
  expiresAt: string;
}

/** What can be done to many users at once. */
export type BulkAction = 'deactivate' | 'reactivate' | 'delete';

export interface BulkResult {
  affectedIds: string[];
  /** Another school, unknown, or not in the right state for the action. */
  skippedIds: string[];
}

/** The server takes at most this many ids in one request. */
const BULK_LIMIT = 200;

export type UserStatus = 'active' | 'deactivated' | 'all';

export interface UsersFilter {
  role?: Role;
  status: UserStatus;
  search?: string;
  limit: number;
}

export const usersApi = {
  list: ({ role, status, search, limit }: UsersFilter) => {
    const query = new URLSearchParams({ status, limit: String(limit) });
    if (role) query.set('role', role);
    if (search) query.set('search', search);
    return apiRequest<{ users: ManagedUser[]; total: number }>(`/users?${query}`);
  },
  get: (id: string) => apiRequest<{ user: ManagedUser }>(`/users/${encodeURIComponent(id)}`),
  create: (body: { fullName: string; role: NewUserRole }) =>
    apiRequest<{ user: ManagedUser }>('/users', { method: 'POST', body }),
  rename: (id: string, fullName: string) =>
    apiRequest<{ user: ManagedUser }>(`/users/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: { fullName },
    }),
  /**
   * More than 200 ids go in several requests. If a later one fails, the earlier ones have
   * already been applied; the list is loaded again either way, so the screen shows the truth.
   */
  change: async (action: BulkAction, ids: string[]): Promise<BulkResult> => {
    const result: BulkResult = { affectedIds: [], skippedIds: [] };
    for (let start = 0; start < ids.length; start += BULK_LIMIT) {
      const part = await apiRequest<BulkResult>(`/users/${action}`, {
        method: 'POST',
        body: { ids: ids.slice(start, start + BULK_LIMIT) },
      });
      result.affectedIds.push(...part.affectedIds);
      result.skippedIds.push(...part.skippedIds);
    }
    return result;
  },
  /** Asking again cancels the link given before, so it is also the answer to a forgotten password. */
  issueActivation: (id: string) =>
    apiRequest<{ activation: Activation }>(`/users/${encodeURIComponent(id)}/activation`, {
      method: 'POST',
    }),
};
