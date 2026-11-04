import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import type { LessonVersionKind, StudentProfile, SupportProfile } from '@/features/student/types';
import { createDemoAiService, type AiService } from './demoAiService';
import { demoSchoolData, demoSubjects } from './demoSchoolData';
import {
  isFullyApproved,
  publishableContent,
  publishedView,
  SchoolContext,
  type LessonEdits,
  type NewLessonInput,
  type NewSuggestion,
  type SchoolStore,
  type VersionEdits,
} from './schoolContext';
import {
  ADAPTED_KINDS,
  teacherClassIds,
  type AdaptedKind,
  type SchoolData,
  type SchoolLesson,
  type SuggestionStatus,
} from './types';

/** Long enough to see the AI at work, short enough for a demo. */
const DEFAULT_AI_DELAY_MS = 2500;

let idCounter = 0;
// crypto.randomUUID() is unavailable over plain http on a LAN address (e.g. testing on a phone).
function createId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

/** Which version kinds a student receives; illustrations go to everyone. */
function receives(profile: SupportProfile, kind: AdaptedKind): boolean {
  if (kind === 'illustrations') return true;
  if (kind === 'audio') return profile.audio;
  return profile.readingVersion === kind;
}

interface DemoSchoolProviderProps {
  children: ReactNode;
  /** Lets tests start from known data. */
  initialData?: SchoolData;
  aiDelayMs?: number;
  /** Lets tests replace the simulated AI, e.g. with one that fails. */
  aiService?: AiService;
}

/**
 * Demo-only school kept in React state above the router: changes survive navigation but are
 * intentionally lost on page reload. Nothing is sent over the network.
 */
