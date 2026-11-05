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

/**
 * What the AI or the teacher made next to the text. `outdated` is true when the text of the
 * lesson changed after it was made or approved; approving again says it still fits.
 */
interface LessonPart {
  origin: 'ai' | 'teacher';
  status: ContentState;
  outdated: boolean;
  approvedAt: string | null;
  updatedAt: string;
}

/** Limits of the API (see API-CONTRACT.md, "PUT /lessons/{id}/summary"). */
export const SUMMARY_MAX_POINTS = 30;
export const SUMMARY_POINT_MAX_LENGTH = 300;

export interface Summary extends LessonPart {
  /** Each point is one short sentence. */
  points: string[];
}

export interface QuizOption {
  id: string;
  position: number;
  text: string;
  isCorrect: boolean;
}

export interface QuizQuestion {
  id: string;
  position: number;
  kind: 'choice' | 'true_false';
  prompt: string;
  explanation: string | null;
  options: QuizOption[];
}

export interface Quiz extends LessonPart {
  questions: QuizQuestion[];
}

export interface Lesson extends LessonListItem {
  body: string;
  source: 'pasted' | 'docx' | 'pdf';
  sourceFileName: string | null;
  bodyRevision: number;
  /** Why the last AI run failed; only the teacher gets it. */
  processingError: string | null;
  subject: LessonSubject & { teacher: { id: string; fullName: string } };
  summary: Summary | null;
  quiz: Quiz | null;
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

/** Which AI service the server uses: `fake` makes invented results, `groq` is a real one. */
export interface Health {
  status: string;
  ai?: string;
}

export const lessonsApi = {
  health: () => apiRequest<Health>('/health'),
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
  /** The AI works in the background: the answer is the lesson in the state "processing". */
  generate: (id: string, parts: { summary: boolean; quiz: boolean }) =>
    apiRequest<{ lesson: Lesson }>(`/lessons/${id}/generate`, { method: 'POST', body: parts }),
  saveSummary: (id: string, points: string[]) =>
    apiRequest<{ lesson: Lesson }>(`/lessons/${id}/summary`, { method: 'PUT', body: { points } }),
  deleteSummary: (id: string) =>
    apiRequest<{ lesson: Lesson }>(`/lessons/${id}/summary`, { method: 'DELETE' }),
  approveSummary: (id: string) =>
    apiRequest<{ lesson: Lesson }>(`/lessons/${id}/summary/approve`, { method: 'POST' }),
  publish: (id: string) =>
    apiRequest<{ lesson: Lesson }>(`/lessons/${id}/publish`, { method: 'POST' }),
  unpublish: (id: string) =>
    apiRequest<{ lesson: Lesson }>(`/lessons/${id}/unpublish`, { method: 'POST' }),
};
