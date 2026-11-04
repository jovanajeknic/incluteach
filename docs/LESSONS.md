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

Illustrations, a glossary of difficult words (AI explanations), the easier version of the whole text, a version profile per student, a server-side voice, scanned documents (OCR). Not discussed yet, so not planned for the backend: parents' suggestions to the teacher, the stars for effort and the class-teacher rules that appear in the demo of the frontend.

## Proposed defaults (please confirm or change)

- **A lesson belongs to a subject** (a name in one odeljenje taught by one teacher). Only that subject's teacher can create and change its lessons. Students whose enrollment in the subject was approved see its published lessons; a parent sees the lessons of the subjects their children joined. The school admin does not see lessons.
- **Summary and quiz are optional per lesson.** A teacher may publish only the text, or the text and the summary. Whatever the AI made must still be approved.
- **The original file is not kept**, only the extracted text (less data to protect; the teacher has the original).
- **Limits**: a file up to 10 MB and extracted text up to about 40,000 characters (roughly 15 pages), which also keeps the AI cost under control.
- **If the teacher changes the text after the AI worked**, the summary and the quiz are marked outdated and must be made or approved again (as in the earlier plan).
- **Status of a lesson**: draft, processing, in review, published; a teacher can take a published lesson back to draft.
- **Progress of the AI** is shown by asking the server every few seconds (polling), the simplest option.

## Build order (each step small, with tests, and the contract and frontend plan updated)

1. Database for lessons, summaries, quiz questions and the child's quiz answers.
2. Lessons from **pasted text**: create, list, edit and delete for the teacher; publish; students read. No file and no AI yet.
3. **File upload**: Word and PDF to text, the message for scanned PDFs, the limits.
4. The **AI interface with the fake AI**: make the summary and the quiz, show progress, the teacher edits and approves.
5. **Quiz for students**: answer, feedback, attempts; what parents and teachers see.
6. A real AI provider, when one is chosen.
