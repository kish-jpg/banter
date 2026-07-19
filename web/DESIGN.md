# Banter — Design System ("Bloom", 2026-07-19)

Third identity. Mono (white/black + violet) is retired. Kish reviewed three warm
directions generated in the claude.ai design canvas (Golden Hour, Bloom, Verdant)
and chose **Bloom**: cream editorial, forest-green accent, hairline rules, a serif
voice. Premium the way a beautiful book is.

## Theme

**Committed single light world** (not system-following). The 11pm scene reframed as
calm daylight paper: warm cream, low-glare, no harsh white. `color-scheme: light`.
If a dark variant is ever wanted, derive it deliberately; do not auto-invert.

## Color (warm cream + ink + forest green)

- background: `#f2ede2` (cream paper)
- card / popover: `#faf7ef` (soft raised paper)
- foreground (ink): `#211c15`
- muted-foreground: `#857c6c`
- secondary / muted / accent (tints, avatars): `#e6e0d2`
- border (hairline): `rgba(33,28,21,0.13)` — Bloom leans on hairline rules over filled cards
- primary (ink CTA): `#211c15`, primary-foreground cream `#f2ede2`
- **signal (forest green): `#4f7a52`**, signal-dim `rgba(79,122,82,0.13)`. Tailwind
  `text-signal` / `bg-signal`. Appears ONLY on genuinely good news: strong bands,
  readiness ready, rare resonance locks, wordmark period, "you met", "why this works",
  "owned it", "due", the DNA radar, "landed ↑". Warming/low = ink at reduced opacity.
- destructive: warm red, delete affordances only.

## Typography

- **Instrument Serif** (`--font-instrument-serif`, Tailwind `font-serif`) — the display
  and editorial voice. Screen h1s, the wordmark `banter.`, person names, signal
  sentences ("Warm and mutual"), and section subheads. 400 weight only (normal +
  italic); at display size it reads as a serif headline, so drop bold on serif text.
- Section labels use `.section-label` = `font-serif italic text-[15px] text-muted-foreground`
  ("what you two share", "facts to cold memory", "what I'd send").
- **Plus Jakarta Sans** — body, buttons, most UI text.
- **Geist Mono** — data labels (band labels, "3 DUE", "where things stand", timestamps).

## Surfaces

Cream cards (`#faf7ef`) with hairline borders, rounded-2xl; many sections use hairline
top-rules instead of filled cards. Never a bordered card inside a bordered card. Read
bars are thin (3px) hairline tracks with green (strong) or ink-40% (warming) fill,
Geist Mono labels.

## Components

.btn-primary (ink fill, cream text) / .btn-secondary / .chip / .chip-active /
.card-tap (hover border → signal green) / .section-label — in globals.css. Same API,
retinted by tokens.

## Motion

Unchanged: 150–250ms ease-out, state changes only, skeletons, reduced-motion honored.
No glows, no gradients. The serif + cream + hairlines carry the premium feel, not effects.

## Share cards (/api/card/*)

Cream ground `#f2ede2`, ink text, forest-green signal, Instrument Serif for the big
headline / archetype name / "we met." (loaded from @fontsource/instrument-serif woff),
Plus Jakarta body. DNA radar fill/stroke green.

## Bans

- Raw percentages for reads of a person (bands only) — unchanged.
- Violet anything (retired). Green only on good news, never neutral/negative.
- Neon, decorative gradients, glassmorphism, glows.
- Identical card grids; the home is people rows with hairline rules.
