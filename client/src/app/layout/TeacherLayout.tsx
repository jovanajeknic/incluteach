import { ChatsCircleIcon, HouseIcon, PlusIcon } from '@phosphor-icons/react';
import { newLessonPath, suggestionsPath, teacherHomePath } from '@/features/lessons/paths';
import { useSchool } from '@/features/school/schoolContext';
import { initialsOf } from '@/shared/lib/format';
import { text } from '@/text/sr-Latn';
import { SidebarLayout } from './SidebarLayout';

export function TeacherLayout() {
  const { data, suggestionsForTeacher } = useSchool();
  const teacher = data.teacher;
  const newSuggestions = suggestionsForTeacher().filter(
    (item) => item.status === 'pending-teacher',
  ).length;

  return (
    <SidebarLayout
      navLabel={text.app.mainNavigation}
      navItems={[
        {
          to: teacherHomePath,
          label: text.nav.home,
          icon: HouseIcon,
          tone: 'bg-butter text-butter-ink',
          end: true,
        },
        {
          to: suggestionsPath,
          label: text.nav.suggestions,
          icon: ChatsCircleIcon,
          tone: 'bg-blush text-blush-ink',
          count: { value: newSuggestions, label: text.nav.newSuggestions },
        },
      ]}
      action={{ to: newLessonPath, label: text.nav.newLesson, icon: PlusIcon }}
      person={{
        name: `${teacher.firstName} ${teacher.lastName}`,
        initials: initialsOf(teacher.firstName, teacher.lastName),
        role: text.demo.profileRole,
        badge: text.demo.profileBadge,
      }}
      demoNotice={text.demo.notice}
    />
  );
}
