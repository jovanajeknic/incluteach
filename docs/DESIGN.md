# Design

The IncluTeach visual identity. Every value here is defined as a token in [`client/src/index.css`](../client/src/index.css), so all screens inherit it from one place. When this document and the code disagree, fix one of them; do not add one-off values.

Status: **approved initial direction**. Details are refined after the owner reviews screens.

## Direction: "Different paths, one place of knowledge"

The identity should feel expert, warm, creative and fair. It draws on paper and ink (a calm, studious base), a deep petrol colour (trust and focus) and small warm accents of apricot and gold (encouragement and creativity). Shapes are soft and organic rather than technical.

## Logo

Three lines start from different points and meet in one, with a dot above them. It reads as different learning paths leading to the same knowledge, and also as a young plant growing. The symbol avoids disability stereotypes and works without colour.

| Asset                                                       | Use                                                                                                                |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `Logo` and `LogoMark` in `client/src/shared/brand/Logo.tsx` | In the app. Tone `color` (default), `mono` or `inverse` (on dark surfaces)                                         |
| `client/public/favicon.svg`                                 | Browser tab: symbol on a petrol rounded square                                                                     |
| `client/public/brand/incluteach-mark.svg`                   | Symbol in colour                                                                                                   |
| `client/public/brand/incluteach-mark-mono.svg`              | Symbol in one colour (ink)                                                                                         |
| `client/public/brand/incluteach-logo.svg`                   | Symbol and wordmark; the wordmark is live text in Fraunces, so convert it to outlines before print or external use |

Rules:

- Wordmark: "Inclu" in ink, "Teach" in petrol, Fraunces semibold. In one colour, both parts take the same colour.
- Minimum size: symbol 16 px (favicon), full logo 24 px high.
- Clear space: at least the diameter of the dot on every side.
- Do not rotate, stretch, add effects or change the stroke ends.

## Colour

Text pairings below meet WCAG AA (normal text at least 4.5:1, UI parts and focus rings at least 3:1). They were checked by calculation.

| Token                  | Value     | Role                                                             |
| ---------------------- | --------- | ---------------------------------------------------------------- |
| `--brand-paper`        | `#fbf7f0` | Page background                                                  |
| `--brand-paper-deep`   | `#f4ecdf` | Alternate section background, muted surfaces                     |
| `--brand-card`         | `#fffdf9` | Cards and form fields                                            |
| `--brand-ink`          | `#1a2b2f` | Main text (13.8:1 on paper)                                      |
| `--brand-ink-soft`     | `#4b5b60` | Secondary text (at least 5.8:1 on every light surface)           |
| `--brand-petrol`       | `#0f5257` | Primary actions, links, focus ring (8.3:1 on paper)              |
| `--brand-petrol-deep`  | `#0a3a3e` | Button hover, dark sections                                      |
| `--brand-petrol-tint`  | `#ddebe8` | Selected navigation, soft highlights                             |
| `--brand-apricot`      | `#f0a066` | Accent: logo dot, one key action on dark surfaces, illustrations |
| `--brand-apricot-tint` | `#fce9d9` | Warm highlight surfaces                                          |
| `--brand-apricot-ink`  | `#8a4417` | Text on apricot tint (6.1:1)                                     |
| `--brand-gold`         | `#e5b54a` | Small illustrative accents only                                  |
| `--brand-gold-tint`    | `#fbf1d3` | Soft surface for "coming soon" notes                             |

Rules:

- Apricot and gold are accents. Use them sparingly and never as the colour of normal text on light backgrounds.
- On dark petrol surfaces, use paper or petrol-tint text. Add the `surface-dark` class so the focus ring turns apricot.
- Colour never carries meaning alone; statuses always have text and usually an icon.
- The teacher lesson status badges keep their own tints for now (draft, in review, approved, assigned).

Components use role tokens with shadcn/ui names (`--primary`, `--muted`, `--border` and so on), mapped onto the brand palette. New screens should use role tokens first and brand tokens (`bg-petrol-tint`, `text-apricot-ink`...) only for identity details.

## Typography

| Use                | Typeface                                  | Notes                                                                              |
| ------------------ | ----------------------------------------- | ---------------------------------------------------------------------------------- |
| Headings, wordmark | **Fraunces** (variable)                   | Soft serif with character. Semibold for headings                                   |
| Body and interface | **Atkinson Hyperlegible Next** (variable) | Designed by the Braille Institute for legibility, including for low-vision readers |

- Both are self-hosted through `@fontsource-variable` packages. There are no third-party font requests, and the latin-ext subset covers č, ć, đ, š and ž.
- Fallbacks: Georgia for headings, the system sans-serif for body text.
- Body text is at least 16 px with line height 1.6. Lesson text is 18 px with relaxed line height.
- Scale used on the landing page: hero 40–64 px, section headings 30–44 px, card headings 20–24 px.
- Keep line length near 65 characters (`max-w-prose`) for reading text.

## Space, shape and elevation

- **Spacing**: the Tailwind 4 px scale. Sections use 80–128 px of vertical space; cards use 20–32 px of padding.
- **Radius**: `--radius` is 14 px for cards. Large feature blocks use `rounded-2xl` or larger. Buttons and small badges are fully rounded (pill).
- **Shadows**: `shadow-soft` for resting cards and `shadow-lifted` for featured or floating elements. Both are warm and low in contrast. Do not stack heavy shadows.
- **Borders**: 1 px `--border` lines separate surfaces calmly; prefer them over shadows inside dense UI.

## Buttons and links

- **Primary**: petrol fill, white text, pill shape. Darkens on hover (lightening would lower contrast).
- **Outline**: border with transparent fill, for secondary actions.
- **Accent**: apricot fill with petrol-deep text, used only for the main action on a dark section.
- Size `lg` (40 px high) for calls to action; touch targets are never below 24 px.
- Hover: colour change and a 1 px lift over 200 ms. Focus: a 3 px outline that is always visible.
- Links in running text are petrol and underlined on hover.

## Icons

[Lucide](https://lucide.dev) line icons. Stroke style matches the logo: rounded ends, no fills. Use 16–20 px icons next to text and 24 px icons in feature blocks. Icons next to text are hidden from screen readers (`aria-hidden`), because the text already carries the meaning.

## Illustration

- Flat, calm shapes: organic blobs, circles and soft curves in petrol tint, apricot tint and gold tint.
- Thin connecting lines with the same rounded stroke as the logo show relationships ("paths").
- Product illustrations are built from real interface elements and inline SVG, not photos or heavy images.
- Illustrations that show features which do not exist yet are labelled as illustrative ("Ilustrativni prikaz") and marked "U pripremi".
- Decorative illustrations are hidden from screen readers. Meaningful ones have a short text alternative or caption.

## Motion

- Short and gentle: 150–200 ms transitions with a soft ease-out (`--ease-out-soft`).
- Optional reveal on scroll (`reveal-on-scroll`): runs only in browsers that support scroll-driven animations and only without `prefers-reduced-motion`. Content is fully visible without it.
- Not allowed: carousels that move on their own, flashing, strong parallax, autoplaying sound, and decorations that move constantly.
- With `prefers-reduced-motion: reduce`, animations and transitions are effectively disabled.
