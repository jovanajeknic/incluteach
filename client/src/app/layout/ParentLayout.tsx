import { Users } from 'lucide-react';
import { useParent } from '@/features/parent/data/parentContext';
import { parentHomePath } from '@/features/parent/paths';
import { text } from '@/text/sr-Latn';
import { initialsOf } from '@/shared/lib/format';
import { RoleLayout } from './RoleLayout';

export function ParentLayout() {
  const t = text.parent;
  const { parent } = useParent();

  return (
    <RoleLayout
      navLabel={t.nav.label}
      navItems={[{ to: parentHomePath, label: t.nav.children, icon: Users }]}
      person={{
        firstName: parent.firstName,
        initials: initialsOf(parent.firstName, parent.lastName),
        role: t.profile.role,
        badge: t.profile.badge,
      }}
      demoNotice={t.demoNotice}
    />
  );
}