export function DemoSchoolProvider({
  children,
  initialData = demoSchoolData,
  aiDelayMs = DEFAULT_AI_DELAY_MS,
  aiService: aiServiceOverride,
}: DemoSchoolProviderProps) {
  const [data, setData] = useState<SchoolData>(initialData);
  const aiService = useMemo(
    () => aiServiceOverride ?? createDemoAiService(aiDelayMs),
    [aiServiceOverride, aiDelayMs],
  );
  // Redo requests per lesson and version, so each redo can give a different result.
  const attempts = useRef(new Map<string, number>());

  const updateLessonById = useCallback(
    (lessonId: string, change: (lesson: SchoolLesson) => SchoolLesson) => {
      setData((current) => ({
        ...current,
        lessons: current.lessons.map((lesson) =>
          lesson.id === lessonId ? change(lesson) : lesson,
        ),
      }));
    },
    [],
  );

  const classOf = useCallback(
    (studentId: string) => data.classes.find((group) => group.studentIds.includes(studentId)),
    [data],
  );

  const studentsOf = useCallback(
    (classId: string): StudentProfile[] => {
      const ids = data.classes.find((group) => group.id === classId)?.studentIds ?? [];
      return data.students.filter((student) => ids.includes(student.id));
    },
    [data],
  );

  const suggestionsForAdaptation = useCallback(
    (lesson: Pick<SchoolLesson, 'id' | 'classId'>) => {
      const ids = new Set(studentsOf(lesson.classId).map((student) => student.id));
      return data.suggestions.filter(
        (item) =>
          item.status === 'use-for-adaptation' &&
          ids.has(item.childId) &&
          (item.lessonId === undefined || item.lessonId === lesson.id),
      );
    },
    [data, studentsOf],
  );

  // Only the teacher's own instructions reach the AI, never what a parent wrote.
  const aiNotesFor = useCallback(
    (lesson: Pick<SchoolLesson, 'id' | 'classId'>) =>
      suggestionsForAdaptation(lesson).flatMap((item) => (item.aiNote ? [item.aiNote] : [])),
    [suggestionsForAdaptation],
  );

  // Takes the lesson itself, so a lesson created in the same click can be generated at once.
  const runFullGeneration = useCallback(
    async (lesson: SchoolLesson) => {
      if (lesson.status === 'processing') return;
      const previousStatus = lesson.status;
      const suggestions = aiNotesFor(lesson);
      updateLessonById(lesson.id, (current) => ({
        ...current,
        status: 'processing',
        aiFailed: undefined,
      }));

      let result: Awaited<ReturnType<AiService['generate']>>;
      try {
        result = await aiService.generate({ lesson, kinds: ADAPTED_KINDS, suggestions });
      } catch {
        // Nothing is lost: the lesson goes back to where it was, with a way to try again.
        updateLessonById(lesson.id, (current) => ({
          ...current,
          status: previousStatus,
          aiFailed: 'all',
        }));
        return;
      }

      updateLessonById(lesson.id, (current) => ({
        ...current,
        // New results replace the working AI versions; the teacher's text stays, and a
        // published lesson keeps showing its published copy until the teacher publishes again.
        versions: [
          ...current.versions.filter((version) => version.kind === 'standard'),
          ...result.versions,
        ],
        glossary: [
          ...current.glossary,
          ...result.glossary.filter(
            (entry) => !current.glossary.some((existing) => existing.term === entry.term),
          ),
        ],
        quiz: current.quiz.length > 0 ? current.quiz : result.quiz,
        extrasApproved: false,
        adaptationCount: (current.adaptationCount ?? 0) + 1,
        // A published lesson stays visible with its approved versions while new ones wait.
        status: previousStatus === 'assigned' ? 'assigned' : 'in_review',
      }));
    },
    [aiService, aiNotesFor, updateLessonById],
  );

  const generateAll = useCallback(
    async (lessonId: string) => {
      const lesson = data.lessons.find((item) => item.id === lessonId);
      if (lesson) await runFullGeneration(lesson);
    },
    [data, runFullGeneration],
  );

  const regenerateVersion = useCallback(
    async (lessonId: string, kind: AdaptedKind, feedback: string) => {
      const lesson = data.lessons.find((item) => item.id === lessonId);
      if (!lesson || lesson.status === 'processing' || lesson.regenerating?.includes(kind)) return;
      const key = `${lessonId}:${kind}`;
      const attempt = (attempts.current.get(key) ?? 0) + 1;
      attempts.current.set(key, attempt);
      const suggestions = aiNotesFor(lesson);
      updateLessonById(lessonId, (current) => ({
        ...current,
        regenerating: [...(current.regenerating ?? []), kind],
        aiFailed: undefined,
      }));

      let result: Awaited<ReturnType<AiService['generate']>>;
      try {
        result = await aiService.generate({
          lesson,
          kinds: [kind],
          suggestions,
          feedback,
          attempt,
        });
      } catch {
        updateLessonById(lessonId, (current) => ({
          ...current,
          regenerating: (current.regenerating ?? []).filter((item) => item !== kind),
          aiFailed: kind,
        }));
        return;
      }

      updateLessonById(lessonId, (current) => ({
        ...current,
        versions: [
          ...current.versions.filter((version) => version.kind !== kind),
          ...result.versions,
        ],
        regenerating: (current.regenerating ?? []).filter((item) => item !== kind),
        // The new version needs a fresh look before the lesson counts as approved again.
        status: current.status === 'approved' ? 'in_review' : current.status,
      }));
    },
    [data, aiService, aiNotesFor, updateLessonById],
  );

  const createLesson = useCallback(
    (input: NewLessonInput): SchoolLesson => {
      const group = data.classes.find((item) => item.id === input.classId);
      const lesson: SchoolLesson = {
        id: createId('lesson'),
        title: input.title,
        subjectId: input.subjectId,
        classId: input.classId,
        grade: group?.grade ?? 0,
        status: 'draft',
        versions: [
          { kind: 'standard', source: 'teacher', approvedByTeacher: true, content: input.content },
        ],
        glossary: [],
        quiz: [],
      };
      // Newest first, so the teacher sees the new lesson at the top of the list.
      setData((current) => ({ ...current, lessons: [lesson, ...current.lessons] }));
      void runFullGeneration(lesson);
      return lesson;
    },
    [data, runFullGeneration],
  );

  const updateVersion = useCallback(
    (lessonId: string, kind: LessonVersionKind, edits: VersionEdits) =>
      updateLessonById(lessonId, (lesson) => {
        const before = lesson.versions.find((version) => version.kind === kind);
        const textChanged =
          kind === 'standard' && edits.content !== undefined && edits.content !== before?.content;
        return {
          ...lesson,
          versions: lesson.versions.map((version) => {
            if (version.kind === kind) return { ...version, ...edits };
            // Versions made from the old teacher text must be looked at again.
            return textChanged ? { ...version, stale: true } : version;
          }),
          extrasApproved: textChanged ? false : lesson.extrasApproved,
          status: textChanged && lesson.status === 'approved' ? 'in_review' : lesson.status,
        };
      }),
    [updateLessonById],
  );

  const approveVersion = useCallback(
    (lessonId: string, kind: AdaptedKind) =>
      updateLessonById(lessonId, (lesson) => {
        const next: SchoolLesson = {
          ...lesson,
          versions: lesson.versions.map((version) =>
            version.kind === kind ? { ...version, approvedByTeacher: true, stale: false } : version,
          ),
        };
        return lesson.status === 'in_review' && isFullyApproved(next)
          ? { ...next, status: 'approved' }
          : next;
      }),
    [updateLessonById],
  );

  const approveExtras = useCallback(
    (lessonId: string) =>
      updateLessonById(lessonId, (lesson) => {
        const next: SchoolLesson = { ...lesson, extrasApproved: true };
        return lesson.status === 'in_review' && isFullyApproved(next)
          ? { ...next, status: 'approved' }
          : next;
      }),
    [updateLessonById],
  );

  const publishLesson = useCallback(
    (lessonId: string) =>
      updateLessonById(lessonId, (lesson) =>
        // Only fully approved content can be published; the UI also prevents it.
        isFullyApproved(lesson)
          ? { ...lesson, status: 'assigned', published: publishableContent(lesson) }
          : lesson,
      ),
    [updateLessonById],
  );

  const unpublishLesson = useCallback(
    (lessonId: string) =>
      updateLessonById(lessonId, (lesson) =>
        lesson.status === 'assigned'
          ? {
              ...lesson,
              published: undefined,
              status: isFullyApproved(lesson) ? 'approved' : 'in_review',
            }
          : lesson,
      ),
    [updateLessonById],
  );

  const deleteLesson = useCallback((lessonId: string) => {
    setData((current) => ({
      ...current,
      // A published lesson must be taken back first, so nothing disappears from students.
      lessons: current.lessons.filter(
        (lesson) => lesson.id !== lessonId || lesson.status === 'assigned',
      ),
    }));
  }, []);

  const updateLesson = useCallback(
    (lessonId: string, edits: LessonEdits) =>
      updateLessonById(lessonId, (lesson) => ({ ...lesson, ...edits })),
    [updateLessonById],
  );

  const setStudentSupport = useCallback((studentId: string, profile: SupportProfile) => {
    setData((current) => ({
      ...current,
      students: current.students.map((student) =>
        student.id === studentId ? { ...student, supportProfile: profile } : student,
      ),
    }));
  }, []);

  const setSuggestionStatus = useCallback((suggestionId: string, status: SuggestionStatus) => {
    setData((current) => ({
      ...current,
      suggestions: current.suggestions.map((item) =>
        item.id === suggestionId ? { ...item, status } : item,
      ),
    }));
  }, []);

  const useSuggestionForAi = useCallback((suggestionId: string, aiNote: string) => {
    setData((current) => ({
      ...current,
      suggestions: current.suggestions.map((item) =>
        item.id === suggestionId ? { ...item, status: 'use-for-adaptation', aiNote } : item,
      ),
    }));
  }, []);

  const unmarkLessonDone = useCallback((studentId: string, lessonId: string) => {
    setData((current) =>
      current.progress[studentId]?.[lessonId] !== 'completed'
        ? current
        : {
            ...current,
            progress: {
              ...current.progress,
              [studentId]: { ...current.progress[studentId], [lessonId]: 'started' },
            },
          },
    );
  }, []);

  const addSuggestion = useCallback((suggestion: NewSuggestion) => {
    setData((current) => ({
      ...current,
      suggestions: [
        {
          ...suggestion,
          id: createId('suggestion'),
          createdAt: new Date().toISOString(),
          status: 'pending-teacher',
        },
        ...current.suggestions,
      ],
    }));
  }, []);

  const markStarted = useCallback((studentId: string, lessonId: string) => {
    setData((current) => {
      if (current.progress[studentId]?.[lessonId]) return current;
      return {
        ...current,
        progress: {
          ...current.progress,
          [studentId]: { ...current.progress[studentId], [lessonId]: 'started' },
        },
      };
    });
  }, []);

  const markLessonDone = useCallback((studentId: string, lessonId: string) => {
    setData((current) => ({
      ...current,
      progress: {
        ...current.progress,
        [studentId]: { ...current.progress[studentId], [lessonId]: 'completed' },
      },
    }));
  }, []);

  const recordPractice = useCallback(
    (studentId: string, lessonId: string, difficultQuestionIds: readonly string[]) => {
      setData((current) => ({
        ...current,
        // Doing the quiz means the lesson was at least opened.
        progress: {
          ...current.progress,
          [studentId]: {
            ...current.progress[studentId],
            [lessonId]: current.progress[studentId]?.[lessonId] ?? 'started',
          },
        },
        // Only the latest practice is kept: it shows where help is useful now.
        practice: {
          ...current.practice,
          [studentId]: {
            ...current.practice[studentId],
            [lessonId]: {
              completedAt: new Date().toISOString(),
              difficultQuestionIds: [...difficultQuestionIds],
            },
          },
        },
      }));
    },
    [],
  );

  const store = useMemo<SchoolStore>(() => {
    const getStudent = (id: string) => data.students.find((student) => student.id === id);
    const ownClassIds = teacherClassIds(data.teacher);
    // Students and parents only ever get the published copy of a lesson.
    const visibleLessonsFor = (studentId: string): SchoolLesson[] => {
      const group = classOf(studentId);
      if (!getStudent(studentId) || !group) return [];
      return data.lessons
        .filter((lesson) => lesson.classId === group.id)
        .flatMap((lesson) => publishedView(lesson) ?? []);
    };
    const teachesCourse = (subjectId: string, classId: string) =>
      data.teacher.teaching.some(
        (item) => item.subjectId === subjectId && item.classId === classId,
      );
    const isClassTeacherOf = (studentId: string) =>
      classOf(studentId)?.classTeacherId === data.teacher.id;
    return {
      data,
      subjects: demoSubjects,
      getStudent,
      getLesson: (id) => data.lessons.find((lesson) => lesson.id === id),
      getClass: (id) => data.classes.find((group) => group.id === id),
      getSubject: (id) => demoSubjects.find((subject) => subject.id === id),
      classOf,
      teachesStudent: (studentId) => {
        const group = classOf(studentId);
        return group !== undefined && ownClassIds.includes(group.id);
      },
      teachesCourse,
      isClassTeacherOf,
      lessonsVisibleToTeacher: (studentId) =>
        visibleLessonsFor(studentId).filter(
          (lesson) =>
            isClassTeacherOf(studentId) || teachesCourse(lesson.subjectId, lesson.classId),
        ),
      createLesson,
      generateAll,
      regenerateVersion,
      updateVersion,
      approveVersion,
      approveExtras,
      publishLesson,
      unpublishLesson,
      deleteLesson,
      updateLesson,
      studentsOf,
      versionAudience: (lesson) => {
        const students = studentsOf(lesson.classId);
        return Object.fromEntries(
          ADAPTED_KINDS.map((kind) => [
            kind,
            students.filter((student) => receives(student.supportProfile, kind)).length,
          ]),
        ) as Record<AdaptedKind, number>;
      },
      suggestionsForAdaptation,
      setStudentSupport,
      setSuggestionStatus,
      useSuggestionForAi,
      suggestionsForTeacher: () =>
        data.suggestions.filter((item) => {
          const lesson = item.lessonId
            ? data.lessons.find((entry) => entry.id === item.lessonId)
            : undefined;
          return lesson
            ? teachesCourse(lesson.subjectId, lesson.classId)
            : isClassTeacherOf(item.childId);
        }),
      visibleLessonsFor,
      progressOf: (studentId, lessonId) => data.progress[studentId]?.[lessonId] ?? 'new',
      practiceOf: (studentId, lessonId) => data.practice[studentId]?.[lessonId],
      markStarted,
      markLessonDone,
      unmarkLessonDone,
      recordPractice,
      starsOf: (studentId) =>
        visibleLessonsFor(studentId).reduce(
          (sum, lesson) =>
            sum +
            (data.progress[studentId]?.[lesson.id] === 'completed' ? 1 : 0) +
            (data.practice[studentId]?.[lesson.id] ? 1 : 0),
          0,
        ),
      addSuggestion,
    };
  }, [
    data,
    classOf,
    createLesson,
    generateAll,
    regenerateVersion,
    updateVersion,
    approveVersion,
    approveExtras,
    publishLesson,
    unpublishLesson,
    deleteLesson,
    updateLesson,
    studentsOf,
    suggestionsForAdaptation,
    setStudentSupport,
    setSuggestionStatus,
    useSuggestionForAi,
    unmarkLessonDone,
    markStarted,
    markLessonDone,
    recordPractice,
    addSuggestion,
  ]);

  return <SchoolContext value={store}>{children}</SchoolContext>;
}
