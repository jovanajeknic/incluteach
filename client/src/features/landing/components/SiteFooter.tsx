import { Link } from 'react-router';
import { teacherHomePath } from '@/features/lessons/paths';
import { Logo } from '@/shared/brand/Logo';
import { text } from '@/text/sr-Latn';
import { sectionLinks } from '../sections';

const footerLinkClassName =
  'rounded-sm text-ink underline-offset-4 transition-colors duration-150 hover:text-petrol hover:underline';

export function SiteFooter() {
  const t = text.landing.footer;

  return (
    <footer className="border-t bg-paper-deep">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr] lg:px-8">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-ink-soft">{t.description}</p>
          <p className="mt-6 text-sm text-ink-soft">
            © {new Date().getFullYear()} IncluTeach. {t.note}
          </p>
        </div>
        <nav aria-label={t.linksLabel}>
          <ul className="grid gap-3">
            {sectionLinks.map((link) => (
              <li key={link.id}>
                <a href={`#${link.id}`} className={footerLinkClassName}>
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <Link to={teacherHomePath} className={footerLinkClassName}>
                {t.teacherDemo}
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
