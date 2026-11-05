import { UsersIcon } from '@phosphor-icons/react';
import { adminUsersPath } from '@/features/admin/paths';
import { useSession } from '@/features/auth/api/session';
import { initialsOfName } from '@/shared/lib/format';
import { text } from '@/text/sr-Latn';
import { SidebarLayout } from './SidebarLayout';

export function AdminLayout() {
  const { user } = useSession();
  const t = text.admin.nav;

  return (
    <SidebarLayout
      navLabel={t.label}
      navItems={[
        { to: adminUsersPath, label: t.users, icon: UsersIcon, tone: 'bg-butter text-butter-ink' },
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
