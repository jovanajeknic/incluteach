import { ArrowRightIcon } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { Link } from 'react-router';
import { initialsOf } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import { itemMotion, listMotion } from '@/shared/motion/listMotion';
import { blobShape } from '@/shared/visual/subjectIcons';
import { text } from '@/text/sr-Latn';
import { childTones } from '../childSummary';
import { ChildStats } from '../components/ChildStats';
import { useParent } from '../data/parentContext';
import { childPath } from '../paths';

export function ParentHomePage() {
  const t = text.parent.home;
  const { parent, children } = useParent();

  return (
    <>
      <title>{text.app.pageTitle(t.pageTitle)}</title>
      <p className="font-display text-lg font-medium text-forest">{t.greeting(parent.firstName)}</p>
      <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">{t.heading}</h1>

      <section aria-labelledby="children-heading" className="mt-8">
        <h2 id="children-heading" className="sr-only">
          {t.childrenHeading}
        </h2>
        <motion.ul
          variants={listMotion}
          initial="hidden"
          animate="show"
          className="grid gap-5 lg:grid-cols-2"
        >
          {children.map((child, index) => {
            const { firstName, lastName, id } = child.profile;
            const tone = childTones[index % childTones.length]!;
            return (
              <motion.li key={id} variants={itemMotion}>
                <Link
                  to={childPath(id)}
                  className="group relative block h-full overflow-hidden rounded-[2rem] bg-card p-6 shadow-soft transition-[transform,box-shadow] duration-300 ease-bounce hover:-translate-y-1 hover:shadow-lifted"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'absolute -top-12 -right-12 size-40 rounded-full opacity-60 transition-transform duration-500 group-hover:scale-110',
                      tone,
                    )}
                  />
                  <span className="relative flex items-center gap-4">
                    <span
                      aria-hidden="true"
                      className={cn(
                        'flex size-16 shrink-0 items-center justify-center font-display text-xl font-semibold',
                        blobShape,
                        tone,
                      )}
                    >
                      {initialsOf(firstName, lastName)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-2xl font-semibold text-ink">
                        {firstName} {lastName}
                      </span>
                      {child.className && (
                        <span className="block text-ink-soft">{t.classLabel(child.className)}</span>
                      )}
                    </span>
                    <span
                      aria-hidden="true"
                      className="flex size-11 shrink-0 items-center justify-center rounded-full bg-paper transition-transform group-hover:translate-x-1"
                    >
                      <ArrowRightIcon weight="bold" className="size-5 text-forest" />
                    </span>
                  </span>
                  <div className="relative mt-6">
                    <ChildStats child={child} compact />
                  </div>
                </Link>
              </motion.li>
            );
          })}
        </motion.ul>
      </section>
    </>
  );
}
