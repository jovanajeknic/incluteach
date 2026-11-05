import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';
import { GlossaryTerm } from './GlossaryTerm';
import { sentenceParts, splitParagraphs } from './sentences';

export interface GlossaryItem {
  term: string;
  definition: string;
}

interface LessonContentProps {
  content: string;
  /** Overrides font, size and spacing, e.g. from the student's reading preferences. */
  className?: string;
  /** Harder words that get a tap-to-explain button. */
  glossary?: readonly GlossaryItem[];
  /** Index of the sentence being read aloud, across the whole content. */
  activeSentence?: number | null;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Wraps glossary words in a sentence; longer terms win, so "vodena para" beats "para". */
function withGlossary(sentence: string, glossary: readonly GlossaryItem[]): ReactNode {
  if (glossary.length === 0) return sentence;
  const terms = [...glossary].sort((a, b) => b.term.length - a.term.length);
  // \p{L} instead of \b, because \b does not treat č, ć, š, ž and đ as letters.
  const pattern = new RegExp(
    `(?<!\\p{L})(${terms.map((entry) => escapeRegExp(entry.term)).join('|')})(?!\\p{L})`,
    'giu',
  );
  const parts = sentence.split(pattern);
  return parts.map((part, index) => {
    if (index % 2 === 0) return part;
    const entry = terms.find((item) => item.term.toLowerCase() === part.toLowerCase());
    return entry ? <GlossaryTerm key={index} word={part} definition={entry.definition} /> : part;
  });
}

/**
 * The single renderer for lesson text, used by teacher review and the student reading view,
 * so both always show content the same way.
 */
export function LessonContent({
  content,
  className,
  glossary = [],
  activeSentence = null,
}: LessonContentProps) {
  let sentenceIndex = 0;

  return (
    <div className={cn('max-w-prose space-y-4 text-lg leading-relaxed', className)}>
      {splitParagraphs(content).map((paragraph, paragraphIndex) => (
        // Paragraphs have no stable id and the list is static for a given content string.
        // pre-line: single line breaks of the text (lists, headings) are kept. On paper a
        // paragraph is not split between two pages when it fits on one.
        <p key={paragraphIndex} className="whitespace-pre-line print:break-inside-avoid">
          {sentenceParts(paragraph).map(({ lead, text: sentence }, index) => {
            const current = sentenceIndex++;
            const active = current === activeSentence;
            return (
              <span key={index}>
                {index > 0 && (lead.includes('\n') ? lead : ' ')}
                <span
                  data-sentence={current}
                  data-active={active || undefined}
                  className={cn(
                    'rounded-md transition-colors duration-200',
                    active && 'bg-butter-deep/70 box-decoration-clone',
                  )}
                >
                  {withGlossary(sentence, glossary)}
                </span>
              </span>
            );
          })}
        </p>
      ))}
    </div>
  );
}
