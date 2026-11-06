import { apiRequest } from '@/shared/api/apiClient';

/** A subject as an admin sees it (see API-CONTRACT.md, "Subject"): a name in one class, one teacher. */
export interface AdminSubject {
  id: string;
  name: string;
  classId: string;
  className: string;
  schoolYear: number;
  teacher: {
    id: string;
    fullName: string;
    /** The teacher left the school: the subject needs a new one. */
    deactivated: boolean;
    /** The teacher's data was erased; `fullName` is then a placeholder. */
    deleted: boolean;
  };
  createdAt: string;
}

export interface SubjectsFilter {
  schoolYear: number;
  classId?: string;
  teacherId?: string;
  limit: number;
}

export const subjectsApi = {
  list: ({ schoolYear, classId, teacherId, limit }: SubjectsFilter) => {
    const query = new URLSearchParams({ schoolYear: String(schoolYear), limit: String(limit) });
    if (classId) query.set('classId', classId);
    if (teacherId) query.set('teacherId', teacherId);
    return apiRequest<{ subjects: AdminSubject[]; total: number }>(`/subjects?${query}`);
  },
  create: (body: { name: string; classId: string; teacherId: string }) =>
    apiRequest<{ subject: AdminSubject }>('/subjects', { method: 'POST', body }),
  /** The class cannot change. Send what changed; the server needs at least one of the two. */
  update: (id: string, body: { name?: string; teacherId?: string }) =>
    apiRequest<{ subject: AdminSubject }>(`/subjects/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body,
    }),
  remove: (id: string) =>
    apiRequest<void>(`/subjects/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
