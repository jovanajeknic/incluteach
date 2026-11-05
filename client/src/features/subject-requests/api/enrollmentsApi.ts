import { apiRequest } from '@/shared/api/apiClient';

export type EnrollmentStatus = 'awaiting_parent' | 'awaiting_teacher' | 'approved' | 'rejected';

/** A request of a student to join a subject (see API-CONTRACT.md, "Enrollment requests"). */
export interface Enrollment {
  id: string;
  status: EnrollmentStatus;
  student: { id: string; fullName: string };
  subject: { id: string; name: string; className: string; schoolYear: number };
  /** Who started it: a student needs a parent's confirmation first, a parent does not. */
  requestedBy: 'student' | 'parent';
  parentDecidedAt: string | null;
  teacherDecidedAt: string | null;
  createdAt: string;
}

export const enrollmentsApi = {
  /** The requests the parent has passed on and the teacher has not answered yet. */
  waitingForTeacher: () =>
    apiRequest<{ enrollments: Enrollment[]; total: number }>(
      `/enrollments?${new URLSearchParams({ status: 'awaiting_teacher', limit: '200' })}`,
    ),
  approve: (id: string) =>
    apiRequest<{ enrollment: Enrollment }>(`/enrollments/${id}/approve`, { method: 'POST' }),
  reject: (id: string) =>
    apiRequest<{ enrollment: Enrollment }>(`/enrollments/${id}/reject`, { method: 'POST' }),
};
