import type { LessonIllustration } from '@/features/student/types';

/**
 * Prepared drawings that the simulated AI "generates". The real backend will send its own
 * images; until then these files in /public stand in for them.
 */
const catalog = {
  waterCycle: {
    src: '/illustrations/water-cycle.svg',
    alt: 'Sunce grije more, para se diže, od nje nastaje oblak iz kojeg pada kiša.',
    caption: 'Voda putuje u krug: more, para, oblak, kiša.',
  },
  plant: {
    src: '/illustrations/plant.svg',
    alt: 'Biljka sa korijenom u zemlji, stablom, dva lista i crvenim cvijetom, pored kapi vode.',
    caption: 'Korijen, stablo, list i cvijet.',
  },
  counting: {
    src: '/illustrations/counting.svg',
    alt: 'Tri jabuke i dvije jabuke sa znakom plus između njih.',
    caption: 'Kad sabiramo, spajamo dvije grupe u jednu.',
  },
  fractions: {
    src: '/illustrations/fractions.svg',
    alt: 'Pica podijeljena na četiri jednaka dijela; jedan dio je izvučen. Pored piše jedna četvrtina.',
    caption: 'Jedan od četiri jednaka dijela je jedna četvrtina.',
  },
  seasons: {
    src: '/illustrations/seasons.svg',
    alt: 'Isto drvo četiri puta: u cvijetu, zeleno, sa narandžastim lišćem i pod snijegom.',
    caption: 'Proljeće, ljeto, jesen i zima.',
  },
  crosswalk: {
    src: '/illustrations/crosswalk.svg',
    alt: 'Pješački prelaz sa bijelim prugama, semafor sa zelenim svjetlom i dijete koje čeka.',
    caption: 'Ulicu prelazimo na pješačkom prelazu, kad je zeleno.',
  },
  reading: {
    src: '/illustrations/reading.svg',
    alt: 'Otvorena knjiga iznad koje lebde slova A, b i Č.',
    caption: 'Riječi imaju svoja imena i svoja pravila.',
  },
  colors: {
    src: '/illustrations/colors.svg',
    alt: 'Duga od četiri boje sa natpisima red, yellow, green i blue.',
    caption: 'Red, yellow, green, blue.',
  },
} satisfies Record<string, Omit<LessonIllustration, 'id'>>;

type IllustrationKey = keyof typeof catalog;

const byLesson: Record<string, IllustrationKey[]> = {
  'kruzenje-vode': ['waterCycle'],
  biljke: ['plant'],
  sabiranje: ['counting'],
  oduzimanje: ['counting'],
  mnozenje: ['counting'],
  'razlomci-uvod': ['fractions'],
  'godisnja-doba': ['seasons'],
  saobracaj: ['crosswalk'],
  imenice: ['reading'],
  'boje-engleski': ['colors'],
};

const bySubject: Record<string, IllustrationKey[]> = {
  priroda: ['waterCycle', 'plant', 'seasons'],
  matematika: ['counting', 'fractions'],
  jezik: ['reading'],
  engleski: ['colors'],
  likovno: ['colors'],
};

const fallback: IllustrationKey[] = ['reading'];

/**
 * Picks drawings for a lesson. `attempt` rotates through the subject's drawings, so asking
 * the AI again after feedback gives a different result.
 */
export function demoIllustrationsFor(
  lessonId: string,
  subjectId: string,
  attempt = 0,
): LessonIllustration[] {
  const subjectKeys = bySubject[subjectId] ?? fallback;
  const keys =
    attempt === 0
      ? (byLesson[lessonId] ?? subjectKeys.slice(0, 1))
      : [subjectKeys[attempt % subjectKeys.length]!];
  return keys.map((key, index) => ({
    id: `${lessonId}-${key}-${attempt}-${index}`,
    ...catalog[key],
  }));
}
