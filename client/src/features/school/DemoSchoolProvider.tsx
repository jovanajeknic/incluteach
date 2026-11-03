import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { pickLessonVersion } from '@/features/student/lessonVersion';
import type { LessonVersionKind, StudentProfile, SupportProfile } from '@/features/student/types';
import { createDemoAiService } from './demoAiService';
import { demoSchoolData, demoSubjects } from './demoSchoolData';
import {
  SchoolContext,
  type LessonEdits,
  type NeededVersion,
  type NewLessonInput,
  type NewSuggestion,
  type SchoolStore,
} from './schoolContext';
import { ADAPTED_KINDS, type SchoolData, type SchoolLesson, type SuggestionStatus } from './types';

/** Long enough to see the "processing" state, short enough for a demo. */
const DEFAULT_AI_DELAY_MS = 2500;

let idCounter = 0;
// crypto.randomUUID() is unavailable over plain http on a LAN address (e.g. testing on a phone).
function createId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

const needsKind: Record<(typeof ADAPTED_KINDS)[number], (needs: SupportProfile) => boolean> = {
  simplified: (needs) => needs.preferSimplifiedText,
  examples: (needs) => needs.preferMoreExamples,
};

interface DemoSchoolProviderProps {
  children: ReactNode;
  /** Lets tests start from known data. */
  initialData?: SchoolData;
  aiDelayMs?: number;
}

/**
 * Demo-only school kept in React state above the router: changes survive navigation but are
 * intentionally lost on page reload. Nothing is sent over the network.
 */
