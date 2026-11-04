import { useNavigate, useSearchParams } from 'react-router';
import { useSchool, type NewLessonInput } from '@/features/school/schoolContext';
import { text } from '@/text/sr-Latn';
import { LessonForm } from '../components/LessonForm';
import { courseKey } from '../lessonForm';
import { coursePath, lessonPath, teacherHomePath } from '../paths';

export function NewLessonPage() {
  const t = text.newLesson;
  const { createLesson, data } = useSchool();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const teaching = data.teacher.teaching;
  const preselected = teaching.find(
    (item) => item.subjectId === params.get('subject') && item.classId === params.get('class'),
  );

  function handleSubmit(input: NewLessonInput) {
    // The AI starts at once; the lesson page shows it at work.
    const lesson = createLesson(input);
    navigate(lessonPath(lesson.id));
  }

  return (
    <>
      <title>{text.app.pageTitle(t.pageTitle)}</title>
      <h1 className="mb-8 font-display text-4xl font-semibold tracking-tight text-ink">
        {t.heading}
      </h1>
      <div className="max-w-4xl">
        <LessonForm
          teaching={teaching}
          initialCourse={preselected ? courseKey(preselected) : ''}
          onSubmit={handleSubmit}
          onCancel={() =>
            navigate(
              preselected
                ? coursePath(preselected.subjectId, preselected.classId)
                : teacherHomePath,
            )
          }
        />
      </div>
    </>
  );
}
