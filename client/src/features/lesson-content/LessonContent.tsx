interface LessonContentProps {
  content: string;
}

/**
 * The single renderer for lesson text. Teacher review uses it now; the student
 * reading view will reuse it, so both always show content the same way.
 */
export function LessonContent({ content }: LessonContentProps) {
  const paragraphs = content
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <div className="max-w-prose space-y-4 text-lg leading-relaxed">
      {paragraphs.map((paragraph, index) => (
        // Paragraphs have no stable id and the list is static for a given content string.
        <p key={index} className="whitespace-pre-line">
          {paragraph}
        </p>
      ))}
    </div>
  );
}
