// Small Word and PDF files built in code for tests, so no real documents are needed.
import { strToU8, zipSync } from 'fflate';

const WORD_NAMESPACES =
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
  'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"';

export function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export const wordParagraph = (text: string) =>
  `<w:p><w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;

export const documentXml = (bodyXml: string) =>
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<w:document ${WORD_NAMESPACES}><w:body>${bodyXml}</w:body></w:document>`;

// A Word file with the given content inside <w:body>.
export function makeDocx(bodyXml: string): Buffer {
  return Buffer.from(
    zipSync({
      '[Content_Types].xml': strToU8('<Types/>'),
      'word/document.xml': strToU8(documentXml(bodyXml)),
    }),
  );
}

// A zip that is not a Word file (it has no word/document.xml).
export function makeOtherZip(): Buffer {
  return Buffer.from(zipSync({ 'xl/workbook.xml': strToU8('<workbook/>') }));
}

// A PDF with one page per entry. Each entry is the lines of text on that page, or null for a
// page with nothing on it (like a scan). Text is plain ASCII, in the standard Helvetica font.
export function makePdf(pages: (string[] | null)[]): Buffer {
  const objects: string[] = [];
  const add = (body: string) => objects.push(body) && objects.length;

  const catalog = add('<< /Type /Catalog /Pages 2 0 R >>');
  const pagesObject = add('PLACEHOLDER');
  const font = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const pageNumbers: number[] = [];

  for (const lines of pages) {
    let contents = '';
    if (lines) {
      const stream =
        'BT /F1 12 Tf 14 TL 40 700 Td ' +
        lines.map((line) => `(${line.replace(/[()\\]/g, '\\$&')}) Tj T*`).join(' ') +
        ' ET';
      contents = ` /Contents ${add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`)} 0 R`;
    }
    pageNumbers.push(
      add(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${font} 0 R >> >>${contents} >>`,
      ),
    );
  }
  objects[pagesObject - 1] = `<< /Type /Pages /Kids [${pageNumbers
    .map((number) => `${number} 0 R`)
    .join(' ')}] /Count ${pageNumbers.length} >>`;

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}
