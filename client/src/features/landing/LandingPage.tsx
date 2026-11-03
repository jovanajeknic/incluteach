import { ScrollRestoration } from 'react-router';
import { MAIN_CONTENT_ID, SkipLink } from '@/shared/components/SkipLink';
import { text } from '@/text/sr-Latn';
import { AccessibilitySection } from './components/AccessibilitySection';
import { AudiencesSection } from './components/AudiencesSection';
import { FinalCallToAction } from './components/FinalCallToAction';
import { HeroSection } from './components/HeroSection';
import { HowItWorksSection } from './components/HowItWorksSection';
import { SiteFooter } from './components/SiteFooter';
import { SiteHeader } from './components/SiteHeader';

export function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-clip bg-paper">
      <title>{text.landing.pageTitle}</title>
      <SkipLink />
      <SiteHeader />
      {/* tabIndex lets the skip link move keyboard focus into the main area. */}
      <main id={MAIN_CONTENT_ID} tabIndex={-1} className="focus:outline-none">
        <HeroSection />
        <HowItWorksSection />
        <AudiencesSection />
        <AccessibilitySection />
        <FinalCallToAction />
      </main>
      <SiteFooter />
      <ScrollRestoration />
    </div>
  );
}
