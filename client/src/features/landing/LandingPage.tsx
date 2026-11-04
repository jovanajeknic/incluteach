import { ScrollRestoration } from 'react-router';
import { MAIN_CONTENT_ID, SkipLink } from '@/shared/components/SkipLink';
import { useSmoothScroll } from '@/shared/motion/useSmoothScroll';
import { text } from '@/text/sr-Latn';
import { AboutSection } from './components/AboutSection';
import { AudiencesSection } from './components/AudiencesSection';
import { HeroSection } from './components/HeroSection';
import { SiteFooter } from './components/SiteFooter';
import { SiteHeader } from './components/SiteHeader';
import { useScrollReveal } from './useScrollReveal';

export function LandingPage() {
  useScrollReveal();
  // The sticky header is 80 px tall; sections land just below it.
  useSmoothScroll({ anchorOffset: 96 });

  return (
    <div className="area-theme flex min-h-screen flex-col overflow-x-clip bg-paper">
      <title>{text.landing.pageTitle}</title>
      <SkipLink />
      <SiteHeader />
      {/* tabIndex lets the skip link move keyboard focus into the main area. */}
      <main id={MAIN_CONTENT_ID} tabIndex={-1} className="flex-1 focus:outline-none">
        <HeroSection />
        <AudiencesSection />
        <AboutSection />
      </main>
      <SiteFooter />
      <ScrollRestoration />
    </div>
  );
}
