import { readFileSync } from 'node:fs';
import path from 'node:path';

import { strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';

import { MAX_BODY_LENGTH } from '../limits.ts';
import { docxToText, documentXmlToText, MAX_DOCUMENT_XML_BYTES } from './docx.ts';
import { detectFileKind, extractLessonText } from './index.ts';
import { pdfToText } from './pdf.ts';
import { joinWrappedLines, normalizeText } from './text.ts';
import { documentXml, makeDocx, makeOtherZip, makePdf, wordParagraph } from './testFiles.ts';

const rejection = async (run: () => unknown) =>
  Promise.resolve()
    .then(run)
    .then(
      () => {
        throw new Error('It did not fail.');
      },
      (error: unknown) => error as { status: number; code: string; message: string },
    );

describe('normalizeText', () => {
  it('turns tabs, no-break spaces and runs of spaces into one space', () => {
    expect(normalizeText('a\t\tb   c d')).toBe('a b c d');
  });

  it('makes the line ends the same and trims the lines', () => {
    expect(normalizeText('  prvi  \r\n  drugi\r  ')).toBe('prvi\ndrugi');
  });

  it('keeps at most one empty line in a row', () => {
    expect(normalizeText('a\n\n\n\n\nb')).toBe('a\n\nb');
  });

  it('removes the NUL character', () => {
    expect(normalizeText(`a${String.fromCharCode(0)}b`)).toBe('ab');
  });
});

describe('joinWrappedLines', () => {
  it('joins a line cut in the middle of a sentence with the next one', () => {
    expect(joinWrappedLines('Biljke prave hranu uz pomoć svjetlosti. Slova: č\nć š đ ž.')).toBe(
      'Biljke prave hranu uz pomoć svjetlosti. Slova: č ć š đ ž.',
    );
  });

  it('works for Cyrillic too', () => {
    expect(
      joinWrappedLines('Фотосинтеза је процес у којем биљке праве\nхрану уз помоћ светлости.'),
    ).toBe('Фотосинтеза је процес у којем биљке праве храну уз помоћ светлости.');
  });

  it('does not join after a colon, so a list that follows is not turned into one sentence', () => {
    expect(joinWrappedLines('Biljkama su potrebne sljedeće stvari:\nvoda\nsvjetlost')).toBe(
      'Biljkama su potrebne sljedeće stvari:\nvoda\nsvjetlost',
    );
  });

  it('does not join short lines, which are headings or items of a list', () => {
    expect(joinWrappedLines('Biljkama trebaju još i\nvoda\nsvjetlost')).toBe(
      'Biljkama trebaju još i\nvoda\nsvjetlost',
    );
  });

  it('leaves a line that ends a sentence, and a new sentence, alone', () => {
    expect(joinWrappedLines('Prva rečenica.\nDruga rečenica.')).toBe(
      'Prva rečenica.\nDruga rečenica.',
    );
  });

  it('leaves headings and list items alone, since the next line starts with a capital', () => {
    expect(joinWrappedLines('Fotosinteza\nBiljke prave hranu.\nPrva tačka\nDruga tačka')).toBe(
      'Fotosinteza\nBiljke prave hranu.\nPrva tačka\nDruga tačka',
    );
  });

  it('does not join a line that ends with a hyphen, which may be a real one', () => {
    expect(joinWrappedLines('ugljen-\ndioksid')).toBe('ugljen-\ndioksid');
  });

  it('does not join across an empty line', () => {
    expect(joinWrappedLines('Prvi pasus bez tačke\n\nmale riječi')).toBe(
      'Prvi pasus bez tačke\n\nmale riječi',
    );
  });
});

describe('documentXmlToText', () => {
  const text = (body: string) => documentXmlToText(documentXml(body));

  it('reads paragraphs with Serbian letters, in Latin and in Cyrillic', () => {
    expect(
      text(
        wordParagraph('Biljke prave hranu: č ć š đ ž.') +
          wordParagraph('Фотосинтеза: ђ ј љ њ ћ џ.'),
      ),
    ).toBe('Biljke prave hranu: č ć š đ ž.\nФотосинтеза: ђ ј љ њ ћ џ.');
  });

  it('joins the runs of one paragraph', () => {
    expect(text('<w:p><w:r><w:t>Bilj</w:t></w:r><w:r><w:t>ke</w:t></w:r></w:p>')).toBe('Biljke');
  });

  it('reads tabs and line breaks', () => {
    expect(text('<w:p><w:r><w:t>a</w:t><w:tab/><w:t>b</w:t><w:br/><w:t>c</w:t></w:r></w:p>')).toBe(
      'a b\nc',
    );
  });

  it('turns list items into bullets', () => {
    const item = (label: string) =>
      `<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>${label}</w:t></w:r></w:p>`;

    expect(text(wordParagraph('Naslov') + item('Prva tačka') + item('Druga tačka'))).toBe(
      'Naslov\n• Prva tačka\n• Druga tačka',
    );
  });

  it('puts a table on lines, with the cells separated', () => {
    const cell = (label: string) => `<w:tc><w:p><w:r><w:t>${label}</w:t></w:r></w:p></w:tc>`;
    const row = (...labels: string[]) => `<w:tr>${labels.map(cell).join('')}</w:tr>`;

    expect(text(`<w:tbl>${row('Biljka', 'Hrana')}${row('List', 'Glukoza')}</w:tbl>`)).toBe(
      'Biljka | Hrana\nList | Glukoza',
    );
  });

  it('decodes the special characters of XML', () => {
    // Written as XML writes them: &amp; &lt; &gt; and the letters by their numbers.
    expect(
      text(
        '<w:p><w:r><w:t>A &amp; B &lt; C &gt; D &quot;e&quot; &apos;f&apos; &#269; &#x107;</w:t></w:r></w:p>',
      ),
    ).toBe('A & B < C > D "e" \'f\' č ć');
  });

  it('leaves out text that was deleted with tracked changes', () => {
    expect(
      text(
        '<w:p><w:r><w:t>Ostaje</w:t></w:r><w:del><w:r><w:delText>obrisano</w:delText></w:r></w:del></w:p>',
      ),
    ).toBe('Ostaje');
  });

  it('reads the text of a text box only once', () => {
    const box = (label: string) => `<w:p><w:r><w:t>${label}</w:t></w:r></w:p>`;

    expect(
      text(
        `<mc:AlternateContent><mc:Choice>${box('U okviru')}</mc:Choice><mc:Fallback>${box('U okviru')}</mc:Fallback></mc:AlternateContent>`,
      ),
    ).toBe('U okviru');
  });

  it('does not take the properties of a paragraph or a table for text', () => {
    expect(
      text(
        '<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>Naslov</w:t></w:r></w:p>',
      ),
    ).toBe('Naslov');
  });

  it('keeps a blank line for an empty paragraph', () => {
    expect(text(wordParagraph('Prvi') + '<w:p/>' + wordParagraph('Drugi'))).toBe('Prvi\n\nDrugi');
  });
});

describe('docxToText', () => {
  it('reads a Word file', () => {
    expect(docxToText(makeDocx(wordParagraph('Biljke prave hranu.')))).toBe('Biljke prave hranu.');
  });

  it('says it is not a Word file when the zip has no document', () => {
    expect(docxToText(makeOtherZip())).toBeNull();
  });

  it('refuses a file that unpacks into far too much data, whatever the sizes it claims', async () => {
    const bomb = Buffer.from(
      zipSync({ 'word/document.xml': strToU8('a'.repeat(MAX_DOCUMENT_XML_BYTES + 1_000_000)) }),
    );
    expect(bomb.length).toBeLessThan(200_000);

    const error = await rejection(() => docxToText(bomb));

    expect(error).toMatchObject({ status: 422, code: 'unreadable_file' });
  });

  it('refuses a damaged zip', async () => {
    const damaged = makeDocx(wordParagraph('Tekst')).subarray(0, 60);

    const error = await rejection(() => docxToText(damaged));

    expect(error).toMatchObject({ status: 422, code: 'unreadable_file' });
  });
});

describe('pdfToText', () => {
  const fixture = readFileSync(path.join(import.meta.dirname, '../fixtures/fotosinteza.pdf'));

  it('reads a real PDF with Serbian letters in Latin and in Cyrillic', async () => {
    const text = await pdfToText(fixture);

    expect(text).toContain('Fotosinteza');
    expect(text).toContain('č ć š đ ž Č Ć Š Đ Ž');
    expect(text).toContain('Фотосинтеза је процес у којем биљке праве храну');
    expect(text).toContain('ђ ј љ њ ћ џ');
  });

  it('joins the lines of a sentence that the page cut', async () => {
    const text = await pdfToText(fixture);

    // The page cut this sentence after "č"; it is one line again.
    expect(text).toContain('Slova: č ć š đ ž Č Ć Š Đ Ž.');
    // After a colon the break stays, on purpose (see joinWrappedLines).
    expect(text).toContain('Слова:\nђ ј љ њ ћ џ.');
  });

  it('keeps headings and list items on their own lines', async () => {
    const lines = (await pdfToText(fixture)).split('\n');

    expect(lines).toContain('Fotosinteza');
    expect(lines).toContain('Prva tačka liste.');
    expect(lines).toContain('Druga tačka liste.');
  });

  it('reads a simple PDF and puts a blank line between pages', async () => {
    const pdf = makePdf([
      ['Prva stranica ima dovoljno teksta da se prepozna.'],
      ['Druga stranica takodje ima dovoljno teksta za citanje.'],
    ]);

    expect(await pdfToText(pdf)).toBe(
      'Prva stranica ima dovoljno teksta da se prepozna.\n\nDruga stranica takodje ima dovoljno teksta za citanje.',
    );
  });

  it('says that a PDF made of empty pages (a scan) has no text', async () => {
    const error = await rejection(() => pdfToText(makePdf([null, null])));

    expect(error).toMatchObject({ status: 422, code: 'no_text_in_file' });
  });

  it('says that a PDF that is too damaged to read cannot be read', async () => {
    const error = await rejection(() =>
      pdfToText(Buffer.from('%PDF-1.4\nthis is not a pdf at all')),
    );

    expect(error).toMatchObject({ status: 422, code: 'unreadable_file' });
  });

  it('refuses a PDF with too many pages', async () => {
    const pages = Array.from({ length: 101 }, () => [
      'Jedna stranica sa dovoljno teksta za citanje.',
    ]);

    const error = await rejection(() => pdfToText(makePdf(pages)));

    expect(error).toMatchObject({ status: 422, code: 'text_too_long' });
  });
});

describe('detectFileKind', () => {
  it('knows a PDF by its content', () => {
    expect(detectFileKind(makePdf([['x']]))).toBe('pdf');
  });

  it('knows a zip (a Word file is one)', () => {
    expect(detectFileKind(makeDocx(wordParagraph('x')))).toBe('zip');
  });

  it('knows an old Word file', () => {
    expect(detectFileKind(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))).toBe(
      'old-office',
    );
  });

  it.each([
    ['a picture', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
    ['plain text', Buffer.from('Obican tekst')],
    ['an empty file', Buffer.alloc(0)],
  ])('does not know %s', (_name, data) => {
    expect(detectFileKind(data)).toBeNull();
  });
});

describe('extractLessonText', () => {
  it('reads a Word file and says where it came from', async () => {
    expect(await extractLessonText(makeDocx(wordParagraph('Biljke prave hranu.')))).toEqual({
      text: 'Biljke prave hranu.',
      source: 'docx',
    });
  });

  it('reads a PDF and says where it came from', async () => {
    const result = await extractLessonText(
      makePdf([['Jedna stranica sa dovoljno teksta za citanje.']]),
    );

    expect(result.source).toBe('pdf');
    expect(result.text).toBe('Jedna stranica sa dovoljno teksta za citanje.');
  });

  it.each([
    ['a picture', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
    ['plain text', Buffer.from('Obican tekst')],
    ['a zip that is not Word', makeOtherZip()],
  ])('refuses %s as an unsupported file', async (_name, data) => {
    const error = await rejection(() => extractLessonText(data));

    expect(error).toMatchObject({ status: 415, code: 'unsupported_file' });
  });

  it('tells how to deal with an old .doc file', async () => {
    const error = await rejection(() =>
      extractLessonText(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])),
    );

    expect(error).toMatchObject({ status: 415, code: 'unsupported_file' });
    expect(error.message).toMatch(/\.docx/);
  });

  it('refuses a Word file without any text', async () => {
    const error = await rejection(() => extractLessonText(makeDocx(wordParagraph('   '))));

    expect(error).toMatchObject({ status: 422, code: 'no_text_in_file' });
  });

  it('refuses a text that is too long for a lesson, and accepts one at the limit', async () => {
    const atLimit = makeDocx(wordParagraph('a'.repeat(MAX_BODY_LENGTH)));
    const overLimit = makeDocx(wordParagraph('a'.repeat(MAX_BODY_LENGTH + 1)));

    expect((await extractLessonText(atLimit)).text).toHaveLength(MAX_BODY_LENGTH);
    expect(await rejection(() => extractLessonText(overLimit))).toMatchObject({
      status: 422,
      code: 'text_too_long',
    });
  });
});
