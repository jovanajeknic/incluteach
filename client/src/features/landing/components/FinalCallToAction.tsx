import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import { teacherHomePath } from '@/features/lessons/paths';
import { LogoMark } from '@/shared/brand/Logo';
import { Button } from '@/shared/ui/button';
import { text } from '@/text/sr-Latn';
import { Wave } from './Wave';

export function FinalCallToAction() {
  const t = text.landing.finalCta;

  return (
    <section aria-labelledby="final-cta-heading" className="bg-lilac">
      <Wave className="text-paper" />
      <div className="bg-paper py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div
            data-reveal="pop"
            className="relative grid items-center gap-10 overflow-hidden rounded-[2.5rem] bg-butter px-7 py-12 sm:px-12 sm:py-14 md:grid-cols-[1.4fr_1fr]"
          >
            <div
              aria-hidden="true"
              className="absolute -top-10 -left-10 size-40 rounded-full bg-blush/70"
            />
            <div className="relative">
              <h2
                id="final-cta-heading"
                className="font-display text-3xl leading-tight font-black tracking-tight text-balance text-ink sm:text-4xl"
              >
                {t.title}
              </h2>
              <p className="mt-4 text-lg text-ink">{t.description}</p>
              <Button asChild size="lg" className="mt-8 h-13 px-7 text-base">
                <Link to={teacherHomePath}>
                  {t.action}
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </div>
            <div className="relative hidden justify-center md:flex">
              <div aria-hidden="true" className="absolute inset-4 rounded-full bg-card/60" />
              <LogoMark className="hover-hop relative h-auto w-full max-w-64" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
