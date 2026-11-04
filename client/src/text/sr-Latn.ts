/**
 * All user interface text (Serbian, Latin script, ijekavian).
 * Kept out of components so the UI can be translated later without touching logic.
 */
/** "1 učenik", "2 učenika", "5 učenika", "21 učenik". */
function studentsWord(count: number): string {
  return count % 10 === 1 && count % 100 !== 11 ? 'učenik' : 'učenika';
}

/** "1 zvjezdica", "2 zvjezdice", "5 zvjezdica". */
function starsWord(count: number): string {
  const last = count % 10;
  const lastTwo = count % 100;
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return 'zvjezdice';
  return 'zvjezdica';
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
      audiences: 'Za koga je',
      schools: 'Za škole',
      login: 'Prijavi se',
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
    schools: {
      title: 'Vaša škola u IncluTeach-u',
      text: 'Škola se priključuje jednom. Mi provjerimo zahtjev, potpišemo ugovor o zaštiti podataka i otvorimo nalog vašem administratoru.',
      cta: 'Prijavite školu',
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
    demoNotice: 'Demo prikaz — prijava i aktivacija naloga još nijesu povezani sa serverom.',
    fields: {
      email: 'Email adresa',
      password: 'Lozinka',
      newPassword: 'Nova lozinka',
      confirmPassword: 'Potvrdite lozinku',
      inviteCode: 'Kod iz pozivnice',
      inviteCodeHint: 'Nalazi se u pozivnici koju ste dobili od škole, na primjer K7Q2-M9XA.',
      cardCode: 'Kod sa kartice',
      cardCodeHint: 'Ispod QR koda na kartici, na primjer ABCD-1234.',
      passwordHint: (minLength: number) =>
        `Najmanje ${minLength} znakova. Razmaci su dozvoljeni, a lozinku možete zalijepiti iz menadžera lozinki.`,
    },
    backHome: 'Početna',
    showPassword: 'Prikaži lozinku',
    hidePassword: 'Sakrij lozinku',
    errors: {
      emailRequired: 'Unesite email adresu.',
      emailInvalid: 'Unesite ispravnu email adresu, na primjer ime@primjer.me.',
      passwordRequired: 'Unesite lozinku.',
      passwordTooShort: (minLength: number) => `Lozinka mora imati najmanje ${minLength} znakova.`,
      confirmPasswordRequired: 'Ponovo unesite lozinku.',
      passwordsDoNotMatch: 'Lozinke se ne podudaraju.',
      inviteCodeRequired: 'Unesite kod iz pozivnice.',
      inviteCodeInvalid: 'Kod ima 8 slova i brojeva, na primjer K7Q2-M9XA.',
      cardCodeRequired: 'Upiši kod sa kartice.',
      cardCodeInvalid: 'Kod ima 8 slova i brojeva, na primjer ABCD-1234.',
      submitFailed: 'Slanje nije uspjelo. Pokušajte ponovo.',
    },
    login: {
      pageTitle: 'Prijava',
      heading: 'Prijava',
      rolesLabel: 'Prijavljujem se kao',
      roles: {
        teacher: 'Nastavnik',
        parent: 'Roditelj',
        student: 'Učenik',
      },
      roleIntro: {
        teacher: 'Prijavite se emailom škole na koji je stigla pozivnica.',
        parent: 'Prijavite se emailom na koji je stigla pozivnica škole.',
        student: 'Pokaži svoju karticu kameri ili upiši kod koji piše na njoj.',
      },
      openDemo: {
        teacher: 'Otvori nastavnički demo',
        parent: 'Otvori roditeljski demo',
        student: 'Otvori učenički demo',
      },
      submit: 'Prijavi se',
      submitting: 'Prijavljivanje…',
      demoSuccess:
        'Forma je uspješno provjerena. Ovo je demo prikaz: prijava nije stvarno izvršena.',
      studentScanNote: 'Skeniranje kamerom dolazi uz pravu prijavu. U demou upiši kod.',
      studentDemoSuccess:
        'Kod je ispravno upisan. Ovo je demo prikaz: prijava nije stvarno izvršena.',
      lostCard: 'Izgubio si karticu? Javi se svom nastavniku, dobićeš novu.',
      invitePrompt: 'Dobili ste pozivnicu od škole?',
      inviteLink: 'Aktivirajte nalog.',
    },
    activate: {
      pageTitle: 'Aktivacija naloga',
      heading: 'Aktivirajte nalog',
      description: 'Nalog vam je otvorila škola. Upišite kod iz pozivnice i izaberite lozinku.',
      submit: 'Aktiviraj nalog',
      submitting: 'Aktiviranje…',
      demoSuccess:
        'Forma je uspješno provjerena. Ovo je demo prikaz: nalog nije stvarno aktiviran.',
      noInvite: 'Niste dobili pozivnicu? Javite se školi.',
      switchPrompt: 'Već ste aktivirali nalog?',
      switchLink: 'Prijavite se.',
    },
  },

  schoolRequest: {
    pageTitle: 'Prijava škole',
    heading: 'Prijavite školu',
    description:
      'Ovo je zahtjev, ne nalog. IncluTeach tim provjerava školu i javlja se na službeni email.',
    demoNotice: 'Demo prikaz — zahtjev se ne šalje i ništa se ne čuva.',
    steps: [
      'Pošaljete zahtjev.',
      'Provjerimo školu i potpišemo ugovor o zaštiti podataka.',
      'Administrator škole dobija pozivnicu i aktivira nalog.',
    ],
    stepsLabel: 'Šta slijedi',
    fields: {
      schoolName: 'Naziv škole',
      municipality: 'Opština',
      contactName: 'Ime i prezime',
      contactRole: 'Funkcija u školi',
      contactRolePlaceholder: 'Izaberite',
      roles: {
        principal: 'Direktor/ka',
        deputy: 'Pomoćnik/ca direktora',
        pedagogue: 'Pedagog',
        psychologist: 'Psiholog',
        secretary: 'Sekretar/ka',
        other: 'Drugo',
      },
      email: 'Službeni email škole',
      emailHint: 'Adresa škole, ne lična. Na nju šaljemo odgovor i kasnije pozivnicu.',
      phone: 'Telefon (nije obavezno)',
      message: 'Poruka (nije obavezno)',
      consent: 'Slažem se da me IncluTeach kontaktira u vezi s ovim zahtjevom.',
    },
    errors: {
      schoolNameRequired: 'Unesite naziv škole.',
      municipalityRequired: 'Unesite opštinu.',
      contactNameRequired: 'Unesite ime i prezime.',
      contactRoleRequired: 'Izaberite funkciju.',
      consentRequired: 'Potrebna je saglasnost da bismo vas kontaktirali.',
      messageTooLong: (max: number) => `Poruka može imati najviše ${max} znakova.`,
    },
    submit: 'Pošalji zahtjev',
    submitting: 'Slanje…',
    demoSuccess:
      'Zahtjev je ispravno popunjen. Ovo je demo prikaz: ništa nije poslato. U pravoj verziji javljamo se na službeni email škole.',
    backHome: 'Nazad na početnu',
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
      stars: 'Moje zvjezdice',
    },
    home: {
      pageTitle: 'Moji predmeti',
      greeting: (name: string) => `Zdravo, ${name}!`,
      heading: 'Moji predmeti',
      subjectsHeading: 'Predmeti',
      doneCount: (done: number, total: number) => `pređeno ${done} od ${total}`,
      lessonCount: (count: number) => {
        if (count === 0) return 'Još nema lekcija';
        if (count === 1) return '1 lekcija';
        if (count >= 2 && count <= 4) return `${count} lekcije`;
        return `${count} lekcija`;
      },
      starsLabel: 'Zvjezdice za trud',
    },
    subject: {
      backToSubjects: 'Nazad na predmete',
      lessonsHeading: 'Lekcije',
      empty: 'U ovom predmetu još nema lekcija. Uskoro stižu!',
      status: {
        new: 'Nova',
        started: 'Započeta',
        completed: 'Pređena',
      },
      starsEarned: (count: number) => `${count} od 2 zvjezdice`,
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
      glossaryHint: 'Podvučene riječi kriju objašnjenje — dodirni ih.',
      picturesLabel: 'Slike uz lekciju',
      finishHeading: 'Kad završiš',
      markDone: 'Označi kao pređeno',
      markedDone: 'Lekcija je pređena. Zvjezdica je tvoja!',
      undoDone: 'Poništi',
      startQuiz: 'Hajde na kviz',
      quizAgain: 'Uradi kviz ponovo',
      quizDone: 'Kviz je urađen. Zvjezdica je tvoja!',
      plusStar: '+1 zvjezdica',
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
      pageTitle: (lesson: string) => `Kviz: ${lesson}`,
      heading: 'Kviz',
      intro: 'Ovo je kviz za vježbu, ne ocjena. Polako, imaš vremena.',
      progress: (current: number, total: number) => `Pitanje ${current} od ${total}`,
      answersLabel: 'Odgovori',
      correct: 'Tačno!',
      incorrect: 'Nije baš tako.',
      correctAnswerIs: (answer: string) => `Tačan odgovor: ${answer}`,
      next: 'Sljedeće pitanje',
      finish: 'Završi kviz',
      doneTitle: 'Bravo! Kviz je završen.',
      doneText: 'Zvjezdica za kviz je tvoja.',
      again: 'Ponovi kviz',
      backToLesson: 'Nazad na lekciju',
      backToSubjects: 'Moji predmeti',
    },
    stars: {
      pageTitle: 'Moje zvjezdice',
      heading: 'Moje zvjezdice',
      total: (count: number) => `${count} ${starsWord(count)}`,
      howTo:
        'Jednu zvjezdicu dobijaš kad označiš lekciju kao pređenu, a još jednu kad uradiš kviz.',
      lessonStar: 'Lekcija pređena',
      quizStar: 'Kviz urađen',
      missing: 'još nije',
      empty: 'Još nemaš lekcija. Kad ti nastavnik pošalje prvu, ovdje ćeš skupljati zvjezdice.',
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
      suggestions: 'Moji prijedlozi',
    },
    home: {
      pageTitle: 'Moja djeca',
      greeting: (name: string) => `Dobro došli, ${name}`,
      heading: 'Moja djeca',
      childrenHeading: 'Povezana djeca',
      classLabel: (name: string) => `Odjeljenje ${name}`,
    },
    stats: {
      lessons: 'Pređene lekcije',
      quizzes: 'Urađeni kvizovi',
      stars: 'Zvjezdice',
      toRepeat: 'Pitanja za ponavljanje',
      ofTotal: (done: number, total: number) => `${done} od ${total}`,
    },
    child: {
      backToChildren: 'Moja djeca',
      progressHeading: 'Napredak',
      toRepeatHeading: 'Za ponavljanje kod kuće',
      toRepeatIntro: 'Na ovim pitanjima prvi odgovor nije bio tačan:',
      lessonsHeading: 'Lekcije po predmetima',
      quizDone: 'kviz urađen',
      profileHeading: 'Koje verzije lekcija dobija',
      profileIntro:
        'Ovo je dogovoreno sa razrednim starešinom. Dijete ovo ne vidi. Ako mislite da nešto treba promijeniti, pošaljite prijedlog.',
      audioYes: 'Dobija i audio zapis',
      audioNo: 'Bez audio zapisa',
      suggestChange: 'Predloži promjenu',
      noLessons: 'U ovom predmetu još nema lekcija.',
      forbiddenTitle: 'Nemate pristup',
      forbiddenDescription: 'Ovo dijete nije povezano sa vašim nalogom.',
    },
    lesson: {
      backToChild: (name: string) => name,
      lessonDone: 'Označeno kao pređeno',
      lessonNotDone: 'Još nije označeno kao pređeno',
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
      practiceHeading: 'Kviz',
      practiceNotDone: 'Kviz još nije urađen.',
      practiceDone: (date: string) => `Kviz je urađen ${date}.`,
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
    suggestionsPage: {
      pageTitle: 'Moji prijedlozi',
      heading: 'Moji prijedlozi',
      intro: 'Šta ste predložili nastavniku i šta je nastavnik uradio sa prijedlogom.',
      empty: 'Još niste poslali nijedan prijedlog.',
      writeFor: (name: string) => `Napiši prijedlog za: ${name}`,
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
    signOut: 'Odjavi se',
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
    forbiddenTitle: 'Nemate pristup',
    forbiddenDescription: 'Ova lekcija pripada predmetu ili odjeljenju kojem ne predaješ.',
    ai: {
      working: 'AI priprema verzije…',
      workingHint: 'Za koji trenutak sve će biti spremno za tvoj pregled.',
      redoing: 'AI prepravlja ovu verziju…',
      draftTitle: 'AI još nije pripremio verzije',
      draftText: 'Pokreni AI i dobićeš sve verzije ove lekcije za pregled.',
      start: 'Pokreni AI',
      again: 'Napravi sve verzije ponovo',
      againHint: 'Ako promijeniš tekst, AI može ponovo napraviti sve verzije.',
      suggestionsIntro: 'AI uzima u obzir i tvoja uputstva:',
      demoNote: 'U demou je AI simuliran i ništa ne odlazi na internet.',
      failed: 'AI trenutno nije uspio da pripremi verzije. Ništa nije izgubljeno.',
      failedVersion: 'AI nije uspio da prepravi ovu verziju. Prethodna je sačuvana.',
      retry: 'Pokušaj ponovo',
    },
    stale: 'Tvoj tekst se promijenio poslije ove verzije. Pogledaj je, prepravi ili odobri ponovo.',
    extrasHint: 'AI je predložio pitanja za kviz i objašnjenja riječi. I njih odobri prije objave.',
    approveExtras: 'Odobri kviz i riječi',
    aiCommentLabel: 'Napomena AI-ja (vidiš je samo ti):',
    manage: {
      unpublish: 'Povuci od učenika',
      unpublishConfirm: 'Učenici više neće vidjeti ovu lekciju dok je ponovo ne objaviš.',
      unpublishYes: 'Da, povuci',
      unpublished: 'Lekcija je povučena. Učenici je više ne vide.',
      delete: 'Obriši lekciju',
      deleteConfirm: 'Lekcija će biti trajno obrisana.',
      deleteYes: 'Da, obriši',
      cancel: 'Odustani',
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
      progress: (approved: number, total: number) => `Odobreno ${approved} od ${total}`,
      button: 'Objavi učenicima',
      needsApproval: 'Odobri sve verzije, pa objavi.',
      published: (className: string) =>
        `Objavljeno. Učenici odjeljenja ${className} je vide, svako u verziji koja mu je namijenjena.`,
      ready: (className: string) => `Sve je odobreno. Lekcija ide odjeljenju ${className}.`,
      changesWaiting:
        'Učenici vide objavljenu lekciju. Tvoje izmjene vide tek kad ih odobriš i objaviš.',
      changesReady: 'Izmjene su odobrene. Objavi ih da ih učenici vide.',
      republish: 'Objavi izmjene',
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
    starsCount: (count: number) => `${count} ${starsWord(count)}`,
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
    audioNo: 'Bez audio zapisa',
    profileReadOnly:
      'Ove verzije mijenja razredni starešina odjeljenja, u dogovoru sa roditeljima.',
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
    useForAdaptation: 'Napiši uputstvo za AI',
    aiNoteLabel: 'Uputstvo za AI',
    aiNoteHint:
      'Svojim riječima napiši šta AI treba da uradi, na primjer „kraće rečenice i više slika“. Bez imena i dijagnoza: AI dobija samo ovo uputstvo, nikad tekst roditelja.',
    aiNoteRequired: 'Napiši uputstvo prije čuvanja.',
    saveAiNote: 'Sačuvaj uputstvo',
    cancelAiNote: 'Odustani',
    aiNoteShown: (note: string) => `Uputstvo za AI: „${note}“`,
    markRead: 'Označi kao pročitano',
    openStudent: 'Otvori učenika',
  },

  suggestionStatus: {
    'pending-teacher': 'Čeka pregled nastavnika',
    'use-for-adaptation': 'Nastavnik ga uzima u obzir pri prilagođavanju',
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
