import { EyeIcon, EyeSlashIcon } from '@phosphor-icons/react';
import { useState, type ComponentProps } from 'react';
import { cn } from '@/shared/lib/utils';
import { Input } from '@/shared/ui/input';
import { text } from '@/text/sr-Latn';

type PasswordFieldProps = Omit<ComponentProps<'input'>, 'type'>;

/**
 * Password input with a show/hide toggle. The toggle is a plain button (type="button"),
 * so it never submits the form. Paste is allowed and the value is never altered.
 */
export function PasswordField({ id, className, ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        id={id}
        type={visible ? 'text' : 'password'}
        spellCheck={false}
        autoCapitalize="none"
        autoCorrect="off"
        className={cn('pr-14', className)}
      />
      <button
        type="button"
        aria-label={text.auth.showPassword}
        aria-pressed={visible}
        aria-controls={id}
        onClick={() => setVisible((current) => !current)}
        className="absolute inset-y-1 right-1 flex w-11 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-mint hover:text-ink"
      >
        {visible ? (
          <EyeSlashIcon aria-hidden="true" weight="duotone" className="size-5" />
        ) : (
          <EyeIcon aria-hidden="true" weight="duotone" className="size-5" />
        )}
      </button>
    </div>
  );
}
