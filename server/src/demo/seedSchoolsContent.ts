// The texts of the schools seed (see seedSchools.ts): lessons with summaries and quizzes, and the
// words teachers and parents write to each other. Everything here is invented.

export interface QuizQuestionSpec {
  kind: 'choice' | 'true_false';
  prompt: string;
  explanation: string;
  options: { text: string; isCorrect: boolean }[];
}

export interface LessonSpec {
  title: string;
  body: string;
  // Without a summary and a quiz the lesson is only text.
  summary?: string[];
  quiz?: QuizQuestionSpec[];
  // A draft stays unpublished.
  draft?: boolean;
}

// The right answer comes first in `answers`; the others are wrong.
const choice = (prompt: string, explanation: string, answers: string[]): QuizQuestionSpec => ({
  kind: 'choice',
  prompt,
  explanation,
  options: answers.map((text, index) => ({ text, isCorrect: index === 0 })),
});

const statement = (prompt: string, explanation: string, isTrue: boolean): QuizQuestionSpec => ({
  kind: 'true_false',
  prompt,
  explanation,
  options: [
    { text: 'Tačno', isCorrect: isTrue },
    { text: 'Netačno', isCorrect: !isTrue },
  ],
});

export const MATH_LESSONS: LessonSpec[] = [
  {
    title: 'Razlomci',
    body:
      'Razlomak pokazuje dio cjeline. Zapisujemo ga pomoću dva broja, jednog iznad drugog, i crte između njih. ' +
      'Broj ispod crte zove se imenilac. On kaže na koliko jednakih dijelova je cjelina podijeljena. ' +
      'Broj iznad crte zove se brojilac. On kaže koliko tih dijelova uzimamo. ' +
      'Na primjer, ako picu podijelimo na osam jednakih kriški i pojedemo tri, pojeli smo tri osmine pice. ' +
      'Zapisujemo to kao 3/8. Ako je brojilac manji od imenioca, razlomak je manji od jedan. ' +
      'Ako su brojilac i imenilac jednaki, razlomak je jednak jednoj cijeloj. Na primjer, 4/4 je jedna cijela.',
    summary: [
      'Razlomak pokazuje dio cjeline.',
      'Imenilac kaže na koliko jednakih dijelova je cjelina podijeljena.',
      'Brojilac kaže koliko tih dijelova uzimamo.',
      'Tri osmine pice zapisujemo kao 3/8.',
      'Kad su brojilac i imenilac jednaki, razlomak je jedna cijela.',
    ],
    quiz: [
      choice('Kako se zove broj ispod razlomačke crte?', 'Broj ispod crte zove se imenilac.', [
        'Imenilac',
        'Brojilac',
        'Količnik',
      ]),
      choice('Šta kaže brojilac?', 'Brojilac kaže koliko dijelova uzimamo.', [
        'Koliko dijelova uzimamo',
        'Na koliko dijelova je cjelina podijeljena',
        'Koliko je cijelih brojeva',
      ]),
      choice(
        'Pica je podijeljena na 8 jednakih kriški. Pojedene su 3 kriške. Koji razlomak je pojeden?',
        'Tri od osam kriški su tri osmine, a zapisujemo ih kao 3/8.',
        ['3/8', '8/3', '5/8'],
      ),
      statement(
        'Razlomak 4/4 je jednak jednoj cijeloj.',
        'Kad su brojilac i imenilac jednaki, razlomak je jedna cijela.',
        true,
      ),
      statement('U razlomku 2/5 imenilac je 2.', 'Imenilac je 5, a 2 je brojilac.', false),
      choice(
        'Koji razlomak je manji od jedan?',
        'Razlomak je manji od jedan kad je brojilac manji od imenioca.',
        ['3/7', '7/7', '9/7'],
      ),
    ],
  },
  {
    title: 'Sabiranje i oduzimanje razlomaka',
    body:
      'Razlomke koji imaju isti imenilac sabiramo lako. Imenilac prepišemo, a brojioce saberemo. ' +
      'Na primjer, 2/7 + 3/7 = 5/7. Sa oduzimanjem je isto: imenilac prepišemo, a brojioce oduzmemo. ' +
      'Na primjer, 6/9 − 2/9 = 4/9. Kada razlomci imaju različite imenioce, prvo ih moramo svesti na zajednički imenilac. ' +
      'To radimo tako što razlomak proširimo. Širenje znači da brojilac i imenilac pomnožimo istim brojem. ' +
      'Na primjer, 1/2 proširimo sa 2 i dobijemo 2/4. Sada 1/2 + 1/4 postaje 2/4 + 1/4, a to je 3/4. ' +
      'Na kraju rezultat, ako može, skratimo.',
    summary: [
      'Razlomke sa istim imeniocem sabiramo tako što saberemo brojioce.',
      'Imenilac pri sabiranju i oduzimanju samo prepišemo.',
      'Razlomke sa različitim imeniocima prvo svedemo na zajednički imenilac.',
      'Širenje znači da brojilac i imenilac pomnožimo istim brojem.',
    ],
  },
  {
    title: 'Decimalni brojevi',
    body:
      'Decimalni broj ima decimalni zarez. Cifre lijevo od zareza čine cio dio broja. ' +
      'Cifre desno od zareza čine decimalni dio. Prva cifra iza zareza su desetine, a druga su stotine. ' +
      'Na primjer, u broju 3,25 broj 3 je cio dio, 2 su desetine, a 5 su stotine. ' +
      'Decimalne brojeve poredimo tako što prvo poredimo cijele dijelove. Ako su isti, poredimo desetine, pa stotine. ' +
      'Zato je 3,40 veće od 3,25. Decimalni broj možemo zapisati i kao razlomak: 0,5 je isto što i 1/2. ' +
      'Novac je dobar primjer. Dva eura i pedeset centi pišemo kao 2,50 eura.',
    summary: [
      'Decimalni broj ima decimalni zarez.',
      'Lijevo od zareza je cio dio, a desno su desetine i stotine.',
      'Decimalne brojeve poredimo cifru po cifru, počevši od cijelog dijela.',
      'Broj 0,5 je isto što i razlomak 1/2.',
    ],
  },
  {
    title: 'Obim i površina pravougaonika',
    body:
      'Pravougaonik ima četiri stranice i četiri prava ugla. Suprotne stranice su jednake. Zovemo ih dužina i širina. ' +
      'Obim je zbir dužina svih stranica. Obim pravougaonika računamo tako što saberemo dužinu i širinu, pa to pomnožimo sa dva. ' +
      'Obim mjerimo u centimetrima ili metrima. Površina pokazuje koliko prostora pravougaonik zauzima. ' +
      'Dobijamo je kad pomnožimo dužinu i širinu. Površinu mjerimo u kvadratnim centimetrima ili kvadratnim metrima. ' +
      'Primjer: pravougaonik ima dužinu 6 cm i širinu 4 cm. Obim je (6 + 4) · 2 = 20 cm. Površina je 6 · 4 = 24 cm².',
    summary: [
      'Pravougaonik ima četiri prava ugla, a suprotne stranice su mu jednake.',
      'Obim je zbir svih stranica: saberemo dužinu i širinu i pomnožimo sa dva.',
      'Površinu dobijamo množenjem dužine i širine.',
      'Površinu mjerimo u kvadratnim jedinicama, na primjer u cm².',
    ],
    quiz: [
      choice(
        'Kako računamo obim pravougaonika?',
        'Saberemo dužinu i širinu, pa pomnožimo sa dva.',
        [
          'Saberemo dužinu i širinu i pomnožimo sa 2',
          'Pomnožimo dužinu i širinu',
          'Saberemo samo dvije stranice',
        ],
      ),
      choice(
        'Pravougaonik ima dužinu 6 cm i širinu 4 cm. Koliki je obim?',
        'Obim je (6 + 4) · 2 = 20 cm.',
        ['20 cm', '24 cm', '10 cm'],
      ),
      choice(
        'Pravougaonik ima dužinu 6 cm i širinu 4 cm. Kolika je površina?',
        'Površina je 6 · 4 = 24 cm².',
        ['24 cm²', '20 cm²', '10 cm²'],
      ),
      statement(
        'Suprotne stranice pravougaonika su jednake.',
        'Dužine su jednake među sobom, a širine među sobom.',
        true,
      ),
      statement(
        'Površinu računamo tako što saberemo dužinu i širinu.',
        'Površinu dobijamo množenjem dužine i širine.',
        false,
      ),
      choice('U čemu mjerimo površinu?', 'Površinu mjerimo u kvadratnim jedinicama.', [
        'U kvadratnim centimetrima',
        'U centimetrima',
        'U litrima',
      ]),
    ],
  },
  {
    title: 'Procenti',
    body:
      'Procenat znači jedan od sto. Znak za procenat je %. Ako kažemo 50%, mislimo na 50 od 100, a to je polovina. ' +
      'Procenat od broja računamo tako što broj podijelimo sa 100 i pomnožimo traženim procentom. ' +
      'Na primjer, 10% od 200 je 20. Isto tako, 25% je četvrtina, a 100% je cjelina. ' +
      'Procente često srećemo u prodavnici. Ako majica košta 40 eura, a ima popust od 25%, popust iznosi 10 eura. ' +
      'Nova cijena majice je 30 eura.',
    summary: [
      'Procenat znači jedan od sto.',
      'Pedeset procenata je polovina, a dvadeset pet procenata je četvrtina.',
      'Procenat od broja računamo tako što broj podijelimo sa 100 i pomnožimo procentom.',
      'Popust od 25% na majicu od 40 eura iznosi 10 eura.',
    ],
  },
  {
    title: 'Uglovi',
    body:
      'Ugao nastaje kad se dvije poluprave sastanu u jednoj tački. Ta tačka zove se tjeme ugla. ' +
      'Uglove mjerimo u stepenima.',
    draft: true,
  },
];

