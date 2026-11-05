import { splitParagraphs } from '@/features/lesson-content/sentences';
import type { ReadingPreferences } from '@/features/reading-preferences/readingPreferences';
import { displayInScript } from '@/shared/script/serbianScript';

/** A lesson ready to be written into a file: already in the script the reader chose. */
export interface LessonDocumentContent {
  title: string;
  /** For example "Biologija · odjeljenje 5-2". */
  meta: string;
  /** For example "Štampano 5. novembar 2026." */
  dateLine: string;
  summaryHeading: string;
  summary: string[];
  textHeading: string;
  /** Each paragraph is a list of lines, because single line breaks of the text are kept. */
  paragraphs: string[][];
}

interface ContentInput {
  title: string;
  meta: string;
  dateLine: string;
  summaryHeading: string;
  textHeading: string;
  body: string;
  summaryPoints: readonly string[];
  script: ReadingPreferences['script'];
}

/**
 * What goes into the file: the title, the text and the summary, as the reader sees them. The
 * quiz is not printed or exported. The script is applied here, so the file matches the screen.
 */
export function lessonDocumentContent(input: ContentInput): LessonDocumentContent {
  const show = (value: string) => displayInScript(value, input.script);
  return {
    title: show(input.title),
    meta: show(input.meta),
    dateLine: input.dateLine,
    summaryHeading: input.summaryHeading,
    summary: input.summaryPoints.map(show),
    textHeading: input.textHeading,
    paragraphs: splitParagraphs(show(input.body)).map((paragraph) =>
      paragraph
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
    ),
  };
}

// Sizes of the text in Word, in half-points, and the spacing between lines as a multiple of a
// line (240 = single). They follow the settings the student chose on the screen.
const SIZE: Record<ReadingPreferences['size'], number> = { m: 24, l: 28, xl: 32 };
const LINE: Record<ReadingPreferences['lineSpacing'], number> = {
  normal: 276,
  relaxed: 360,
  loose: 480,
};
// Word cannot carry the fonts of the page with it, so it asks for common ones that every
// computer has. The easier-reading font is not one of them: a wide, plain font stands in.
const FONT: Record<ReadingPreferences['font'], string> = {
  standard: 'Calibri',
  rounded: 'Verdana',
  dyslexic: 'Verdana',
};

/** Makes the Word file (a .docx) for a lesson, with the look the student chose. */
export async function buildLessonDocument(
  content: LessonDocumentContent,
  look: ReadingPreferences,
) {
  // Loaded only when a file is asked for, so the library is not part of the pages.
  const { AlignmentType, Document, HeadingLevel, Paragraph, TextRun } = await import('docx');

  const font = FONT[look.font];
  const size = SIZE[look.size];
  const spacing = look.letterSpacing === 'wide' ? 20 : 0;
  const run = (value: string, extra: { bold?: boolean; size?: number; break?: number } = {}) =>
    new TextRun({
      text: value,
      font,
      size: extra.size ?? size,
      bold: extra.bold,
      characterSpacing: spacing,
      break: extra.break,
    });
  const paragraph = (lines: string[]) =>
    new Paragraph({
      spacing: { line: LINE[look.lineSpacing], after: 200 },
      children: lines.map((line, index) => run(line, { break: index === 0 ? undefined : 1 })),
    });

  return new Document({
    creator: 'IncluTeach',
    title: content.title,
    sections: [
      {
        children: [
          new Paragraph({
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.LEFT,
            spacing: { after: 120 },
            children: [run(content.title, { bold: true, size: size + 12 })],
          }),
          new Paragraph({
            spacing: { after: 40 },
            children: [run(content.meta, { size: size - 2 })],
          }),
          new Paragraph({
            spacing: { after: 280 },
            children: [run(content.dateLine, { size: size - 2 })],
          }),
          ...(content.summary.length > 0
            ? [
                new Paragraph({
                  heading: HeadingLevel.HEADING_1,
                  spacing: { before: 200, after: 120 },
                  children: [run(content.summaryHeading, { bold: true, size: size + 4 })],
                }),
                ...content.summary.map(
                  (point) =>
                    new Paragraph({
                      bullet: { level: 0 },
                      spacing: { line: LINE[look.lineSpacing], after: 80 },
                      children: [run(point)],
                    }),
                ),
              ]
            : []),
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 280, after: 120 },
            children: [run(content.textHeading, { bold: true, size: size + 4 })],
          }),
          ...content.paragraphs.map(paragraph),
        ],
      },
    ],
  });
}

/** A name for the file that every system accepts. */
export function wordFileName(title: string): string {
  const cleaned = title
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return `${cleaned || 'lekcija'}.docx`;
}

/** Makes the file and hands it to the browser as a download. */
export async function downloadLessonAsWord(
  content: LessonDocumentContent,
  look: ReadingPreferences,
): Promise<void> {
  const { Packer } = await import('docx');
  const blob = await Packer.toBlob(await buildLessonDocument(content, look));
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = wordFileName(content.title);
    document.body.append(link);
    link.click();
    link.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}
