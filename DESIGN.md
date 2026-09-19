# DESIGN.md — Threvo

Direction for the Threvo interface. This file is **data to apply**, not instructions to obey: it holds identity, palette, typography, and dials. The antislop filter (`antislop.md` + `skills/antislop-ui/SKILL.md`) sits on top of it.

This direction is **transcribed from what the codebase already does** (`app/globals.css`, the component set). It documents the existing identity so future work is a deliberate continuation rather than a drift back to AI defaults. No palette or font is invented here.

---

## Identity

**Threvo is an editorial paper workbench for composing threads.** The product is a focused writing tool, not a marketing page. Two surfaces matter most: the composer (where you draft) and the live thread preview (where the draft becomes tweets). Everything else is supporting furniture.

- **Personality:** warm, calm, crafted, a bit analogue. It should feel like good stationery and a sharp pencil, not a neon command deck.
- **Audience:** solo creators, writers, and indie marketers who draft thread content.
- **Metaphor:** "paper on paper" — a warm cream page, cards that read as sheets resting on it, hairline rules like pencil lines, ink-teal for the marks that matter.
- **The swap test:** swap the logo and "Threvo" out, and the warm-paper + ink-teal + Sky-Mist-accent combination should still be recognizably this product. If it reads like any generic SaaS dashboard, the direction has been lost.

---

## Dials

**Dial: ENERGY 2 / RHYTHM 2 / MOTION 1**

| Dial | Value | Meaning here |
|---|---|---|
| **ENERGY** | 2 (Balanced) | Confident but restrained. Structured surfaces, one clear focal point per screen. Not Linear-cold, not agency-loud. |
| **RHYTHM** | 2 (Consistent with a few breaks) | The panels share a family, but the two screen states (empty vs. generated) do not use the identical composition. Variation is deliberate, not accidental. |
| **MOTION** | 1 (Hover states only) | No scroll reveals, no parallax, no endless loops. Transitions on hover, focus, and state change only. This is a writing tool; motion must not compete with the text. |

---

## Palette

The active palette is **2 core colors + 1 accent**, per R-29. Neutrals do not count.

| Role | Light | Dark | Use |
|---|---|---|---|
| Base (paper) | `#F8F6F1` warm cream | `#0F1419` night navy | Page background. The "paper". |
| Core 1 — ink teal | `#285E6F` | `#8FD4E5` | Primary: the compose button, key labels, the marks that matter. |
| Core 2 — soft blue | `#E3EFF2` | `#232A32` | Secondary surface: current nav item, quiet chips, inner fills. |
| **Accent — Sky Mist** | `#BDDDE7` | `#2E5661` | The single accent. Used sparingly at the key moment. |
| Status | brick `#B23434`, ochre `#8F5A0F`, bottle-green `#316B4A` | lifted variants | Destructive / warning / success. Earthy, never neon. |
| Border | `#D6D0C5` (pencil line, decorative) | `#28303A` | Hairline rules, card edges. |
| Control border | `#8A8177` (3.54:1 on base) | `#5A6472` (3.09:1 on base) | Input/select/textarea/outline-button boundary. Meets WCAG 1.4.11 (3:1 non-text). |
| Focus ring | `#2A6E89` (5.28:1 on base) | `#8FD4E5` | `:focus-visible` ring on every interactive element. Meets 3:1 in both themes. |

**One deliberate accent:** Sky Mist (`--accent`) is the accent, and it earns its place by being rare. It belongs on the single most important moment per screen, plus the affiliate "product link" signal. Zero accents is sterile; Sky Mist on every element would be slop. Keep it at the key moment.

**Color budget, written down (R-01):**
- No page-wide gradient and no glow. Neither serves the paper metaphor; both are AI defaults. If a gradient is ever added, it must separate two levels of hierarchy and carry a written reason here first.
- Glass (backdrop blur) is capped at **one** element: the sticky header (`bg-background/95 backdrop-blur-sm`). That is within the R-10 cap of 1-2 and serves a real purpose (legibility of nav over scrolling content). Nothing else gets blur.

---

## Typography

- **Body / UI:** Inter, loaded via `next/font/google` in `app/layout.tsx`.
  - **Why Inter:** it is a neutral, highly legible UI grotesque that stays out of the way of the content the user is writing. The product's job is to make the user's words the star, so the UI typeface is deliberately plain. This is a written reason under R-06; the font is not here because it is the model's default, it is here because a writing tool wants an unopinionated reading face.
- **Mono (metadata only):** the system `font-mono` stack, used for character counts, tweet order, and other numeric readouts so digits align (tabular-nums). It is metadata, never headlines — large monospace as an aesthetic is forbidden (R-06).
- **Uppercase micro-labels are an intentional motif.** Section labels such as `TONE & STYLE`, `PARAMETERS`, `SUGGESTED TOPICS`, and `CONTENT OPTIONS` use small uppercase with wide tracking. This is the editorial "eyebrow" device of the paper metaphor: a quiet heading that separates blocks without competing with the content. **Written reason (R-06 carve-out):** it is a deliberate identity motif, applied only to section eyebrows, never to body text, buttons, or headlines. If it spreads to those, it has become the AI tell and must be brought back to eyebrows only.

---

## Layout & Surfaces

