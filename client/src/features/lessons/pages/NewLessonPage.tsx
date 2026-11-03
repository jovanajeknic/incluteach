import { useNavigate } from 'react-router';
import { useSchool, type NewLessonInput } from '@/features/school/schoolContext';
import { PageHeader } from '@/shared/components/PageHeader';
import { text } from '@/text/sr-Latn';
import { LessonForm } from '../components/LessonForm';
import { lessonPath, teacherHomePath } from '../paths';

export interface LessonDetailLocationState {
  justCreated?: boolean;
}

export function NewLessonPage() {
  const t = text.newLesson;
  const { createDraft, subjects } = useSchool();
  const navigate = useNavigate();

  function handleSubmit(input: NewLessonInput) {
    const lesson = createDraft(input);
    const state: LessonDetailLocationState = { justCreated: true };
    navigate(lessonPath(lesson.id), { state });
  }

  return (
    <>
      <title>{text.app.pageTitle(t.pageTitle)}</title>
      <PageHeader title={t.heading} description={t.intro} />
      <div className="max-w-3xl rounded-3xl border bg-card p-5 shadow-soft sm:p-8">
        <LessonForm
          subjects={subjects}
          onSubmit={handleSubmit}
          onCancel={() => navigate(teacherHomePath)}
        />
      </div>
    </>
  );
}
