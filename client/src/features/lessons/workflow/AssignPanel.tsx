import { useState } from 'react';
import { useSchool } from '@/features/school/schoolContext';
import type { SchoolLesson } from '@/features/school/types';
import { Button } from '@/shared/ui/button';
import { text } from '@/text/sr-Latn';
import { SectionCard, StatusMessage } from './SectionCard';

/** Assign an approved lesson to a whole class or to chosen students. */
export function AssignPanel({ lesson }: { lesson: SchoolLesson }) {
  const t = text.lessonDetail.assign;
  const school = useSchool();
  const classes = school.data.teacher.classIds.flatMap((id) => school.getClass(id) ?? []);
  const [classIds, setClassIds] = useState<string[]>(lesson.assignedClassIds);
  const [studentIds, setStudentIds] = useState<string[]>(lesson.assignedStudentIds);
  const [message, setMessage] = useState<{ text: string; tone: 'success' | 'error' }>();
  const canAssign = lesson.status === 'approved' || lesson.status === 'assigned';

  const toggle = (list: string[], id: string) =>
    list.includes(id) ? list.filter((item) => item !== id) : [...list, id];

  function assign() {
    if (classIds.length === 0 && studentIds.length === 0) {
      setMessage({ text: t.nothingSelected, tone: 'error' });
      return;
    }
    // A whole class already includes its students, so individual picks are dropped.
    const individual = studentIds.filter(
      (id) =>
        !classes.some((group) => classIds.includes(group.id) && group.studentIds.includes(id)),
    );
    school.assignLesson(lesson.id, { classIds, studentIds: individual });
    setStudentIds(individual);
    setMessage({ text: t.assigned, tone: 'success' });
  }

  const assignedNames = [
    ...lesson.assignedClassIds.map((id) => t.classTarget(school.getClass(id)?.name ?? id)),
    ...lesson.assignedStudentIds.map((id) => {
      const student = school.getStudent(id);
      return student ? `${student.firstName} ${student.lastName}` : id;
    }),
  ];

  return (
    <SectionCard id="assign-heading" title={t.heading} variant="side">
      {!canAssign ? (
        <p className="text-ink-soft">{t.notApproved}</p>
      ) : (
        <>
          {lesson.status === 'assigned' && assignedNames.length > 0 && (
            <p className="mb-4 text-ink">
              <span className="hand-note text-lg text-mint-ink">{t.currentTarget}</span>{' '}
              {assignedNames.join(', ')}
            </p>
          )}
          <div className="grid gap-4">
            {classes.map((group) => (
              <div key={group.id}>
                <label className="flex items-center gap-3 font-display font-medium text-ink">
                  <input
                    type="checkbox"
                    checked={classIds.includes(group.id)}
                    onChange={() => {
                      setClassIds((current) => toggle(current, group.id));
                      setMessage(undefined);
                    }}
                    className="size-5 accent-forest"
                  />
                  {t.wholeClass(group.name)}
                </label>
                <fieldset className="mt-3" disabled={classIds.includes(group.id)}>
                  <legend className="text-sm text-ink-soft">{t.students}</legend>
                  <div className="mt-2 grid gap-1.5">
                    {group.studentIds.map((id) => {
                      const student = school.getStudent(id);
                      if (!student) return null;
                      return (
                        <label
                          key={id}
                          className="flex items-center gap-3 text-ink has-[:disabled]:text-ink-soft"
                        >
                          <input
                            type="checkbox"
                            checked={classIds.includes(group.id) || studentIds.includes(id)}
                            onChange={() => {
                              setStudentIds((current) => toggle(current, id));
                              setMessage(undefined);
                            }}
                            className="size-5 accent-forest"
                          />
                          {student.firstName} {student.lastName}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              </div>
            ))}
          </div>
          <Button type="button" onClick={assign} className="mt-4 h-10 w-full px-4">
            {t.assign}
          </Button>
        </>
      )}
      <StatusMessage message={message?.text} tone={message?.tone} />
    </SectionCard>
  );
}
