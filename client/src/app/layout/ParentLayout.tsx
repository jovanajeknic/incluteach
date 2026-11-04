import { ChatsCircleIcon, UsersThreeIcon } from '@phosphor-icons/react';
import { useParent } from '@/features/parent/data/parentContext';
import { parentHomePath, parentSuggestionsPath } from '@/features/parent/paths';
import { initialsOf } from '@/shared/lib/format';
import { text } from '@/text/sr-Latn';
import { SidebarLayout } from './SidebarLayout';

export function ParentLayout() {
  const t = text.parent;
  const { parent } = useParent();

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
          to: parentSuggestionsPath,
          label: t.nav.suggestions,
          icon: ChatsCircleIcon,
          tone: 'bg-blush text-blush-ink',
        },
      ]}
      person={{
        name: `${parent.firstName} ${parent.lastName}`,
        initials: initialsOf(parent.firstName, parent.lastName),
        role: t.profile.role,
        badge: t.profile.badge,
      }}
      demoNotice={t.demoNotice}
    />
  );
}
