import { Unzip, UnzipInflate, type UnzipFile } from 'fflate';

import { HttpError } from '../../http/errors.ts';
import { normalizeText } from './text.ts';

// The text of a Word document lives in one XML file inside it. A normal lesson needs a few
// hundred kilobytes at most; this stops a file that unpacks into something enormous (a "zip
// bomb") without trusting the sizes written in the file, which can be forged.
export const MAX_DOCUMENT_XML_BYTES = 20 * 1024 * 1024;

const unreadable = (message: string) => new HttpError(422, 'unreadable_file', message);

// Unpacks only word/document.xml, counting the bytes as they come out and stopping when
// there are too many. Returns null when the file has no such part (it is a zip, but not Word).
function readDocumentXml(data: Uint8Array): string | null {
  // Every complete zip file ends with a record that has this signature. A file cut short, for
  // example by an interrupted download, does not, and is reported as damaged.
  const tail = Buffer.from(data.subarray(Math.max(0, data.length - 66_000)));
  if (!tail.includes(Buffer.from([0x50, 0x4b, 0x05, 0x06]))) {
    throw unreadable('The Word file is incomplete or damaged.');
  }

  const chunks: Uint8Array[] = [];
  let total = 0;
  let tooBig = false;
  let found = false;
  let failure: Error | null = null;

  const unzip = new Unzip();
  unzip.register(UnzipInflate);
  unzip.onfile = (file: UnzipFile) => {
    if (file.name !== 'word/document.xml') {
      return;
    }
    found = true;
    file.ondata = (error, chunk) => {
      if (error) {
        failure = error;
        return;
      }
      total += chunk.length;
      if (total > MAX_DOCUMENT_XML_BYTES) {
        tooBig = true;
        file.terminate();
        return;
      }
      chunks.push(chunk);
    };
    file.start();
  };

  try {
    unzip.push(data, true);
  } catch {
    throw unreadable('The Word file could not be opened. It may be damaged.');
  }

  if (failure) {
    throw unreadable('The Word file could not be opened. It may be damaged.');
  }
  if (tooBig) {
    throw unreadable('The Word file is too large to read.');
  }
  if (!found) {
    return null;
  }
  return new TextDecoder('utf-8').decode(Buffer.concat(chunks));
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, name: string) => {
    if (name.startsWith('#')) {
      const code =
        name[1].toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : '';
    }
    return ENTITIES[name] ?? whole;
  });
}

// Every piece of the document that matters for the text, in order: the start and end of a
// paragraph, a piece of text, a tab, a line break, the start and end of a table cell, the end
// of a table row, and the mark of a list item. Everything else in the XML is ignored.
const TOKEN =
  /<w:p(?=[\s>/])[^>]*?(\/?)>|<\/w:p>|<w:t(?=[\s>/])[^>]*?(?:\/>|>([\s\S]*?)<\/w:t>)|<w:tab\s*\/>|<w:br\b[^>]*\/>|<w:cr\s*\/>|<w:tc(?=[\s>/])[^>]*>|<\/w:tc>|<\/w:tr>|<w:numPr>/g;

const NEW_LINE = '\n';

// Turns the XML of a Word document into plain text. List items get a bullet, table cells are
// separated by " | ", and text that was deleted with tracked changes is left out.
export function documentXmlToText(xml: string): string {
  // Word writes the content of a text box twice, once for new programs and once as a copy for
  // old ones. Only the first is kept.
  const source = xml.replace(/<mc:Fallback>[\s\S]*?<\/mc:Fallback>/g, '');

  let output = '';
  let paragraphStart = 0;
  let isListItem = false;
  let cellDepth = 0;
  // Inside a table cell paragraphs run on, so a cell stays on one line.
  const paragraphEnd = () => (cellDepth > 0 ? ' ' : NEW_LINE);

  for (const match of source.matchAll(TOKEN)) {
    const token = match[0];

    if (/^<w:p[\s>/]/.test(token)) {
      paragraphStart = output.length;
      isListItem = false;
      // An empty paragraph written as <w:p/> is a blank line.
      if (match[1] === '/') {
        output += paragraphEnd();
      }
    } else if (token === '</w:p>') {
      const hasText = output.slice(paragraphStart).trim() !== '';
      if (isListItem && hasText) {
        output = `${output.slice(0, paragraphStart)}• ${output.slice(paragraphStart)}`;
      }
      output += paragraphEnd();
    } else if (/^<w:t[\s>/]/.test(token)) {
      if (match[2] !== undefined) {
        output += decodeEntities(match[2]);
      }
    } else if (/^<w:tab\b/.test(token)) {
      output += ' ';
    } else if (/^<w:(br|cr)\b/.test(token)) {
      output += NEW_LINE;
    } else if (/^<w:tc[\s>/]/.test(token)) {
      cellDepth += 1;
    } else if (token === '</w:tc>') {
      cellDepth = Math.max(0, cellDepth - 1);
      output += ' | ';
    } else if (token === '</w:tr>') {
      output = `${output.replace(/ \| *$/, '').trimEnd()}${NEW_LINE}`;
    } else if (token === '<w:numPr>') {
      isListItem = true;
    }
  }

  return normalizeText(output);
}

// The text of a Word (.docx) file, or null when the zip is not a Word document.
export function docxToText(data: Uint8Array): string | null {
  const xml = readDocumentXml(data);
  return xml === null ? null : documentXmlToText(xml);
}
