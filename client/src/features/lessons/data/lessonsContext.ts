import { createContext, useContext } from 'react';
import type { Lesson, NewLessonInput } from '../types';

/**
 * What screens may do with lessons. Screens depend only on this interface,
 * so the in-memory demo store can later be replaced by API calls without changing them.
 */
export interface LessonsStore {
  lessons: readonly Lesson[];
  getLessonById: (id: string) => Lesson | undefined;
  createDraft: (input: NewLessonInput) => Lesson;
}

export const LessonsContext = createContext<LessonsStore | null>(null);

export function useLessons(): LessonsStore {
  const store = useContext(LessonsContext);
  if (!store) {
    throw new Error('useLessons must be used inside <LessonsProvider>');
  }
  return store;
}
