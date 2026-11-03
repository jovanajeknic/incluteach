import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { demoStudentLessons } from '@/features/student/data/demoStudentData';
import { useStudent } from '@/features/student/data/studentContext';
import { pickLessonVersion } from '@/features/student/lessonVersion';
import type { ChildData, ParentProfile, Suggestion } from '../types';
import {
  demoParent,
  demoSecondChild,
  demoSecondChildPractice,
  demoSecondChildProgress,
} from './demoParentData';
import { ParentContext, type NewSuggestion, type ParentStore } from './parentContext';

let suggestionCounter = 0;

function createSuggestionId(): string {
  suggestionCounter += 1;
  return `suggestion-${Date.now()}-${suggestionCounter}`;
}

interface DemoParentProviderProps {
  children: ReactNode;
  parent?: ParentProfile;
}

/**
 * Demo-only parent store. The demo student's progress is read live from the student area,
 * so finishing a practice there shows up here. Suggestions stay in memory and are never sent.
 */
export function DemoParentProvider({ children, parent = demoParent }: DemoParentProviderProps) {
  const student = useStudent();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const linkedChildren = useMemo<ChildData[]>(() => {
    const live: ChildData = {
      profile: student.profile,
      lessons: student.lessons,
      progressOf: student.progressOf,
      practiceOf: student.practiceOf,
    };
    const second: ChildData = {
      profile: demoSecondChild,
      lessons: demoStudentLessons.filter((lesson) =>
        pickLessonVersion(lesson, demoSecondChild.supportProfile),
      ),
      progressOf: (lessonId) => demoSecondChildProgress[lessonId] ?? 'new',
      practiceOf: (lessonId) => demoSecondChildPractice[lessonId],
    };
    // Only children linked to this parent are exposed; everything else is unreachable.
    return [live, second].filter((child) => parent.childIds.includes(child.profile.id));
  }, [student, parent]);

  const addSuggestion = useCallback((suggestion: NewSuggestion) => {
    setSuggestions((current) => [
      {
        ...suggestion,
        id: createSuggestionId(),
        createdAt: new Date().toISOString(),
        status: 'pending-teacher',
      },
      ...current,
    ]);
  }, []);

  const store = useMemo<ParentStore>(
    () => ({
      parent,
      children: linkedChildren,
      subjects: student.subjects,
      getChild: (childId) => linkedChildren.find((child) => child.profile.id === childId),
      suggestionsFor: (childId, lessonId) =>
        suggestions.filter(
          (item) =>
            item.childId === childId && (lessonId === undefined || item.lessonId === lessonId),
        ),
      addSuggestion,
    }),
    [parent, linkedChildren, student.subjects, suggestions, addSuggestion],
  );

  return <ParentContext value={store}>{children}</ParentContext>;
}
