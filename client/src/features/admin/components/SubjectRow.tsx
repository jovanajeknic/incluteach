import { WarningIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/native-select';
import { text } from '@/text/sr-Latn';
import { useDeleteSubject, useUpdateSubject } from '../api/queries';
import type { AdminSubject } from '../api/subjectsApi';
import type { ManagedUser } from '../api/usersApi';
import { adminErrorMessage } from '../apiErrorMessage';
import { subjectName } from '../schemas';

const t = text.admin.subjects;

interface SubjectRowProps {
  subject: AdminSubject;
  /** The teachers who can be chosen: those still at the school. */
  teachers: ManagedUser[];
  onNotice: (message: string) => void;
  onProblem: (message: string) => void;
}

export function SubjectRow({ subject, teachers, onNotice, onProblem }: SubjectRowProps) {
  const [editing, setEditing] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const deleteSubject = useDeleteSubject();
  const { teacher } = subject;
  const needsTeacher = teacher.deactivated || teacher.deleted;

  async function remove() {
    setConfirmRemove(false);
    try {
      await deleteSubject.mutateAsync(subject.id);
      onNotice(t.removed(subject.name));
    } catch (error) {
      onProblem(adminErrorMessage(error));
    }
  }

  return (
    <div className="rounded-2xl bg-card px-5 py-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <p className="font-display text-lg font-semibold break-words text-ink">{subject.name}</p>
          <p className="text-sm text-ink-soft">{t.inClass(subject.className)}</p>
          <p className="text-sm text-ink-soft">
            {t.taughtBy(teacher.deleted ? t.teacherDeleted : teacher.fullName)}
          </p>
          {needsTeacher && (
            <p className="mt-1 flex items-center gap-2 font-medium text-butter-ink">
              <WarningIcon aria-hidden="true" weight="fill" className="size-5 shrink-0" />
              {t.teacherLeft}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={needsTeacher ? 'default' : 'outline'}
            aria-label={
              needsTeacher
                ? t.changeTeacherFor(subject.name, subject.className)
                : t.editFor(subject.name, subject.className)
            }
            onClick={() => setEditing((current) => !current)}
          >
            {needsTeacher ? t.changeTeacher : t.edit}
          </Button>
          <ConfirmDialog
            open={confirmRemove}
            onOpenChange={setConfirmRemove}
            trigger={
              <Button
                type="button"
                variant="outline"
                aria-label={t.removeFor(subject.name, subject.className)}
                disabled={deleteSubject.isPending}
              >
                {t.remove}
              </Button>
            }
            title={t.confirmRemoveTitle(subject.name)}
            description={t.confirmRemove}
            confirmLabel={t.confirmRemoveYes}
            cancelLabel={t.cancel}
            destructive
            onConfirm={() => void remove()}
          />
        </div>
      </div>
      {editing && (
        <EditForm
          subject={subject}
          teachers={teachers}
          onDone={(message) => {
            setEditing(false);
            if (message) onNotice(message);
          }}
        />
      )}
    </div>
  );
}

interface EditFormProps {
  subject: AdminSubject;
  teachers: ManagedUser[];
  onDone: (notice?: string) => void;
}

/** The name and the teacher; the class cannot change. */
function EditForm({ subject, teachers, onDone }: EditFormProps) {
  const update = useUpdateSubject();
  const stillThere = teachers.some((person) => person.id === subject.teacher.id);
  const [name, setName] = useState(subject.name);
  // A teacher who left is not offered, so the choice starts empty and means "keep the same".
  const [teacherId, setTeacherId] = useState(stillThere ? subject.teacher.id : '');
  const [problem, setProblem] = useState<string | null>(null);
  const id = `edit-subject-${subject.id}`;

  async function save() {
    const checked = subjectName.safeParse(name);
    if (!checked.success) {
      setProblem(checked.error.issues[0]?.message ?? null);
      return;
    }
    const changes = {
      ...(checked.data !== subject.name && { name: checked.data }),
      ...(teacherId && teacherId !== subject.teacher.id && { teacherId }),
    };
    if (Object.keys(changes).length === 0) {
      setProblem(t.noChange);
      return;
    }
    setProblem(null);
    try {
      await update.mutateAsync({ id: subject.id, ...changes });
      onDone(t.saved(checked.data));
    } catch (error) {
      setProblem(adminErrorMessage(error));
    }
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
      className="mt-4 grid max-w-xl gap-3 border-t border-border pt-4"
    >
      <div className="grid gap-2">
        <Label htmlFor={`${id}-name`} className="text-base">
          {t.nameLabel}
        </Label>
        <Input
          id={`${id}-name`}
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="off"
          className="h-12 rounded-xl bg-card text-base md:text-base"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-teacher`} className="text-base">
          {t.teacherPick}
        </Label>
        <NativeSelect
          id={`${id}-teacher`}
          value={teacherId}
          onChange={(event) => setTeacherId(event.target.value)}
          className="h-12 rounded-xl bg-card text-base"
        >
          {!stillThere && <NativeSelectOption value="">{t.teacherPlaceholder}</NativeSelectOption>}
          {teachers.map((person) => (
            <NativeSelectOption key={person.id} value={person.id}>
              {person.fullName}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        {!stillThere && <p className="text-sm text-ink-soft">{t.keepTeacher}</p>}
      </div>
      {problem && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {problem}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" size="lg" disabled={update.isPending}>
          {update.isPending ? t.saving : t.save}
        </Button>
        <Button type="button" variant="outline" size="lg" onClick={() => onDone()}>
          {t.cancel}
        </Button>
      </div>
    </form>
  );
}
