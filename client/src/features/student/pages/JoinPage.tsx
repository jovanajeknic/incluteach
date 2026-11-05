import { text } from '@/text/sr-Latn';
import { CatalogBrowser } from '../components/CatalogBrowser';

/** "Prijava na predmet": find a subject and ask to join it, and see the state of the requests. */
export function JoinPage() {
  const t = text.pupil.join;

  return (
    <>
      <title>{text.app.pageTitle(t.pageTitle)}</title>
      <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">{t.heading}</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">{t.intro}</p>
      <CatalogBrowser />
    </>
  );
}