export const BIOLOGY_LESSONS: LessonSpec[] = [
  {
    title: 'Ćelija',
    body:
      'Ćelija je najmanji živi dio svakog bića. Sva živa bića se sastoje od ćelija. ' +
      'Neka bića imaju samo jednu ćeliju, a čovjek ih ima mnogo milijardi. Ćelija ima tri glavna dijela. ' +
      'Ćelijska membrana je tanki omotač koji štiti ćeliju i propušta ono što joj treba. ' +
      'Citoplazma je tečnost unutar ćelije u kojoj se nalaze ostali dijelovi. ' +
      'Jedro je upravljački centar ćelije. U njemu se čuva nasljedna informacija. ' +
      'Biljne ćelije imaju i ćelijski zid, koji ih čini čvrstim, i hloroplaste, koji im pomažu da prave hranu. ' +
      'Ćelije možemo vidjeti samo pomoću mikroskopa.',
    summary: [
      'Ćelija je najmanji živi dio svakog bića.',
      'Ćelija ima membranu, citoplazmu i jedro.',
      'Jedro je upravljački centar ćelije.',
      'Biljne ćelije imaju ćelijski zid i hloroplaste.',
      'Ćelije vidimo samo mikroskopom.',
    ],
    quiz: [
      choice('Šta je najmanji živi dio bića?', 'Najmanji živi dio bića je ćelija.', [
        'Ćelija',
        'Tkivo',
        'Organ',
      ]),
      choice('Koji dio ćelije je upravljački centar?', 'Jedro je upravljački centar ćelije.', [
        'Jedro',
        'Membrana',
        'Citoplazma',
      ]),
      statement(
        'Sva živa bića se sastoje od ćelija.',
        'Svako živo biće ima jednu ćeliju ili više njih.',
        true,
      ),
      choice('Šta štiti ćeliju i propušta ono što joj treba?', 'To radi ćelijska membrana.', [
        'Ćelijska membrana',
        'Jedro',
        'Hloroplast',
      ]),
      statement(
        'Životinjske ćelije imaju hloroplaste.',
        'Hloroplaste imaju biljne ćelije, a životinjske ih nemaju.',
        false,
      ),
      choice(
        'Čime možemo vidjeti ćelije?',
        'Ćelije su toliko sitne da ih vidimo samo mikroskopom.',
        ['Mikroskopom', 'Teleskopom', 'Termometrom'],
      ),
    ],
  },
  {
    title: 'Biljke i fotosinteza',
    body:
      'Fotosinteza je proces u kojem biljke prave hranu uz pomoć svjetlosti. ' +
      'Za to koriste vodu iz zemljišta i ugljen-dioksid iz vazduha. ' +
      'Proces se odvija u zelenim dijelovima biljke, najviše u lišću. ' +
      'Zelena boja potiče od hlorofila, koji hvata svjetlosnu energiju. ' +
      'Tokom fotosinteze nastaje glukoza, vrsta šećera koja biljci služi kao hrana. ' +
      'Pored glukoze, biljka ispušta kisik koji je potreban svim živim bićima. ' +
      'Bez fotosinteze na Zemlji ne bi bilo dovoljno kisika za disanje.',
    summary: [
      'Biljke prave hranu uz pomoć svjetlosti. To se zove fotosinteza.',
      'Za fotosintezu biljke koriste vodu i ugljen-dioksid.',
      'Fotosinteza se najviše odvija u zelenom lišću.',
      'Zelenu boju daje hlorofil, koji hvata svjetlost.',
      'Biljka pravi glukozu, a ispušta kisik koji nam treba za disanje.',
    ],
    quiz: [
      choice(
        'Gdje se najviše odvija fotosinteza?',
        'Odvija se u zelenim dijelovima, najviše u lišću.',
        ['U lišću', 'U korijenu', 'U zemlji'],
      ),
      statement(
        'Biljke ispuštaju kisik.',
        'Biljka ispušta kisik koji je potreban svim živim bićima.',
        true,
      ),
      choice('Šta daje biljkama zelenu boju?', 'Zelena boja potiče od hlorofila.', [
        'Hlorofil',
        'Glukoza',
        'Kisik',
      ]),
      statement('Vodu za fotosintezu biljka uzima iz vazduha.', 'Vodu uzima iz zemljišta.', false),
      choice('Šta nastaje tokom fotosinteze?', 'Nastaje glukoza, vrsta šećera, i kisik.', [
        'Glukoza',
        'Sladoled',
        'Plastika',
      ]),
    ],
  },
  {
    title: 'Životinje: kičmenjaci i beskičmenjaci',
    body:
      'Životinje dijelimo na kičmenjake i beskičmenjake. Kičmenjaci imaju kičmu, odnosno kičmeni stub od kostiju. ' +
      'Među njima su sisari, ptice, gmizavci, vodozemci i ribe. Sisari doje svoje mlade, a ptice imaju perje i polažu jaja. ' +
      'Beskičmenjaci nemaju kičmu. U njih spadaju insekti, pauci, mekušci i crvi. ' +
      'Najbrojnija grupa životinja na Zemlji su insekti. Pčela je insekt i ima šest nogu. ' +
      'Pauk nije insekt, jer ima osam nogu.',
    summary: [
      'Životinje dijelimo na kičmenjake i beskičmenjake.',
      'Kičmenjaci imaju kičmu, a beskičmenjaci je nemaju.',
      'Kičmenjaci su sisari, ptice, gmizavci, vodozemci i ribe.',
      'Insekti imaju šest nogu, a pauci osam.',
    ],
  },
  {
    title: 'Srce i krvotok',
    body:
      'Srce je mišić veličine pesnice. Ono pumpa krv kroz krvne sudove. ' +
      'Krv nosi kisik i hranljive materije do svih dijelova tijela. ' +
      'Krvni sudovi koji nose krv od srca zovu se arterije, a oni koji je vraćaju u srce zovu se vene. ' +
      'Najmanji krvni sudovi su kapilari. Srce odraslog čovjeka kuca oko sedamdeset puta u minuti. ' +
      'Kada trčimo, srce kuca brže jer tijelu treba više kisika. Puls možemo osjetiti na zglobu ruke.',
    summary: [
      'Srce je mišić koji pumpa krv kroz tijelo.',
      'Krv nosi kisik i hranljive materije do svih dijelova tijela.',
      'Arterije nose krv od srca, a vene je vraćaju u srce.',
      'Kad trčimo, srce kuca brže jer tijelu treba više kisika.',
    ],
    quiz: [
      choice('Šta radi srce?', 'Srce pumpa krv kroz krvne sudove.', [
        'Pumpa krv kroz tijelo',
        'Vari hranu',
        'Pravi kisik',
      ]),
      choice('Kako se zovu krvni sudovi koji nose krv od srca?', 'Krv od srca nose arterije.', [
        'Arterije',
        'Vene',
        'Kapilari',
      ]),
      statement(
        'Krv nosi kisik do svih dijelova tijela.',
        'Krv nosi kisik i hranljive materije.',
        true,
      ),
      statement(
        'Kada trčimo, srce kuca sporije.',
        'Srce kuca brže jer tijelu treba više kisika.',
        false,
      ),
      choice('Gdje možemo osjetiti puls?', 'Puls osjećamo na zglobu ruke.', [
        'Na zglobu ruke',
        'Na koljenu',
        'Na uhu',
      ]),
      choice(
        'Koliko puta u minuti kuca srce odraslog čovjeka?',
        'Kuca oko sedamdeset puta u minuti.',
        ['Oko sedamdeset', 'Oko sedam', 'Oko sedam stotina'],
      ),
    ],
  },
  {
    title: 'Ishrana i zdravlje',
    body:
      'Hrana nam daje energiju za igru, učenje i rast. U hrani se nalaze hranljive materije: proteini, ugljeni hidrati, masti, vitamini i minerali. ' +
      'Proteini grade tijelo, a nalaze se u mesu, jajima, mlijeku i pasulju. ' +
      'Ugljeni hidrati daju energiju, a nalaze se u hljebu, pirinču i krompiru. Voće i povrće imaju mnogo vitamina. ' +
      'Svakog dana treba piti dovoljno vode. Slatkiše i slane grickalice treba jesti rijetko. ' +
      'Zdrav obrok ima razne vrste hrane. Prije jela treba oprati ruke.',
    summary: [
      'Hrana nam daje energiju za igru, učenje i rast.',
      'Proteini grade tijelo, a ugljeni hidrati daju energiju.',
      'Voće i povrće imaju mnogo vitamina.',
      'Treba piti dovoljno vode, a slatkiše jesti rijetko.',
    ],
  },
  {
    title: 'Ekosistem',
    body: 'Ekosistem čine živa bića i prostor u kojem žive, kao što su šuma, livada ili jezero.',
    draft: true,
  },
];

