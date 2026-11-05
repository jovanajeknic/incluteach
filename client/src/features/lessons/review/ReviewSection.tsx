import { text } from '@/text/sr-Latn';
import type { Lesson } from '../api/lessonsApi';
import { GeneratePanel } from './GeneratePanel';
import { PartState } from './PartState';
import { SummarySection } from './SummarySection';

interface ReviewSectionProps {
  lesson: Lesson;
  /** The text of the lesson has edits that were not saved. */
  textDirty: boolean;
  onDirtyChange: (part: string, dirty: boolean) => void;
}

/** "Sažetak i kviz": asking the AI, then reading, editing and approving what it made. */
export function ReviewSection({ lesson, textDirty, onDirtyChange }: ReviewSectionProps) {
  const t = text.teacher.review;
  const locked = lesson.status === 'published' || lesson.status === 'processing';

  return (
    <section className="mt-10" aria-labelledby="review-heading">
      <h2 id="review-heading" className="font-display text-2xl font-semibold text-ink">
        {t.heading}
      </h2>
      <p className="mt-2 max-w-2xl text-ink-soft">{t.intro}</p>

      <GeneratePanel lesson={lesson} textDirty={textDirty} />
      <SummarySection lesson={lesson} locked={locked} onDirtyChange={onDirtyChange} />
      {lesson.quiz && (
        <div className="mt-8">
          <h3 className="font-display text-xl font-semibold text-ink">{t.generate.quiz}</h3>
          <PartState
            origin={lesson.quiz.origin}
            status={lesson.quiz.status}
            outdated={lesson.quiz.outdated}
          />
        </div>
      )}
    </section>
  );
}
