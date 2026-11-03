import type { Lesson } from '../types';

/**
 * Fictional demo lessons. Statuses vary only to show how each one looks;
 * the review, approval and assignment process is not implemented yet.
 */
export const demoLessons: Lesson[] = [
  {
    id: 'demo-water-cycle',
    title: 'Kruženje vode u prirodi',
    subject: 'Priroda i društvo',
    grade: 4,
    status: 'in_review',
    content:
      'Voda u prirodi stalno putuje. Sunce zagrijava vodu u morima, rijekama i jezerima, pa ona isparava i odlazi u vazduh.\n\nU vazduhu se vodena para hladi i pravi oblake. Kada se u oblacima skupi dovoljno kapljica, pada kiša ili snijeg.\n\nVoda se zatim vraća u rijeke, jezera i mora, i sve počinje iznova.',
  },
  {
    id: 'demo-addition-100',
    title: 'Sabiranje i oduzimanje do 100',
    subject: 'Matematika',
    grade: 2,
    status: 'assigned',
    content:
      'Kada sabiramo, spajamo dvije grupe u jednu. Kada oduzimamo, od jedne grupe nešto uzimamo.\n\nPrimjer: 34 + 25. Prvo saberemo desetice: 30 + 20 = 50. Zatim saberemo jedinice: 4 + 5 = 9. Rezultat je 59.',
  },
  {
    id: 'demo-nouns-adjectives',
    title: 'Imenice i pridjevi',
    subject: 'Maternji jezik',
    grade: 3,
    status: 'approved',
    content:
      'Imenice su riječi kojima imenujemo bića, stvari i pojave. Na primjer: djevojčica, sto, kiša.\n\nPridjevi su riječi koje nam govore kakvo je nešto. Na primjer: vesela djevojčica, drveni sto, topla kiša.',
  },
  {
    id: 'demo-plants-around-us',
    title: 'Biljke u našem okruženju',
    subject: 'Priroda i društvo',
    grade: 3,
    status: 'draft',
    content:
      'Biljke rastu u šumi, na livadi, u vrtu i u parku. Većina biljaka ima korijen, stablo, list, cvijet i plod.\n\nKorijen upija vodu iz zemlje, a listovi koriste sunčevu svjetlost da bi biljka rasla.',
  },
  {
    id: 'demo-fractions-intro',
    title: 'Razlomci – uvod',
    subject: 'Matematika',
    grade: 5,
    status: 'in_review',
    content:
      'Razlomak pokazuje dio cjeline. Ako picu podijelimo na četiri jednaka dijela i uzmemo jedan, uzeli smo jednu četvrtinu.\n\nBroj ispod razlomačke crte kaže na koliko je jednakih dijelova cjelina podijeljena. Broj iznad crte kaže koliko smo dijelova uzeli.',
  },
  {
    id: 'demo-traffic-safety',
    title: 'Bezbjednost u saobraćaju',
    subject: 'Priroda i društvo',
    grade: 2,
    status: 'assigned',
    content:
      'Ulicu prelazimo samo na pješačkom prelazu. Prije prelaska pogledamo lijevo, pa desno, pa ponovo lijevo.\n\nNa semaforu čekamo zeleno svjetlo za pješake. Kada idemo pored puta, hodamo po trotoaru.',
  },
];
