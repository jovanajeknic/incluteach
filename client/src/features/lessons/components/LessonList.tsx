import { Link } from 'react-router';
import { text } from '@/text/sr-Latn';
import { lessonPath } from '../paths';
import type { Lesson } from '../types';
import { LessonStatusBadge } from './LessonStatusBadge';

interface LessonListProps {
  lessons: readonly Lesson[];
}

export function LessonList({ lessons }: LessonListProps) {
  return (
    <ul className="grid gap-3">
      {lessons.map((lesson) => (
        <li
          key={lesson.id}
          className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5"
        >
          <div className="min-w-0">
            <Link
              to={lessonPath(lesson.id)}
              className="text-lg font-semibold break-words text-foreground underline-offset-4 hover:text-primary hover:underline"
            >
              {lesson.title}
            </Link>
            <p className="mt-1 text-sm text-muted-foreground">
              {lesson.subject} · {text.lesson.gradeLabel(lesson.grade)}
            </p>
          </div>
          <div className="shrink-0">
            <LessonStatusBadge status={lesson.status} />
          </div>
        </li>
      ))}
    </ul>
  );
}
