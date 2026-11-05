import { apiRequest } from '@/shared/api/apiClient';

export type Role = 'admin' | 'teacher' | 'student' | 'parent';

/** The signed-in user, as `GET /auth/me` and the sign-in answers return it. */
export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  /** `null` until the account is activated. */
  email: string | null;
  role: Role;
  schoolId: string;
}

export interface LoginRequest {
  /** An email or a username. */
  identifier: string;
  password: string;
}

export interface ActivateRequest {
  token: string;
  password: string;
  email: string;
}

export const authApi = {
  login: (request: LoginRequest) =>
    apiRequest<{ user: AuthUser }>('/auth/login', { method: 'POST', body: request }),
  me: (signal?: AbortSignal) => apiRequest<{ user: AuthUser }>('/auth/me', { signal }),
  logout: () => apiRequest<void>('/auth/logout', { method: 'POST' }),
  activate: (request: ActivateRequest) =>
    apiRequest<{ user: AuthUser }>('/auth/activate', { method: 'POST', body: request }),
};
