/** Splits lesson text into paragraphs; a blank line separates them. */
export function splitParagraphs(content: string): string[] {
  return content
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

/**
 * Splits a paragraph into sentences, keeping the closing punctuation. Used both to render
 * the text and to read it aloud, so the highlighted sentence always matches the voice.
 */
export function splitSentences(paragraph: string): string[] {
  return sentenceParts(paragraph).map((part) => part.text);
}

/**
 * The same sentences, each with the white space that came before it. A line break written by
 * the teacher between two sentences is in `lead`, so the page can keep it.
 */
export function sentenceParts(paragraph: string): { lead: string; text: string }[] {
  const matches = paragraph.match(/[^.!?]+[.!?]+["“”»]?|[^.!?]+$/g) ?? [];
  return matches
    .map((raw) => ({ lead: /^\s*/.exec(raw)?.[0] ?? '', text: raw.trim() }))
    .filter((part) => part.text !== '');
}

/** All sentences of a lesson, in reading order. */
export function lessonSentences(content: string): string[] {
  return splitParagraphs(content).flatMap(splitSentences);
}
