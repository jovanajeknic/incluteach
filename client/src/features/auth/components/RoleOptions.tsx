import { BookOpenText, HeartHandshake, type LucideIcon } from 'lucide-react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { text } from '@/text/sr-Latn';
import { REGISTRATION_ROLES, type RegistrationRole } from '../schemas';

const roleIcons: Record<RegistrationRole, LucideIcon> = {
  teacher: BookOpenText,
  parent: HeartHandshake,
};

interface RoleOptionsProps {
  registration: UseFormRegisterReturn<'role'>;
  error?: string;
}

/** Native radio buttons styled as cards, so keyboard and screen reader behaviour stay standard. */
export function RoleOptions({ registration, error }: RoleOptionsProps) {
  const t = text.auth;
  const errorId = 'register-role-error';
  const noteId = 'register-role-note';

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-base font-medium">{t.fields.role}</legend>
      <div className="grid grid-cols-2 gap-3">
        {REGISTRATION_ROLES.map((role) => {
          const Icon = roleIcons[role];
          return (
            <label
              key={role}
              className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-border bg-card px-4 py-3 transition-colors hover:border-forest/40 has-[:checked]:border-forest has-[:checked]:bg-mint/60"
            >
              <input
                {...registration}
                type="radio"
                value={role}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${noteId} ${errorId}` : noteId}
                className="size-4 shrink-0 accent-forest"
              />
              <Icon aria-hidden="true" className="size-5 shrink-0 text-forest" />
              <span className="font-display font-medium text-ink">{t.roles[role]}</span>
            </label>
          );
        })}
      </div>
      <p id={noteId} className="text-sm text-ink-soft">
        {t.roles.studentNote}
      </p>
      {error && (
        <p id={errorId} className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}
