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
};
