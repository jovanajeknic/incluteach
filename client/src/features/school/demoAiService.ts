import { splitParagraphs, splitSentences } from '@/features/lesson-content/sentences';
import type { GlossaryEntry, LessonVersion, QuizQuestion } from '@/features/student/types';
import { curatedAdaptations } from './demoSchoolData';
import type { AdaptedKind, SchoolLesson } from './types';

export interface AdaptationRequest {
  lesson: SchoolLesson;
  kinds: readonly AdaptedKind[];
  /** Parent suggestions the teacher chose to pass on. Shown to the teacher; the demo ignores them. */
  suggestions: readonly string[];
}

export interface AdaptationResult {
  versions: LessonVersion[];
  glossary: GlossaryEntry[];
  quiz: QuizQuestion[];
}

/** What a real AI service will do once the backend exists. */
export interface AiService {
  adapt(request: AdaptationRequest): Promise<AdaptationResult>;
}

const DEMO_NOTE = '(Demo AI prijedlog — pregledajte i uredite ovaj tekst.)';

/** Very rough "simplification": the first sentence of each paragraph. Good enough to edit. */
function genericSimplified(content: string): string {
  return splitParagraphs(content)
    .map((paragraph) => splitSentences(paragraph)[0] ?? paragraph)
    .concat(DEMO_NOTE)
    .join('\n\n');
}

function genericExamples(content: string, title: string): string {
  return `${content}\n\nPrimjer iz svakodnevnog života: ovdje AI dodaje primjer povezan sa temom „${title}“. ${DEMO_NOTE}`;
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

/**
 * Simulated AI. Nothing leaves the browser: results are hand-written for demo lessons or
 * built from simple rules, and every result is an unapproved suggestion for the teacher.
 */
export function createDemoAiService(delayMs: number): AiService {
  return {
    async adapt({ lesson, kinds }) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      const original = lesson.versions.find((version) => version.kind === 'standard');
      const content = original?.content ?? '';
      const curated = curatedAdaptations[lesson.id];

      const versions: LessonVersion[] = kinds.map((kind) => ({
        kind,
        source: 'ai',
        approvedByTeacher: false,
        content:
          curated?.[kind] ??
          (kind === 'simplified'
            ? genericSimplified(content)
            : genericExamples(content, lesson.title)),
      }));

      return {
        versions,
        glossary: curated?.glossary ?? genericGlossary(content),
        quiz: curated?.quiz ?? genericQuiz(lesson.title),
      };
    },
  };
}
