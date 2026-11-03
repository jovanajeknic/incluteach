import type { StudentLesson, StudentProfile, Subject } from '@/features/student/types';

/** Fictional demo student. Their support profile lists needs only, as the backend would. */
export const demoStudent: StudentProfile = {
  id: 'demo-student-luka',
  firstName: 'Luka',
  lastName: 'Petrović',
  supportProfile: {
    preferSimplifiedText: true,
    preferMoreExamples: false,
    preferStepByStep: false,
    readingPreset: 'easier-reading',
  },
};

export const demoSubjects: Subject[] = [
  { id: 'priroda', name: 'Priroda i društvo', color: 'mint', icon: 'leaf' },
  { id: 'matematika', name: 'Matematika', color: 'sky', icon: 'calculator' },
  { id: 'jezik', name: 'Maternji jezik', color: 'blush', icon: 'book' },
  { id: 'engleski', name: 'Engleski jezik', color: 'lilac', icon: 'globe' },
  { id: 'likovno', name: 'Likovna kultura', color: 'butter', icon: 'palette' },
];

export const demoStudentLessons: StudentLesson[] = [
  {
    id: 'kruzenje-vode',
    subjectId: 'priroda',
    grade: 4,
    title: 'Kruženje vode u prirodi',
    homeGuidance: [
      'Ostavite čašu vode na suncu i zajedno pratite kako se voda smanjuje.',
      'Kad pada kiša, pitajte dijete odakle je ta voda došla.',
    ],
    versions: [
      {
        kind: 'standard',
        source: 'teacher',
        approvedByTeacher: true,
        content:
          'Voda u prirodi stalno putuje. Sunce zagrijava vodu u morima, rijekama i jezerima, pa dolazi do isparavanja. Vodena para se diže visoko u vazduh.\n\nU visini je hladnije, pa se vodena para hladi i pretvara u sitne kapljice. Od mnogo kapljica nastaju oblaci.\n\nKada se kapljice u oblacima spoje i postanu teške, pada kiša. Zimi, kada je hladno, umjesto kiše pada snijeg.\n\nVoda se zatim vraća u rijeke, jezera i mora, a dio se upija u zemlju. Tako krug počinje iznova.',
      },
      {
        kind: 'simplified',
        source: 'ai',
        approvedByTeacher: true,
        content:
          'Sunce grije vodu. Voda se pretvara u paru. To je isparavanje.\n\nPara se diže u nebo. Gore je hladno. Para pravi oblake.\n\nIz oblaka pada kiša. Kiša se vraća u rijeke i mora.\n\nI sve počinje ponovo!',
      },
    ],
    glossary: [
      { term: 'isparavanje', definition: 'Kada se voda zagrije i pretvori u paru koja se diže.' },
      { term: 'vodena para', definition: 'Voda u obliku sitnih, nevidljivih kapljica u vazduhu.' },
      { term: 'para', definition: 'Voda koja je postala lagana kao vazduh.' },
    ],
    quiz: [
      {
        id: 'q1',
        question: 'Šta grije vodu u morima i rijekama?',
        options: ['Mjesec', 'Sunce', 'Vjetar'],
        correctIndex: 1,
        explanation: 'Sunce grije vodu, pa ona isparava.',
      },
      {
        id: 'q2',
        question: 'Od čega nastaju oblaci?',
        options: ['Od sitnih kapljica vode', 'Od dima', 'Od pijeska'],
        correctIndex: 0,
        explanation: 'Vodena para se ohladi i pravi sitne kapljice. Od njih nastaju oblaci.',
      },
      {
        id: 'q3',
        question: 'Šta pada iz oblaka kad je zima i hladno?',
        options: ['Lišće', 'Kiša', 'Snijeg'],
        correctIndex: 2,
        explanation: 'Kad je hladno, umjesto kiše pada snijeg.',
      },
    ],
  },
  {
    id: 'biljke',
    subjectId: 'priroda',
    grade: 4,
    title: 'Djelovi biljke',
    homeGuidance: [
      'U parku ili kod kuće zajedno pronađite korijen, stablo, list i cvijet neke biljke.',
    ],
    versions: [
      {
        kind: 'standard',
        source: 'teacher',
        approvedByTeacher: true,
        content:
          'Većina biljaka ima korijen, stablo, list, cvijet i plod. Svaki dio ima svoj zadatak.\n\nKorijen drži biljku u zemlji i upija vodu. Stablo nosi listove i vodi vodu do njih.\n\nListovi koriste sunčevu svjetlost da bi biljka rasla. Iz cvijeta nastaje plod, a u plodu su sjemenke za nove biljke.',
      },
      {
        // Generated but not reviewed yet: students must not see it.
        kind: 'simplified',
        source: 'ai',
        approvedByTeacher: false,
        content: 'Biljka ima korijen, stablo i list. Ova verzija još čeka pregled nastavnika.',
      },
    ],
    glossary: [
      { term: 'korijen', definition: 'Dio biljke u zemlji. Pije vodu i drži biljku.' },
      { term: 'sjemenke', definition: 'Sitna zrnca iz kojih rastu nove biljke.' },
    ],
    quiz: [
      {
        id: 'q1',
        question: 'Koji dio biljke upija vodu iz zemlje?',
        options: ['Cvijet', 'Korijen', 'List'],
        correctIndex: 1,
        explanation: 'Korijen je u zemlji i upija vodu.',
      },
      {
        id: 'q2',
        question: 'Gdje se nalaze sjemenke?',
        options: ['U plodu', 'U korijenu', 'U stablu'],
        correctIndex: 0,
        explanation: 'Sjemenke su u plodu. Iz njih rastu nove biljke.',
      },
    ],
  },
  {
    id: 'sabiranje',
    subjectId: 'matematika',
    grade: 4,
    title: 'Sabiranje do 100',
    homeGuidance: [
      'Sabirajte uz predmete: 3 grupe od po 10 kockica i još 4 kockice.',
      'Pustite dijete da prvo kaže desetice, pa jedinice.',
    ],
    versions: [
      {
        kind: 'standard',
        source: 'teacher',
        approvedByTeacher: true,
        content:
          'Kada sabiramo dva broja, prvo saberemo desetice, a zatim jedinice.\n\nPrimjer: 34 + 25. Desetice: 30 + 20 = 50. Jedinice: 4 + 5 = 9. Zajedno: 50 + 9 = 59.\n\nOvaj način nam pomaže da brže i tačnije računamo u glavi.',
      },
      {
        kind: 'simplified',
        source: 'ai',
        approvedByTeacher: true,
        content:
          'Broj 34 ima 3 desetice i 4 jedinice.\n\nSaberi desetice: 30 + 20 = 50.\n\nSaberi jedinice: 4 + 5 = 9.\n\nSada spoji: 50 + 9 = 59.',
      },
    ],
    glossary: [
      { term: 'desetice', definition: 'Grupe od po deset. U broju 34 ima 3 desetice.' },
      {
        term: 'jedinice',
        definition: 'Ono što ostane kad izbrojimo desetice. U broju 34 ima 4 jedinice.',
      },
    ],
    quiz: [
      {
        id: 'q1',
        question: 'Koliko je 20 + 30?',
        options: ['40', '50', '60'],
        correctIndex: 1,
        explanation: 'Dvije desetice i tri desetice su pet desetica, to jest 50.',
      },
      {
        id: 'q2',
        question: 'Koliko je 42 + 15?',
        options: ['57', '67', '52'],
        correctIndex: 0,
        explanation: '40 + 10 = 50, a 2 + 5 = 7. Zajedno je 57.',
      },
    ],
  },
  {
    id: 'oduzimanje',
    subjectId: 'matematika',
    grade: 4,
    title: 'Oduzimanje do 100',
    versions: [
      {
        kind: 'standard',
        source: 'teacher',
        approvedByTeacher: true,
        content:
          'Kod oduzimanja od većeg broja oduzimamo manji. I ovdje prvo radimo sa deseticama, pa sa jedinicama.\n\nPrimjer: 68 − 23. Desetice: 60 − 20 = 40. Jedinice: 8 − 3 = 5. Rezultat je 45.',
      },
    ],
    glossary: [],
    quiz: [
      {
        id: 'q1',
        question: 'Koliko je 68 − 23?',
        options: ['45', '35', '55'],
        correctIndex: 0,
        explanation: '60 − 20 = 40, a 8 − 3 = 5. Rezultat je 45.',
      },
    ],
  },
  {
    id: 'imenice',
    subjectId: 'jezik',
    grade: 4,
    title: 'Imenice',
    homeGuidance: ['Igrajte igru „Imenuj šta vidiš“: dijete imenuje pet stvari u sobi.'],
    versions: [
      {
        kind: 'standard',
        source: 'teacher',
        approvedByTeacher: true,
        content:
          'Imenice su riječi kojima imenujemo bića, stvari i pojave. Na primjer: djevojčica, pas, sto, kiša.\n\nImenice mogu biti vlastite i zajedničke. Vlastite imenice pišemo velikim početnim slovom, na primjer: Ana, Podgorica, Morača.',
      },
      {
        kind: 'simplified',
        source: 'ai',
        approvedByTeacher: true,
        content:
          'Imenice su riječi za bića i stvari.\n\nPrimjeri: pas, mama, sto, kiša.\n\nImena pišemo velikim slovom: Ana, Podgorica.',
      },
    ],
    glossary: [{ term: 'imenice', definition: 'Riječi koje kažu kako se nešto ili neko zove.' }],
    quiz: [
      {
        id: 'q1',
        question: 'Koja riječ je imenica?',
        options: ['trčati', 'pas', 'brzo'],
        correctIndex: 1,
        explanation: 'Pas je biće, pa je riječ „pas“ imenica.',
      },
      {
        id: 'q2',
        question: 'Kako pišemo ime grada?',
        options: ['Malim slovom', 'Velikim početnim slovom'],
        correctIndex: 1,
        explanation: 'Imena gradova pišemo velikim početnim slovom, na primjer: Podgorica.',
      },
    ],
  },
  {
    id: 'boje-engleski',
    subjectId: 'engleski',
    grade: 4,
    title: 'Boje na engleskom',
    versions: [
      {
        kind: 'standard',
        source: 'teacher',
        approvedByTeacher: true,
        content:
          'Na engleskom jeziku crvena boja je red, plava je blue, a žuta je yellow.\n\nZelena boja se kaže green. Kad pitamo koje je boje nešto, kažemo: What colour is it?',
      },
    ],
    glossary: [],
    quiz: [
      {
        id: 'q1',
        question: 'Kako se na engleskom kaže „plava“?',
        options: ['red', 'blue', 'green'],
        correctIndex: 1,
        explanation: 'Plava boja na engleskom je blue.',
      },
    ],
  },
];
