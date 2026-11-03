/**
 * All user interface text (Serbian, Latin script, ijekavian).
 * Kept out of components so the UI can be translated later without touching logic.
 */
/** "1 učenik", "2 učenika", "5 učenika", "21 učenik". */
function studentsWord(count: number): string {
  return count % 10 === 1 && count % 100 !== 11 ? 'učenik' : 'učenika';
}

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
      backToSubject: (subject: string) => subject,
      readingSettings: 'Slova i boje',
      stepByStep: 'Korak po korak',
      stepProgress: (step: number, total: number) => `Korak ${step} od ${total}`,
      previousStep: 'Prethodni korak',
      nextStep: 'Sljedeći korak',
      glossaryHint: 'podvučene riječi kriju objašnjenje — dodirni ih',
      startQuiz: 'Hajde na vježbu',
      quizNote: 'kad pročitaš',
      notFoundTitle: 'Lekcija nije pronađena',
      notFoundDescription: 'Ova lekcija ne postoji ili ti još nije dodijeljena.',
    },
    reading: {
      title: 'Slova i boje',
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
      /** Parents agreed to these versions with the teacher, so naming them is fine here. */
      versionNames: {
        standard: 'Osnovna verzija',
        shortened: 'Skraćena verzija',
        easier: 'Verzija nižeg nivoa',
        dyslexia: 'Verzija za lakše čitanje',
        audio: 'Audio zapis',
        illustrations: 'Ilustracije',
      },
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
    home: 'Moji predmeti',
    newLesson: 'Dodaj lekciju',
    myClass: 'Učenici',
    suggestions: 'Prijedlozi roditelja',
    newSuggestions: 'novih',
    openMenu: 'Otvori meni',
    closeMenu: 'Zatvori meni',
  },

  home: {
    pageTitle: 'Moji predmeti',
    heading: 'Moji predmeti',
    viewLabel: 'Prikaz predmeta',
    bySubject: 'Po predmetima',
    byClass: 'Po odjeljenjima',
    classHeading: (name: string) => `Odjeljenje ${name}`,
    lessonCount: (count: number) => {
      if (count === 0) return 'još nema lekcija';
      if (count % 10 === 1 && count % 100 !== 11) return `${count} lekcija`;
      if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100))
        return `${count} lekcije`;
      return `${count} lekcija`;
    },
    openCourse: (subject: string, className: string) => `${subject}, odjeljenje ${className}`,
    reviewLabel: 'Čeka tvoj pregled',
    noSubjects: 'Još ti nije dodijeljen nijedan predmet. Predmete dodjeljuje škola.',
  },

  lesson: {
    statuses: {
      draft: 'Nacrt',
      processing: 'AI radi',
      in_review: 'Čeka pregled',
      approved: 'Odobrena',
      assigned: 'Objavljena',
    },
    courseLabel: (subject: string, className: string) => `${subject} · ${className}`,
  },

  course: {
    backToSubjects: 'Moji predmeti',
    studentCount: (count: number) => `${count} ${studentsWord(count)}`,
    otherClasses: 'Isti predmet u odjeljenju:',
    filterLabel: 'Prikaz lekcija',
    filters: {
      all: 'Sve',
      review: 'Čekaju pregled',
      published: 'Objavljene',
      working: 'U izradi',
    },
    empty: 'Ovdje još nema lekcija. Dodaj prvu, a AI će pripremiti sve verzije.',
    noMatches: 'Nijedna lekcija ne odgovara ovom prikazu.',
    approvedCount: (approved: number, total: number) => `odobreno ${approved} od ${total}`,
    notFoundTitle: 'Predmet nije pronađen',
    notFoundDescription: 'Ovaj predmet ne predaješ u tom odjeljenju.',
  },

  newLesson: {
    pageTitle: 'Dodaj lekciju',
    heading: 'Dodaj lekciju',
    allFieldsRequired: 'Sva polja su obavezna.',
    courseLabel: 'Predmet i odjeljenje',
    coursePlaceholder: 'Izaberi',
    titleLabel: 'Naslov',
    contentLabel: 'Tekst lekcije',
    contentHint: 'Zalijepi ili ukucaj tekst. Prazan red odvaja pasuse.',
    aiNote:
      'Čim sačuvaš, AI pravi skraćenu verziju, niži nivo, tekst za lakše čitanje, audio i ilustracije.',
    save: 'Dodaj i pokreni AI',
    cancel: 'Odustani',
    errors: {
      titleRequired: 'Unesi naslov lekcije.',
      courseRequired: 'Izaberi predmet i odjeljenje.',
      contentRequired: 'Unesi tekst lekcije.',
    },
  },

  lessonDetail: {
    notFoundTitle: 'Lekcija nije pronađena',
    notFoundDescription:
      'Ove lekcije nema. Možda je adresa pogrešna, ili je lekcija napravljena prije osvježavanja stranice pa se izgubila.',
    backToSubjects: 'Moji predmeti',
    ai: {
      working: 'AI priprema verzije…',
      workingHint: 'Za koji trenutak sve će biti spremno za tvoj pregled.',
      redoing: 'AI prepravlja ovu verziju…',
      draftTitle: 'AI još nije pripremio verzije',
      draftText: 'Pokreni AI i dobićeš sve verzije ove lekcije za pregled.',
      start: 'Pokreni AI',
      again: 'Napravi sve verzije ponovo',
      againHint: 'Ako promijeniš tekst, AI može ponovo napraviti sve verzije.',
      suggestionsIntro: 'AI uzima u obzir i prijedloge roditelja:',
      demoNote: 'U demou je AI simuliran i ništa ne odlazi na internet.',
    },
    tabsLabel: 'Verzije lekcije',
    kinds: {
      standard: 'Original',
      shortened: 'Skraćena',
      easier: 'Niži nivo',
      dyslexia: 'Lakše čitanje',
      audio: 'Audio',
      illustrations: 'Ilustracije',
    },
    kindHints: {
      standard: 'Tvoj tekst. Iz njega AI pravi sve ostale verzije.',
      shortened: 'Samo ono najvažnije iz lekcije.',
      easier: 'Isti sadržaj, jednostavnijim riječima i rečenicama.',
      dyslexia:
        'Kratki redovi, posebna slova i veći razmaci, za učenike kojima je čitanje teško (na primjer kod disleksije).',
      audio: 'Tekst koji se čita naglas. Učenici ga slušaju glasom uređaja.',
      illustrations: 'Crteži uz lekciju. Vide ih svi učenici odjeljenja.',
    },
    extrasTab: 'Kviz i riječi',
    audience: (count: number) =>
      count === 0
        ? 'Trenutno je ne dobija nijedan učenik'
        : `Dobija ${count} ${studentsWord(count)}`,
    aiSuggestion: 'AI prijedlog',
    approved: 'Odobreno',
    approve: 'Odobri',
    missingTitle: 'Ova verzija još ne postoji',
    missingText: 'Lekcija je napravljena prije nego što je AI pripremao ovu verziju.',
    create: 'Napravi verziju',
    edit: 'Uredi tekst',
    save: 'Sačuvaj',
    cancel: 'Odustani',
    editLabel: (kind: string) => `Tekst: ${kind}`,
    emptyError: 'Tekst ne može biti prazan.',
    captionLabel: (n: number) => `Opis ispod slike ${n}`,
    feedbackLabel: 'Šta da AI promijeni?',
    feedbackHint: 'Na primjer: „Kraće rečenice“ ili „Dodaj primjer sa jabukama“.',
    feedbackRequired: 'Napiši šta treba promijeniti.',
    redo: 'Prepravi',
    listen: 'Poslušaj',
    stopListening: 'Zaustavi',
    noVoice: 'Ovaj uređaj ne može da čita naglas, ali učenici ga mogu slušati na svojim uređajima.',
    publish: {
      progress: (approved: number, total: number) => `Odobreno ${approved} od ${total} verzija`,
      button: 'Objavi učenicima',
      needsApproval: 'Odobri sve verzije, pa objavi.',
      published: (className: string) =>
        `Objavljeno. Učenici odjeljenja ${className} je vide, svako u verziji koja mu je namijenjena.`,
      ready: (className: string) => `Sve je odobreno. Lekcija ide odjeljenju ${className}.`,
    },
    saveSection: 'Sačuvaj',
    sectionSaved: 'Sačuvano.',
    sectionInvalid: 'Neki redovi su prazni — popuni ih ili ukloni.',
    glossary: {
      heading: 'Teže riječi',
      intro: 'Dijete dodirne podvučenu riječ i vidi objašnjenje.',
      term: (n: number) => `Riječ ${n}`,
      definition: (n: number) => `Objašnjenje ${n}`,
      add: '+ riječ',
      remove: (n: number) => `Ukloni riječ ${n}`,
      empty: 'Još nema nijedne.',
    },
    quiz: {
      heading: 'Pitanja za kviz',
      intro:
        'Nema ocjena: poslije svakog odgovora dijete vidi objašnjenje i dobija zvjezdicu kad završi.',
      question: (n: number) => `Pitanje ${n}`,
      option: (q: number, n: number) => `Pitanje ${q}, odgovor ${n}`,
      correct: (q: number) => `Tačan odgovor na pitanje ${q}`,
      correctOption: (n: number) => `Odgovor ${n} je tačan`,
      explanation: (n: number) => `Objašnjenje za pitanje ${n}`,
      addQuestion: '+ pitanje',
      removeQuestion: (n: number) => `Ukloni pitanje ${n}`,
      empty: 'Još nema pitanja.',
    },
    home: {
      heading: 'Za roditelje',
      intro: 'Savjeti za rad kod kuće, po jedan u redu.',
      label: 'Savjeti',
    },
  },

  classView: {
    pageTitle: 'Učenici',
    heading: 'Učenici',
    classesLabel: 'Odjeljenje',
    classTab: (name: string) => `Odjeljenje ${name}`,
    columns: {
      student: 'Učenik',
      lessons: 'Pređene lekcije',
      quizzes: 'Urađeni kvizovi',
      stars: 'Zvjezdice',
    },
    ofTotal: (done: number, total: number) => `${done} od ${total}`,
    starsCount: (count: number) => `${count} zvjezdica`,
    pendingSuggestions: (count: number) => `Novi prijedlozi roditelja: ${count}`,
  },

  studentView: {
    backToClass: 'Učenici',
    classLabel: (name: string) => `Odjeljenje ${name}`,
    profileHeading: 'Koje verzije dobija',
    profileIntro:
      'Unose ih nastavnici uz saglasnost roditelja. Učenik ovo ne vidi i nigdje se ne ističe: služi samo da mu sistem pošalje odgovarajuću verziju.',
    readingLabel: 'Tekst lekcije',
    readingOptions: {
      standard: 'Original',
      shortened: 'Skraćena verzija',
      easier: 'Niži nivo',
      dyslexia: 'Lakše čitanje',
    },
    audioLabel: 'Dobija i audio zapis',
    saveProfile: 'Sačuvaj',
    profileSaved: 'Sačuvano. Važi od sljedećeg otvaranja lekcije.',
    progressHeading: 'Lekcije i kvizovi',
    noLessons: 'Učenik još nema nijednu objavljenu lekciju.',
    quizDone: (date: string) => `Kviz urađen ${date}`,
    quizNotDone: 'Kviz još nije urađen',
    difficult: 'Teže je bilo:',
    suggestionsHeading: 'Prijedlozi roditelja',
    noSuggestions: 'Roditelji još nijesu poslali prijedloge.',
    forbiddenTitle: 'Nemate pristup',
    forbiddenDescription: 'Ovaj učenik nije u odjeljenju kojem predaješ.',
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
    useForAdaptation: 'Proslijedi AI-u',
    markRead: 'Označi kao pročitano',
    openStudent: 'Otvori učenika',
  },

  suggestionStatus: {
    'pending-teacher': 'Čeka pregled nastavnika',
    'use-for-adaptation': 'Nastavnik ga je proslijedio AI-u',
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
