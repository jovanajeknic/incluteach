import type { ReactNode } from 'react';
import type { Subject } from '@/shared/visual/subjectTypes';
import { cn } from '@/shared/lib/utils';
import { SubjectBlob } from './SubjectBlob';
import { subjectTheme } from './subjectIcons';

/** A subject on its own colour, with a big soft circle in its deeper colour for depth. */
export function SubjectCard({
  subject,
  children,
  headingLevel = 'h3',
}: {
  subject: Subject;
  children?: ReactNode;
  headingLevel?: 'h2' | 'h3';
}) {
  const theme = subjectTheme[subject.color];
  const Heading = headingLevel;
  return (
    <div
      className={cn(
        'group relative h-full overflow-hidden rounded-[2rem] p-6 transition-transform duration-300 ease-bounce hover:-translate-y-1',
        theme.surface,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute -top-10 -right-10 size-36 rounded-full opacity-50 transition-transform duration-500 group-hover:scale-110',
          theme.deep,
        )}
      />
      <div className="relative flex items-center gap-4">
        <SubjectBlob subject={subject} size="lg" className="bg-card" />
        <Heading className="font-display text-xl font-semibold text-ink">{subject.name}</Heading>
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}
