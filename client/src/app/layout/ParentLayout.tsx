import { UsersThreeIcon } from '@phosphor-icons/react';
import { useSession } from '@/features/auth/api/session';
import { parentHomePath } from '@/features/parent/paths';
import { initialsOfName } from '@/shared/lib/format';
import { text } from '@/text/sr-Latn';
import { SidebarLayout } from './SidebarLayout';

export function ParentLayout() {
  const t = text.guardian;
  const { user } = useSession();

  return (
    <SidebarLayout
      navLabel={t.nav.label}
      navItems={[
        {
          to: parentHomePath,
          label: t.nav.children,
          icon: UsersThreeIcon,
          tone: 'bg-sky text-sky-ink',
          end: true,
        },
      ]}
      person={{
        name: user?.fullName ?? '',
        initials: initialsOfName(user?.fullName ?? ''),
        role: t.role,
        badge: user?.username ?? '',
      }}
    />
  );
}
