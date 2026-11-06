import { apiRequest } from '@/shared/api/apiClient';

/** A person on a link between a parent and a child (see API-CONTRACT.md, "Parent-child links"). */
export interface LinkedPerson {
  id: string;
  fullName: string;
  username: string;
  /** The person left the school. */
  deactivated: boolean;
  /** The person's data was erased; `fullName` is then a placeholder. */
  deleted: boolean;
}

export interface ParentLink {
  parent: LinkedPerson;
  student: LinkedPerson;
  createdAt: string;
}

export const familiesApi = {
  /** The parents and guardians of one child. */
  parentsOf: (studentId: string) =>
    apiRequest<{ links: ParentLink[]; total: number }>(
      `/parent-students?${new URLSearchParams({ studentId, limit: '200' })}`,
    ),
  /** There is no way to undo a link, so callers ask first. */
  link: (body: { parentId: string; studentId: string }) =>
    apiRequest<{ link: ParentLink }>('/parent-students', { method: 'POST', body }),
};
