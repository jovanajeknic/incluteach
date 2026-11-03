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
    pageTitle: 'IncluTeach – učenje koje nas povezuje',
    nav: {
      label: 'Glavna navigacija',
      about: 'O nama',
      howItWorks: 'Kako funkcioniše',
      audiences: 'Za koga je',
      login: 'Prijavi se',
      register: 'Registruj se',
      menu: 'Meni',
    },
    hero: {
      eyebrow: 'Učenje koje nas povezuje',
      titleFirst: 'Učimo različito.',
      titleSecond: 'Rastemo zajedno.',
      description: 'Prostor za znanje, podršku i prilike za svako dijete.',
      explore: 'Istraži IncluTeach',
      ourStory: 'Naša priča',
    },
    audiences: {
      title: 'Zajedno stvaramo prostor za svakoga.',
      comingSoon: 'U pripremi',
      teacher: {
        title: 'Za nastavnike',
        description: 'Alati i podrška za inkluzivno i fleksibilno učenje.',
      },
      student: {
        title: 'Za učenike',
        description: 'Prilike da uče na način koji odgovara njihovim potrebama.',
      },
      parent: {
        title: 'Za roditelje',
        description: 'Sigurnost da dijete dobija podršku koja mu je potrebna.',
      },
    },
    howItWorks: {
      title: 'Kako funkcioniše',
      steps: [
        'Nastavnik unosi lekciju.',
        'Platforma pomaže da se lekcija prilagodi, a nastavnik je pregleda.',
        'Učenik uči na svoj način, a roditelj prati i podržava.',
      ],
      note: 'Ovo je planirani tok. Demo trenutno prikazuje početni nastavnički dio.',
    },
    about: {
      title: 'Naša priča',
      text: 'IncluTeach nastaje iz uvjerenja da svako dijete zaslužuje da uči na način koji mu odgovara. Povezujemo nastavnike, učenike i roditelje, kako bi podrška djetetu bila zajednička.',
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
