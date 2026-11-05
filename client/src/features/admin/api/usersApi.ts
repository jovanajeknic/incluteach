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
  create: (body: { fullName: string; role: NewUserRole }) =>
    apiRequest<{ user: ManagedUser }>('/users', { method: 'POST', body }),
  /** Asking again cancels the link given before, so it is also the answer to a forgotten password. */
  issueActivation: (id: string) =>
    apiRequest<{ activation: Activation }>(`/users/${encodeURIComponent(id)}/activation`, {
      method: 'POST',
    }),
};
