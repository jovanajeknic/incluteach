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
      demoLinks: {
        teacher: 'Nastavnički demo',
        student: 'Učenički demo',
        parent: 'Roditeljski demo',
      },
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
    demoNotice: 'Demo prikaz — prijava i kreiranje naloga još nijesu povezani sa serverom.',
    fields: {
      email: 'Email adresa',
      password: 'Lozinka',
      confirmPassword: 'Potvrdite lozinku',
      firstName: 'Ime',
      lastName: 'Prezime',
      role: 'Uloga',
      passwordHint: (minLength: number) =>
        `Najmanje ${minLength} znakova. Razmaci su dozvoljeni, a lozinku možete zalijepiti iz menadžera lozinki.`,
    },
    roles: {
      teacher: 'Nastavnik',
      parent: 'Roditelj',
      studentNote: 'Učenike u aplikaciju dodaje škola, pa se ne registruju sami.',
    },
    showPassword: 'Prikaži lozinku',
    hidePassword: 'Sakrij lozinku',
    errors: {
      emailRequired: 'Unesite email adresu.',
      emailInvalid: 'Unesite ispravnu email adresu, na primjer ime@primjer.me.',
      passwordRequired: 'Unesite lozinku.',
      passwordTooShort: (minLength: number) => `Lozinka mora imati najmanje ${minLength} znakova.`,
      confirmPasswordRequired: 'Ponovo unesite lozinku.',
      passwordsDoNotMatch: 'Lozinke se ne podudaraju.',
      firstNameRequired: 'Unesite ime.',
      lastNameRequired: 'Unesite prezime.',
      roleRequired: 'Izaberite ulogu.',
      submitFailed: 'Slanje nije uspjelo. Pokušajte ponovo.',
    },
    login: {
      pageTitle: 'Prijava',
      heading: 'Dobro došli nazad',
      description: 'Nastavite svoje putovanje kroz učenje.',
      submit: 'Prijavi se',
      submitting: 'Prijavljivanje…',
      demoSuccess:
        'Forma je uspješno provjerena. Ovo je demo prikaz: prijava nije stvarno izvršena.',
      switchPrompt: 'Nemate nalog?',
      switchLink: 'Registrujte se.',
    },
    register: {
      pageTitle: 'Registracija',
      heading: 'Dobro došli u IncluTeach',
      description: 'Izaberite svoju ulogu i napravite nalog.',
      submit: 'Napravi nalog',
      submitting: 'Pravljenje naloga…',
      demoSuccess:
        'Forma je uspješno provjerena. Ovo je demo prikaz: nalog nije stvarno napravljen.',
      switchPrompt: 'Već imate nalog?',
      switchLink: 'Prijavite se.',
    },
  },

  student: {
    demoNotice:
      'Demo verzija sa izmišljenim podacima. Napredak se ne čuva nakon osvježavanja stranice.',
    profile: {
      role: 'Učenik',
      badge: 'Demo profil',
    },
    nav: {
      label: 'Učenička navigacija',
      subjects: 'Moji predmeti',
    },
    home: {
      pageTitle: 'Moji predmeti',
      greeting: (name: string) => `Zdravo, ${name}!`,
      intro: 'Izaberi predmet i nastavi da učiš.',
      subjectsHeading: 'Predmeti',
      lessonCount: (count: number) => {
        if (count === 0) return 'Još nema lekcija';
        if (count === 1) return '1 lekcija';
        if (count >= 2 && count <= 4) return `${count} lekcije`;
        return `${count} lekcija`;
      },
      starsLabel: 'Zvjezdice za trud',
      starsHint: 'Zvjezdicu dobijaš kad završiš vježbu uz lekciju.',
    },
    subject: {
      backToSubjects: 'Nazad na predmete',
      lessonsHeading: 'Lekcije',
      empty: 'U ovom predmetu još nema lekcija. Uskoro stižu!',
      status: {
        new: 'Nova',
        started: 'Započeta',
        completed: 'Završena',
      },
      notFoundTitle: 'Predmet nije pronađen',
      notFoundDescription: 'Ovaj predmet ne postoji ili ti nije dodijeljen.',
    },
    lesson: {
      backToSubject: (subject: string) => `Nazad na: ${subject}`,
      shorterVersion: 'Kraća verzija',
      readingSettings: 'Podešavanja čitanja',
      stepByStep: 'Korak po korak',
      stepProgress: (step: number, total: number) => `Korak ${step} od ${total}`,
      previousStep: 'Prethodni korak',
      nextStep: 'Sljedeći korak',
      glossaryHint: 'Podvučene riječi imaju objašnjenje. Dodirni riječ da ga vidiš.',
      startQuiz: 'Uradi vježbu',
      notFoundTitle: 'Lekcija nije pronađena',
      notFoundDescription: 'Ova lekcija ne postoji ili ti još nije dodijeljena.',
    },
    reading: {
      title: 'Podešavanja čitanja',
      font: {
        label: 'Slova',
        standard: 'Obična',
        rounded: 'Zaobljena',
        dyslexic: 'Za lakše čitanje',
      },
      size: { label: 'Veličina slova', m: 'Srednja', l: 'Velika', xl: 'Najveća' },
      lineSpacing: {
        label: 'Razmak između redova',
        normal: 'Običan',
        relaxed: 'Veći',
        loose: 'Najveći',
      },
      letterSpacing: { label: 'Razmak između slova', normal: 'Običan', wide: 'Veći' },
      background: {
        label: 'Boja podloge',
        white: 'Bijela',
        cream: 'Krem',
        mint: 'Menta',
        sky: 'Plava',
        butter: 'Žuta',
      },
      reset: 'Vrati početna podešavanja',
      savedNote: 'Podešavanja se pamte na ovom uređaju.',
    },
    audio: {
      listen: 'Poslušaj lekciju',
      pause: 'Pauza',
      resume: 'Nastavi',
      stop: 'Zaustavi',
      speed: 'Brzina čitanja',
      speeds: { slow: 'Sporije', normal: 'Obično', fast: 'Brže' },
      unsupported: 'Ovaj pregledač ne može da čita naglas.',
      noVoice: 'Na ovom uređaju nema glasa koji čita na našem jeziku.',
    },
    glossary: {
      closeHint: 'Dodirni riječ ponovo da zatvoriš objašnjenje.',
    },
    quiz: {
      pageTitle: (lesson: string) => `Vježba: ${lesson}`,
      heading: 'Vježba',
      intro: 'Ovo je vježba, ne ocjena. Polako, imaš vremena.',
      progress: (current: number, total: number) => `Pitanje ${current} od ${total}`,
      answersLabel: 'Odgovori',
      correct: 'Tačno!',
      incorrect: 'Nije baš tako.',
      correctAnswerIs: (answer: string) => `Tačan odgovor: ${answer}`,
      next: 'Sljedeće pitanje',
      finish: 'Završi vježbu',
      doneTitle: 'Bravo! Vježba je završena.',
      doneText: 'Zvjezdica za trud je tvoja.',
      again: 'Ponovi vježbu',
      backToLesson: 'Nazad na lekciju',
      backToSubjects: 'Moji predmeti',
    },
  },

  parent: {
    demoNotice:
      'Demo verzija sa izmišljenim podacima. Prijedlozi se ne šalju stvarno i gube se osvježavanjem stranice.',
    profile: {
      role: 'Roditelj',
      badge: 'Demo profil',
    },
    nav: {
      label: 'Roditeljska navigacija',
      children: 'Moja djeca',
    },
    home: {
      pageTitle: 'Moja djeca',
      greeting: (name: string) => `Dobro došli, ${name}`,
      intro: 'Pratite šta vaše dijete uči i pomozite nam da lekcije prilagodimo baš njemu.',
      childrenHeading: 'Povezana djeca',
      lessonsSummary: (started: number, completed: number) =>
        `Započetih lekcija: ${started} · Završenih: ${completed}`,
      open: 'Pogledaj',
    },
    child: {
      backToChildren: 'Nazad na djecu',
      lessonsHeading: 'Lekcije po predmetima',
      noLessons: 'U ovom predmetu još nema lekcija.',
      forbiddenTitle: 'Nemate pristup',
      forbiddenDescription: 'Ovo dijete nije povezano sa vašim nalogom.',
    },
    lesson: {
      backToChild: (name: string) => `Nazad na: ${name}`,
      versionHeading: (name: string) => `Lekcija kako je vidi ${name}`,
      shorterVersion: 'Kraća verzija',
      standardVersion: 'Osnovna verzija',
      practiceHeading: 'Vježba',
      practiceNotDone: 'Vježba još nije urađena.',
      practiceDone: (date: string) => `Vježba je urađena ${date}.`,
      difficultHeading: 'Gdje je bilo teško',
      difficultIntro: 'Na ovim pitanjima prvi odgovor nije bio tačan. Možete ih ponoviti zajedno:',
      noDifficult: 'Sva pitanja su odgovorena tačno iz prvog pokušaja.',
      homeHeading: 'Za rad kod kuće',
      notFoundTitle: 'Lekcija nije pronađena',
      notFoundDescription: 'Ova lekcija ne postoji ili nije dodijeljena vašem djetetu.',
    },
    suggestions: {
      heading: 'Prijedlozi za prilagođavanje',
      intro:
        'Opišite šta vašem djetetu pomaže u učenju. Prijedlog prvo čita nastavnik, koji odlučuje kako će ga AI uzeti u obzir pri prilagođavanju lekcija.',
      lessonIntro: 'Prijedlog će se odnositi na ovu lekciju.',
      label: 'Vaš prijedlog',
      hint: 'Na primjer: „Bolje razumije kad su rečenice kratke i kad ima primjer iz svakodnevnog života.“ Dijagnoza nije potrebna.',
      privacy: 'Prijedlog vidi samo nastavnik. Dijete ga ne vidi.',
      submit: 'Pošalji nastavniku',
      required: 'Napišite prijedlog prije slanja.',
      tooLong: (max: number) => `Prijedlog može imati najviše ${max} znakova.`,
      demoSent:
        'Prijedlog je zabilježen. Ovo je demo prikaz: ništa nije stvarno poslato nastavniku.',
      listHeading: 'Vaši prijedlozi',
      forLesson: (title: string) => `Lekcija: ${title}`,
      general: 'Opšti prijedlog',
      statusPending: 'Čeka pregled nastavnika',
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