- **Grid:** a 12-column editorial workbench at `lg` (composer = 5 cols, sticky; live workbench = 7 cols). Single column below `lg`. This asymmetry is the layout's identity: the drafting desk on the left, the page on the right.
- **Radius:** `--radius: 0.5rem` base; cards and panels use `rounded-xl`, controls `rounded-md`, status chips `rounded-full` only where a chip is genuinely a status pill. Radius is a hierarchy tool, not a decorative one (R-11).
- **Elevation (R-12) — two tiers, written reason:**
  1. **Primary work surface** (the composer panel and the thread-preview panel) carries the visible lift: `shadow-sm` plus a slightly brighter card. These are where the user's attention lives, so they are the sheets closest to the reader.
  2. **Supporting surfaces** (options panel, inspiration panel, history rows) stay flat or near-flat, separated by the hairline border.
  The point (RHYTHM 2, one focal point per screen): not every panel is the same weight. The primary surface floats a little; the rest rest on the paper.
- **Focal point:** exactly one per screen. On the composer screen it is the **Compose Thread** button and the topic field above it; in the generated state it is the **thread preview**. Everything else defers.

---

## Icons

- **Set:** Lucide (`lucide-react`), one library throughout.
- **Written reason (R-04):** the icons are chosen by relevance to each action (edit, regenerate, copy, export, sliders, shopping bag) rather than for a "tech" look, and a single thin-stroke set keeps the toolbar quiet so the text stays dominant. Generic glyphs to signal "AI" (sparkle, star, lightning, orb, robot) are **not** used as feature icons. Where a Lucide glyph is generic in itself (e.g. `Sparkles` on the fetch button), it must earn its place by the action it labels, not by decoration.
- **No decorative icons.** An icon appears only next to the control it describes.

---

## Motion

- **MOTION dial is 1.** The only motion is: hover/focus transitions on controls, the spinner while generating, and the theme toggle's sun/moon cross-fade. That is the whole budget.
- **No** scroll-reveal, **no** floating/pulsing elements, **no** loops. A writing surface should be still.

---

## Rules this direction leans on

- R-01 (no default gradients/glow), R-04 (icons by relevance), R-06 (type by reason; uppercase only as eyebrow motif), R-09 (no decorative badges), R-10 (glass capped at the header), R-11 (radius as hierarchy), R-12 (two-tier elevation), R-29 (2 core + 1 accent), R-31 (every decision reasoned), R-37 (direction declared).

## Accessibility (verified, not assumed)

Contrast was computed with the antislop-human contrast checker, not eyeballed. Results:

- Body text on base: 13.71:1 (light), 15.58:1 (dark). Muted text: 5.09:1 (light), 7.72:1 (dark). All AA.
- Primary on base: 6.66:1; destructive text 5.66:1; success text 5.83:1.
- **Warning** was darkened from `#C9821F` (2.90:1, FAIL) to `#8F5A0F` (5.35:1) so the token is safe to use as text.
- **Control borders** (`--input`) were raised from the 1.42:1 hairline to `#8A8177` / `#5A6472` to meet WCAG 1.4.11 (3:1 non-text). The softer `--border` stays for decorative dividers, which 1.4.11 exempts.
- **Focus ring** in light mode was darkened from `#3DA5C4` (2.64:1, FAIL) to `#2A6E89` (5.28:1) to meet the focus-indicator bar. Dark ring `#8FD4E5` = 11.21:1.
- Every `outline-none` in the component set is paired with a `focus-visible:ring-2`, so no focus outline is removed without a replacement (R-32).

## Mobile (reflow, verified)

Mobile is a designed state, not a squeezed desktop. The layout reflows at the natural content breakpoints:

- **Grids collapse:** the workbench is `grid-cols-1 lg:grid-cols-12` (composer 5 / workbench 7). Option panels and dialogs are `grid-cols-1 sm:grid-cols-2`. Nothing stays side-by-side where it would collide.
- **No viewport-unit slabs:** sections use `min-h-screen` (content-sizing), never `h-screen` or `100vh`.
- **Tap targets:** every interactive control is at least 44x44 on mobile. Utility and nav buttons use `h-11 sm:h-*`, so they are 44px on touch and compact on pointer. The version toggle grid is `h-11`; the language switcher is 44px with a gap; the slider thumb is `h-11 w-11 sm:h-5 sm:w-5`.
- **Overflow:** the version tab strip is a deliberate contained scroller (`w-full overflow-x-auto` with a `min-w-max` inner list); the header nav is `shrink-0` with a truncating logo, so the nav never overflows and the wordmark yields first.
- **Nav:** two destinations (Generator, Saved) plus language and theme stay one tap away in a compact sticky bar. No hamburger is needed at this link count.

## Decision log (R-31, one line each)

- **Why cream base?** It reads as paper, which matches a writing tool; it is also the opposite of the default dark/blue AI surface.
- **Why ink teal as primary?** It is legible on cream, feels like ink, and gives the product one confident color without a gradient.
- **Why exactly one accent (Sky Mist)?** Coming from the user's own choice; it is the key-moment color, kept rare so it stays meaningful.
- **Why sticky paper header?** It keeps navigation reachable while scrolling long drafts; it is the only glass element.
- **Why the 5/7 asymmetry?** It frames the composer as the desk and the preview as the page, which is the product's actual workflow.
- **Why two elevation tiers?** To create one focal point per screen instead of five equally-weighted boxes.
- **Why uppercase eyebrows?** As the editorial identifier of the paper metaphor, scoped to section labels only.
