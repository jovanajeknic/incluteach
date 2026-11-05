import { apiRequest } from '@/shared/api/apiClient';
import type { Enrollment } from '@/features/subject-requests/api/enrollmentsApi';
import type { LessonListItem } from '@/features/lessons/api/lessonsApi';
import type {
  QuizHistory,
  Star,
  StarCounts,
  StudentProgress,
} from '@/features/subject-students/api/studentsApi';

export type { Enrollment, LessonListItem, QuizHistory, Star, StarCounts, StudentProgress };

/** What a student gets of a quiz question before answering: no right answer, no explanation. */
export interface StudentQuizQuestion {
  id: string;
  position: number;
  kind: 'choice' | 'true_false';
  prompt: string;
  options: { id: string; position: number; text: string }[];
}

/** How far the student got with a lesson (see API-CONTRACT.md, "GET /lessons/{id}"). */
export interface MyProgress {
  completed: boolean;
  completedAt: string | null;
  /** The server decides if "Završi lekciju" works now. */
  canFinish: boolean;
  quiz: {
    openAttemptId: string | null;
    nextAttemptAt: string | null;
    passed: boolean;
  } | null;
}

/** One question of a try: the answer is `null` until the student has answered it. */
export interface AttemptQuestion extends StudentQuizQuestion {
  answer: {
    optionId: string;
    correct: boolean;
    correctOptionId: string;
    explanation: string | null;
  } | null;
}

/** One go through the whole quiz. There is no score, only whether each answer was right. */
export interface QuizTry {
  id: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  allCorrect: boolean | null;
  questions: AttemptQuestion[];
}

/** The answer of one question, with the state of the try after it. */
export interface AnswerResult {
  answer: {
    questionId: string;
    optionId: string;
    correct: boolean;
    correctOptionId: string;
    explanation: string | null;
  };
  attempt: {
    id: string;
    status: string;
    answered: number;
    total: number;
    allCorrect: boolean | null;
  };
}

/** A published lesson as its student reads it: the text, the approved summary and quiz. */
export interface StudentLesson {
  id: string;
  title: string;
  status: 'published';
  subject: {
    id: string;
    name: string;
    className: string;
    schoolYear: number;
    teacher: { id: string; fullName: string };
  };
  publishedAt: string | null;
  body: string;
  summary: { points: string[] } | null;
  quiz: { questions: StudentQuizQuestion[] } | null;
  myProgress: MyProgress;
}

/** An odeljenje that has subjects to join (see API-CONTRACT.md, "Subject catalog"). */
export interface CatalogClass {
  id: string;
  name: string;
  schoolYear: number;
  subjectCount: number;
}

export type RequestStatus = 'awaiting_parent' | 'awaiting_teacher' | 'approved' | 'rejected';

/** A subject the student can ask to join, with the state of their own request for it. */
export interface CatalogSubject {
  id: string;
  name: string;
  className: string;
  schoolYear: number;
  teacher: { id: string; fullName: string };
  request: { id: string; status: RequestStatus } | null;
}

export const CATALOG_PAGE_SIZE = 50;

export const studentApi = {
  catalogClasses: () =>
    apiRequest<{ classes: CatalogClass[]; schoolYear: number }>('/catalog/classes'),
  catalogSubjects: (filters: { classId?: string; search?: string; limit: number }) => {
    const params = new URLSearchParams({ limit: String(filters.limit) });
    if (filters.classId) params.set('classId', filters.classId);
    if (filters.search) params.set('search', filters.search);
    return apiRequest<{ subjects: CatalogSubject[]; total: number; schoolYear: number }>(
      `/catalog/subjects?${params}`,
    );
  },
  /** A student sends only the subject; the server knows who they are. */
  requestToJoin: (subjectId: string) =>
    apiRequest<{ enrollment: Enrollment }>('/enrollments', {
      method: 'POST',
      body: { subjectId },
    }),
  /** Every request of the student, of every state (a few at most). */
  myRequests: () =>
    apiRequest<{ enrollments: Enrollment[]; total: number }>('/enrollments?limit=200'),
  /** The progress of the signed-in student in a subject they joined. */
  progress: (subjectId: string) => apiRequest<StudentProgress>(`/subjects/${subjectId}/progress`),
  lesson: (id: string) => apiRequest<{ lesson: StudentLesson }>(`/lessons/${id}`),
  /** Starts the quiz, or goes on with the try that is still open. */
  startTry: (lessonId: string) =>
    apiRequest<{ attempt: QuizTry }>(`/lessons/${lessonId}/quiz/attempts`, { method: 'POST' }),
  answer: (lessonId: string, tryId: string, input: { questionId: string; optionId: string }) =>
    apiRequest<AnswerResult>(`/lessons/${lessonId}/quiz/attempts/${tryId}/answers`, {
      method: 'POST',
      body: input,
    }),
  /** "Završi lekciju". The server decides if it may be pressed (`myProgress.canFinish`). */
  complete: (lessonId: string) =>
    apiRequest<{ progress: MyProgress }>(`/lessons/${lessonId}/complete`, { method: 'POST' }),
  /** The tries of the signed-in student, newest first, with every question and answer. */
  history: (lessonId: string) => apiRequest<QuizHistory>(`/lessons/${lessonId}/quiz/attempts`),
  lessonsOf: (subjectId: string) =>
    apiRequest<{ lessons: LessonListItem[]; total: number }>(
      `/lessons?${new URLSearchParams({ subjectId, limit: '200' })}`,
    ),
  stars: () =>
    apiRequest<{ stars: Star[]; counts: StarCounts }>(
      `/stars?${new URLSearchParams({ limit: '200' })}`,
    ),
};
