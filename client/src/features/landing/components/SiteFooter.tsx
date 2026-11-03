import { Logo } from '@/shared/brand/Logo';
import { text } from '@/text/sr-Latn';
import { Wave } from './Wave';

export function SiteFooter() {
  return (
    <footer>
      <Wave className="text-mint" />
      <div className="bg-mint">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 pt-4 pb-10 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <Logo />
          <p className="text-sm text-ink-soft">
            © {new Date().getFullYear()} IncluTeach. {text.landing.footer.note}
          </p>
        </div>
      </div>
    </footer>
  );
}
