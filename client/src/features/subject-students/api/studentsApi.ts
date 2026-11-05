import { apiRequest } from '@/shared/api/apiClient';

/** Limits of the API (see API-CONTRACT.md, "Stars"). */
export const STAR_MESSAGE_MAX_LENGTH = 200;

export interface StarCounts {
  /** Earned by finishing a lesson. */
  automatic: number;
  /** Given by a teacher. */
  teacher: number;
}

export interface PersonRef {
  id: string;
  fullName: string;
}

/** One row of the teacher's table of a subject, already sorted by the server. */
export interface RankedStudent {
  /** Equal students share a rank (1, 2, 3, 3, 5). */
  rank: number;
  student: PersonRef;
  completedLessons: number;
  stars: StarCounts;
}

export interface SubjectStudents {
  subject: { id: string; name: string };
  publishedLessons: number;
  students: RankedStudent[];
}

export interface ProgressItem {
  id: string;
  title: string;
  completed: boolean;
  completedAt: string | null;
}

export interface StudentProgress {
  student: PersonRef;
  subject: { id: string; name: string };
  lessons: { published: number; completed: number };
  stars: StarCounts;
  items: ProgressItem[];
}

export interface Star {
  id: string;
  source: 'automatic' | 'teacher';
  student: PersonRef;
  subject: { id: string; name: string };
  /** Set for an automatic star. */
  lesson: { id: string; title: string } | null;
  /** Set for a star from a teacher. */
  message: string | null;
  givenBy: PersonRef | null;
  createdAt: string;
}

export interface QuizAnswer {
  position: number;
  kind: 'choice' | 'true_false';
  prompt: string;
  chosenText: string;
  correctText: string;
  explanation: string | null;
  correct: boolean;
}

export interface QuizAttempt {
  id: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  allCorrect: boolean | null;
  answers: QuizAnswer[];
}

export interface QuizHistory {
  student: PersonRef;
  completedAt: string | null;
  attempts: QuizAttempt[];
}

export const studentsApi = {
  ranking: (subjectId: string) =>
    apiRequest<SubjectStudents>(`/subjects/${subjectId}/progress/students`),
  progress: (subjectId: string, studentId: string) =>
    apiRequest<StudentProgress>(
      `/subjects/${subjectId}/progress?${new URLSearchParams({ studentId })}`,
    ),
  stars: (subjectId: string, studentId: string) =>
    apiRequest<{ stars: Star[]; counts: StarCounts }>(
      `/stars?${new URLSearchParams({ subjectId, studentId, limit: '200' })}`,
    ),
  giveStar: (input: { studentId: string; subjectId: string; message: string }) =>
    apiRequest<{ star: Star }>('/stars', { method: 'POST', body: input }),
  takeBackStar: (id: string) => apiRequest<void>(`/stars/${id}`, { method: 'DELETE' }),
  quizHistory: (lessonId: string, studentId: string) =>
    apiRequest<QuizHistory>(
      `/lessons/${lessonId}/quiz/attempts?${new URLSearchParams({ studentId })}`,
    ),
};
