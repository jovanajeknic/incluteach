import { HttpError } from '../../http/errors.ts';
import { MAX_BODY_LENGTH } from '../limits.ts';
import { docxToText } from './docx.ts';
import { readPdf } from './pdf.ts';

export type FileKind = 'pdf' | 'docx';

export interface ExtractedLesson {
  text: string;
  source: FileKind;
  // How many pictures were in the file. They are not in the text. Only a PDF is counted for
  // now; for a Word file this is always 0.
  imageCount: number;
}

const unsupported = (message: string) => new HttpError(415, 'unsupported_file', message);

// Works out what the file is from its first bytes, not from its name or the type the browser
// claimed, which can be wrong or false. Returns null for anything that is not a PDF or a
// zip (a Word file is a zip).
export function detectFileKind(data: Uint8Array): FileKind | 'zip' | 'old-office' | null {
  const start = Buffer.from(data.subarray(0, 1024));

  if (start.includes('%PDF-')) {
    return 'pdf';
  }
  if (
    start.length >= 4 &&
    start[0] === 0x50 &&
    start[1] === 0x4b &&
    start[2] === 0x03 &&
    start[3] === 0x04
  ) {
    return 'zip';
  }
  if (
    start.length >= 4 &&
    start[0] === 0xd0 &&
    start[1] === 0xcf &&
    start[2] === 0x11 &&
    start[3] === 0xe0
  ) {
    return 'old-office';
  }
  return null;
}

// The text of a Word (.docx) or PDF file, ready for the teacher to correct. Throws a clear
// error (an HttpError) for anything else, for a file without text and for a text that is too
// long for a lesson.
export async function extractLessonText(data: Uint8Array): Promise<ExtractedLesson> {
  const kind = detectFileKind(data);

  let result: ExtractedLesson;
  if (kind === 'pdf') {
    const pdf = await readPdf(data);
    result = { text: pdf.text, source: 'pdf', imageCount: pdf.imageCount };
  } else if (kind === 'zip') {
    const text = docxToText(data);
    if (text === null) {
      throw unsupported('Only Word (.docx) and PDF files can be used.');
    }
    result = { text, source: 'docx', imageCount: 0 };
  } else if (kind === 'old-office') {
    throw unsupported(
      'This is an old Word file (.doc). Open it in Word and save it as .docx, then send it again.',
    );
  } else {
    throw unsupported('Only Word (.docx) and PDF files can be used.');
  }

  if (result.text.replace(/\s/g, '') === '') {
    throw new HttpError(
      422,
      'no_text_in_file',
      'The file has no text. Check that it is the right file, or paste the text.',
    );
  }
  if (result.text.length > MAX_BODY_LENGTH) {
    throw new HttpError(
      422,
      'text_too_long',
      `The text has ${result.text.length} characters and a lesson can have at most ${MAX_BODY_LENGTH}. Send a shorter part.`,
    );
  }
  return result;
}
