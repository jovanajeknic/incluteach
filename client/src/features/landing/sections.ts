import { text } from '@/text/sr-Latn';

/** Anchor ids of landing page sections, shared by the header and hero links. */
export const sectionIds = {
  about: 'o-nama',
  audiences: 'za-koga-je',
} as const;

export const sectionLinks = [
  { id: sectionIds.about, label: text.landing.nav.about },
  { id: sectionIds.audiences, label: text.landing.nav.audiences },
] as const;
