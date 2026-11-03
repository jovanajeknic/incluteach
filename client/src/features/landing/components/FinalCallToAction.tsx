import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import { teacherHomePath } from '@/features/lessons/paths';
import { LogoMark } from '@/shared/brand/Logo';
import { Button } from '@/shared/ui/button';
import { text } from '@/text/sr-Latn';

export function FinalCallToAction() {
  const t = text.landing.finalCta;

  return (
    <section aria-labelledby="final-cta-heading" className="py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="surface-dark reveal-on-scroll relative overflow-hidden rounded-[2rem] bg-petrol-deep px-7 py-14 sm:px-14 sm:py-16">
          <LogoMark
            tone="inverse"
            className="pointer-events-none absolute -right-8 -bottom-10 size-64 text-paper opacity-[0.07] sm:size-80"
          />
          <div className="relative max-w-2xl">
            <h2
              id="final-cta-heading"
              className="font-display text-3xl leading-tight font-semibold tracking-tight text-balance text-paper sm:text-4xl"
            >
              {t.title}
            </h2>
            <p className="mt-4 text-lg text-petrol-tint">{t.description}</p>
            <Button asChild variant="accent" size="lg" className="mt-8 h-12 px-7 text-base">
              <Link to={teacherHomePath}>
                {t.action}
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
