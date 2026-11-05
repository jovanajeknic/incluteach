import { readFileSync } from 'node:fs';
import path from 'node:path';

import type pg from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createPool } from '../db/pool.ts';
import { insertActivatedUser, insertClass, insertLesson, insertSubject } from '../db/testUtils.ts';
import { MAX_BODY_LENGTH, MAX_FILE_BYTES } from '../lessons/limits.ts';
import { makeDocx, makeOtherZip, makePdf, wordParagraph } from '../lessons/extract/testFiles.ts';
import { inApi as runWithApi, PASSWORD, type Api, type Requests } from './testApi.ts';

const UNKNOWN = '00000000-0000-0000-0000-000000000000';
const REAL_PDF = readFileSync(
  path.join(import.meta.dirname, '../lessons/fixtures/fotosinteza.pdf'),
);
const OLD_WORD_FILE = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// These tests talk to the real local database, so they run only when DATABASE_URL is set.
describe.skipIf(!process.env.DATABASE_URL)('lesson files', () => {
  // Created in beforeAll because describe bodies run even when the suite is skipped.
  let pool: pg.Pool;

  beforeAll(() => {
    pool = createPool();
  });

  afterAll(() => pool.end());

  const inApi = (run: (api: Api) => Promise<void>) => runWithApi(pool, run);

  interface World {
    subjectId: string;
    teacher: Requests;
    otherTeacher: Requests;
    student: Requests;
    parent: Requests;
  }

  // Jovan teaches the subject; Mira is another teacher.
  async function setup(api: Api): Promise<World> {
    const { client, f } = api;
    await insertActivatedUser(client, f.schoolId, 'teacher', {
      username: 'mira_miric',
      email: 'mira@example.com',
      password: PASSWORD,
    });
    const classId = await insertClass(client, f.schoolId, '5-2', 2026);
    const subjectId = await insertSubject(client, f.schoolId, classId, f.teacherId, 'Biologija');
    return {
      subjectId,
      teacher: await api.as('jovan_jovanovic'),
      otherTeacher: await api.as('mira_miric'),
      student: await api.as('ana_ivic'),
      parent: await api.as('petar_ivic'),
    };
  }

  const draft = (api: Api, w: World, fields: object = {}) =>
    insertLesson(api.client, {
      schoolId: api.f.schoolId,
      subjectId: w.subjectId,
      createdBy: api.f.teacherId,
      ...fields,
    });

  const stored = async (api: Api, id: string) =>
    (
      await api.client.query<{
        body: string;
        source: string;
        source_file_name: string | null;
        body_revision: number;
      }>('SELECT body, source, source_file_name, body_revision FROM lessons WHERE id = $1', [id])
    ).rows[0];

  describe('POST /lessons/:id/source', () => {
    it('fills the lesson with the text of a Word file', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await draft(api, w, { body: '' });
        const file = makeDocx(
          wordParagraph('Biljke prave hranu: č ć š đ ž.') + wordParagraph('Drugi red.'),
        );

        const response = await w.teacher.postFile(`/lessons/${id}/source`, file, {
          name: 'Fotosinteza.docx',
        });

        expect(response.status).toBe(200);
        expect(response.body.lesson).toMatchObject({
          id,
          body: 'Biljke prave hranu: č ć š đ ž.\nDrugi red.',
          source: 'docx',
          sourceFileName: 'Fotosinteza.docx',
          bodyRevision: 2,
          status: 'draft',
        });
        expect(response.body.warnings).toEqual([]);
      });
    });

    it('fills the lesson with the text of a real PDF, letters of both scripts included', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await draft(api, w, { body: '' });

        const response = await w.teacher.postFile(`/lessons/${id}/source`, REAL_PDF, {
          name: 'fotosinteza.pdf',
          type: 'application/pdf',
        });

        expect(response.status).toBe(200);
        expect(response.body.lesson.source).toBe('pdf');
        expect(response.body.lesson.body).toContain('č ć š đ ž Č Ć Š Đ Ž');
        expect(response.body.lesson.body).toContain('Фотосинтеза је процес у којем');
        expect(response.body.warnings).toEqual([]);
      });
    });

    it('warns that the pictures of a PDF are not in the text', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await draft(api, w, { body: '' });
        const file = makePdf(
          [['Prva stranica ima dovoljno teksta.'], ['Druga stranica ima teksta.']],
          {
            imagesPerPage: 2,
          },
        );

        const response = await w.teacher.postFile(`/lessons/${id}/source`, file, {
          type: 'application/pdf',
        });

        expect(response.status).toBe(200);
        expect(response.body.warnings).toEqual([{ code: 'images_not_included', count: 4 }]);
        expect(response.body.lesson.body).toBe(
          'Prva stranica ima dovoljno teksta.\n\nDruga stranica ima teksta.',
        );
      });
    });

    it('replaces the text the lesson had, and counts a real change as a new revision', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await draft(api, w, { body: 'Stari tekst.' });
        const file = makeDocx(wordParagraph('Novi tekst.'));

        const first = await w.teacher.postFile(`/lessons/${id}/source`, file);
        const again = await w.teacher.postFile(`/lessons/${id}/source`, file);

        expect(first.body.lesson).toMatchObject({ body: 'Novi tekst.', bodyRevision: 2 });
        expect(again.body.lesson).toMatchObject({ body: 'Novi tekst.', bodyRevision: 2 });
      });
    });

    it('works for a lesson in review', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await draft(api, w, { status: 'in_review' });

        const response = await w.teacher.postFile(
          `/lessons/${id}/source`,
          makeDocx(wordParagraph('Tekst.')),
        );

        expect(response.status).toBe(200);
      });
    });

    it('finds out the kind of file from its content, whatever the browser says it is', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await draft(api, w);

        for (const type of [
          'application/octet-stream',
          'image/png',
          'text/plain',
          'application/pdf',
        ]) {
          const response = await w.teacher.postFile(
            `/lessons/${id}/source`,
            makeDocx(wordParagraph(`Tekst za ${type}.`)),
            { type },
          );

          expect(response.status).toBe(200);
          expect(response.body.lesson.source).toBe('docx');
        }
      });
    });

    it.each([
      [
        'a name that was written with encodeURIComponent',
        encodeURIComponent('Lekcija čćšđž.docx'),
        'Lekcija čćšđž.docx',
      ],
      ['a name with a folder', 'C%3A%5CUsers%5Cana%5Cfotosinteza.docx', 'fotosinteza.docx'],
      [
        'a name with a folder in the other direction',
        encodeURIComponent('/home/ana/fotosinteza.docx'),
        'fotosinteza.docx',
      ],
      [
        'a name with spaces around it',
        encodeURIComponent('  fotosinteza.docx  '),
        'fotosinteza.docx',
      ],
    ])('keeps %s', async (_name, header, expected) => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await draft(api, w);

        await w.teacher.postFile(`/lessons/${id}/source`, makeDocx(wordParagraph('Tekst.')), {
          name: header,
        });

        expect((await stored(api, id)).source_file_name).toBe(expected);
      });
    });

    it('cuts a very long name, and keeps none when no name is sent', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await draft(api, w);
        const file = makeDocx(wordParagraph('Tekst.'));

        await w.teacher.postFile(`/lessons/${id}/source`, file, { name: 'x'.repeat(400) });
        expect((await stored(api, id)).source_file_name).toHaveLength(255);

        await w.teacher.postFile(`/lessons/${id}/source`, file);
        expect((await stored(api, id)).source_file_name).toBeNull();
      });
    });

    it('answers 400 when there is no file', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await draft(api, w);

        const response = await w.teacher.postFile(`/lessons/${id}/source`, Buffer.alloc(0));

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('invalid_request');
      });
    });

    it.each([
      ['a picture', PNG],
      ['plain text', Buffer.from('Obican tekst')],
      ['a zip that is not a Word file', makeOtherZip()],
      ['an old Word file (.doc)', OLD_WORD_FILE],
    ])('answers 415 for %s, and leaves the lesson alone', async (_name, file) => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await draft(api, w, { body: 'Ostaje.' });

        const response = await w.teacher.postFile(`/lessons/${id}/source`, file);

        expect(response.status).toBe(415);
        expect(response.body.error.code).toBe('unsupported_file');
        expect((await stored(api, id)).body).toBe('Ostaje.');
      });
    });

    it('answers 422 for a PDF that is a scan with no text', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await draft(api, w, { body: 'Ostaje.' });

        const response = await w.teacher.postFile(`/lessons/${id}/source`, makePdf([null, null]));

        expect(response.status).toBe(422);
        expect(response.body.error.code).toBe('no_text_in_file');
        expect((await stored(api, id)).body).toBe('Ostaje.');
      });
    });

    it('answers 422 for a damaged file', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await draft(api, w);

        const damagedWord = await w.teacher.postFile(
          `/lessons/${id}/source`,
          makeDocx(wordParagraph('Tekst.')).subarray(0, 60),
        );
        const damagedPdf = await w.teacher.postFile(
          `/lessons/${id}/source`,
          Buffer.from('%PDF-1.4\nnot really a pdf'),
        );

        expect(damagedWord.body.error.code).toBe('unreadable_file');
        expect(damagedPdf.body.error.code).toBe('unreadable_file');
      });
    });

    it('answers 422 for a text longer than a lesson may be', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await draft(api, w, { body: 'Ostaje.' });

        const response = await w.teacher.postFile(
          `/lessons/${id}/source`,
          makeDocx(wordParagraph('a'.repeat(MAX_BODY_LENGTH + 1))),
        );

        expect(response.status).toBe(422);
        expect(response.body.error.code).toBe('text_too_long');
        expect((await stored(api, id)).body).toBe('Ostaje.');
      });
    });

    it('answers 413 for a file bigger than 10 MB', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await draft(api, w);

        const response = await w.teacher.postFile(
          `/lessons/${id}/source`,
          Buffer.alloc(MAX_FILE_BYTES + 1, 0x61),
        );

        expect(response.status).toBe(413);
        expect(response.body.error.code).toBe('file_too_large');
      });
    });

    it('answers 409 for a lesson that is published or being processed', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const live = await draft(api, w, {
          status: 'published',
          publishedAt: new Date().toISOString(),
        });
        const busy = await draft(api, w, { status: 'processing' });
        const file = makeDocx(wordParagraph('Tekst.'));

        const published = await w.teacher.postFile(`/lessons/${live}/source`, file);
        const processing = await w.teacher.postFile(`/lessons/${busy}/source`, file);

        expect(published.body.error.code).toBe('lesson_published');
        expect(processing.body.error.code).toBe('lesson_busy');
      });
    });

    it("answers 404 for another teacher's lesson, an unknown lesson and a bad id", async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await draft(api, w, { body: 'Ostaje.' });
        const file = makeDocx(wordParagraph('Tuđi tekst.'));

        for (const lessonId of [id, UNKNOWN, 'nope']) {
          expect((await w.otherTeacher.postFile(`/lessons/${lessonId}/source`, file)).status).toBe(
            404,
          );
        }
        expect((await stored(api, id)).body).toBe('Ostaje.');
      });
    });

    it('answers 401 when nobody is signed in and 403 for students, parents and admins', async () => {
      await inApi(async (api) => {
        const w = await setup(api);
        const id = await draft(api, w);
        const file = makeDocx(wordParagraph('Tekst.'));

        expect((await request(api.app).post(`/lessons/${id}/source`).send(file)).status).toBe(401);
        expect((await w.student.postFile(`/lessons/${id}/source`, file)).status).toBe(403);
        expect((await w.parent.postFile(`/lessons/${id}/source`, file)).status).toBe(403);
        expect((await api.postFile(`/lessons/${id}/source`, file)).status).toBe(403);
      });
    });
  });
});
