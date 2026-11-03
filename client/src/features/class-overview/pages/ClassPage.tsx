import { ChevronRight, MessageSquareHeart } from 'lucide-react';
import { Link } from 'react-router';
import { teacherStudentPath } from '@/features/lessons/paths';
import { useSchool } from '@/features/school/schoolContext';
import { PageHeader } from '@/shared/components/PageHeader';
import { initialsOf } from '@/shared/lib/format';
import { text } from '@/text/sr-Latn';
import { needLabels } from '../needs';

export function ClassPage() {
  const t = text.classView;
  const school = useSchool();
  const classes = school.data.teacher.classIds.flatMap((id) => school.getClass(id) ?? []);

  return (
    <>
      <title>{text.app.pageTitle(t.pageTitle)}</title>
      {classes.map((group) => (
        <section key={group.id} aria-labelledby={`class-${group.id}`}>
          <PageHeader title={t.heading(group.name)} description={t.intro} />
          <h2 id={`class-${group.id}`} className="sr-only">
            {t.studentsHeading}
          </h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {group.studentIds.map((studentId) => {
              const student = school.getStudent(studentId);
              if (!student) return null;
              const lessons = school.visibleLessonsFor(studentId);
              const completed = lessons.filter(
                (lesson) => school.progressOf(studentId, lesson.id) === 'completed',
              ).length;
              const labels = needLabels(student.supportProfile);
              const newSuggestions = school.data.suggestions.filter(
                (item) => item.childId === studentId && item.status === 'pending-teacher',
              ).length;
              return (
                <li key={studentId}>
                  <Link
                    to={teacherStudentPath(studentId)}
                    className="group flex h-full gap-4 rounded-2xl border bg-card p-4 shadow-soft transition-transform duration-200 hover:-translate-y-0.5 sm:p-5"
                  >
                    <span
                      aria-hidden="true"
                      className="flex size-12 shrink-0 items-center justify-center rounded-full bg-sky font-display font-bold text-sky-ink"
                    >
                      {initialsOf(student.firstName, student.lastName)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-lg font-bold text-ink">
                        {student.firstName} {student.lastName}
                      </span>
                      <span className="block text-sm text-ink-soft">
                        {t.progress(completed, lessons.length)}
                      </span>
                      <span className="mt-2 flex flex-wrap gap-1.5">
                        {labels.length === 0 ? (
                          <span className="text-sm text-ink-soft">{t.noNeeds}</span>
                        ) : (
                          labels.map((label) => (
                            <span
                              key={label}
                              className="rounded-full bg-lilac px-2.5 py-0.5 text-sm text-lilac-ink"
                            >
                              {label}
                            </span>
                          ))
                        )}
                      </span>
                      {newSuggestions > 0 && (
                        <span className="mt-2 flex items-center gap-1.5 text-sm font-medium text-blush-ink">
                          <MessageSquareHeart aria-hidden="true" className="size-4" />
                          {t.pendingSuggestions(newSuggestions)}
                        </span>
                      )}
                    </span>
                    <ChevronRight
                      aria-hidden="true"
                      className="size-5 shrink-0 self-center text-ink-soft"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}
