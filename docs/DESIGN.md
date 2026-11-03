# Design

The IncluTeach visual identity. Every value here is defined as a token in [`client/src/index.css`](../client/src/index.css), so all screens inherit it from one place. When this document and the code disagree, fix one of them; do not add one-off values.

Status: **approved direction from the owner**. Details are refined after the owner reviews screens.

## Direction: "Simple, soft and playful"

IncluTeach is used first of all by children, so the interface must be **simple to understand and pleasant to look at**. It uses many soft pastel colours, large rounded "windows", chunky buttons that look pressable and small, friendly motion. It must still stay calm: clear hierarchy, plenty of space and readable text come before decoration.

The owner chose **mint** and **blush** as the base colours. The motion style (sections that slide in, wave dividers, pill buttons with a colour swap) takes inspiration from playful learning apps for children; nothing is copied from other sites.

## Logo

Five learners of different colours stand behind one open book: different children, one shared place of learning. The figures use the pastel "deep" colours and the book uses two soft teals.

| Asset                                                       | Use                                                                                                              |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `Logo` and `LogoMark` in `client/src/shared/brand/Logo.tsx` | In the app. Tone `color` (default), `mono` or `inverse`                                                          |
| `client/public/favicon.svg`                                 | Browser tab: simplified symbol with three learners                                                               |
| `client/public/brand/incluteach-mark.svg`                   | Symbol in colour                                                                                                 |
| `client/public/brand/incluteach-mark-mono.svg`              | Symbol in one colour (ink), with a white outline that separates the pages from the figures                       |
| `client/public/brand/incluteach-logo.svg`                   | Symbol and wordmark; the wordmark is live text in Nunito, so convert it to outlines before print or external use |

Rules:

- Figure colours from left to right: sky, mint, blush, butter, lilac (all `-deep`). Book pages: `--logo-page-left` `#4c8c84` and `--logo-page-right` `#6aa8a0`.
- Wordmark: "Inclu" in ink, "Teach" in teal, Nunito ExtraBold.
- Below 32 px, use the simplified three-learner favicon.
- In one colour, keep the knockout outline around the pages (`--logo-knockout`).
- Do not rotate, stretch, recolour single figures or add effects.

## Colour

All text pairings meet WCAG AA (normal text at least 4.5:1, UI parts and focus rings at least 3:1). They were checked by calculation; pastels are always paired with dark text.

### Base

| Token               | Value     | Role                                            |
| ------------------- | --------- | ----------------------------------------------- |
| `--brand-paper`     | `#fffaf5` | Page background between coloured sections       |
| `--brand-card`      | `#ffffff` | Cards ("windows") and form fields               |
| `--brand-ink`       | `#22313a` | Main text (at least 10:1 on every pastel)       |
| `--brand-ink-soft`  | `#4f5b63` | Secondary text (at least 5.3:1 on every pastel) |
| `--brand-teal`      | `#2d6b64` | Primary buttons, links, focus ring              |
| `--brand-teal-deep` | `#1f4f4a` | The "pressed" edge under primary buttons        |

### Pastels

Each pastel has three forms: the **pastel** for surfaces, a **deep** shade for shapes and illustration (never text) and an **ink** shade for text.

| Name         | Pastel    | Deep      | Ink (text) |
| ------------ | --------- | --------- | ---------- |
| Mint (base)  | `#d6e6e4` | `#8fc4bc` | `#1f5a52`  |
| Blush (base) | `#f8dbd5` | `#f0a597` | `#9a3b2c`  |
| Butter       | `#fbecc0` | `#f3cd6a` | `#6e5100`  |
| Lilac        | `#e4ddf4` | `#b5a5e3` | `#55409a`  |
| Sky          | `#d8e8f6` | `#93bfe6` | `#22578a`  |
| Pistachio    | `#e3efd2` | `#b3d48e` | `#3f5f1c`  |

Rules:

