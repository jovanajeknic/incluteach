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
    home: 'Lekcije',
    newLesson: 'Nova lekcija',
    myClass: 'Moj razred',
    suggestions: 'Prijedlozi roditelja',
    newSuggestions: 'novih',
  },

  dashboard: {
    pageTitle: 'Lekcije',
    welcome: (name: string) => `Dobro došli, ${name}`,
    intro:
      'Unesite lekciju, a AI će pripremiti verzije prilagođene potrebama vaših učenika. Vi pregledate, odobravate i dodjeljujete.',
    statsHeading: 'Pregled lekcija',
    statTotal: 'Ukupno lekcija',
    statInReview: 'Za pregled',
    statAssigned: 'Dodijeljene',
    lessonsHeading: 'Lekcije',
    newLessonButton: 'Nova lekcija',
    emptyTitle: 'Još nemate lekcija',
    emptyDescription: 'Napravite prvu lekciju i ona će se pojaviti ovdje.',
    filterSubject: 'Predmet',
    filterStatus: 'Status',
    allSubjects: 'Svi predmeti',
    allStatuses: 'Svi statusi',
    noMatches: 'Nijedna lekcija ne odgovara izabranim filterima.',
    pendingReview: 'Ima AI prijedloga za pregled',
  },

  lesson: {
    gradeLabel: (grade: number) => `${grade}. razred`,
    subject: 'Predmet',
    grade: 'Razred',
    status: 'Status',
    content: 'Sadržaj lekcije',
    statuses: {
      draft: 'Nacrt',
      processing: 'AI obrada',
      in_review: 'Za pregled',
      approved: 'Odobrena',
      assigned: 'Dodijeljena',
    },
  },

  newLesson: {
    pageTitle: 'Nova lekcija',
    heading: 'Nova lekcija',
    intro:
      'Unesite tekst lekcije kakav koristite u nastavi. Nakon čuvanja možete zatražiti AI prilagođavanje.',
    allFieldsRequired: 'Sva polja su obavezna.',
    titleLabel: 'Naslov',
    subjectLabel: 'Predmet',
    subjectPlaceholder: 'Izaberite predmet',
    gradeLabel: 'Razred',
    gradePlaceholder: 'Izaberite razred',
    contentLabel: 'Tekst lekcije',
    contentHint: 'Zalijepite ili ukucajte tekst. Prazan red odvaja pasuse.',
    save: 'Sačuvaj nacrt',
    cancel: 'Odustani',
    errors: {
      titleRequired: 'Unesite naslov lekcije.',
      subjectRequired: 'Izaberite predmet.',
      gradeRequired: 'Izaberite razred.',
      contentRequired: 'Unesite tekst lekcije.',
    },
  },

  lessonDetail: {
    backToLessons: 'Nazad na lekcije',
    savedMessage: 'Nacrt je sačuvan. Sada možete zatražiti AI prilagođavanje.',
    notFoundTitle: 'Lekcija nije pronađena',
    notFoundDescription:
      'Tražena lekcija ne postoji. Moguće je da je adresa netačna ili da je lekcija napravljena prije osvježavanja stranice, pa je izgubljena.',
    steps: {
      label: 'Faze lekcije',
      draft: 'Nacrt',
      adapt: 'AI prilagođavanje',
      review: 'Pregled i odobrenje',
      assign: 'Dodjela',
      current: 'trenutna faza',
      done: 'završeno',
    },
    adaptation: {
      heading: 'AI prilagođavanje',
      intro: 'AI priprema verzije prema potrebama učenika kojima je lekcija namijenjena:',
      neededSimplified: (count: number) => `Kraća i jednostavnija verzija — za ${count} učenika`,
      neededExamples: (count: number) => `Verzija sa više primjera — za ${count} učenika`,
      noneNeeded: 'Nijednom učeniku ne treba posebna verzija teksta; svi čitaju vaš tekst.',
      always: 'Uz to: objašnjenja težih riječi i pitanja za vježbu.',
      suggestionsIntro: 'AI će uzeti u obzir prijedloge roditelja koje ste odabrali:',
      start: 'Prilagodi pomoću AI',
      again: 'Ponovo prilagodi',
      processing: 'AI priprema prilagođene verzije…',
      done: 'AI prijedlozi su spremni za pregled.',
      demoNote:
        'Demo: AI je simuliran. Prijedlozi su unaprijed pripremljeni ili napravljeni po jednostavnim pravilima i ništa se ne šalje na internet.',
    },
    versions: {
      heading: 'Verzije lekcije',
      kinds: {
        standard: 'Vaš tekst',
        simplified: 'Kraća i jednostavnija',
        examples: 'Sa više primjera',
      },
      aiPending: 'AI prijedlog — čeka odobrenje',
      approved: 'Odobreno',
      edit: 'Uredi',
      save: 'Sačuvaj',
      cancel: 'Odustani',
      remove: 'Ukloni verziju',
      editLabel: (kind: string) => `Tekst verzije: ${kind}`,
      emptyError: 'Tekst ne može biti prazan.',
    },
    glossary: {
      heading: 'Objašnjenja težih riječi',
      intro: 'Učenik dodirne podvučenu riječ u lekciji i vidi objašnjenje.',
      term: (n: number) => `Riječ ${n}`,
      definition: (n: number) => `Objašnjenje ${n}`,
      add: 'Dodaj riječ',
      remove: (n: number) => `Ukloni riječ ${n}`,
      empty: 'Još nema riječi. Dodajte ih ili zatražite AI prilagođavanje.',
    },
    quiz: {
      heading: 'Pitanja za vježbu',
      intro: 'Vježba je bez ocjene: učenik nakon svakog odgovora dobije objašnjenje.',
      question: (n: number) => `Pitanje ${n}`,
      option: (q: number, n: number) => `Pitanje ${q}, odgovor ${n}`,
      correct: (q: number) => `Tačan odgovor na pitanje ${q}`,
      correctOption: (n: number) => `Odgovor ${n}`,
      explanation: (n: number) => `Objašnjenje za pitanje ${n}`,
      addQuestion: 'Dodaj pitanje',
      removeQuestion: (n: number) => `Ukloni pitanje ${n}`,
      empty: 'Još nema pitanja. Dodajte ih ili zatražite AI prilagođavanje.',
    },
    home: {
      heading: 'Uputstva za roditelje',
      intro: 'Kratki savjeti za rad kod kuće. Svaki red je jedan savjet.',
      label: 'Savjeti za rad kod kuće',
    },
    saveSection: 'Sačuvaj izmjene',
    sectionSaved: 'Izmjene su sačuvane.',
    sectionInvalid: 'Popunite sva polja ili uklonite prazne redove.',
    approval: {
      heading: 'Odobrenje',
      intro:
        'Učenici vide samo odobren sadržaj. Odobravanjem potvrđujete da ste pregledali sve verzije, objašnjenja i pitanja.',
      approve: 'Odobri lekciju',
      confirmText: 'Da li ste pregledali sve verzije, objašnjenja i pitanja?',
      confirm: 'Da, odobri',
      cancel: 'Odustani',
      approved: 'Lekcija je odobrena.',
      nothingToApprove: 'Sav sadržaj je odobren.',
      waitForAi: 'Sačekajte da AI završi obradu.',
    },
    assign: {
      heading: 'Dodjela učenicima',
      intro: 'Izaberite cijeli razred ili pojedine učenike.',
      notApproved: 'Lekciju možete dodijeliti tek kad je odobrite.',
      wholeClass: (name: string) => `Cijeli razred ${name}`,
      students: 'Pojedini učenici',
      assign: 'Dodijeli',
      nothingSelected: 'Izaberite razred ili bar jednog učenika.',
      assigned: 'Lekcija je dodijeljena. Učenici je sada vide u svom dijelu aplikacije.',
      currentTarget: 'Trenutno dodijeljeno:',
      classTarget: (name: string) => `razred ${name}`,
    },
  },

  classView: {
    pageTitle: 'Moj razred',
    heading: (name: string) => `Razred ${name}`,
    intro:
      'Napredak učenika i njihove potrebe. Potrebe opisuju šta učeniku pomaže; dijagnoze se ne unose.',
    studentsHeading: 'Učenici',
    progress: (completed: number, total: number) =>
      `Završene vježbe: ${completed} od ${total} lekcija`,
    noNeeds: 'Bez posebnih potreba',
    pendingSuggestions: (count: number) => `Novi prijedlozi roditelja: ${count}`,
  },

  needs: {
    preferSimplifiedText: 'Kraći i jednostavniji tekst',
    preferMoreExamples: 'Više primjera',
    preferStepByStep: 'Korak po korak',
    easierReading: 'Lakše čitanje (posebna slova, veći razmaci)',
  },

  studentView: {
    backToClass: 'Nazad na razred',
    needsHeading: 'Potrebe učenika',
    needsIntro:
      'Na osnovu ovoga AI bira verzije lekcija i početna podešavanja čitanja. Učenik ne vidi ove podatke, a dijagnoze se ne unose.',
    saveNeeds: 'Sačuvaj potrebe',
    needsSaved:
      'Potrebe su sačuvane. Važe od sljedećeg otvaranja lekcije i za sljedeće AI prilagođavanje.',
    lessonsHeading: 'Lekcije i vježbe',
    noLessons: 'Učeniku još nije dodijeljena nijedna lekcija.',
    practiceDone: (date: string) => `Vježba urađena ${date}`,
    practiceNotDone: 'Vježba još nije urađena',
    difficult: 'Teže je bilo:',
    suggestionsHeading: 'Prijedlozi roditelja',
    noSuggestions: 'Roditelji još nijesu poslali prijedloge.',
    forbiddenTitle: 'Nemate pristup',
    forbiddenDescription: 'Ovaj učenik nije u vašem razredu.',
  },

  suggestionsInbox: {
    pageTitle: 'Prijedlozi roditelja',
    heading: 'Prijedlozi roditelja',
    intro:
      'Roditelji opisuju šta pomaže njihovom djetetu. Odaberite prijedloge koje AI treba da uzme u obzir pri sljedećem prilagođavanju.',
    filterNew: 'Novi',
    filterAll: 'Svi',
    filterLabel: 'Prikaz prijedloga',
    empty: 'Nema prijedloga za prikaz.',
    forStudent: (name: string) => `Za: ${name}`,
    useForAdaptation: 'Koristi pri prilagođavanju',
    markRead: 'Označi kao pročitano',
    openStudent: 'Otvori učenika',
  },

  suggestionStatus: {
    'pending-teacher': 'Čeka pregled nastavnika',
    'use-for-adaptation': 'Nastavnik ga koristi pri prilagođavanju',
    read: 'Nastavnik je pročitao',
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
