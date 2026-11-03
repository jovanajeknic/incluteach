import { text } from '@/text/sr-Latn';
import type { LessonStats } from '../lessonStats';

interface LessonStatsCardsProps {
  stats: LessonStats;
}

export function LessonStatsCards({ stats }: LessonStatsCardsProps) {
  const t = text.dashboard;
  const items = [
    { label: t.statTotal, value: stats.total },
    { label: t.statInReview, value: stats.inReview },
    { label: t.statAssigned, value: stats.assigned },
  ];

  return (
    <section aria-labelledby="lesson-stats-heading" className="mb-10">
      <h2 id="lesson-stats-heading" className="sr-only">
        {t.statsHeading}
      </h2>
      {/* A description list keeps each number paired with its label for screen readers. */}
      <dl className="grid gap-4 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className="rounded-xl border bg-card p-5 shadow-sm">
            <dt className="text-sm font-medium text-muted-foreground">{item.label}</dt>
            <dd className="mt-2 text-3xl font-semibold text-foreground">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
