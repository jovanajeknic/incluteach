import { apiRequest } from '@/shared/api/apiClient';

/** A child linked to the signed-in parent (see API-CONTRACT.md, "GET /children"). */
export interface Child {
  id: string;
  fullName: string;
}

export const parentApi = {
  children: () => apiRequest<{ children: Child[] }>('/children'),
};
