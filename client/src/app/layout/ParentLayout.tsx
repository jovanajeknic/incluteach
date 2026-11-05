import { ChatsCircleIcon, HandshakeIcon, UsersThreeIcon } from '@phosphor-icons/react';
import { useSession } from '@/features/auth/api/session';
import { parentHomePath, parentMessagesPath, parentRequestsPath } from '@/features/parent/paths';
import { useWaitingRequests } from '@/features/subject-requests/api/queries';
import { initialsOfName } from '@/shared/lib/format';
import { text } from '@/text/sr-Latn';
import { SidebarLayout } from './SidebarLayout';

export function ParentLayout() {
  const t = text.guardian;
  const { user } = useSession();
  // The same request as the page of the requests, so the number and the list always agree.
  const waiting = useWaitingRequests('awaiting_parent').data?.total ?? 0;

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
        {
          to: parentRequestsPath,
          label: t.nav.requests,
          icon: HandshakeIcon,
          tone: 'bg-mint text-mint-ink',
          count: { value: waiting, label: t.nav.requestsLabel },
        },
        {
          to: parentMessagesPath,
          label: t.nav.messages,
          icon: ChatsCircleIcon,
          tone: 'bg-blush text-blush-ink',
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
