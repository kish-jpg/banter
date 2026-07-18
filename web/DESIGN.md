# Banter — Design System ("Mono", 2026-07-17 overhaul)

Kish rejected the warm-dark coral system outright (theme, color, typography).
Direction he set: minimal, "white and blacks, one small accent". This file is the
new source of truth; the old coral system is dead.

## Theme

**Both themes, system-following** (no forced dark class — Tailwind v4 media dark).
Light: paper #fcfcfc, ink #141414. Dark: ground #0f0f0f, surface #1a1a1a,
text #ececec. No hue tinting: true neutrals. The interface should read like a
well-made notebook — the anti-RizzGPT (competitors are neon and loud; our users
are the people repelled by that).

## Color

- Chrome is monochrome. CTAs are ink-filled: black on light, white on dark
  (`--primary` = ink; never a colored button).
- **The signal**: electric violet — #6d4aff light / #9b85ff dark (`--signal`,
  `--signal-dim`; Tailwind `text-signal` / `bg-signal`). The blend of the social
  spectrum (IG magenta + TikTok cyan/pink + Twitter blue → violet). It appears
  ONLY when the app has something genuinely good to say:
  - strong signal bands (dots, bars, band words)
  - readiness "ready"
  - rare resonance locks
  - the wordmark's period
  Warming/low states are ink at reduced opacity (foreground/45,
  muted-foreground/40). Never violet on neutral or negative information.
- Destructive stays semantic red, delete affordances only.

## Typography

- **Plus Jakarta Sans** everywhere (loaded via next/font on the legacy
  `--font-geist-sans` var so tokens didn't move). Friendly geometric; the face
  carries the whole mono design.
- Display: bold (700) with tracking-[-0.03em]. Screen h1: text-2xl semibold.
  Body 15px. Labels lowercase 13px muted. Micro 11px.
- Geist Mono remains registered for data labels if needed.

## Surfaces

Same three levels as before (flat tint / card / interactive card), rounded-2xl,
never nested borders. Cards are #ffffff on light (border rgba-ink-10%),
#1a1a1a on dark.

## Components

.btn-primary (ink fill) / .btn-secondary / .chip / .chip-active / .card-tap in
globals.css @layer components — unchanged API, retinted by tokens. All
interactive states preserved; focus ring is ink.

## Motion

Unchanged rules: 150–250ms ease-out-quart, state changes only, skeletons in
place, prefers-reduced-motion honored globally. No glows, no gradients — the
landing hero is now type + the live demo in a plain border.

## Share cards (/api/card/*)

Mono dark ground always (marketing surface): #0f0f0f, ink text, violet signal
on strong bands / wordmark dot / ref pill. Font: Plus Jakarta woff from
@fontsource (satori-compatible).

## Bans

- Raw percentages for reads of a person (bands only) — unchanged.
- Colored buttons; violet on anything that isn't good news.
- Neon, gradients-as-decoration, glassmorphism, glows.
- Identical card grids; thread list stays avatar rows.
