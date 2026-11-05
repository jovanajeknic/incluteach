import { apiRequest } from '@/shared/api/apiClient';

export type LessonState = 'draft' | 'processing' | 'in_review' | 'published';
export const LESSON_STATES: readonly LessonState[] = [
  'draft',
  'processing',
  'in_review',
  'published',
];

/** Limits of the API (see API-CONTRACT.md, "Lessons"). */
export const TITLE_MAX_LENGTH = 200;
export const BODY_MAX_LENGTH = 40_000;
export const FILE_MAX_BYTES = 10 * 1024 * 1024;

/** A subject of the signed-in teacher, from `GET /subjects/mine`. */
export interface TeacherSubject {
  id: string;
  name: string;
  classId: string;
  /** The odeljenje, for example "5-2". */
  className: string;
  schoolYear: number;
  studentCount: number;
  lessonCounts: Record<LessonState, number>;
}

export interface LessonSubject {
  id: string;
  name: string;
  className: string;
  schoolYear: number;
}

export interface LessonListItem {
  id: string;
  title: string;
  status: LessonState;
  subject: LessonSubject;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ContentState = 'draft' | 'approved';

/** What a teacher sees of the summary and the quiz; editing them is a later screen. */
export interface LessonPart {
  origin: 'ai' | 'teacher';
  status: ContentState;
  outdated: boolean;
}

export interface Lesson extends LessonListItem {
  body: string;
  source: 'pasted' | 'docx' | 'pdf';
  sourceFileName: string | null;
  bodyRevision: number;
  /** Why the last AI run failed; only the teacher gets it. */
  processingError: string | null;
  subject: LessonSubject & { teacher: { id: string; fullName: string } };
  summary: LessonPart | null;
  quiz: LessonPart | null;
}

/** Something the server noticed while reading a file; so far only left-out pictures. */
export interface UploadWarning {
  code: 'images_not_included';
  count: number;
}

export interface LessonFilters {
  subjectId?: string;
  status?: LessonState;
  limit?: number;
}

function queryString(values: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : '';
}

export const lessonsApi = {
  mySubjects: () =>
    apiRequest<{ subjects: TeacherSubject[]; schoolYear: number }>('/subjects/mine'),
  list: ({ subjectId, status, limit }: LessonFilters = {}) =>
    apiRequest<{ lessons: LessonListItem[]; total: number }>(
      `/lessons${queryString({ subjectId, status, limit })}`,
    ),
  get: (id: string, signal?: AbortSignal) =>
    apiRequest<{ lesson: Lesson }>(`/lessons/${id}`, { signal }),
  create: (input: { subjectId: string; title: string; body?: string }) =>
    apiRequest<{ lesson: Lesson }>('/lessons', { method: 'POST', body: input }),
  update: (id: string, input: { title?: string; body?: string }) =>
    apiRequest<{ lesson: Lesson }>(`/lessons/${id}`, { method: 'PATCH', body: input }),
  remove: (id: string) => apiRequest<void>(`/lessons/${id}`, { method: 'DELETE' }),
  /** The file itself is the body of the request; its name travels in a header. */
  uploadSource: (id: string, file: File) =>
    apiRequest<{ lesson: Lesson; warnings: UploadWarning[] }>(`/lessons/${id}/source`, {
      method: 'POST',
      rawBody: file,
      headers: { 'X-File-Name': encodeURIComponent(file.name) },
    }),
  publish: (id: string) =>
    apiRequest<{ lesson: Lesson }>(`/lessons/${id}/publish`, { method: 'POST' }),
  unpublish: (id: string) =>
    apiRequest<{ lesson: Lesson }>(`/lessons/${id}/unpublish`, { method: 'POST' }),
};
