import { extractText, getDocumentProxy } from 'unpdf';

import { HttpError } from '../../http/errors.ts';
import { joinWrappedLines, normalizeText } from './text.ts';

// Reading a very long PDF takes long and its text would be far over the limit anyway.
export const MAX_PDF_PAGES = 100;
const READ_TIMEOUT_MS = 30_000;
// A page with fewer letters than this on average is taken to be a picture (a scanned page).
const MIN_CHARACTERS_PER_PAGE = 20;

const unreadable = () =>
  new HttpError(
    422,
    'unreadable_file',
    'The PDF could not be read. It may be damaged or protected with a password.',
  );

// The text of a PDF, with the lines of a paragraph joined. A PDF made of pictures of pages (a
// scan) has no text to read; that is reported as `no_text_in_file`, because turning pictures
// into text (OCR) is not supported.
export async function pdfToText(data: Uint8Array): Promise<string> {
  // The reader may keep the array it is given, so it gets its own copy.
  const copy = new Uint8Array(data);

  const work = (async () => {
    const pdf = await getDocumentProxy(copy);
    if (pdf.numPages > MAX_PDF_PAGES) {
      throw new HttpError(
        422,
        'text_too_long',
        `The PDF has more than ${MAX_PDF_PAGES} pages. Send a shorter part of it.`,
      );
    }
    const { text } = await extractText(pdf, { mergePages: false });
    return text;
  })();

  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(unreadable()), READ_TIMEOUT_MS);
  });

  let pages: string[];
  try {
    pages = await Promise.race([work, timeout]);
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    throw unreadable();
  } finally {
    clearTimeout(timer);
  }

  const text = normalizeText(
    pages.map((page) => joinWrappedLines(normalizeText(page))).join('\n\n'),
  );
  const letters = text.replace(/\s/g, '').length;
  if (letters < MIN_CHARACTERS_PER_PAGE * Math.max(pages.length, 1)) {
    throw new HttpError(
      422,
      'no_text_in_file',
      'This PDF is a picture of pages and has no text to read. Send a Word file or paste the text.',
    );
  }
  return text;
}