export const SERBIAN_LESSONS: LessonSpec[] = [
  {
    title: 'Imenice',
    body:
      'Imenice su riječi kojima imenujemo bića, stvari i pojave. Na primjer: dječak, sto, kiša. ' +
      'Imenice imaju rod, broj i padež. Rod može biti muški, ženski i srednji. ' +
      'Broj može biti jednina, kada govorimo o jednom, i množina, kada govorimo o više njih. ' +
      'Vlastite imenice pišemo velikim početnim slovom. To su imena ljudi, gradova i rijeka, na primjer Podgorica.',
    summary: [
      'Imenice imenuju bića, stvari i pojave.',
      'Imenice imaju rod, broj i padež.',
      'Vlastite imenice pišemo velikim početnim slovom.',
    ],
  },
];

export const HISTORY_LESSONS: LessonSpec[] = [
  {
    title: 'Stari Egipat',
    body:
      'Stari Egipat nastao je prije više od pet hiljada godina, pored rijeke Nil. ' +
      'Nil je svake godine plavio okolna polja i ostavljao plodno tlo. Zato su Egipćani mogli da uzgajaju žito. ' +
      'Vladar Egipta zvao se faraon. Faraoni su sebi gradili velike grobnice, koje zovemo piramide. ' +
      'Egipćani su pisali hijeroglifima, to jest slikama koje označavaju riječi.',
    summary: [
      'Stari Egipat nastao je pored rijeke Nil.',
      'Nil je plavio polja i ostavljao plodno tlo.',
      'Vladar Egipta zvao se faraon, a grobnice su piramide.',
      'Egipćani su pisali hijeroglifima.',
    ],
  },
];

