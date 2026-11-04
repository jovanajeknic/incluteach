import { CaretRightIcon, ChatsCircleIcon, StarIcon } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { Link } from 'react-router';
import { teacherStudentPath } from '@/features/lessons/paths';
import { useSchool } from '@/features/school/schoolContext';
import { teacherClassIds } from '@/features/school/types';
import { blobShape } from '@/shared/visual/subjectIcons';
import { initialsOf } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import { text } from '@/text/sr-Latn';

const avatarTones = [
  'bg-sky text-sky-ink',
  'bg-blush text-blush-ink',
  'bg-pistachio text-pistachio-ink',
  'bg-lilac text-lilac-ink',
  'bg-butter text-butter-ink',
  'bg-mint text-mint-ink',
];

/** Progress of every student the teacher teaches, one class at a time. */
export function ClassPage() {
  const t = text.classView;
  const school = useSchool();
  const classIds = teacherClassIds(school.data.teacher);
  const [classId, setClassId] = useState(classIds[0] ?? '');
  const group = school.getClass(classId);
  const students = school.studentsOf(classId);

  return (
    <>
      <title>{text.app.pageTitle(t.pageTitle)}</title>
      <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">{t.heading}</h1>

      {classIds.length > 1 && (
        <div
          role="group"
          aria-label={t.classesLabel}
          className="mt-6 flex flex-wrap gap-x-6 gap-y-2"
        >
          {classIds.map((id) => {
            const active = id === classId;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => setClassId(id)}
                className={cn(
                  'relative pb-2 font-display text-lg font-medium transition-colors',
                  active ? 'text-ink' : 'text-ink-soft hover:text-ink',
                )}
              >
                {t.classTab(school.getClass(id)?.name ?? id)}
                {active && (
                  <motion.span
                    layoutId="class-tab-marker"
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-0.5 h-1.5 rounded-full bg-ochre"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      {group && (
        <section aria-labelledby="students-heading" className="mt-8">
          <h2 id="students-heading" className="sr-only">
            {t.classTab(group.name)}
          </h2>
          <div className="overflow-x-auto rounded-[1.75rem] bg-card shadow-soft">
            <table className="w-full min-w-[40rem] text-left">
              <thead>
                <tr className="border-b-2 border-border font-display text-sm text-ink-soft">
                  <th scope="col" className="px-6 py-4 font-medium">
                    {t.columns.student}
                  </th>
                  <th scope="col" className="px-4 py-4 font-medium">
                    {t.columns.lessons}
                  </th>
                  <th scope="col" className="px-4 py-4 font-medium">
                    {t.columns.quizzes}
                  </th>
                  <th scope="col" className="px-4 py-4 font-medium">
                    {t.columns.stars}
                  </th>
                  <td className="w-12" />
                </tr>
              </thead>
              <tbody>
                {students.map((student, index) => {
                  const lessons = school.visibleLessonsFor(student.id);
                  const completed = lessons.filter(
                    (lesson) => school.progressOf(student.id, lesson.id) === 'completed',
                  ).length;
                  const quizzes = lessons.filter((lesson) =>
                    school.practiceOf(student.id, lesson.id),
                  ).length;
                  const stars = school.starsOf(student.id);
                  const name = `${student.firstName} ${student.lastName}`;
                  const newSuggestions = school.data.suggestions.filter(
                    (item) => item.childId === student.id && item.status === 'pending-teacher',
                  ).length;
                  return (
                    <motion.tr
                      key={student.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                      // relative: the name link stretches over the whole row.
                      className="group relative border-b border-border/70 last:border-0 hover:bg-paper/60"
                    >
                      <th scope="row" className="px-6 py-4 font-normal">
                        <span className="flex items-center gap-3">
                          <span
                            aria-hidden="true"
                            className={cn(
                              'flex size-11 shrink-0 items-center justify-center font-display font-semibold',
                              blobShape,
                              avatarTones[index % avatarTones.length],
                            )}
                          >
                            {initialsOf(student.firstName, student.lastName)}
                          </span>
                          <span className="min-w-0">
                            <Link
                              to={teacherStudentPath(student.id)}
                              className="font-display text-lg font-semibold text-ink after:absolute after:inset-0 hover:text-forest"
                            >
                              {name}
                            </Link>
                            {newSuggestions > 0 && (
                              <span className="flex items-center gap-1 text-sm font-medium text-blush-ink">
                                <ChatsCircleIcon
                                  aria-hidden="true"
                                  weight="duotone"
                                  className="size-4"
                                />
                                {t.pendingSuggestions(newSuggestions)}
                              </span>
                            )}
                          </span>
                        </span>
                      </th>
                      <td className="px-4 py-4">
                        <ProgressCell done={completed} total={lessons.length} />
                      </td>
                      <td className="px-4 py-4">
                        <ProgressCell done={quizzes} total={lessons.length} />
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-1.5 font-display font-semibold text-butter-ink">
                          <StarIcon
                            aria-hidden="true"
                            weight="fill"
                            className="size-5 text-butter-deep"
                          />
                          {stars}
                          <span className="sr-only">{t.starsCount(stars)}</span>
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <CaretRightIcon
                          aria-hidden="true"
                          weight="bold"
                          className="size-5 text-ink-soft transition-transform group-hover:translate-x-1"
                        />
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

/** "3 od 6" with a small bar; the words carry the meaning, the bar only supports it. */
function ProgressCell({ done, total }: { done: number; total: number }) {
  const share = total === 0 ? 0 : done / total;
  return (
    <span className="flex min-w-28 flex-col gap-1.5">
      <span className="text-ink">{text.classView.ofTotal(done, total)}</span>
      <span aria-hidden="true" className="h-2 w-24 overflow-hidden rounded-full bg-mint">
        <motion.span
          className="block h-full rounded-full bg-mint-ink"
          initial={{ width: 0 }}
          animate={{ width: `${share * 100}%` }}
          transition={{ duration: 0.7, ease: [0.2, 0.7, 0.3, 1] }}
        />
      </span>
    </span>
  );
}