export function DemoSchoolProvider({
  children,
  initialData = demoSchoolData,
  aiDelayMs = DEFAULT_AI_DELAY_MS,
}: DemoSchoolProviderProps) {
  const [data, setData] = useState<SchoolData>(initialData);
  const aiService = useMemo(() => createDemoAiService(aiDelayMs), [aiDelayMs]);

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
    (studentId: string, source: SchoolData = data) =>
      source.classes.find((group) => group.studentIds.includes(studentId)),
    [data],
  );

  const targetStudents = useCallback(
    (lesson: SchoolLesson, source: SchoolData = data): StudentProfile[] => {
      const assigned = lesson.assignedClassIds.length > 0 || lesson.assignedStudentIds.length > 0;
      const classIds = assigned ? lesson.assignedClassIds : source.teacher.classIds;
      const ids = new Set([
        ...source.classes
          .filter((group) => classIds.includes(group.id))
          .flatMap((group) => group.studentIds),
        ...lesson.assignedStudentIds,
      ]);
      return source.students.filter((student) => ids.has(student.id));
    },
    [data],
  );

  const neededVersions = useCallback(
    (lesson: SchoolLesson, source: SchoolData = data): NeededVersion[] => {
      const students = targetStudents(lesson, source);
      return ADAPTED_KINDS.map((kind) => ({
        kind,
        studentCount: students.filter((student) => needsKind[kind](student.supportProfile)).length,
      })).filter((entry) => entry.studentCount > 0);
    },
    [data, targetStudents],
  );

  const suggestionsForAdaptation = useCallback(
    (lesson: SchoolLesson, source: SchoolData = data) => {
      const ids = new Set(targetStudents(lesson, source).map((student) => student.id));
      return source.suggestions.filter(
        (item) =>
          item.status === 'use-for-adaptation' &&
          ids.has(item.childId) &&
          (item.lessonId === undefined || item.lessonId === lesson.id),
      );
    },
    [data, targetStudents],
  );

  const requestAdaptation = useCallback(
    async (lessonId: string) => {
      const lesson = data.lessons.find((item) => item.id === lessonId);
      if (!lesson || lesson.status === 'processing') return;
      const previousStatus = lesson.status;
      const kinds: readonly string[] = neededVersions(lesson).map((entry) => entry.kind);
      const suggestions = suggestionsForAdaptation(lesson).map((item) => item.text);
      updateLessonById(lessonId, (current) => ({ ...current, status: 'processing' }));

      const result = await aiService.adapt({
        lesson,
        kinds: neededVersions(lesson).map((entry) => entry.kind),
        suggestions,
      });

      updateLessonById(lessonId, (current) => ({
        ...current,
        // New suggestions replace older versions of the same kind; the teacher's text stays.
        versions: [
          ...current.versions.filter((version) => !kinds.includes(version.kind)),
          ...result.versions,
        ],
        glossary: [
          ...current.glossary,
          ...result.glossary.filter(
            (entry) => !current.glossary.some((existing) => existing.term === entry.term),
          ),
        ],
        quiz: current.quiz.length > 0 ? current.quiz : result.quiz,
        adaptationCount: (current.adaptationCount ?? 0) + 1,
        // An assigned lesson stays visible with its approved versions while new ones wait.
        status: previousStatus === 'assigned' ? 'assigned' : 'in_review',
      }));
    },
    [data, aiService, neededVersions, suggestionsForAdaptation, updateLessonById],
  );

  const createDraft = useCallback((input: NewLessonInput): SchoolLesson => {
    const lesson: SchoolLesson = {
      id: createId('lesson'),
      title: input.title,
      subjectId: input.subjectId,
      grade: input.grade,
      status: 'draft',
      assignedClassIds: [],
      assignedStudentIds: [],
      versions: [
        { kind: 'standard', source: 'teacher', approvedByTeacher: true, content: input.content },
      ],
      glossary: [],
      quiz: [],
    };
    // Newest first, so the teacher sees the new draft at the top of the list.
    setData((current) => ({ ...current, lessons: [lesson, ...current.lessons] }));
    return lesson;
  }, []);

  const updateVersionContent = useCallback(
    (lessonId: string, kind: LessonVersionKind, content: string) =>
      updateLessonById(lessonId, (lesson) => ({
        ...lesson,
        versions: lesson.versions.map((version) =>
          version.kind === kind ? { ...version, content } : version,
        ),
      })),
    [updateLessonById],
  );

  const removeVersion = useCallback(
    (lessonId: string, kind: LessonVersionKind) =>
      updateLessonById(lessonId, (lesson) => ({
        ...lesson,
        versions: lesson.versions.filter((version) => version.kind !== kind),
      })),
    [updateLessonById],
  );

  const updateLesson = useCallback(
    (lessonId: string, edits: LessonEdits) =>
      updateLessonById(lessonId, (lesson) => ({ ...lesson, ...edits })),
    [updateLessonById],
  );

  const approveLesson = useCallback(
    (lessonId: string) =>
      updateLessonById(lessonId, (lesson) => ({
        ...lesson,
        versions: lesson.versions.map((version) => ({ ...version, approvedByTeacher: true })),
        status: lesson.status === 'assigned' ? 'assigned' : 'approved',
      })),
    [updateLessonById],
  );

  const assignLesson = useCallback(
    (lessonId: string, target: { classIds: string[]; studentIds: string[] }) =>
      updateLessonById(lessonId, (lesson) =>
        // Only approved content can be assigned; the UI also prevents it.
        lesson.status === 'approved' || lesson.status === 'assigned'
          ? {
              ...lesson,
              assignedClassIds: target.classIds,
              assignedStudentIds: target.studentIds,
              status: 'assigned',
            }
          : lesson,
      ),
    [updateLessonById],
  );

  const setStudentNeeds = useCallback((studentId: string, needs: SupportProfile) => {
    setData((current) => ({
      ...current,
      students: current.students.map((student) =>
        student.id === studentId ? { ...student, supportProfile: needs } : student,
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

  const markCompleted = useCallback(
    (studentId: string, lessonId: string, difficultQuestionIds: readonly string[]) => {
      setData((current) => ({
        ...current,
        progress: {
          ...current.progress,
          [studentId]: { ...current.progress[studentId], [lessonId]: 'completed' },
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
    return {
      data,
      subjects: demoSubjects,
      getStudent,
      getLesson: (id) => data.lessons.find((lesson) => lesson.id === id),
      getClass: (id) => data.classes.find((group) => group.id === id),
      classOf: (studentId) => classOf(studentId),
      createDraft,
      updateVersionContent,
      removeVersion,
      updateLesson,
      targetStudents: (lesson) => targetStudents(lesson),
      neededVersions: (lesson) => neededVersions(lesson),
      suggestionsForAdaptation: (lesson) => suggestionsForAdaptation(lesson),
      requestAdaptation,
      approveLesson,
      assignLesson,
      setStudentNeeds,
      setSuggestionStatus,
      visibleLessonsFor: (studentId) => {
        const student = getStudent(studentId);
        const group = classOf(studentId);
        if (!student) return [];
        return data.lessons.filter(
          (lesson) =>
            lesson.status === 'assigned' &&
            ((group && lesson.assignedClassIds.includes(group.id)) ||
              lesson.assignedStudentIds.includes(studentId)) &&
            pickLessonVersion(lesson, student.supportProfile) !== undefined,
        );
      },
      progressOf: (studentId, lessonId) => data.progress[studentId]?.[lessonId] ?? 'new',
      practiceOf: (studentId, lessonId) => data.practice[studentId]?.[lessonId],
      markStarted,
      markCompleted,
      addSuggestion,
    };
  }, [
    data,
    classOf,
    createDraft,
    updateVersionContent,
    removeVersion,
    updateLesson,
    targetStudents,
    neededVersions,
    suggestionsForAdaptation,
    requestAdaptation,
    approveLesson,
    assignLesson,
    setStudentNeeds,
    setSuggestionStatus,
    markStarted,
    markCompleted,
    addSuggestion,
  ]);

  return <SchoolContext value={store}>{children}</SchoolContext>;
}
