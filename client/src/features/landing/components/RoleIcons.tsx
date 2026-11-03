// Flat, decorative role icons in the landing palette (sage and ochre).

const iconProps = {
  viewBox: '0 0 64 48',
  'aria-hidden': true,
  focusable: false,
  className: 'h-12 w-16 shrink-0',
} as const;

export function TeacherIcon() {
  return (
    <svg {...iconProps}>
      <path d="M14 22v11c0 4.5 8 8 18 8s18-3.5 18-8V22L32 29Z" fill="#6f8a60" />
      <path d="M32 5 62 17 32 29 2 17Z" fill="var(--brand-sage)" />
      <path d="M56 19v15" stroke="var(--brand-ochre)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="56" cy="37" r="3.5" fill="#f2a93b" />
    </svg>
  );
}

export function StudentIcon() {
  return (
    <svg {...iconProps}>
      <path d="M32 12C24 6 12 6 4 9v30c8-3 20-3 28 3Z" fill="var(--brand-ochre)" />
      <path d="M32 12c8-6 20-6 28-3v30c-8-3-20-3-28 3Z" fill="#f4b04a" />
      <path
        d="M10 17c5-1.5 11-1.5 16 1M10 24c5-1.5 11-1.5 16 1M38 18c5-2.5 11-2.5 16-1M38 25c5-2.5 11-2.5 16-1"
        stroke="#e39a2f"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function ParentIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="16" cy="11" r="6" fill="#f0be6c" />
      <rect x="8" y="19" width="16" height="25" rx="8" fill="#f0be6c" />
      <circle cx="48" cy="11" r="6" fill="var(--brand-sage)" />
      <rect x="40" y="19" width="16" height="25" rx="8" fill="var(--brand-sage)" />
      <circle cx="32" cy="22" r="5" fill="var(--brand-ochre)" />
      <rect x="26" y="29" width="12" height="15" rx="6" fill="var(--brand-ochre)" />
    </svg>
  );
}
