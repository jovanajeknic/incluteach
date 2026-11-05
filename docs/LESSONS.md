# Lessons, summaries and quizzes

What a lesson is, how it is made, what the AI does and what students, parents and teachers see. Agreed with the project owner on 2026-11-04. Nothing in this document is built yet; the backend for it is planned in the order at the end. Working rules are in [AGENTS.md](../AGENTS.md); the data model of schools, users and enrollments is in [DATABASE.md](DATABASE.md).

## The idea in one paragraph

A teacher uploads a Word or PDF document, or pastes text. The server turns it into text, and the teacher corrects it. The text stays exactly as the teacher wrote it; the student shapes how it looks with buttons (size, spacing, contrast, font, script). On top of the text the AI makes two things: a **summary** in short, student-friendly sentences, and a **quiz**. The teacher reviews and edits both, and only then publishes. Students who joined the subject read the text and the summary and take the quiz; parents and the teacher can see the quiz and the answers.

## Decided

1. **Two layers, never mixed.** *Content* is the text, the summary and the quiz; the AI may write the last two, and only after the teacher approves them. *Display* (text size, line spacing, contrast, font, reduced motion, script) is chosen by the student at any time, needs no approval and never changes the content.
2. **The text is not rewritten.** The AI never replaces the teacher's text. The "easier version of the whole text" and the "version profile per student" of the earlier plan are dropped for now.
3. **Sources**: Word (`.docx`), PDF **with selectable text**, and pasted text (for example copied from Wikipedia). Scanned PDFs (pictures of pages, which need OCR) are not supported; the teacher gets a clear message and can paste the text or send a Word file.
4. **The teacher corrects the extracted text first**, before the AI works on it, because converting a document is never perfect.
5. **Summary**: bullet points. The number depends on the text, not fixed, but never too many or too few (guidance for the AI: roughly 3 to 10). Short, simple sentences. The teacher can edit, delete or add points.
6. **Quiz**: question types are *choose one answer from 3 or 4* and *true or false*. The number depends on the length of the text (guidance: roughly 5 to 10). Practice only, **no score**, with feedback after every answer, as decided earlier. The student may take it again. The teacher can edit, delete or add questions before approving.
7. **Who sees the quiz**: the teacher and the parents see **all questions and all of the child's answers**. The screen should tell the child that their parent and teacher can see their answers.
8. **Nothing reaches students without the teacher's approval**: the text, the summary and the quiz are each approved by the teacher before publishing. (AGENTS.md, section 6.)
9. **Read aloud** is in the first version, using the voice of the browser (free, no server needed). A better voice from a server can come later.
10. **Script switch**: every student, parent or teacher can show text, summary and quiz in Latin or in Cyrillic with one button. The conversion is exact (each letter has exactly one pair) and is done by the frontend; the server stores what the teacher wrote.
11. **The AI is a replaceable part.** The server talks to the AI only through one small interface, so any model or provider can be plugged in with one change. Until a provider is chosen (it depends on price, quality in Serbian and the terms about data), a **fake AI** returns invented but realistic results, so everything can be built and tested for free and nothing leaves the computer. The key of a real service lives only on the server, and the AI only ever receives the lesson text, never any data about students.

## Not in the first version

Illustrations, a glossary of difficult words (AI explanations), the easier version of the whole text, a version profile per student, a server-side voice, scanned documents (OCR).

## Wanted next, after the core (agreed to add, details still to settle)

These come from the owner on 2026-11-04. They build on lessons and quizzes, so they are planned right after them as one separate step.

- **Comments from a parent** on a lesson or on a quiz, for the teacher.
- **Stars for effort**: the teacher can give a student a star for effort.
- **Progress of a student per subject**: how many lessons were finished and how many quizzes were done, for the student, the parent and the teacher.

Decided on 2026-11-04:

