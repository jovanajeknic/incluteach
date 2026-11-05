import { ArrowLeftIcon } from '@phosphor-icons/react';
import { Link } from 'react-router';
import { text } from '@/text/sr-Latn';
import { StarsView } from '../components/StarsView';
import { studentHomePath } from '../paths';

/** "Moje zvjezdice": the stars for effort, with what each was for. */
export function StarsPage() {
  const t = text.pupil.stars;

  return (
    <>
      <title>{text.app.pageTitle(t.pageTitle)}</title>
      <Link
        to={studentHomePath}
        className="inline-flex items-center gap-1.5 rounded-full font-display font-medium text-ink-soft hover:text-forest"
      >
        <ArrowLeftIcon aria-hidden="true" weight="bold" className="size-4" />
        {text.pupil.subject.back}
      </Link>
      <h1 className="mt-5 font-display text-4xl font-semibold tracking-tight text-ink">
        {t.heading}
      </h1>
      <p className="mt-2 max-w-2xl text-ink-soft">{t.intro}</p>
      <StarsView />
    </>
  );
}
