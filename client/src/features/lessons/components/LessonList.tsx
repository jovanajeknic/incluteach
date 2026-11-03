import { Eye } from 'lucide-react';
import { Link } from 'react-router';
import { needsReview, useSchool } from '@/features/school/schoolContext';
import { text } from '@/text/sr-Latn';
import { lessonPath } from '../paths';
import type { SchoolLesson } from '../types';
import { LessonStatusBadge } from './LessonStatusBadge';

interface LessonListProps {
  lessons: readonly SchoolLesson[];
}

export function LessonList({ lessons }: LessonListProps) {
  const { subjects } = useSchool();
  const subjectName = (id: string) => subjects.find((subject) => subject.id === id)?.name ?? '';

  return (
    <ul className="grid gap-3">
      {lessons.map((lesson) => (
        <li
          key={lesson.id}
          className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between sm:p-5"
        >
          <div className="min-w-0">
            <Link
              to={lessonPath(lesson.id)}
              className="font-display text-lg font-medium break-words text-ink underline-offset-4 hover:text-forest hover:underline"
            >
              {lesson.title}
            </Link>
            <p className="mt-1 text-sm text-ink-soft">
              {subjectName(lesson.subjectId)} · {text.lesson.gradeLabel(lesson.grade)}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {/* An assigned lesson can still have new AI suggestions waiting for review. */}
            {lesson.status === 'assigned' && needsReview(lesson) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-butter px-2.5 py-1 text-sm text-butter-ink">
                <Eye aria-hidden="true" className="size-3.5" />
                {text.dashboard.pendingReview}
              </span>
            )}
            <LessonStatusBadge status={lesson.status} />
          </div>
        </li>
      ))}
    </ul>
  );
}
