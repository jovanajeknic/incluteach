import { useEffect, useId, useState } from 'react';

interface GlossaryTermProps {
  word: string;
  definition: string;
}

/**
 * A harder word the student can tap to see a short explanation. The explanation opens right
 * under the word and is linked to the button, so screen readers read it too.
 */
export function GlossaryTerm({ word, definition }: GlossaryTermProps) {
  const [open, setOpen] = useState(false);
  const definitionId = useId();

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [open]);

  return (
    <span className="relative inline-block">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={definitionId}
        onClick={() => setOpen((current) => !current)}
        className="rounded-md underline decoration-sky-ink decoration-dotted decoration-2 underline-offset-4 hover:bg-sky"
      >
        {word}
      </button>
      {open && (
        <span
          id={definitionId}
          role="note"
          className="absolute top-full left-0 z-20 mt-2 block w-64 max-w-[80vw] rounded-2xl bg-sky p-3 text-base leading-snug font-normal tracking-normal text-ink shadow-lifted"
        >
          {definition}
        </span>
      )}
    </span>
  );
}
