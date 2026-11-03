# Design

The IncluTeach visual identity. Every value here is defined as a token in [`client/src/index.css`](../client/src/index.css), so all screens inherit it from one place. When this document and the code disagree, fix one of them; do not add one-off values.

Status: **approved by the owner**. The logo was provided by the owner, and the palette is derived from it. Details are refined after the owner reviews screens.

## Direction: "Different learners, one shared book"

The identity should feel expert, warm, creative and fair. A cream, paper-like base and a deep navy book give calm and trust. Five learner colours bring warmth, creativity and the idea that every learner is different but equally present. Shapes are soft and rounded rather than technical.

## Logo

Five learners of different colours stand behind one open book: different people, one shared place of learning. The symbol avoids disability stereotypes and also works in one colour.

| Asset                                                       | Use                                                                                                                |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `Logo` and `LogoMark` in `client/src/shared/brand/Logo.tsx` | In the app. Tone `color` (default), `mono` or `inverse` (on dark surfaces)                                         |
| `client/public/favicon.svg`                                 | Browser tab: simplified symbol with three learners on a cream rounded square                                       |
| `client/public/brand/incluteach-mark.svg`                   | Symbol in colour                                                                                                   |
| `client/public/brand/incluteach-mark-mono.svg`              | Symbol in one colour (ink), with a white outline that separates the pages from the figures                         |
| `client/public/brand/incluteach-logo.svg`                   | Symbol and wordmark; the wordmark is live text in Fraunces, so convert it to outlines before print or external use |

Rules:

- Figure colours from left to right: sky, leaf, coral, sun, violet. The left page is navy, the right page blue.
- Wordmark: "Inclu" in ink, "Teach" in blue, Fraunces semibold. In one colour, both parts take the same colour.
- Below 32 px, use the simplified three-learner favicon; five figures blur together at that size.
- In one colour, keep the knockout outline around the pages (`--logo-knockout`, set to the surface colour) so the book stays separate from the figures.
- Clear space: at least the width of one figure's head on every side.
- Do not rotate, stretch, recolour single figures or add effects.

## Colour

Text pairings below meet WCAG AA (normal text at least 4.5:1, UI parts and focus rings at least 3:1). They were checked by calculation.

### Base

| Token                | Value     | Role                                                    |
| -------------------- | --------- | ------------------------------------------------------- |
| `--brand-paper`      | `#fff6e5` | Page background (the logo's cream)                      |
| `--brand-paper-deep` | `#faebd3` | Alternate section background, muted surfaces            |
| `--brand-card`       | `#fffcf7` | Cards and form fields                                   |
| `--brand-ink`        | `#16263d` | Main text (14.2:1 on paper)                             |
| `--brand-ink-soft`   | `#4a5468` | Secondary text (at least 6.2:1 on every light surface)  |
| `--brand-navy`       | `#1e3a5f` | Primary actions, links, focus ring (10.7:1 on paper)    |
| `--brand-navy-deep`  | `#142a47` | Button hover, dark sections                             |
| `--brand-navy-tint`  | `#e2eaf4` | Selected navigation, "available in the demo" highlights |
| `--brand-blue`       | `#2c5484` | The wordmark's "Teach", the book's right page           |

### Learner colours

Each of the five learner colours has three forms: the **full colour** for shapes and illustration, a **tint** for surfaces and an **ink** for text.

| Colour | Full      | Tint      | Ink (text)                    |
| ------ | --------- | --------- | ----------------------------- |
| Sky    | `#3e8ede` | `#e0edfb` | `#1f5b9e` (5.8:1 on its tint) |
| Leaf   | `#3fb58f` | `#dcf2e9` | `#1c6a50` (5.6:1 on its tint) |
| Coral  | `#f26b5b` | `#fde4df` | `#a2301f` (5.8:1 on its tint) |
| Sun    | `#f7b538` | `#fdf0d0` | `#7a4c00` (6.5:1 on its tint) |
| Violet | `#8b6fd6` | `#ebe5fa` | `#5a3fa6` (6.4:1 on its tint) |

Rules:

- Full learner colours are never used for text. Use the matching ink variant.
- Sun is the accent for the main action on dark navy (navy-deep text on sun: 8.0:1).
- On dark navy surfaces, use paper or navy-tint text. Add the `surface-dark` class so the focus ring turns sun yellow.
- Give different audiences or ideas different learner colours (for example the student corner in sky and the parent corner in coral), but keep navy for primary actions everywhere.
- Colour never carries meaning alone; statuses always have text and usually an icon.
- The teacher lesson status badges keep their own tints for now (draft, in review, approved, assigned).

Components use role tokens with shadcn/ui names (`--primary`, `--muted`, `--border` and so on), mapped onto the brand palette. New screens should use role tokens first and brand tokens (`bg-sky-tint`, `text-coral-ink`...) only for identity details.

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
- **Radius**: `--radius` is 14 px for cards. Large feature blocks use `rounded-2xl` or larger. Buttons and small badges are fully rounded (pill), like the logo's figures.
- **Shadows**: `shadow-soft` for resting cards and `shadow-lifted` for featured or floating elements. Both are warm and low in contrast. Do not stack heavy shadows.
- **Borders**: 1 px `--border` lines separate surfaces calmly; prefer them over shadows inside dense UI.

## Buttons and links

- **Primary**: navy fill, white text, pill shape. Darkens on hover (lightening would lower contrast).
- **Outline**: border with transparent fill, for secondary actions.
- **Accent**: sun fill with navy-deep text, used only for the main action on a dark section.
- Size `lg` (40 px high) for calls to action; touch targets are never below 24 px.
- Hover: colour change and a 1 px lift over 200 ms. Focus: a 3 px outline that is always visible.
- Links in running text are navy and underlined on hover.

## Icons

[Lucide](https://lucide.dev) line icons with rounded ends and no fills. Use 16–20 px icons next to text and 24 px icons in feature blocks. Icons next to text are hidden from screen readers (`aria-hidden`), because the text already carries the meaning.

## Illustration

- Flat, calm shapes: soft blobs, circles and rounded forms in the learner tints.
- Thin dotted or dashed lines with rounded ends show relationships between parts.
- Product illustrations are built from real interface elements and inline SVG, not photos or heavy images.
- Illustrations that show features which do not exist yet are labelled as illustrative ("Ilustrativni prikaz") and marked "U pripremi".
- Decorative illustrations are hidden from screen readers. Meaningful ones have a short text alternative or caption.

## Motion

- Short and gentle: 150–200 ms transitions with a soft ease-out (`--ease-out-soft`).
- Optional reveal on scroll (`reveal-on-scroll`): runs only in browsers that support scroll-driven animations and only without `prefers-reduced-motion`. Content is fully visible without it.
- **Logo intro** on the landing page, on every visit: the logo appears large on the cream background, shrinks into its place in the header and the page fades in (about 1.6 seconds in total). It uses the browser's Web Animations API, with no animation library. Any click or key press skips it. It never plays with `prefers-reduced-motion`, and the page is fully rendered and accessible underneath while it runs.
- Not allowed: carousels that move on their own, flashing, strong parallax, autoplaying sound, and decorations that move constantly.
- With `prefers-reduced-motion: reduce`, animations and transitions are effectively disabled.
