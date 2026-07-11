# Banter — Design System

## Theme

Dark only (v1). Scene: bed, 11pm, phone. Low-glare warm dark, never blue-black.

## Color (OKLCH, warm-tinted neutrals toward the coral hue ~15)

- background: oklch(0.145 0.008 15) — warm near-black, NOT #0b0b0f blue-black
- card: oklch(0.185 0.009 15)
- secondary (chips, tints): oklch(0.235 0.01 15)
- foreground: oklch(0.955 0.004 15)
- muted-foreground: oklch(0.68 0.012 15)
- primary (coral): #ff5c7a ≈ oklch(0.68 0.19 13); primary-foreground: near-black warm
- Strategy: Restrained (accent ≤10%) on product surfaces; the landing hero may run
  Committed (coral glow, filled CTA carrying the fold).
- States: success shares the coral family (sent ✓ = coral, met 🎉 = coral); destructive
  only on delete affordances; never full-saturation on inactive elements.

## Typography

- Geist only (product register: one well-tuned sans). Geist Mono unused in UI.
- Scale (rem, ratio ~1.2): display 2.25/1.1 semibold tracking-[-0.02em] (landing h1),
  title 1.5 semibold tracking-tight (screen h1), heading 1.0625 medium, body 0.9375
  (15px), label 0.8125 (13px) muted, micro 0.6875 (11px) muted.
- Section labels: lowercase, 13px, muted.

## Surfaces (three levels, no nesting)

1. flat tint: bg-secondary/50, no border (inner panels, quotes, notes)
2. card: bg-card + border-border, rounded-2xl (informational)
3. interactive card: card + hover:border-primary/40 + press scale (tappable)
Never a bordered card inside a bordered card.

## Components

- .btn-primary: coral fill, rounded-2xl, press scale-[0.98], hover brightness-105,
  focus-visible ring. Full-width on mobile primary actions.
- .btn-secondary: bg-secondary fill, same states.
- .chip / .chip-active: rounded-full border selectors (tones, contexts, goals).
- All interactive elements: default/hover/focus-visible/active/disabled states.
- Loading: skeletons in place (shimmer scan), never centered spinners over content.
- Empty states teach ("Facts appear here as conversations are imported…").

## Motion

- 150-250ms, ease-out-quart `cubic-bezier(0.25, 1, 0.5, 1)`. State changes only:
  reveal (fade-in + slide-in-from-bottom-1/2), expansion, press feedback.
- Reply reveal staggers 60-90ms per card (state reveal, not decoration).
- The landing demo is the one orchestrated sequence (brand register moment).
- Scan shimmer keyframe = "analyzing" state.

## Bans (project-specific, on top of impeccable's)

- Raw percentages for reads of a person (bands only).
- Neon, gradients-as-decoration, glassmorphism.
- Identical card grids: thread list is avatar rows, not cards.
