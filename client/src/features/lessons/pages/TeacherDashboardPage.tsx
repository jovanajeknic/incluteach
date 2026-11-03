import { Plus } from 'lucide-react';
import { useId, useState } from 'react';
import { Link } from 'react-router';
import { useSchool } from '@/features/school/schoolContext';
import { LESSON_STATUSES } from '@/features/school/types';
import { EmptyState } from '@/shared/components/EmptyState';
import { PageHeader } from '@/shared/components/PageHeader';
import { Button } from '@/shared/ui/button';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/native-select';
import { text } from '@/text/sr-Latn';
import { LessonList } from '../components/LessonList';
import { LessonStatsCards } from '../components/LessonStatsCards';
import { computeLessonStats } from '../lessonStats';
import { newLessonPath } from '../paths';

export function TeacherDashboardPage() {
  const t = text.dashboard;
  const { data, subjects } = useSchool();
  const lessons = data.lessons;
  const stats = computeLessonStats(lessons);
  const [subjectFilter, setSubjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const subjectFilterId = useId();
  const statusFilterId = useId();

  const visible = lessons.filter(
    (lesson) =>
      (!subjectFilter || lesson.subjectId === subjectFilter) &&
      (!statusFilter || lesson.status === statusFilter),
  );

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
      <PageHeader title={t.welcome(data.teacher.firstName)} description={t.intro} />

      <LessonStatsCards stats={stats} />

      <section aria-labelledby="lessons-heading">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="lessons-heading" className="font-display text-xl font-bold">
            {t.lessonsHeading}
          </h2>
          {lessons.length > 0 && newLessonButton}
        </div>

        {lessons.length === 0 ? (
          <EmptyState
            title={t.emptyTitle}
            description={t.emptyDescription}
            action={newLessonButton}
          />
        ) : (
          <>
            <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:max-w-xl">
              <div className="flex flex-col gap-1.5">
                <label htmlFor={subjectFilterId} className="text-sm font-medium text-ink">
                  {t.filterSubject}
                </label>
                <NativeSelect
                  id={subjectFilterId}
                  value={subjectFilter}
                  onChange={(event) => setSubjectFilter(event.target.value)}
                  className="h-11 bg-card text-base md:text-base"
                >
                  <NativeSelectOption value="">{t.allSubjects}</NativeSelectOption>
                  {subjects.map((subject) => (
                    <NativeSelectOption key={subject.id} value={subject.id}>
                      {subject.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor={statusFilterId} className="text-sm font-medium text-ink">
                  {t.filterStatus}
                </label>
                <NativeSelect
                  id={statusFilterId}
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="h-11 bg-card text-base md:text-base"
                >
                  <NativeSelectOption value="">{t.allStatuses}</NativeSelectOption>
                  {LESSON_STATUSES.map((status) => (
                    <NativeSelectOption key={status} value={status}>
                      {text.lesson.statuses[status]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
            </div>
            {visible.length > 0 ? (
              <LessonList lessons={visible} />
            ) : (
              <EmptyState title={t.noMatches} />
            )}
          </>
        )}
      </section>
    </>
  );
}
