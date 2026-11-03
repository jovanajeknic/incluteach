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
  const matches = paragraph.match(/[^.!?]+[.!?]+["“”»]?|[^.!?]+$/g) ?? [];
  return matches.map((sentence) => sentence.trim()).filter(Boolean);
}

/** All sentences of a lesson, in reading order. */
export function lessonSentences(content: string): string[] {
  return splitParagraphs(content).flatMap(splitSentences);
}
