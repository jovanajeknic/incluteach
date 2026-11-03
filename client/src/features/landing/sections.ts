import { text } from '@/text/sr-Latn';

/** Anchor ids of landing page sections, shared by the header, hero and footer links. */
export const sectionIds = {
  howItWorks: 'kako-radi',
  audiences: 'za-koga-je',
  accessibility: 'pristupacnost',
} as const;

export const sectionLinks = [
  { id: sectionIds.howItWorks, label: text.landing.nav.howItWorks },
  { id: sectionIds.audiences, label: text.landing.nav.audiences },
  { id: sectionIds.accessibility, label: text.landing.nav.accessibility },
] as const;
