import { useMemo, type ReactNode } from 'react';
import { useSchool } from '@/features/school/schoolContext';
import type { ChildData } from '../types';
import { ParentContext, type ParentStore } from './parentContext';

/**
 * The parent's view of the shared demo school. Only children linked to this parent are
 * exposed; everything else is unreachable. Suggestions go to the teacher, never to the child.
 */
export function DemoParentProvider({ children }: { children: ReactNode }) {
  const school = useSchool();
  const { parent } = school.data;

  const store = useMemo<ParentStore>(() => {
    const linkedChildren: ChildData[] = parent.childIds.flatMap((childId) => {
      const profile = school.getStudent(childId);
      if (!profile) return [];
      return [
        {
          profile,
          lessons: school.visibleLessonsFor(childId),
          progressOf: (lessonId) => school.progressOf(childId, lessonId),
          practiceOf: (lessonId) => school.practiceOf(childId, lessonId),
          className: school.classOf(childId)?.name,
          stars: school.starsOf(childId),
        },
      ];
    });
    return {
      parent,
      children: linkedChildren,
      subjects: school.subjects,
      getChild: (childId) => linkedChildren.find((child) => child.profile.id === childId),
      suggestionsFor: (childId, lessonId) =>
        school.data.suggestions.filter(
          (item) =>
            item.childId === childId && (lessonId === undefined || item.lessonId === lessonId),
        ),
      addSuggestion: school.addSuggestion,
    };
  }, [school, parent]);

  return <ParentContext value={store}>{children}</ParentContext>;
}
