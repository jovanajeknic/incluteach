import { Logo } from '@/shared/brand/Logo';
import { text } from '@/text/sr-Latn';

export function SiteFooter() {
  return (
    <footer className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 border-t border-line py-8 sm:flex-row sm:items-center sm:justify-between">
        <Logo markClassName="h-8" />
        <p className="text-sm text-ink-soft">
          © {new Date().getFullYear()} IncluTeach. {text.landing.footer.note}
        </p>
      </div>
    </footer>
  );
}
