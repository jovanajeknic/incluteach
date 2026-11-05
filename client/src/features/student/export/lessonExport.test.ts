import { unzipSync } from 'fflate';
import { Packer } from 'docx';
import { describe, expect, it } from 'vitest';
import { defaultPreferences } from '@/features/reading-preferences/readingPreferences';
import {
  buildLessonDocument,
  lessonDocumentContent,
  wordFileName,
  type LessonDocumentContent,
} from './lessonExport';

const input = {
  title: 'Fotosinteza',
  meta: 'Biologija · odjeljenje 5-2',
  dateLine: 'Štampano 5. novembar 2026.',
  summaryHeading: 'Ukratko',
  textHeading: 'Tekst lekcije',
  body: 'Biljke prave hranu.\nTo se zove fotosinteza.\n\nZa to im treba svjetlost.',
  summaryPoints: ['Biljke prave hranu.', 'Treba im svjetlost.'],
  script: 'latin' as const,
};

/** The text of the main part of the Word file (document.xml), without the tags. */
async function wordText(content: LessonDocumentContent, look = defaultPreferences()) {
  const buffer = await Packer.toBuffer(await buildLessonDocument(content, look));
  const files = unzipSync(new Uint8Array(buffer));
  const xml = new TextDecoder().decode(files['word/document.xml']);
  return { xml, text: xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ') };
}

describe('lessonDocumentContent', () => {
  it('keeps the title, the meta line, the summary and the paragraphs', () => {
    const content = lessonDocumentContent(input);

    expect(content.title).toBe('Fotosinteza');
    expect(content.summary).toEqual(['Biljke prave hranu.', 'Treba im svjetlost.']);
    // A blank line separates paragraphs; a single line break stays a line break.
    expect(content.paragraphs).toEqual([
      ['Biljke prave hranu.', 'To se zove fotosinteza.'],
      ['Za to im treba svjetlost.'],
    ]);
  });

  it('writes everything in the script the reader chose', () => {
    const content = lessonDocumentContent({ ...input, script: 'cyrillic' });

    expect(content.title).toBe('Фотосинтеза');
    expect(content.meta).toBe('Биологија · одјељење 5-2');
    expect(content.summary[1]).toBe('Треба им свјетлост.');
    expect(content.paragraphs[0]![1]).toBe('То се зове фотосинтеза.');
    // Only what the page shows is turned; the labels come in Latin from the texts.
    expect(content.textHeading).toBe('Tekst lekcije');
  });

  it('turns a Cyrillic lesson into Latin when the reader wants Latin', () => {
    const content = lessonDocumentContent({
      ...input,
      title: 'Фотосинтеза',
      body: 'Биљке праве храну.',
      summaryPoints: ['Љубав према њиви.'],
    });

    expect(content.title).toBe('Fotosinteza');
    expect(content.paragraphs).toEqual([['Biljke prave hranu.']]);
    expect(content.summary).toEqual(['Ljubav prema njivi.']);
  });

  it('has no summary when the lesson has none', () => {
    expect(lessonDocumentContent({ ...input, summaryPoints: [] }).summary).toEqual([]);
  });
});

describe('buildLessonDocument', () => {
  it('makes a Word file with the title, the summary and the text, and not the quiz', async () => {
    const { text } = await wordText(lessonDocumentContent(input));

    expect(text).toContain('Fotosinteza');
    expect(text).toContain('Biologija · odjeljenje 5-2');
    expect(text).toContain('Ukratko');
    expect(text).toContain('Treba im svjetlost.');
    expect(text).toContain('Tekst lekcije');
    expect(text).toContain('Za to im treba svjetlost.');
    expect(text.toLowerCase()).not.toContain('kviz');
  });

  it('keeps Cyrillic letters in the file', async () => {
    const { text } = await wordText(lessonDocumentContent({ ...input, script: 'cyrillic' }));
    expect(text).toContain('Фотосинтеза');
    expect(text).toContain('свјетлост');
  });

  it('follows the size, spacing and font the student chose', async () => {
    const big = {
      ...defaultPreferences(),
      size: 'xl' as const,
      lineSpacing: 'loose' as const,
      letterSpacing: 'wide' as const,
      font: 'rounded' as const,
    };

    const { xml } = await wordText(lessonDocumentContent(input), big);

    expect(xml).toContain('w:val="32"');
    expect(xml).toContain('w:line="480"');
    expect(xml).toContain('w:spacing w:val="20"');
    expect(xml).toContain('Verdana');
  });

  it('leaves out the summary part when there is no summary', async () => {
    const { text } = await wordText(lessonDocumentContent({ ...input, summaryPoints: [] }));
    expect(text).not.toContain('Ukratko');
    expect(text).toContain('Tekst lekcije');
  });
});

describe('wordFileName', () => {
  it('makes a name that every system accepts', () => {
    expect(wordFileName('Fotosinteza')).toBe('Fotosinteza.docx');
    expect(wordFileName('Voda: kruženje / led?')).toBe('Voda kruženje led.docx');
    expect(wordFileName('Фотосинтеза')).toBe('Фотосинтеза.docx');
  });

  it('has a name even when the title is only signs, and is not too long', () => {
    expect(wordFileName('***')).toBe('lekcija.docx');
    expect(wordFileName('x'.repeat(200)).length).toBe(80 + '.docx'.length);
  });
});
