import { splitParagraphs, splitSentences } from '@/features/lesson-content/sentences';
import type { GlossaryEntry, LessonVersion, QuizQuestion } from '@/features/student/types';
import { demoIllustrationsFor } from './demoIllustrations';
import { curatedAdaptations, narrationScript } from './demoSchoolData';
import type { AdaptedKind, SchoolLesson } from './types';

export interface GenerationRequest {
  lesson: SchoolLesson;
  kinds: readonly AdaptedKind[];
  /** Parent suggestions the teacher chose to pass on. */
  suggestions: readonly string[];
  /** The teacher's note when asking the AI to redo a version. */
  feedback?: string;
  /** Counts redo requests, so each one can give a different result. */
  attempt?: number;
}

export interface GenerationResult {
  versions: LessonVersion[];
  glossary: GlossaryEntry[];
  quiz: QuizQuestion[];
}

/** What a real AI service will do once the backend exists. */
export interface AiService {
  generate(request: GenerationRequest): Promise<GenerationResult>;
}

const DEMO_NOTE = '(Demo AI prijedlog — pregledajte i uredite ovaj tekst.)';

/** Very rough "shortening": the first sentence of each paragraph. Good enough to edit. */
function genericShortened(content: string): string {
  return splitParagraphs(content)
    .map((paragraph) => splitSentences(paragraph)[0] ?? paragraph)
    .concat(DEMO_NOTE)
    .join('\n\n');
}

/** Rough "simpler words": long sentences are cut at commas into short ones. */
function genericEasier(content: string): string {
  return splitParagraphs(content)
    .map((paragraph) =>
      splitSentences(paragraph)
        .flatMap((sentence) => sentence.split(/,\s*/))
        .map((part) => part.trim().replace(/[.!?]*$/, '.'))
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' '),
    )
    .concat(DEMO_NOTE)
    .join('\n\n');
}

/** One short sentence per line, which the dyslexia-friendly layout then spaces out. */
function genericDyslexia(content: string): string {
  return splitParagraphs(content)
    .flatMap((paragraph) => splitSentences(paragraph))
    .concat(DEMO_NOTE)
    .join('\n\n');
}

/** Long words are a reasonable guess for "harder words". */
function genericGlossary(content: string): GlossaryEntry[] {
  const words = content.match(/\p{L}{10,}/gu) ?? [];
  const unique = [...new Set(words.map((word) => word.toLowerCase()))].slice(0, 3);
  return unique.map((term) => ({
    term,
    definition: `Objašnjenje za riječ „${term}“. ${DEMO_NOTE}`,
  }));
}

function genericQuiz(title: string): QuizQuestion[] {
  return [
    {
      id: 'q1',
      question: `Pitanje o lekciji „${title}“ ${DEMO_NOTE}`,
      options: ['Prvi odgovor', 'Drugi odgovor', 'Treći odgovor'],
      correctIndex: 0,
      explanation: 'Objašnjenje tačnog odgovora.',
    },
  ];
}

function textFor(
  kind: Exclude<AdaptedKind, 'illustrations'>,
  lesson: SchoolLesson,
  content: string,
) {
  const curated = curatedAdaptations[lesson.id]?.[kind];
  if (curated) return curated;
  switch (kind) {
    case 'shortened':
      return genericShortened(content);
    case 'easier':
      return genericEasier(content);
    case 'dyslexia':
      return genericDyslexia(content);
    case 'audio':
      return narrationScript(lesson.title, content);
  }
}

/**
 * Simulated AI. Nothing leaves the browser: results are hand-written for demo lessons or
 * built from simple rules, and every result is an unapproved suggestion for the teacher.
 * A redo after feedback marks the text so the teacher can see the note was received.
 */
export function createDemoAiService(delayMs: number): AiService {
  return {
    async generate({ lesson, kinds, feedback, attempt = 0 }) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      const original = lesson.versions.find((version) => version.kind === 'standard');
      const content = original?.content ?? '';
      const curated = curatedAdaptations[lesson.id];
      const note = feedback?.trim();

      const versions: LessonVersion[] = kinds.map((kind) => {
        if (kind === 'illustrations') {
          return {
            kind,
            source: 'ai',
            approvedByTeacher: false,
            content: '',
            illustrations: demoIllustrationsFor(lesson.id, lesson.subjectId, attempt),
          };
        }
        const base = textFor(kind, lesson, content);
        return {
          kind,
          source: 'ai',
          approvedByTeacher: false,
          content: note ? `${base}\n\n(Demo AI: prepravljeno prema napomeni „${note}“.)` : base,
        };
      });

      return {
        versions,
        glossary: curated?.glossary ?? genericGlossary(content),
        quiz: curated?.quiz ?? genericQuiz(lesson.title),
      };
    },
  };
}
