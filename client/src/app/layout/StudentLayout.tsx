import { LayoutGrid } from 'lucide-react';
import { useStudent } from '@/features/student/data/studentContext';
import { studentHomePath } from '@/features/student/paths';
import { text } from '@/text/sr-Latn';
import { initialsOf } from '@/shared/lib/format';
import { RoleLayout } from './RoleLayout';

export function StudentLayout() {
  const t = text.student;
  const { profile } = useStudent();

  return (
    <RoleLayout
      navLabel={t.nav.label}
      navItems={[{ to: studentHomePath, label: t.nav.subjects, icon: LayoutGrid }]}
      person={{
        firstName: profile.firstName,
        initials: initialsOf(profile.firstName, profile.lastName),
        role: t.profile.role,
        badge: t.profile.badge,
      }}
      demoNotice={t.demoNotice}
    />
  );
}