- Use pastels for whole sections and for cards. Alternate them so neighbouring areas differ (for example mint hero, blush "how it works", lilac accessibility).
- Text on a pastel is ink, ink-soft or that pastel's own ink shade. Never put text in a deep shade.
- Give each idea or audience its own pastel (teacher mint, student sky, parent butter), but keep teal for primary actions everywhere.
- Colour never carries meaning alone; statuses always have text and usually an icon.
- The teacher lesson status badges keep their own tints for now.

Components use role tokens with shadcn/ui names (`--primary`, `--muted`, `--border` and so on), mapped onto this palette. Use role tokens first and pastel tokens (`bg-sky`, `text-lilac-ink`...) for identity details.

## Typography

| Use                                 | Typeface                                  | Notes                                                                              |
| ----------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------- |
| Headings, buttons, labels, wordmark | **Nunito** (variable)                     | Rounded and friendly. ExtraBold (800) and Black (900)                              |
| Body text and lessons               | **Atkinson Hyperlegible Next** (variable) | Designed by the Braille Institute for legibility, including for low-vision readers |

- Both are self-hosted through `@fontsource-variable` packages, with no third-party requests. The latin-ext subset covers č, ć, đ, š and ž.
- Body text is at least 16 px with line height 1.6. Lesson text is 18 px.
- Landing page scale: hero 42–64 px, section headings 30–44 px, card headings 20–28 px.
- Keep reading text near 65 characters per line (`max-w-prose`).

## Shape and elevation

- **Rounded windows**: `--radius` is 24 px. Large blocks use 32–40 px (`rounded-[2rem]`, `rounded-[2.5rem]`). Buttons, badges and small labels are pills.
- **Wave dividers** (`Wave` component) join sections of different colours instead of straight lines.
- **Shadows**: `shadow-soft` for resting cards and `shadow-lifted` for featured ones. Both are soft and low in contrast.
- **Decoration**: simple pastel circles behind content. Keep them few and static.

## Buttons and links

- **Primary**: teal pill, white Nunito ExtraBold text, with a 4 px darker "edge" underneath so it looks pressable. On hover it lifts slightly and swaps to blush ink; when pressed it moves down onto its edge.
- **Outline**: white pill with a soft border and edge. Turns mint on hover.
- **Accent**: butter pill with ink text, for a highlighted action on a coloured surface.
- Calls to action are 48–52 px high. Touch targets are never below 24 px.
- Focus: a 3 px teal outline that is always visible.
- Links are teal and underlined on hover.

## Icons

[Lucide](https://lucide.dev) line icons with rounded ends. Put feature icons in a rounded pastel "bubble" (40–56 px). Icons next to text are hidden from screen readers (`aria-hidden`).

## Illustration

- Flat, soft shapes in the pastel deep shades; simple scenes (like the water cycle) made with inline SVG.
- Product illustrations are built from real interface elements, each in its own pastel window.
- Illustrations of features that do not exist yet are labelled "Ilustrativni prikaz" and marked "U pripremi".
- Decorative illustrations are hidden from screen readers. Meaningful ones have a caption.

## Motion

Motion should make the page feel alive, never distract a child from reading.

| Effect           | Details                                                                                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reveal on scroll | Blocks marked `data-reveal` (`''`, `left`, `right`, `pop`) slide or pop in once as they enter the screen, 700 ms, with a 90 ms stagger via `--reveal-order` |
| Hover hop        | `.hover-hop`: cards and illustrations lift 6 px and tilt 1° with a small bounce                                                                             |
| Buttons          | Lift on hover, press down on click, colour swap; 200 ms                                                                                                     |

Rules:

- Everything runs in plain CSS and the IntersectionObserver browser API. There is no animation library.
- No intro or splash animation: the page appears at once and the first blocks gently reveal themselves (the owner found a logo intro unnatural).
- With `prefers-reduced-motion: reduce`, there is no reveal and no hop; content is simply there.
- Content never depends on motion: without JavaScript, every block is visible.
- Not allowed: carousels that move on their own, flashing, strong parallax, autoplaying sound and decorations that move constantly.
