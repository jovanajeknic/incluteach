import { apiRequest } from '@/shared/api/apiClient';

/** An odeljenje (see API-CONTRACT.md, "Class"). `schoolYear` is the year the school year begins in. */
export interface SchoolClass {
  id: string;
  name: string;
  schoolYear: number;
  subjectCount: number;
  createdAt: string;
}

export const classesApi = {
  list: (schoolYear: number) =>
    apiRequest<{ classes: SchoolClass[] }>(
      `/classes?${new URLSearchParams({ schoolYear: String(schoolYear) })}`,
    ),
  create: (body: { name: string; schoolYear: number }) =>
    apiRequest<{ class: SchoolClass }>('/classes', { method: 'POST', body }),
  rename: (id: string, name: string) =>
    apiRequest<{ class: SchoolClass }>(`/classes/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: { name },
    }),
  remove: (id: string) =>
    apiRequest<void>(`/classes/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
