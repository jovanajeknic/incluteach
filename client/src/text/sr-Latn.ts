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
      label: 'Navigacija po stranici',
      howItWorks: 'Kako radi',
      audiences: 'Za koga je',
      accessibility: 'Pristupačnost',
      tryDemo: 'Isprobaj demo',
      menu: 'Meni',
    },
    badges: {
      inDemo: 'Dostupno u demou',
      comingSoon: 'U pripremi',
      illustrative: 'Ilustrativni prikaz',
    },
    hero: {
      eyebrow: 'Platforma za inkluzivno obrazovanje',
      title: 'Različiti načini učenja. Jednake prilike.',
      description:
        'IncluTeach povezuje nastavnike, učenike i roditelje. Nastavnik od jednog materijala priprema lekciju prilagođenu različitim potrebama, učenik uči na način koji mu odgovara, a roditelj zna kako da podrži učenje kod kuće.',
      primaryAction: 'Isprobaj nastavnički demo',
      secondaryAction: 'Kako funkcioniše',
      demoNote: 'Demo koristi izmišljene podatke i ne traži prijavu.',
    },
    visual: {
      caption:
        'Ilustrativni prikaz: jedna lekcija na četiri načina. U demou je dostupan tekstualni prikaz lekcije, a sažetak, vizuelna podrška i slušanje su u pripremi.',
      lessonMeta: 'Priroda i društvo · 4. razred',
      lessonTitle: 'Kruženje vode u prirodi',
      modeText: 'Tekst',
      modeSummary: 'Sažetak',
      modeVisual: 'Vizuelna podrška',
      modeAudio: 'Slušanje',
      textLines: [
        'Sunce zagrijava vodu u morima, rijekama i jezerima, pa ona isparava.',
        'U vazduhu se vodena para hladi i pravi oblake.',
      ],
      summaryItems: ['Sunce zagrijava vodu.', 'Para pravi oblake.', 'Kiša vraća vodu u rijeke.'],
      audioLabel: 'Poslušaj lekciju',
    },
    howItWorks: {
      eyebrow: 'Kako radi',
      title: 'Od jednog materijala do lekcije za svakog učenika',
      plannedNote:
        'Ovo je planirani tok platforme. Trenutni demo prikazuje početni nastavnički dio: unos lekcije, čuvanje nacrta i njegov pregled.',
      steps: [
        {
          actor: 'Nastavnik',
          title: 'Nastavnik unosi materijal',
          description: 'Tekst lekcije koju već koristi u nastavi, sa predmetom i razredom.',
        },
        {
          actor: 'Platforma i nastavnik',
          title: 'Platforma pomaže, nastavnik odlučuje',
          description:
            'Platforma predlaže prilagođene verzije, a nastavnik ih pregleda i uređuje. Ništa ne stiže do učenika bez njegovog odobrenja.',
        },
        {
          actor: 'Učenik i roditelj',
          title: 'Učenik uči, roditelj podržava',
          description:
            'Učenik koristi materijal prilagođen sebi, a roditelj dobija jasne smjernice kako da pomogne kod kuće.',
        },
      ],
    },
    audiences: {
      eyebrow: 'Za koga je',
      title: 'Tri kutka, jedan zajednički cilj',
      intro:
        'Svaka uloga dobija ono što joj treba, a svi prate isto: da svako dijete uči sa razumijevanjem.',
      teacher: {
        label: 'Nastavnički kutak',
        title: 'Manje vremena na pripremu, više vremena za učenike',
        benefits: [
          'Unesite materijal jednom i pripremite ga za različite potrebe u odjeljenju.',
          'Pregledajte i uredite svaki prijedlog prije nego što stigne do učenika.',
          'Pratite status svih lekcija na jednom mjestu.',
        ],
        availability: 'Početni dio je dostupan u demou: unos lekcije, nacrt i pregled.',
        action: 'Otvori nastavnički demo',
      },
      student: {
        label: 'Učenički kutak',
        title: 'Učenje koje se prilagođava meni',
        benefits: [
          'Čitanje uz podesivu veličinu teksta, prored i kontrast.',
          'Sažetak, slike i slušanje uz istu lekciju.',
          'Kviz koji pokazuje napredak, bez poređenja sa drugima.',
        ],
      },
      parent: {
        label: 'Roditeljski kutak',
        title: 'Podrška kod kuće, bez nagađanja',
        benefits: [
          'Pregled lekcija i aktivnosti svog djeteta.',
          'Kratka i jasna uputstva za rad kod kuće.',
          'Vidite samo podatke svog djeteta.',
        ],
      },
    },
    accessibility: {
      eyebrow: 'Pristupačnost',
      title: 'Pristupačnost nije dodatak, već polazna tačka',
      intro:
        'Gradimo platformu tako da je može koristiti svako: uz tastaturu, čitač ekrana, uvećan tekst ili na malom ekranu.',
      principles: [
        {
          title: 'Jasan sadržaj',
          description: 'Kratke rečenice, jasna struktura i lekcije koje nastavnik uvijek pregleda.',
        },
        {
          title: 'Prilagodljiv prikaz',
          description: 'Isti sadržaj, prikazan onako kako je učeniku najlakše da ga čita.',
        },
        {
          title: 'Različiti načini učenja',
          description: 'Tekst, sažetak, slika i zvuk kao ravnopravni putevi do istog znanja.',
        },
        {
          title: 'Poštovanje privatnosti',
          description: 'Dijagnoze se ne prikazuju učenicima ni njihovim vršnjacima.',
        },
      ],
      availableTitle: 'Već radi u demou',
      available: [
        'Rad tastaturom i jasno vidljiv fokus',
        'Kontrast boja prema WCAG AA preporukama',
        'Polja forme sa jasnim oznakama i porukama o greškama',
        'Prikaz prilagođen telefonu, tabletu i računaru',
        'Poštovanje podešavanja za smanjene animacije',
        'Font dizajniran za lakše čitanje',
      ],
      plannedTitle: 'Planirano',
      planned: [
        'Podešavanje veličine teksta, proreda i kontrasta',
        'Sažeci i pojednostavljene verzije koje pregleda nastavnik',
        'Vizuelna podrška uz tekst lekcije',
        'Slušanje lekcije',
      ],
    },
    finalCta: {
      title: 'Pogledajte kako počinje priprema prilagođene lekcije',
      description:
        'Napravite nacrt lekcije u nastavničkom demou. Podaci su izmišljeni i ne traži se prijava.',
      action: 'Isprobaj nastavnički demo',
    },
    footer: {
      description:
        'Platforma za inkluzivno obrazovanje koja povezuje nastavnike, učenike i roditelje.',
      linksLabel: 'Linkovi u podnožju',
      teacherDemo: 'Nastavnički demo',
      note: 'Demo projekat sa izmišljenim podacima.',
    },
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
