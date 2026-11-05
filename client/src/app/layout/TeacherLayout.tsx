import { ChatsCircleIcon, HouseIcon, PlusIcon, UserPlusIcon } from '@phosphor-icons/react';
import {
  newLessonPath,
  requestsPath,
  messagesPath,
  teacherHomePath,
} from '@/features/lessons/paths';
import { useSchool } from '@/features/school/schoolContext';
import { useWaitingRequests } from '@/features/subject-requests/api/queries';
import { initialsOf } from '@/shared/lib/format';
import { text } from '@/text/sr-Latn';
import { SidebarLayout } from './SidebarLayout';

export function TeacherLayout() {
  const { data } = useSchool();
  const teacher = data.teacher;
  // The same request as the page of the requests, so the number and the list always agree.
  const waitingRequests = useWaitingRequests().data?.total ?? 0;

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
          to: requestsPath,
          label: text.nav.requests,
          icon: UserPlusIcon,
          tone: 'bg-mint text-mint-ink',
          count: { value: waitingRequests, label: text.nav.newRequests },
        },
        {
          to: messagesPath,
          label: text.nav.messages,
          icon: ChatsCircleIcon,
          tone: 'bg-blush text-blush-ink',
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
