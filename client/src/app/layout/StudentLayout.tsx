import { HandshakeIcon, SquaresFourIcon, StarIcon } from '@phosphor-icons/react';
import { useSession } from '@/features/auth/api/session';
import { useMyStars } from '@/features/student/api/queries';
import { studentHomePath, studentJoinPath, studentStarsPath } from '@/features/student/paths';
import { initialsOfName } from '@/shared/lib/format';
import { text } from '@/text/sr-Latn';
import { SidebarLayout } from './SidebarLayout';

export function StudentLayout() {
  const t = text.pupil;
  const { user } = useSession();
  // The same request as the stars page and the home page, so the number always agrees.
  const stars = useMyStars().data?.counts;
  const totalStars = stars ? stars.automatic + stars.teacher : 0;

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
          to: studentJoinPath,
          label: t.nav.join,
          icon: HandshakeIcon,
          tone: 'bg-mint text-mint-ink',
        },
        {
          to: studentStarsPath,
          label: t.nav.stars,
          icon: StarIcon,
          tone: 'bg-butter text-butter-ink',
          count: { value: totalStars, label: t.nav.starsLabel },
        },
      ]}
      person={{
        name: user?.fullName ?? '',
        initials: initialsOfName(user?.fullName ?? ''),
        role: text.student.profile.role,
        badge: user?.username ?? '',
      }}
    />
  );
}
