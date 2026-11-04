// What the server needs from an AI service. Any provider can be plugged in by writing an
// object with these two functions; nothing else in the server knows which service is used.
// The service only ever receives the text of a lesson, never anything about students.

export interface SummaryContent {
  // Short, simple sentences, one per point.
  points: string[];
}

export type QuestionKind = 'choice' | 'true_false';

export interface QuestionContent {
  kind: QuestionKind;
  prompt: string;
  // Shown to the child after the answer, to explain it. Optional.
  explanation: string | null;
  // A choice question has 3 or 4 options, a true/false question has "Tačno" and "Netačno".
  // Exactly one is right.
  options: { text: string; isCorrect: boolean }[];
}

export interface QuizContent {
  questions: QuestionContent[];
}

export interface AiProvider {
  // For logs, to tell which provider made something.
  readonly name: string;
  makeSummary(input: { text: string }): Promise<unknown>;
  makeQuiz(input: { text: string }): Promise<unknown>;
}

// An error whose message is meant for the teacher, for example "the text is too short for a
// quiz". Anything else an AI service throws is treated as an internal problem: the teacher
// only gets a general message, and the details go to the server log.
export class AiUserError extends Error {}
