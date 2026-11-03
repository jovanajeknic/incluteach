import { Plus } from 'lucide-react';
import { Link } from 'react-router';
import { EmptyState } from '@/shared/components/EmptyState';
import { PageHeader } from '@/shared/components/PageHeader';
import { Button } from '@/shared/ui/button';
import { text } from '@/text/sr-Latn';
import { LessonList } from '../components/LessonList';
import { LessonStatsCards } from '../components/LessonStatsCards';
import { useLessons } from '../data/lessonsContext';
import { computeLessonStats } from '../lessonStats';
import { newLessonPath } from '../paths';

export function TeacherDashboardPage() {
  const t = text.dashboard;
  const { lessons } = useLessons();
  const stats = computeLessonStats(lessons);

  const newLessonButton = (
    <Button asChild size="lg">
      <Link to={newLessonPath}>
        <Plus aria-hidden="true" />
        {t.newLessonButton}
      </Link>
    </Button>
  );

  return (
    <>
      <title>{text.app.pageTitle(t.pageTitle)}</title>
      <PageHeader title={t.welcome(text.demo.profileName)} description={t.intro} />

      <LessonStatsCards stats={stats} />

      <section aria-labelledby="lessons-heading">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="lessons-heading" className="text-xl font-semibold">
            {t.lessonsHeading}
          </h2>
          {lessons.length > 0 && newLessonButton}
        </div>

        {lessons.length > 0 ? (
          <LessonList lessons={lessons} />
        ) : (
          <EmptyState
            title={t.emptyTitle}
            description={t.emptyDescription}
            action={newLessonButton}
          />
        )}
      </section>
    </>
  );
}
