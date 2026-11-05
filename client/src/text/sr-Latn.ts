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
    fields: {
      identifier: 'Email ili korisničko ime',
      identifierHint: 'Na primjer ana_markovic ili ana@primjer.me.',
      email: 'Email adresa',
      emailHint: 'Za prijavu možete koristiti ovu adresu ili svoje korisničko ime.',
      password: 'Lozinka',
      newPassword: 'Nova lozinka',
      confirmPassword: 'Potvrdite lozinku',
      passwordHint: (minLength: number) =>
        `Najmanje ${minLength} znakova. Razmaci su dozvoljeni, a lozinku možete zalijepiti iz menadžera lozinki.`,
    },
    backHome: 'Početna',
    showPassword: 'Prikaži lozinku',
    hidePassword: 'Sakrij lozinku',
    errors: {
      identifierRequired: 'Unesite email ili korisničko ime.',
      emailRequired: 'Unesite email adresu.',
      emailInvalid: 'Unesite ispravnu email adresu, na primjer ime@primjer.me.',
      passwordRequired: 'Unesite lozinku.',
      passwordTooShort: (minLength: number) => `Lozinka mora imati najmanje ${minLength} znakova.`,
      passwordTooLong: (maxLength: number) => `Lozinka može imati najviše ${maxLength} znakova.`,
      confirmPasswordRequired: 'Ponovo unesite lozinku.',
      passwordsDoNotMatch: 'Lozinke se ne podudaraju.',
      emailTaken: 'Ova email adresa se već koristi. Unesite drugu.',
    },
    // Chosen by the `code` of an API error; `unknown_error` is the fallback for any other.
    apiErrors: {
      invalid_credentials: 'Email, korisničko ime ili lozinka nijesu tačni.',
      too_many_attempts: 'Previše pokušaja. Sačekajte nekoliko minuta pa pokušajte ponovo.',
      invalid_activation_link:
        'Ova veza za aktivaciju je već iskorišćena ili je istekla. Zamolite administratora škole da vam napravi novu.',
      network_error: 'Server trenutno nije dostupan. Provjerite vezu i pokušajte ponovo.',
      unknown_error: 'Došlo je do greške. Pokušajte ponovo.',
    },
    login: {
      pageTitle: 'Prijava',
      heading: 'Prijava',
      intro: 'Prijavite se emailom ili korisničkim imenom koje vam je dala škola.',
      submit: 'Prijavi se',
      submitting: 'Prijavljivanje…',
      activateHint:
        'Dobili ste vezu ili QR kod za aktivaciju? Otvorite ga i izaberite lozinku, nema potrebe da se prijavljujete ovdje.',
      forgotPassword: 'Zaboravili ste lozinku? Javite se administratoru škole, dobićete novu vezu.',
    },
    activate: {
      pageTitle: 'Aktivacija naloga',
      heading: 'Aktivirajte nalog',
      description:
        'Nalog vam je otvorila škola. Izaberite lozinku i upišite email adresu, pa ćete biti prijavljeni.',
      submit: 'Aktiviraj nalog',
      submitting: 'Aktiviranje…',
      noToken:
        'Ova adresa nema vezu za aktivaciju. Otvorite vezu ili QR kod koji ste dobili od škole.',
      noInvite: 'Niste dobili vezu? Javite se administratoru škole.',
      switchPrompt: 'Već ste aktivirali nalog?',
      switchLink: 'Prijavite se.',
    },
  },

  session: {
    loading: 'Provjera prijave…',
    unavailableTitle: 'Server nije dostupan',
    unavailableDescription: 'Nije moguće provjeriti da li ste prijavljeni. Pokušajte ponovo.',
    retry: 'Pokušaj ponovo',
    forbiddenTitle: 'Nemate pristup',
    forbiddenDescription: 'Ova stranica nije namijenjena vašem nalogu.',
    forbiddenAction: 'Na vašu početnu stranicu',
    signOutFailed: 'Odjava nije uspjela. Pokušajte ponovo.',
  },

  admin: {
    pageTitle: 'Administracija',
    heading: 'Administracija škole',
    description:
      'Ekrani za naloge, odeljenja, predmete i porodice dolaze uskoro. Dotad se možete odjaviti.',
    signedInAs: (name: string) => `Prijavljeni ste kao ${name}.`,
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
    suggestions: 'Prijedlozi roditelja',
    newSuggestions: 'novih',
    openMenu: 'Otvori meni',
    signOut: 'Odjavi se',
    closeMenu: 'Zatvori meni',
  },

  teacher: {
    states: {
      draft: 'Nacrt',
      processing: 'AI radi',
      in_review: 'Čeka pregled',
      published: 'Objavljena',
    },
    // Chosen by the `code` of an API error; `unknown_error` is the fallback for any other.
    errors: {
      invalid_title: 'Naslov mora imati od 1 do 200 znakova.',
      invalid_body: 'Tekst je predug. Može imati najviše 40.000 znakova.',
      invalid_subject: 'Izaberi predmet koji predaješ.',
      lesson_published: 'Objavljenu lekciju nije moguće mijenjati. Vrati je u nacrt, pa je uredi.',
      lesson_busy: 'AI trenutno radi na ovoj lekciji. Sačekaj da završi.',
      lesson_has_no_text: 'Lekcija nema tekst. Dodaj tekst, pa je objavi.',
      needs_approval:
        'Sažetak ili kviz ove lekcije još nije odobren, pa je ne možeš objaviti. Odobravanje dolazi uskoro.',
      content_outdated:
        'Tekst se promijenio poslije izrade sažetka ili kviza. Odobri ih ponovo prije objave.',
      wrong_state: 'Lekcija je u međuvremenu promijenjena. Osvježi stranicu i pokušaj ponovo.',
      unsupported_file:
        'Ovaj fajl nije podržan. Izaberi Word (.docx) ili PDF sa tekstom. Stari .doc fajl sačuvaj kao .docx.',
      no_text_in_file:
        'U fajlu nema teksta (možda je skeniran). Zalijepi tekst ili pošalji Word fajl.',
      unreadable_file: 'Fajl nije moguće pročitati. Možda je oštećen ili zaštićen lozinkom.',
      text_too_long:
        'Tekst iz fajla je predug (više od 40.000 znakova ili 100 stranica). Pošalji kraći dio.',
      file_too_large: 'Fajl je veći od 10 MB.',
      invalid_message: 'Poruka mora imati od 1 do 200 znakova.',
      invalid_student: 'Izaberi učenika koji je upisan na tvoj predmet.',
      not_found: 'Ovo ne postoji ili ne možeš da ga vidiš.',
      forbidden: 'Nemaš pravo da ovo uradiš.',
      network_error: 'Server trenutno nije dostupan. Provjeri vezu i pokušaj ponovo.',
      unknown_error: 'Došlo je do greške. Pokušaj ponovo.',
    },
    load: {
      loading: 'Učitavanje…',
      failedTitle: 'Nije moguće učitati podatke',
      failedDescription: 'Provjeri vezu i pokušaj ponovo.',
      retry: 'Pokušaj ponovo',
    },
    home: {
      pageTitle: 'Moji predmeti',
      heading: 'Moji predmeti',
      viewLabel: 'Prikaz predmeta',
      bySubject: 'Po predmetima',
      byClass: 'Po odjeljenjima',
      classHeading: (name: string) => `Odjeljenje ${name}`,
      studentCount: (count: number) => `${count} ${studentsWord(count)}`,
      lessonCount: (count: number) => {
        if (count === 0) return 'još nema lekcija';
        const last = count % 10;
        const lastTwo = count % 100;
        if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return `${count} lekcije`;
        return `${count} lekcija`;
      },
      waitingForReview: (count: number) => `čeka tvoj pregled: ${count}`,
      noSubjects:
        'Još ti nije dodijeljen nijedan predmet u ovoj školskoj godini. Predmete dodjeljuje škola.',
    },
    subject: {
      back: 'Moji predmeti',
      meta: (className: string, students: number) =>
        `Odjeljenje ${className} · ${students} ${studentsWord(students)}`,
      filterLabel: 'Prikaz lekcija',
      filterAll: 'Sve',
      empty: 'Ovdje još nema lekcija. Dodaj prvu.',
      noMatches: 'Nijedna lekcija ne odgovara ovom prikazu.',
      showMore: 'Prikaži još',
      shown: (shown: number, total: number) => `Prikazano ${shown} od ${total}`,
      updated: (date: string) => `izmijenjeno ${date}`,
      notFoundTitle: 'Predmet nije pronađen',
      notFoundDescription: 'Ovaj predmet ne predaješ u ovoj školskoj godini.',
    },
    students: {
      tabsLabel: 'Predmet',
      tabLessons: 'Lekcije',
      tabStudents: 'Učenici',
      filterLabel: 'Odjeljenje',
      filterAll: 'Sva odjeljenja',
      tableCaption: (className: string) => `Učenici, odjeljenje ${className}`,
      columns: {
        rank: 'Mjesto',
        student: 'Učenik',
        lessons: 'Završene lekcije',
        stars: 'Zvjezdice',
      },
      lessonsOf: (done: number, total: number) => `${done} / ${total}`,
      starsOf: (automatic: number, teacher: number) =>
        `${automatic} za lekcije, ${teacher} od nastavnika`,
      noPublished: 'Još nema objavljenih lekcija, pa se napredak ne može pratiti.',
      empty: 'Na ovaj predmet još nije upisan nijedan učenik.',
      onlyYou:
        'Tabelu vidiš samo ti. Učenici i roditelji vide samo svoj napredak, bez poređenja sa drugima.',
      notFoundTitle: 'Učenik nije pronađen',
      notFoundDescription: 'Ovaj učenik nije upisan na tvoj predmet.',
      backToStudents: 'Učenici',
      progressHeading: 'Napredak',
      progressOf: (done: number, total: number) =>
        `${done} od ${total} ${total === 1 ? 'lekcije' : 'lekcija'}`,
      progressLabel: (name: string) => `Napredak: ${name}`,
      lessonsHeading: 'Lekcije',
      noLessons: 'Ovaj predmet još nema objavljenih lekcija.',
      done: (date: string) => `Završena ${date}`,
      notDone: 'Nije završena',
      showQuiz: 'Pokušaji kviza',
      hideQuiz: 'Sakrij pokušaje',
      quiz: {
        noAttempts: 'Učenik još nije pokušao kviz ove lekcije.',
        attempt: (n: number) => `Pokušaj ${n}`,
        allCorrect: 'Svi odgovori tačni',
        someWrong: (wrong: number, total: number) => `Netačno: ${wrong} od ${total}`,
        unfinished: 'Nedovršen',
        chosen: 'Izabrao/la je',
        correct: 'Tačan odgovor',
        rightAnswer: 'tačno',
        wrongAnswer: 'netačno',
        explanation: 'Objašnjenje',
      },
      starsHeading: 'Zvjezdice',
      starKinds: {
        automatic: 'Završena lekcija',
        teacher: 'Od nastavnika',
      },
      starCountAutomatic: (count: number) => `Za završene lekcije: ${count}`,
      starCountTeacher: (count: number) => `Od nastavnika: ${count}`,
      starFromLesson: (title: string) => title,
      starFrom: (name: string) => `Dao/la ${name}`,
      noStars: 'Još nema zvjezdica.',
      giveHeading: 'Daj zvjezdicu',
      giveHint:
        'Zvjezdica je za trud. Poruku vide učenik i njegovi roditelji, pa napiši zašto je dobija.',
      giveLabel: 'Poruka uz zvjezdicu',
      giveCounter: (used: number, max: number) => `${used} od ${max} znakova`,
      give: 'Daj zvjezdicu',
      giving: 'Slanje…',
      given: 'Zvjezdica je data.',
      messageRequired: 'Napiši zašto daješ zvjezdicu.',
      messageTooLong: 'Poruka može imati najviše 200 znakova.',
      takeBack: 'Povuci zvjezdicu',
      takeBackTitle: 'Povući zvjezdicu?',
      takeBackText:
        'Učenik će izgubiti ovu zvjezdicu. Zvjezdice za završene lekcije se ne mogu povući.',
      takeBackYes: 'Da, povuci',
      takenBack: 'Zvjezdica je povučena.',
      cancel: 'Odustani',
    },
    newLesson: {
      pageTitle: 'Dodaj lekciju',
      heading: 'Dodaj lekciju',
      subjectLabel: 'Predmet i odjeljenje',
      subjectPlaceholder: 'Izaberi',
      subjectOption: (subject: string, className: string) => `${subject} · ${className}`,
      titleLabel: 'Naslov',
      sourceLabel: 'Izvor teksta',
      pasteTab: 'Zalijepi tekst',
      fileTab: 'Iz fajla',
      bodyLabel: 'Tekst lekcije',
      bodyHint: 'Zalijepi ili ukucaj tekst. Prazan red odvaja pasuse.',
      fileLabel: 'Word (.docx) ili PDF sa tekstom',
      fileHint:
        'Do 10 MB. Tekst iz fajla ćeš moći da pročitaš i ispraviš prije nego što radiš bilo šta dalje.',
      fileChosen: (name: string) => `Izabrano: ${name}`,
      counter: (used: number, max: number) =>
        `${used.toLocaleString('sr-Latn-ME')} od ${max.toLocaleString('sr-Latn-ME')} znakova`,
      save: 'Dodaj lekciju',
      saving: 'Dodavanje…',
      cancel: 'Odustani',
      noSubjects: 'Nemaš nijedan predmet, pa ne možeš dodati lekciju. Predmete dodjeljuje škola.',
      errors: {
        subjectRequired: 'Izaberi predmet.',
        titleRequired: 'Unesi naslov lekcije.',
        titleTooLong: 'Naslov može imati najviše 200 znakova.',
        bodyRequired: 'Unesi tekst lekcije.',
        bodyTooLong: 'Tekst može imati najviše 40.000 znakova.',
        fileRequired: 'Izaberi fajl.',
        fileTooLarge: 'Fajl je veći od 10 MB.',
        fileOldWord: 'Stari Word fajl (.doc) nije podržan. Sačuvaj ga kao .docx.',
        fileUnsupported: 'Podržani su samo Word (.docx) i PDF fajlovi.',
      },
    },
    lesson: {
      backToSubjects: 'Moji predmeti',
      notFoundTitle: 'Lekcija nije pronađena',
      notFoundDescription: 'Ove lekcije nema, ili je ne možeš vidjeti.',
      source: {
        pasted: 'Zalijepljen tekst',
        docx: (name: string | null) => (name ? `Word fajl: ${name}` : 'Word fajl'),
        pdf: (name: string | null) => (name ? `PDF fajl: ${name}` : 'PDF fajl'),
      },
      titleLabel: 'Naslov',
      bodyLabel: 'Tekst lekcije',
      counter: (used: number, max: number) =>
        `${used.toLocaleString('sr-Latn-ME')} od ${max.toLocaleString('sr-Latn-ME')} znakova`,
      save: 'Sačuvaj izmjene',
      saving: 'Čuvanje…',
      saved: 'Izmjene su sačuvane.',
      unsaved: 'Imaš nesačuvane izmjene.',
      leaveTitle: 'Napustiti stranicu?',
      leaveText: 'Nesačuvane izmjene će se izgubiti.',
      leaveStay: 'Ostani',
      leaveGo: 'Napusti',
      readOnlyPublished:
        'Lekcija je objavljena i ne može se mijenjati. Vrati je u nacrt da urediš tekst.',
      processing: 'AI trenutno radi na ovoj lekciji. Stranica se sama osvježava.',
      processingError: 'AI nije uspio da završi posao. Pokušaj ponovo kasnije.',
      replaceFile: 'Zamijeni tekst iz fajla',
      replaceTitle: 'Zamijeniti tekst?',
      replaceText:
        'Tekst iz fajla zamijeniće trenutni tekst lekcije, a tvoje izmjene u njemu se gube.',
      replaceYes: 'Izaberi fajl',
      cancel: 'Odustani',
      uploading: 'Čitanje fajla…',
      uploadDone: 'Tekst je učitan iz fajla. Pročitaj ga i ispravi gdje treba.',
      uploadFailedAfterCreate: 'Lekcija je napravljena, ali tekst iz fajla nije učitan.',
      imagesNotIncluded: (count: number) =>
        count % 10 === 1 && count % 100 !== 11
          ? `Dokument ima ${count} sliku koja nije uključena u tekst. Ako je važna, opiši je u tekstu.`
          : `Dokument ima ${count} slika koje nisu uključene u tekst. Ako su važne, opiši ih u tekstu.`,
      content: {
        heading: 'Sažetak i kviz',
        none: 'Za ovu lekciju još nema sažetka ni kviza.',
        summary: 'Sažetak',
        quiz: 'Kviz',
        draft: 'čeka odobrenje',
        approved: 'odobren',
        outdated: 'zastario, tekst se promijenio',
        byAi: 'napravio AI',
        byTeacher: 'napisao nastavnik',
        soon: 'Uređivanje i odobravanje dolaze uskoro.',
      },
      publish: 'Objavi',
      publishing: 'Objavljivanje…',
      publishedAt: (date: string) =>
        `Objavljena ${date}. Vide je učenici koji su upisani na predmet.`,
      draftHint: 'Učenici ne vide lekciju dok je ne objaviš.',
      unpublish: 'Vrati u nacrt',
      unpublishing: 'Vraćanje…',
      delete: 'Obriši lekciju',
      deleteTitle: 'Obrisati lekciju?',
      deleteText: 'Lekcija će biti trajno obrisana, zajedno sa svime što joj pripada.',
      deleteYes: 'Da, obriši',
    },
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
