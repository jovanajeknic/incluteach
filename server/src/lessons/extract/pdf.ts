import { extractText, getDocumentProxy, getResolvedPDFJS } from 'unpdf';
import type { PDFDocumentProxy } from 'unpdf/pdfjs';

import { HttpError } from '../../http/errors.ts';
import { joinWrappedLines, normalizeText, removePageNumber } from './text.ts';

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

// How many pictures (graphs, photos, screenshots, tables drawn as pictures) the pages show.
// They are not part of the text, so the teacher is told how many were left out. A count that
// cannot be made is not worth failing the whole file for.
async function countImages(pdf: PDFDocumentProxy): Promise<number> {
  try {
    const { OPS } = await getResolvedPDFJS();
    const imageOperations = new Set<number>(
      [
        OPS.paintImageXObject,
        OPS.paintInlineImageXObject,
        OPS.paintImageMaskXObject,
        OPS.paintImageXObjectRepeat,
        OPS.paintImageMaskXObjectRepeat,
        OPS.paintImageMaskXObjectGroup,
      ].filter((operation): operation is number => typeof operation === 'number'),
    );

    let count = 0;
    for (let number = 1; number <= pdf.numPages; number += 1) {
      const page = await pdf.getPage(number);
      const { fnArray } = await page.getOperatorList();
      count += fnArray.filter((operation) => imageOperations.has(operation)).length;
    }
    return count;
  } catch {
    return 0;
  }
}

export interface PdfContent {
  text: string;
  // The number of pictures that are not in the text.
  imageCount: number;
}

// The text of a PDF, with the lines of a paragraph joined and the page numbers left out. A PDF
// made of pictures of pages (a scan) has no text to read; that is reported as
// `no_text_in_file`, because turning pictures into text (OCR) is not supported.
export async function readPdf(data: Uint8Array): Promise<PdfContent> {
  // The reader may keep the array it is given, so it gets its own copy.
  const copy = new Uint8Array(data);

  const work = (async () => {
    // Verbosity 0 keeps the reader from printing a warning for every font it does not know.
    const pdf = await getDocumentProxy(copy, { verbosity: 0 });
    if (pdf.numPages > MAX_PDF_PAGES) {
      throw new HttpError(
        422,
        'text_too_long',
        `The PDF has more than ${MAX_PDF_PAGES} pages. Send a shorter part of it.`,
      );
    }
    const { text } = await extractText(pdf, { mergePages: false });
    return { pages: text, imageCount: await countImages(pdf) };
  })();

  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(unreadable()), READ_TIMEOUT_MS);
  });

  let pages: string[];
  let imageCount: number;
  try {
    ({ pages, imageCount } = await Promise.race([work, timeout]));
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    throw unreadable();
  } finally {
    clearTimeout(timer);
  }

  const text = normalizeText(
    pages
      .map((page, index) => joinWrappedLines(removePageNumber(normalizeText(page), index + 1)))
      .join('\n\n'),
  );
  const letters = text.replace(/\s/g, '').length;
  if (letters < MIN_CHARACTERS_PER_PAGE * Math.max(pages.length, 1)) {
    throw new HttpError(
      422,
      'no_text_in_file',
      'This PDF is a picture of pages and has no text to read. Send a Word file or paste the text.',
    );
  }
  return { text, imageCount };
}

export async function pdfToText(data: Uint8Array): Promise<string> {
  return (await readPdf(data)).text;
}