1. **Stars**: both kinds exist. The teacher can give a star for effort, and there are also automatic stars (the demo gave one for finishing a lesson and one for finishing its quiz). The two kinds must be clearly different on screen.
2. **Parent comments**: only the teacher and the parent see them (not the child, not other parents). They can be answered: the teacher can reply, and the parent can reply to the reply, so a comment is a small conversation.
3. **A lesson counts as finished when the child does the quiz and answers all questions correctly.** This replaces the idea of the child just marking it as done.
4. **No class-teacher rules.** That was a misunderstanding; the class teacher (razredni starešina) is not part of this. Progress is seen by the student (own), by the parent (own children, in the subjects they joined) and by the subject's teacher (in their own subject). The school admin does not see it.
5. **The teacher can edit what the AI made**, by hand in the browser: delete a summary point or a question, change the wording, add new ones, and fix an answer, before approving. This is part of the core flow, not an extra.

Still to settle when we get there:

- *Lessons without a quiz* (the quiz is optional): how are they finished? Recommendation: the child marks them as done.
- *"All questions correct"*: in a single attempt, or each question correct at least once over several attempts? Recommendation: in a single attempt, since the child gets feedback after every answer and may try again.
- Does a comment belong to the whole lesson, to the quiz, or to one question? Recommendation: to a lesson or to the quiz as a whole, with the option to name a question.
- The demo of the frontend already shows stars, progress and a suggestion inbox; the real versions should replace those.

## Proposed defaults (please confirm or change)

- **A lesson belongs to a subject** (a name in one odeljenje taught by one teacher). Only that subject's teacher can create and change its lessons. Students whose enrollment in the subject was approved see its published lessons; a parent sees the lessons of the subjects their children joined. The school admin does not see lessons.
- **Summary and quiz are optional per lesson.** A teacher may publish only the text, or the text and the summary. Whatever the AI made must still be approved.
- **The original file is not kept**, only the extracted text (less data to protect; the teacher has the original).
- **Limits**: a file up to 10 MB and extracted text up to about 40,000 characters (roughly 15 pages), which also keeps the AI cost under control.
- **If the teacher changes the text after the AI worked**, the summary and the quiz are marked outdated and must be made or approved again (as in the earlier plan).
- **Status of a lesson**: draft, processing, in review, published; a teacher can take a published lesson back to draft.
- **Progress of the AI** is shown by asking the server every few seconds (polling), the simplest option.

## Build order (each step small, with tests, and the contract and frontend plan updated)

1. Database for lessons, summaries and quiz questions (done). The child's quiz answers come with the quiz for students.
2. Lessons from **pasted text** (done): create, list, edit and delete for the teacher; publish and take back; students and parents read. No file and no AI yet.
3. **File upload** (done): Word and PDF to text, the message for scanned PDFs, the limits. The file is sent as the plain body of a request, the kind is found out from its content, and the text is read on the server (Word with `fflate`, which also protects against files that unpack into enormous data; PDF with `unpdf`, the PDF reader of Firefox). Limits: 10 MB, 40,000 characters, 100 pages. **Tuned on a real 23-page document** (a seminar paper in Cyrillic with 46 pictures): page numbers and the dots of a table of contents are removed, the bullets of a list are kept as `•`, a text set in a narrow column beside a picture and a word cut at a hyphen are joined, and the teacher is told how many pictures were left out (`warnings` of `POST /lessons/{id}/source`). Pictures are not read, and neither does the AI see them; tables drawn as pictures are lost. What is still left for the teacher to fix: a line that ends in `)` is not joined to the next one, and a title cut in several lines may be only partly joined.
4. The **AI interface with the fake AI**: make the summary and the quiz, show progress (done), the teacher edits and approves by hand (done). The server talks to the AI only through `AiProvider` (`server/src/ai/types.ts`), everything an AI returns is checked before it is stored, and `AI_PROVIDER` in `.env` chooses the service (`fake`, and now `groq`). A new provider is one object with two functions and one name in a list.
5. **Quiz for students**: answer, feedback, attempts; a lesson is finished when all answers are correct; what parents and teachers see.
   - 5a (done): a try is one go through the whole quiz, in a random order of questions and answers. The child is told after each answer if it was right and why, and each question is answered once. There is no score. A new try is possible 10 minutes after the last answer of the previous one, so the child reads and learns the mistakes instead of clicking through the same questions.
   - 5b (done): the "Završi lekciju" button (`POST /lessons/{id}/complete`). A lesson without a quiz can be finished at any time; a lesson with a quiz only after a try with every answer right, for the quiz as it is now (a try made for an older version of the quiz does not count). The finished lesson stays finished. The student's lesson view has `myProgress`, and the history of tries (`GET /lessons/{id}/quiz/attempts`) is seen by the student, the parent of the child, and the teacher of the subject.
