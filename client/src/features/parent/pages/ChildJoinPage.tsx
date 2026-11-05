import { ArrowLeftIcon } from '@phosphor-icons/react';
import { Link, useParams } from 'react-router';
import { CatalogBrowser } from '@/features/student/components/CatalogBrowser';
import { text } from '@/text/sr-Latn';
import { ChildGate } from '../components/ChildGate';
import { childPath } from '../paths';

const t = text.guardian.join;

/** Asking for a subject for a child: the request goes straight to the teacher of the subject. */
export function ChildJoinPage() {
  const { childId = '' } = useParams();

  return (
    <ChildGate childId={childId}>
      {(child) => (
        <>
          <title>{text.app.pageTitle(t.pageTitle(child.fullName))}</title>
          <Link
            to={childPath(child.id)}
            className="inline-flex items-center gap-1.5 rounded-full font-display font-medium text-ink-soft hover:text-forest"
          >
            <ArrowLeftIcon aria-hidden="true" weight="bold" className="size-4" />
            {child.fullName}
          </Link>
          <h1 className="mt-5 font-display text-4xl font-semibold tracking-tight text-ink">
            {t.heading(child.fullName)}
          </h1>
          <p className="mt-2 max-w-2xl text-ink-soft">{t.intro}</p>
          <CatalogBrowser studentId={child.id} />
        </>
      )}
    </ChildGate>
  );
}