// The words of the conversations between a teacher and a parent about a student.
export interface TalkContext {
  name: string;
  // The student is a girl; a boy otherwise.
  girl: boolean;
  // What the lessons are about, as in "o ___": "razlomcima", "ćeliji".
  about: string;
}

export interface TalkLine {
  by: 'teacher' | 'parent';
  say: (c: TalkContext) => string;
}

const f = (c: TalkContext, girl: string, boy: string) => (c.girl ? girl : boy);

export const TALKS: TalkLine[][] = [
  // Praise.
  [
    {
      by: 'teacher',
      say: (c) =>
        `Dobar dan. ${c.name} je danas ${f(c, 'bila', 'bio')} vrlo aktivn${f(c, 'a', 'an')} na času i tačno odgovara na pitanja o ${c.about}.`,
    },
    {
      by: 'parent',
      say: (c) =>
        `Hvala vam što ste mi javili! Kod kuće jedva čeka da nam ispriča šta je naučil${f(c, 'a', 'o')} o ${c.about}.`,
    },
    {
      by: 'teacher',
      say: (c) => `Odlično, to se vidi. ${c.name} je dobil${f(c, 'a', 'o')} zvjezdicu za trud.`,
    },
    { by: 'parent', say: (c) => `Hvala vam, mnogo ${f(c, 'joj', 'mu')} znači!` },
  ],
  // A worry and advice.
  [
    {
      by: 'teacher',
      say: (c) =>
        `Dobar dan. ${c.name} ima poteškoća sa gradivom o ${c.about}. Predlažem da kod kuće svako veče vježba po deset minuta.`,
    },
    {
      by: 'parent',
      say: () =>
        'Hvala na javljanju. Vježbaćemo svako veče. Da li postoji nešto posebno što bismo trebali da radimo?',
    },
    {
      by: 'teacher',
      say: () =>
        'Najbolje je da zajedno pročitate lekciju na sajtu i uradite kviz. Pomažu i opcije "Korak po korak" i "Poslušaj lekciju".',
    },
    {
      by: 'parent',
      say: (c) =>
        `Probali smo "Korak po korak" i ${f(c, 'joj', 'mu')} je mnogo lakše. Hvala na savjetu!`,
    },
    { by: 'teacher', say: () => 'Drago mi je da pomaže. Pratiću napredak na sljedećim časovima.' },
    { by: 'parent', say: () => 'Hvala još jednom. Javićemo vam ako zatreba pomoć.' },
  ],
  // A question from the parent.
  [
    {
      by: 'parent',
      say: (c) => `Dobar dan, kada je sljedeća provjera znanja i šta ${c.name} treba da ponovi?`,
    },
    {
      by: 'teacher',
      say: (c) =>
        `Dobar dan. Provjera je u srijedu. ${c.name} treba da ponovi lekcije o ${c.about}.`,
    },
    {
      by: 'parent',
      say: () => 'Hvala, ponovićemo zajedno. Da li smije da koristi sažetak lekcije sa sajta?',
    },
    {
      by: 'teacher',
      say: () => 'Naravno, sažetak i kviz na sajtu su napravljeni upravo za vježbu.',
    },
    { by: 'parent', say: () => 'Super, hvala vam!' },
  ],
  // A missed lesson.
  [
    {
      by: 'teacher',
      say: (c) =>
        `Dobar dan. ${c.name} je ${f(c, 'bila odsutna', 'bio odsutan')} na prošlom času, pa je ${f(c, 'propustila', 'propustio')} lekciju o ${c.about}. Lekcija je objavljena na sajtu.`,
    },
    {
      by: 'parent',
      say: (c) =>
        `Hvala, ${c.name} je ${f(c, 'bila prehlađena', 'bio prehlađen')}. Pročitaćemo lekciju večeras.`,
    },
    { by: 'teacher', say: () => 'Odlično. Ako nešto nije jasno, pitajte slobodno.' },
    { by: 'parent', say: () => 'Hvala, hoćemo.' },
  ],
];

// Short messages of a teacher with a star, by subject.
export const STAR_MESSAGES: Record<'math' | 'biology', string[]> = {
  math: [
    'Bravo za trud na času!',
    'Svaki zadatak je tačno riješen. Tako treba!',
    'Postupak je lijepo objašnjen drugovima.',
    'Veliki napredak u računanju. Samo naprijed!',
    'Uredna sveska i tačni rezultati. Bravo!',
    'Hvala što se javljaš na času.',
  ],
  biology: [
    'Bravo za trud na času!',
    'Odličan odgovor o životu ćelije.',
    'Lijepo je ispričano šta je naučeno kod kuće.',
    'Pažljivo posmatranje na času. Tako treba!',
    'Odličan rad u grupi.',
    'Hvala što pomažeš drugarima.',
  ],
};