6. **Effort, comments and progress** (see "Wanted next"), in three parts:
   - 6a (done): **stars**. Automatic ones are earned by finishing a lesson (one per lesson). A teacher gives a star to a student of their subject with a message of up to 200 characters and may take it back. Students, their parents and the teacher see them; the two kinds are returned with `source` so the screen can show them differently.
   - 6b (done): **conversation** between the parents of a child and the teacher of a subject. One conversation for each child and subject, seen and written in by the teacher and every parent linked to the child (both parents can join); the child does not see it. Messages are up to 1000 characters and cannot be edited or deleted yet; there is no "read" mark yet.
   - 6c (done): **progress per subject**: finished lessons out of published ones and the stars, for the student and their parents; for the teacher a table of all students of the subject, ranked by finished lessons, then by stars (equal students share a rank). The ranking is for the teacher only. Only published lessons count, and nothing is computed from the quiz itself: a lesson counts when the student pressed "Završi lekciju".
7. **A real AI provider** (done with Groq, free level): `AI_PROVIDER=groq`, key in `GROQ_API_KEY`, model `openai/gpt-oss-120b` unless `AI_MODEL` says otherwise. It is a plain HTTP call (no new package). The summary and the quiz are asked **one after the other**, never together. The service answers in the form asked for (a JSON schema), and the server checks it again like for the fake AI.
   - **Tested on 2026-11-05** on a Latin and a Cyrillic lesson with three free models. `openai/gpt-oss-120b` was the best: valid answers every time, 1 to 2.5 seconds each. The Latin results are good. The Cyrillic results need a careful read: the model drifts from ijekavian to ekavian (`реке`, `ветар`), sometimes makes up a word or a silly wrong answer, and once added a fact that is not in the lesson. `openai/gpt-oss-20b` made nonsense answers ("Плескање"), and `qwen/qwen3.8-27b` gave one quiz with two right answers and has a very low output limit. **Cyrillic goes through Latin.** Because of this, a lesson in Cyrillic is turned into Latin script before the AI sees it, and what the AI writes is turned back into Cyrillic (`server/src/ai/script.ts`, the standard Serbian table, letter for letter: `љ` is `lj`, `њ` is `nj`, `џ` is `dž`). On the same Cyrillic lesson this removed the ekavian drift, the made-up words and the Latin look-alike letters, and the quiz questions became sensible. The lesson text itself is never changed, only the new text the AI wrote. Words that were Latin in the lesson (English terms, names such as `Spotify`) stay Latin on the way back, and the answers `Tačno` and `Netačno` of a true/false question stay in Latin script; the screen shows them in the script the child chose. A word with a letter that Serbian does not use (`q w x y`) is never converted. The few words where `dž` is two letters (`nadžupan`, `nadživjeti`, `podžupan`) are kept in a short list. A lesson in Latin goes through untouched. Remaining limit: a foreign word that the AI itself introduces and that was not in the lesson would come back in Cyrillic spelling.
   - **Limits of the free level**: 8,000 tokens a minute and 1,000 requests a day for every model. A Latin text is about 0.32 tokens per character, Cyrillic about twice that. In practice a lesson of up to about 10,000 characters of Latin or 6,000 of Cyrillic works; a longer one is refused with a message to send a shorter part (the limit of the server is 40,000 characters, and a paid level would allow it). When the minute limit is hit the server waits as long as the service asks (at most a minute, twice) and tries again.
   - A teacher still reads and corrects everything before it is published; this is the main safety for the weaker Cyrillic results.
