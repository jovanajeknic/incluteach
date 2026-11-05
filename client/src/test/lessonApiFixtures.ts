import type {
  Lesson,
  LessonListItem,
  Quiz,
  QuizQuestionInput,
  Summary,
  TeacherSubject,
} from '@/features/lessons/api/lessonsApi';

// Fictional subjects and lessons, in the shape the API answers with.

export const biology5b: TeacherSubject = {
  id: '10000000-0000-4000-8000-000000000001',
  name: 'Biologija',
  classId: '20000000-0000-4000-8000-000000000001',
  className: '5-2',
  schoolYear: 2026,
  studentCount: 3,
  lessonCounts: { draft: 1, processing: 0, in_review: 1, published: 1 },
};

export const math5a: TeacherSubject = {
  id: '10000000-0000-4000-8000-000000000002',
  name: 'Matematika',
  classId: '20000000-0000-4000-8000-000000000002',
  className: '5-1',
  schoolYear: 2026,
  studentCount: 0,
  lessonCounts: { draft: 0, processing: 0, in_review: 0, published: 0 },
};

export const math5b: TeacherSubject = {
  ...math5a,
  id: '10000000-0000-4000-8000-000000000003',
  classId: biology5b.classId,
  className: '5-2',
  studentCount: 2,
};

export function listItem(overrides: Partial<LessonListItem> = {}): LessonListItem {
  return {
    id: '30000000-0000-4000-8000-000000000001',
    title: 'Fotosinteza',
    status: 'draft',
    subject: {
      id: biology5b.id,
      name: biology5b.name,
      className: biology5b.className,
      schoolYear: 2026,
    },
    publishedAt: null,
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-02T10:00:00.000Z',
    ...overrides,
  };
}

export function lessonOf(overrides: Partial<Lesson> = {}): Lesson {
  const base = listItem();
  return {
    ...base,
    body: 'Biljke prave hranu uz pomoć svjetlosti.\n\nTo se zove fotosinteza.',
    source: 'pasted',
    sourceFileName: null,
    bodyRevision: 1,
    processingError: null,
    subject: { ...base.subject, teacher: { id: 'teacher-1', fullName: 'Milica Petrović' } },
    summary: null,
    quiz: null,
    ...overrides,
  };
}

/** A summary as the teacher gets it; the points are short sentences. */
export function summaryOf(overrides: Partial<Summary> = {}): Summary {
  return {
    origin: 'ai',
    status: 'draft',
    outdated: false,
    approvedAt: null,
    updatedAt: '2026-11-05T10:00:00.000Z',
    points: ['Biljke prave hranu.', 'Za to im treba svjetlost.'],
    ...overrides,
  };
}

/** The questions of the usual test quiz, in the shape the teacher sends them. */
export const quizQuestions: QuizQuestionInput[] = [
  {
    kind: 'choice',
    prompt: 'Šta biljke prave uz svjetlost?',
    explanation: 'Biljke prave hranu uz pomoć svjetlosti.',
    options: [
      { text: 'Hranu', isCorrect: true },
      { text: 'Vodu', isCorrect: false },
      { text: 'Kamen', isCorrect: false },
    ],
  },
  {
    kind: 'true_false',
    prompt: 'Biljke diše kroz lišće.',
    options: [
      { text: 'Tačno', isCorrect: true },
      { text: 'Netačno', isCorrect: false },
    ],
  },
];

/** A quiz as the teacher gets it, made from the questions in the form they are sent in. */
export function quizOf(
  overrides: Partial<Quiz> = {},
  questions: QuizQuestionInput[] = quizQuestions,
): Quiz {
  return {
    origin: 'ai',
    status: 'draft',
    outdated: false,
    approvedAt: null,
    updatedAt: '2026-11-05T10:00:00.000Z',
    questions: questions.map((question, index) => ({
      id: `q${index + 1}`,
      position: index + 1,
      kind: question.kind,
      prompt: question.prompt,
      explanation: question.explanation ?? null,
      options: question.options.map((option, optionIndex) => ({
        id: `q${index + 1}o${optionIndex + 1}`,
        position: optionIndex + 1,
        text: option.text,
        isCorrect: option.isCorrect,
      })),
    })),
    ...overrides,
  };
}
