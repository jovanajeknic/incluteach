import { PencilSimpleLineIcon } from '@phosphor-icons/react';
import { Link } from 'react-router';
import { text } from '@/text/sr-Latn';
import { SuggestionList } from '../components/SuggestionList';
import { useParent } from '../data/parentContext';
import { childPath } from '../paths';

/** Every suggestion this parent sent, per child, with the teacher's response. */
export function ParentSuggestionsPage() {
  const t = text.parent.suggestionsPage;
  const { children, suggestionsFor } = useParent();
  const anySuggestions = children.some((child) => suggestionsFor(child.profile.id).length > 0);

  return (
    <>
      <title>{text.app.pageTitle(t.pageTitle)}</title>
      <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">{t.heading}</h1>
      <p className="mt-2 max-w-prose text-ink-soft">{t.intro}</p>
      {!anySuggestions && <p className="mt-8 text-lg text-ink-soft">{t.empty}</p>}

      <div className="mt-8 grid gap-6">
        {children.map((child) => {
          const name = `${child.profile.firstName} ${child.profile.lastName}`;
          return (
            <section
              key={child.profile.id}
              aria-labelledby={`suggestions-${child.profile.id}`}
              className="rounded-[2rem] bg-card p-6 shadow-soft sm:p-8"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2
                  id={`suggestions-${child.profile.id}`}
                  className="font-display text-2xl font-semibold text-ink"
                >
                  {name}
                </h2>
                <Link
                  to={`${childPath(child.profile.id)}#suggestions-heading`}
                  className="inline-flex items-center gap-1.5 font-display font-medium text-forest underline-offset-4 hover:underline"
                >
                  <PencilSimpleLineIcon aria-hidden="true" weight="duotone" className="size-5" />
                  {t.writeFor(child.profile.firstName)}
                </Link>
              </div>
              <SuggestionList
                suggestions={suggestionsFor(child.profile.id)}
                lessonTitle={(id) => child.lessons.find((lesson) => lesson.id === id)?.title}
                heading={text.parent.suggestions.listHeading}
              />
            </section>
          );
        })}
      </div>
    </>
  );
}
