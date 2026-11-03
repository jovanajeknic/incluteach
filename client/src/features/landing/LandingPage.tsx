import { useCallback, useRef, useState } from 'react';
import { ScrollRestoration } from 'react-router';
import { MAIN_CONTENT_ID, SkipLink } from '@/shared/components/SkipLink';
import { text } from '@/text/sr-Latn';
import { AccessibilitySection } from './components/AccessibilitySection';
import { AudiencesSection } from './components/AudiencesSection';
import { FinalCallToAction } from './components/FinalCallToAction';
import { HeroSection } from './components/HeroSection';
import { HowItWorksSection } from './components/HowItWorksSection';
import { LogoIntro } from './components/LogoIntro';
import { SiteFooter } from './components/SiteFooter';
import { SiteHeader } from './components/SiteHeader';
import { shouldPlayLogoIntro } from './logoIntro';
import { useScrollReveal } from './useScrollReveal';

export function LandingPage() {
  const headerLogoRef = useRef<SVGSVGElement>(null);
  // Decided once per visit, before the first paint, so the page never flashes before the intro.
  const [introActive, setIntroActive] = useState(shouldPlayLogoIntro);
  const handleIntroFinish = useCallback(() => setIntroActive(false), []);
  useScrollReveal();

  return (
    <div className="min-h-screen overflow-x-clip bg-paper">
      <title>{text.landing.pageTitle}</title>
      <SkipLink />
      <SiteHeader logoRef={headerLogoRef} hideLogoMark={introActive} />
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
      {introActive && <LogoIntro targetRef={headerLogoRef} onFinish={handleIntroFinish} />}
    </div>
  );
}
