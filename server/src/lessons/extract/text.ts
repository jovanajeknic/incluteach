// Tidies text taken out of a document so the teacher starts from something clean.
export function normalizeText(raw: string): string {
  return (
    raw
      // PostgreSQL cannot store the character with code 0.
      .replaceAll(String.fromCharCode(0), '')
      .replace(/\r\n?/g, '\n')
      // The dots between a title and its page number in a table of contents are layout, not
      // text. Three dots (an ellipsis) are kept.
      .replace(/[ \t]*\.{4,}[ \t]*/g, ' ')
      // A tab or a run of spaces (also the no-break space) becomes one space.
      .replace(/[\t\p{Zs}]+/gu, ' ')
      .replace(/ +\n/g, '\n')
      .replace(/\n +/g, '\n')
      // At most one empty line in a row.
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      // The bullet of a list in a PDF or Word file is often a character from a private area of
      // a symbol font, which shows as an empty box. At the start of a line it becomes a
      // bullet; anywhere else it is dropped.
      .replace(/^[\uE000-\uF8FF]\s*/gmu, '\u2022 ')
      .replace(/[\uE000-\uF8FF]/gu, '')
  );
}

// A page number is printed on its own line at the end (or the start) of a page. It is not
// part of the lesson. Only a line that is just a number close to the number of the page is
// taken for it, so a real number on its own line (a year, a count) is not removed.
export function removePageNumber(pageText: string, pageNumber: number): string {
  const lines = pageText.split('\n');
  const isPageNumber = (line: string | undefined) =>
    line !== undefined &&
    /^\d{1,4}$/.test(line.trim()) &&
    Math.abs(Number(line.trim()) - pageNumber) <= 1;

  let last = lines.length - 1;
  while (last >= 0 && lines[last].trim() === '') {
    last -= 1;
  }
  if (isPageNumber(lines[last])) {
    lines.splice(last, 1);
  } else {
    const first = lines.findIndex((line) => line.trim() !== '');
    if (first !== -1 && isPageNumber(lines[first])) {
      lines.splice(first, 1);
    }
  }
  return lines.join('\n');
}

// A line of a paragraph that the page cut is nearly as long as a whole line; a short line is a
// heading or an item of a list. Only a line at least this long is joined with the next one.
const MIN_WRAPPED_LINE_LENGTH = 35;

// A text beside a picture is set in a narrow column, so all its lines are short. It is still
// one paragraph, so a short line of at least this many words is joined as well, but only with
// a next line of at least two words: after a short line a lone word is the start of a list.
const MIN_WRAPPED_LINE_WORDS = 3;
const MIN_NEXT_LINE_WORDS = 2;

const wordCount = (line: string) => line.split(' ').filter(Boolean).length;

// Whether a line ends a sentence, given the line that follows it. A colon or a semicolon does
// (a list may follow). A full stop, "!", "?" or "…" does too, also when a closing bracket or
// quote comes after it, but a full stop after a number that is followed by a small letter does
// not: "2010–2020." and "годинама" are one sentence. A bracket or a quote after anything else
// is no end: "(око 75%)" is followed by the rest of the sentence.
function endsSentence(line: string, next: string): boolean {
  if (/[:;]$/.test(line)) {
    return true;
  }
  if (/\d\.$/.test(line) && /^\p{Ll}/u.test(next)) {
    return false;
  }
  return /[.!?…]$/.test(line) || /[.!?…]["”»)]$/.test(line);
}

// A PDF gives the text line by line, as the lines were broken on the page, so a sentence is
// often cut in the middle. A line that does not end a sentence and is followed by a line
// starting with a small letter (or with a number that is not an item of a numbered list) is
// the same paragraph and is joined to it. A long line is also joined to a line that starts with
// an opening bracket or quote. A word cut at a hyphen is joined without a space and keeps its
// hyphen, which is right for words like "ugljen-dioksid"; a teacher can remove it from a word
// that was only divided. Headings, list items and anything else are left as they are, and the
// teacher can fix the rest by hand.
export function joinWrappedLines(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];

  for (const line of lines) {
    const previous = result[result.length - 1];
    const isLong = previous !== undefined && previous.length >= MIN_WRAPPED_LINE_LENGTH;
    const continuesWord =
      /^\p{Ll}/u.test(line) || (/^\d/.test(line) && !/^\d{1,3}[.)]\s/.test(line));
    const opensBracket = /^[(\u201E\u201C"\u00AB]/.test(line);

    const wraps =
      previous !== undefined &&
      previous !== '' &&
      !endsSentence(previous, line) &&
      ((continuesWord &&
        (isLong ||
          (wordCount(previous) >= MIN_WRAPPED_LINE_WORDS &&
            wordCount(line) >= MIN_NEXT_LINE_WORDS))) ||
        (opensBracket && isLong));

    if (wraps && /\p{L}-$/u.test(previous)) {
      result[result.length - 1] = `${previous}${line}`;
    } else if (wraps && !/-$/.test(previous)) {
      result[result.length - 1] = `${previous} ${line}`;
    } else {
      result.push(line);
    }
  }
  return result.join('\n');
}
