/**
 * All user interface text (Serbian, Latin script, ijekavian).
 * Kept out of components so the UI can be translated later without touching logic.
 */
export const text = {
  app: {
    name: 'IncluTeach',
    pageTitle: (page: string) => `${page} · IncluTeach`,
    homeLinkLabel: 'IncluTeach – početna stranica',
    skipToContent: 'Preskoči na sadržaj',
    mainNavigation: 'Glavna navigacija',
  },

  landing: {
    pageTitle: 'IncluTeach – inkluzivno obrazovanje',
    nav: {
      label: 'Nalog',
      login: 'Prijavi se',
      register: 'Registruj se',
    },
    badges: {
      inDemo: 'Dostupno u demou',
      comingSoon: 'U pripremi',
      illustrative: 'Ilustrativni prikaz',
    },
    hero: {
      title: 'Različiti načini učenja. Jednake prilike.',
      description:
        'IncluTeach pomaže nastavnicima da svaku lekciju prilagode svakom učeniku, a roditeljima da podrže učenje kod kuće.',
      demoAction: 'Isprobaj demo',
      demoNote: 'Demo za nastavnike, bez prijave.',
    },
    visual: {
      caption: 'Ilustrativni prikaz: jedna lekcija na četiri načina.',
      lessonMeta: 'Priroda i društvo · 4. razred',
      lessonTitle: 'Kruženje vode u prirodi',
      modeText: 'Tekst',
      modeSummary: 'Sažetak',
      modeVisual: 'Slika',
      modeAudio: 'Slušanje',
      textLines: [
        'Sunce zagrijava vodu u morima, rijekama i jezerima, pa ona isparava.',
        'U vazduhu se vodena para hladi i pravi oblake.',
      ],
      summaryItems: ['Sunce zagrijava vodu.', 'Para pravi oblake.', 'Kiša vraća vodu u rijeke.'],
      audioLabel: 'Poslušaj lekciju',
    },
    roles: {
      heading: 'Za koga je IncluTeach',
      teacher: { title: 'Nastavnik', description: 'Prilagođava lekcije svakom učeniku.' },
      student: { title: 'Učenik', description: 'Uči na način koji mu odgovara.' },
      parent: { title: 'Roditelj', description: 'Prati i podržava učenje kod kuće.' },
    },
    footer: {
      note: 'Demo projekat sa izmišljenim podacima.',
    },
  },

  auth: {
    login: {
      pageTitle: 'Prijava',
      heading: 'Prijava je u pripremi',
    },
    register: {
      pageTitle: 'Registracija',
      heading: 'Registracija je u pripremi',
    },
    description:
      'Nalozi će biti dostupni kada aplikaciju povežemo sa serverom. Do tada možete bez naloga isprobati nastavnički demo.',
    tryDemo: 'Isprobaj nastavnički demo',
    backHome: 'Nazad na početnu',
  },

  demo: {
    notice:
      'Demo verzija sa izmišljenim podacima. Izmjene se čuvaju samo dok je stranica otvorena i gube se osvježavanjem.',
    profileName: 'Ana Marković',
    profileInitials: 'AM',
    profileRole: 'Nastavnica',
    profileBadge: 'Demo profil',
  },

  nav: {
    home: 'Početna',
    newLesson: 'Nova lekcija',
  },

  dashboard: {
    pageTitle: 'Početna',
    welcome: (name: string) => `Dobro došli, ${name}`,
    intro: 'Ovdje pripremate lekcije prilagođene svojim učenicima i pratite njihov status.',
    statsHeading: 'Pregled lekcija',
    statTotal: 'Ukupno lekcija',
    statInReview: 'Za pregled',
    statAssigned: 'Dodijeljene',
    lessonsHeading: 'Lekcije',
    newLessonButton: 'Nova lekcija',
    emptyTitle: 'Još nemate lekcija',
    emptyDescription: 'Napravite prvu lekciju i ona će se pojaviti ovdje.',
  },

  lesson: {
    gradeLabel: (grade: number) => `${grade}. razred`,
    subject: 'Predmet',
    grade: 'Razred',
    status: 'Status',
    content: 'Sadržaj lekcije',
    statuses: {
      draft: 'Nacrt',
      in_review: 'Za pregled',
      approved: 'Odobrena',
      assigned: 'Dodijeljena',
    },
  },

  newLesson: {
    pageTitle: 'Nova lekcija',
    heading: 'Nova lekcija',
    intro: 'Unesite osnovne podatke i tekst lekcije. Lekcija se čuva kao nacrt.',
    allFieldsRequired: 'Sva polja su obavezna.',
    titleLabel: 'Naslov',
    subjectLabel: 'Predmet',
    subjectHint: 'Na primjer: Matematika ili Priroda i društvo',
    gradeLabel: 'Razred',
    gradePlaceholder: 'Izaberite razred',
    contentLabel: 'Tekst lekcije',
    contentHint: 'Prazan red odvaja pasuse.',
    save: 'Sačuvaj nacrt',
    cancel: 'Odustani',
    errors: {
      titleRequired: 'Unesite naslov lekcije.',
      subjectRequired: 'Unesite predmet.',
      gradeRequired: 'Izaberite razred.',
      contentRequired: 'Unesite tekst lekcije.',
    },
  },

  lessonDetail: {
    backToLessons: 'Nazad na lekcije',
    savedMessage: 'Nacrt je sačuvan.',
    notFoundTitle: 'Lekcija nije pronađena',
    notFoundDescription:
      'Tražena lekcija ne postoji. Moguće je da je adresa netačna ili da je lekcija napravljena prije osvježavanja stranice, pa je izgubljena.',
  },

  notFound: {
    pageTitle: 'Stranica nije pronađena',
    heading: 'Stranica nije pronađena',
    description: 'Adresa koju ste otvorili ne postoji.',
    backHome: 'Nazad na početnu',
  },

  routeError: {
    pageTitle: 'Greška',
    heading: 'Došlo je do greške',
    description: 'Stranicu trenutno nije moguće prikazati. Pokušajte ponovo.',
    backHome: 'Nazad na početnu',
  },
} as const;
