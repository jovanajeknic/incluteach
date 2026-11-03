import { useCallback, useMemo, useState, type ReactNode } from 'react';
import type { Lesson, NewLessonInput } from '../types';
import { demoLessons } from './demoLessons';
import { LessonsContext, type LessonsStore } from './lessonsContext';

interface DemoLessonsProviderProps {
  children: ReactNode;
  /** Lets tests start from a known set of lessons. */
  initialLessons?: readonly Lesson[];
}

let draftCounter = 0;

// crypto.randomUUID() is unavailable over plain http on a LAN address (e.g. testing on a phone),
// and demo ids only need to be unique within one page session.
function createDraftId(): string {
  draftCounter += 1;
  return `draft-${Date.now()}-${draftCounter}`;
}

/**
 * Demo-only lesson store kept in React state. It lives above the router, so data
 * survives navigation, but it is intentionally lost on page reload.
 */
export function DemoLessonsProvider({
  children,
  initialLessons = demoLessons,
}: DemoLessonsProviderProps) {
  const [lessons, setLessons] = useState<readonly Lesson[]>(initialLessons);

  const getLessonById = useCallback(
    (id: string) => lessons.find((lesson) => lesson.id === id),
    [lessons],
  );

  const createDraft = useCallback((input: NewLessonInput) => {
    const lesson: Lesson = { ...input, id: createDraftId(), status: 'draft' };
    // Newest first, so the teacher sees the new draft at the top of the list.
    setLessons((current) => [lesson, ...current]);
    return lesson;
  }, []);

  const store = useMemo<LessonsStore>(
    () => ({ lessons, getLessonById, createDraft }),
    [lessons, getLessonById, createDraft],
  );

  return <LessonsContext value={store}>{children}</LessonsContext>;
}
