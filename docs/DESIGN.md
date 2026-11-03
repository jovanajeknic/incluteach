# Design

The IncluTeach visual identity. Every value here is defined as a token in [`client/src/index.css`](../client/src/index.css), so all screens inherit it from one place. When this document and the code disagree, fix one of them; do not add one-off values.

Status: **based on the owner's landing page mockup**. Details are refined after the owner reviews screens.

## Direction: "Warm, calm and inviting"

IncluTeach is used first of all by children, teachers and parents together. The look is warm and calm: a cream, paper-like background, deep forest green for text and actions, soft sage and ochre accents, and a painted illustration of children learning together. Pages stay simple, with plenty of space and very little text, so the purpose is clear at a glance.

## Logo

Five learners of different colours stand behind one open forest-green book: different children, one shared place of learning.

| Asset                                                       | Use                                                                                                              |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `Logo` and `LogoMark` in `client/src/shared/brand/Logo.tsx` | In the app. Tone `color` (default), `mono` or `inverse`                                                          |
| `client/public/favicon.svg`                                 | Browser tab: simplified symbol with three learners                                                               |
| `client/public/brand/incluteach-mark.svg`                   | Symbol in colour                                                                                                 |
| `client/public/brand/incluteach-mark-mono.svg`              | Symbol in one colour (ink), with a white outline between pages and figures                                       |
| `client/public/brand/incluteach-logo.svg`                   | Symbol and wordmark; the wordmark is live text in Lexend, so convert it to outlines before print or external use |

Rules:

- Figure colours from left to right (`--logo-figure-1` to `-5`): `#6fa8dc`, `#5d9a82`, `#f78c61`, `#f6c25b`, `#a58bd6`. Book pages: `#1b5244` and `#2a6b59`.
- Wordmark: "IncluTeach" in ink, Lexend Bold.
- On phones narrower than 400 px, the header shows only the symbol.
- Below 32 px, use the simplified three-learner favicon.
- Do not rotate, stretch, recolour single figures or add effects.

## Colour

All text pairings meet WCAG AA (normal text at least 4.5:1, UI parts and focus rings at least 3:1). They were checked by calculation.

### Main palette

| Token                 | Value     | Role                                                                      |
| --------------------- | --------- | ------------------------------------------------------------------------- |
| `--brand-paper`       | `#fdf6ec` | Page background (cream)                                                   |
| `--brand-card`        | `#ffffff` | Cards and form fields                                                     |
| `--brand-ink`         | `#112b28` | Headings and main text (14:1 on cream)                                    |
| `--brand-ink-soft`    | `#4a5654` | Body and secondary text (7.1:1 on cream)                                  |
| `--brand-forest`      | `#1b5244` | Primary buttons, links, highlighted headline, focus ring (8.4:1 on cream) |
| `--brand-forest-deep` | `#123a30` | Button hover                                                              |
| `--brand-sage`        | `#869e75` | Icons and small accents (not body text)                                   |
| `--brand-ochre`       | `#fdc76b` | Icons, step numbers (ink text on it: 9.7:1)                               |
| `--brand-line`        | `#b5bda6` | Thin dividers between sections (decorative)                               |

### Pastels (secondary)

Six pastels (mint, blush, butter, lilac, sky, pistachio) remain available, each with a `-deep` shade for shapes and an `-ink` shade for text. They are used for soft surfaces in the app, such as the selected item in the teacher navigation. The landing page uses the main palette only.

Rules:

- Text is ink, ink-soft or forest. Sage, ochre and the line colour are never used for body text.
- Colour never carries meaning alone; statuses always have text and usually an icon.
- The teacher lesson status badges keep their own tints for now.

Components use role tokens with shadcn/ui names (`--primary`, `--muted`, `--border` and so on), mapped onto this palette.

## Typography

| Use                                     | Typeface                                  | Notes                                                                              |
| --------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------- |
| Headings, navigation, buttons, wordmark | **Lexend** (variable)                     | Designed to improve reading ease. Bold (700) for headings                          |
| Body text and lessons                   | **Atkinson Hyperlegible Next** (variable) | Designed by the Braille Institute for legibility, including for low-vision readers |

- Both are self-hosted through `@fontsource-variable` packages, with no third-party requests. The latin-ext subset covers č, ć, đ, š and ž.
- Eyebrow labels: small Lexend, uppercase, wide letter spacing (0.2em), forest.
- Landing page scale: hero 42–58 px, section headings 30–36 px, item headings 20 px.
- Body text is at least 16 px (landing 18 px) with line height 1.6.

## Layout and shape

- Content width: up to 1152 px (`max-w-6xl`) with 16–32 px side padding.
- Sections are separated by a thin `--brand-line` rule and generous vertical space, not by coloured blocks.
- **Radius**: cards 24–32 px; buttons and small labels are pills.
- **Shadows**: `shadow-soft` only where a surface needs to lift (cards on the auth pages).

## Buttons and links

- **Primary**: forest pill, white Lexend text. Darkens on hover and lifts by 1 px.
- **Outline**: forest outline with transparent fill, for secondary actions such as "Meni".
- **Text link with arrow** ("Naša priča →"): ink text, turns forest on hover, the arrow slides 4 px.
- Header: "Prijavi se" as a text link, "Registruj se" as the primary pill.
- Focus: a 3 px forest outline that is always visible.

## Icons

- Audience icons are small flat illustrations (`RoleIcons.tsx`) in sage and ochre: a graduation cap, an open book and a family.
- Interface icons are [Lucide](https://lucide.dev) line icons. Icons next to text are hidden from screen readers (`aria-hidden`).

## Illustration

- The hero uses a painted, paper-cut style illustration of a teacher and children, including a child in a wheelchair, reading together under a tree. It has a descriptive `alt` text.
- **Temporary asset**: `client/public/images/hero-illustration.png` is cut from the mockup screenshot (723 × 378 px) and is too small for sharp display on high-density screens. Replace it with the original file, ideally at least 1600 px wide, exported as WebP or optimised PNG.
- Illustrations of features that do not exist yet are labelled as illustrative and marked "U pripremi".

## Motion

| Effect            | Details                                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reveal on scroll  | Blocks marked `data-reveal` (`''`, `left`, `right`, `pop`) fade and slide in once as they enter the screen, 700 ms, with a 90 ms stagger via `--reveal-order` |
| Buttons and links | Colour change and a small lift or arrow slide on hover; 200 ms                                                                                                |

Rules:

- Everything runs in plain CSS and the IntersectionObserver browser API. There is no animation library.
- No intro or splash animation: the page appears at once (the owner found a logo intro unnatural).
- With `prefers-reduced-motion: reduce`, there is no reveal; content is simply there.
- Content never depends on motion: without JavaScript, every block is visible.
- Not allowed: carousels that move on their own, flashing, strong parallax, autoplaying sound and decorations that move constantly.
