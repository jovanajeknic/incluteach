import { SquaresFourIcon, StarIcon } from '@phosphor-icons/react';
import { useStudent } from '@/features/student/data/studentContext';
import { studentHomePath, studentStarsPath } from '@/features/student/paths';
import { initialsOf } from '@/shared/lib/format';
import { text } from '@/text/sr-Latn';
import { SidebarLayout } from './SidebarLayout';

export function StudentLayout() {
  const t = text.student;
  const { profile, stars } = useStudent();

  return (
    <SidebarLayout
      navLabel={t.nav.label}
      navItems={[
        {
          to: studentHomePath,
          label: t.nav.subjects,
          icon: SquaresFourIcon,
          tone: 'bg-sky text-sky-ink',
          end: true,
        },
        {
          to: studentStarsPath,
          label: t.nav.stars,
          icon: StarIcon,
          tone: 'bg-butter text-butter-ink',
          count: { value: stars, label: t.home.starsLabel },
        },
      ]}
      person={{
        name: profile.firstName,
        initials: initialsOf(profile.firstName, profile.lastName),
        role: t.profile.role,
        badge: t.profile.badge,
      }}
      demoNotice={t.demoNotice}
    />
  );
}
