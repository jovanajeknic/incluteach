// Tidies text taken out of a document so the teacher starts from something clean.
export function normalizeText(raw: string): string {
  return (
    raw
      // PostgreSQL cannot store the character with code 0.
      .replaceAll(String.fromCharCode(0), '')
      .replace(/\r\n?/g, '\n')
      // A tab or a run of spaces (also the no-break space) becomes one space.
      .replace(/[\t\p{Zs}]+/gu, ' ')
      .replace(/ +\n/g, '\n')
      .replace(/\n +/g, '\n')
      // At most one empty line in a row.
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

// A line of a paragraph that the page cut is nearly as long as a whole line; a short line is a
// heading or an item of a list. Only a line at least this long is joined with the next one.
const MIN_WRAPPED_LINE_LENGTH = 35;

// A PDF gives the text line by line, as the lines were broken on the page, so a sentence is
// often cut in the middle. A long line that does not end a sentence and is followed by a line
// starting with a small letter is the same paragraph and is joined to it. Headings, list items
// and anything else are left as they are, and the teacher can fix the rest by hand.
export function joinWrappedLines(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];

  for (const line of lines) {
    const previous = result[result.length - 1];
    const continuesSentence =
      previous !== undefined &&
      previous !== '' &&
      previous.length >= MIN_WRAPPED_LINE_LENGTH &&
      !/[.!?:;…»"”)]$/.test(previous) &&
      !/-$/.test(previous) &&
      /^\p{Ll}/u.test(line);

    if (continuesSentence) {
      result[result.length - 1] = `${previous} ${line}`;
    } else {
      result.push(line);
    }
  }
  return result.join('\n');
}
