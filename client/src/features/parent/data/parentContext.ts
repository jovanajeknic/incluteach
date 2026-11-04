import { createContext, useContext } from 'react';
import type { Subject } from '@/features/student/types';
import type { ChildData, ParentProfile, Suggestion } from '../types';

export type { NewSuggestion } from '@/features/school/schoolContext';
import type { NewSuggestion } from '@/features/school/schoolContext';

/** What parent screens may do. Only linked children are ever reachable through it. */
export interface ParentStore {
  parent: ParentProfile;
  children: readonly ChildData[];
  subjects: readonly Subject[];
  /** Undefined for any child that is not linked to this parent. */
  getChild: (childId: string) => ChildData | undefined;
  suggestionsFor: (childId: string, lessonId?: string) => Suggestion[];
  addSuggestion: (suggestion: NewSuggestion) => void;
}

export const ParentContext = createContext<ParentStore | null>(null);

export function useParent(): ParentStore {
  const store = useContext(ParentContext);
  if (!store) {
    throw new Error('useParent must be used inside <DemoParentProvider>');
  }
  return store;
}
