# Banter — Design Brief (paste this into a fresh Claude session)

You are helping redesign / improve the visual and interaction design of **Banter**,
a live web app. Read this whole brief, then propose design improvements. Everything
you need to understand the product is below; ask for screenshots if you want to see
the current state (URLs at the bottom).

---

## What Banter is (one paragraph)

Banter is an AI **texting coach** for dating and social conversations, web-first and
live at **banter-tau.vercel.app**. You paste or screenshot a conversation; it shows a
**signal read** (interest / warmth / reciprocity / momentum as bands, plus a
conversation stage), hands you **3 replies each citing real communication psychology**
(a hard gate bans all pickup-artist / manipulation tactics), lets you **write your own
reply and get it graded** 1–5, and **fades its own help as you improve** (you earn more
for doing it yourself than for copying). It remembers each person as a consent-clean
**persona** (facts only from their own words, exact quotes kept). The thesis: in the AI
era, human connection is the last scarce skill, and every competitor makes you *more*
dependent — Banter is the only one built to make you need it less. The win is a real
date, never a longer thread.

## Who uses it

Mostly 20s–30s dating-app users, texting in the evening on a phone, often anxious,
emotionally invested, privacy-sensitive (they're pasting intimate conversations).
**Mobile-first, one-handed, single primary action per screen.** The emotional job:
"help me not screw this up" and "help me become the person I am in chat, in real life."

## Anti-references (what it must NOT look like)

- RizzGPT / pickup-line generators: neon, bro-coded, manipulation-adjacent. Never.
- Clinical analytics dashboards: this is not a report about a human being.
- Duolingo-style mascot cuteness: progression yes, cartoon energy no.
- Generic SaaS dark template: identical gray cards everywhere.

---

## Current design identity — "Mono" (this is what exists today)

The founder rejected an earlier warm-coral dark theme and chose minimal. Current system:

- **Theme:** system-following (light AND dark). Light = paper `#fcfcfc` / ink `#141414`.
  Dark = ground `#0f0f0f` / surface `#1a1a1a` / text `#ececec`. True neutrals, no tint.
- **Buttons:** ink-filled — black on light, white on dark. No colored buttons.
- **One accent, "the signal":** electric violet `#6d4aff` (light) / `#9b85ff` (dark).
  It appears ONLY on genuinely good news — a strong signal band, readiness "ready", a
  rare compatibility lock, the wordmark's period. Warming/low states are ink at reduced
  opacity. Never violet on neutral or negative info.
- **Type:** Plus Jakarta Sans everywhere. Display bold, tight tracking.
- **Motion:** 150–250ms ease-out, state changes only. No glows, no gradients,
  no glassmorphism.
- **Wordmark:** lowercase `banter.` with a violet period.

The founder likes this minimal direction. **Improve within it, or make a reasoned case
for evolving it — but don't hand back neon, gradients, or a SaaS-template look.**

## The screens

1. **Home — "your people":** a list of the people you're talking to (avatar + name +
   stage + interest band + last-active time). Tap a person → her hub.
2. **Person hub (`/t/[id]`):** the "who is she and where do we stand" screen — the read
   at a glance, your resonance (shared rare traits, running jokes), readiness, what you
   know about her, and a pinned "Continue the conversation" button.
3. **Coach (`/t/[id]/chat`):** the core. A compact read strip, 3 suggested replies each
   with a "why this works", a "your turn" box that grades your own attempt, and a
   collapsible coaching-options panel.
4. **Date brief (`/t/[id]/brief`):** night-before prep — readiness, a spaced-repetition
   fact quiz, stories you owe, running bits, do-not-force boundaries.
5. **The Gym (`/gym`):** one daily 3-minute drill aimed at your weakest graded dimension.
6. **You (`/you`):** your level, XP, a "Texting DNA" radar (warmth / specificity /
   reciprocity / naturalness), and your archetype.

## Non-negotiable design constraints (the brand IS the ethics)

- **Reads of a person are BANDS, never raw percentages** ("interest: strong", not "83%").
  A clinical dial wrecks anxious users. Keep this.
- Nothing surveillance-y or manipulative. The interface must *feel* trustworthy — the
  user is pasting intimate conversations and one-tap "delete everything" wipes it all.
- Empty states teach; loading uses skeletons not spinners.
- Accessibility: real contrast in both themes, visible focus, respects reduced-motion.

---

## What I want from you (the ask)

[EDIT THIS LINE before you send — tell Claude what you actually want. Examples:]
- "Critique the current design and give me 3 directions to make it more distinctive
  and premium while staying minimal."
- "The home and hub feel plain — propose a more memorable visual treatment."
- "Design a signature 'read' visualization that isn't just horizontal bars."
- "Push the typography and layout so it feels like a crafted product, not a template."

Give opinionated, specific proposals — palette, type, layout, one signature moment —
with the reasoning, not a menu of safe options.

---

## Where everything lives (if this Claude has file access to the repo)

- **Repo root:** `banter/` — the web app is in **`banter/web/`**
- **Design system (READ FIRST):** `web/DESIGN.md` (the Mono system) and
  `web/PRODUCT.md` (users, tone, anti-references)
- **Actual tokens + component classes:** `web/src/app/globals.css`
  (colors as CSS custom properties, `.btn-primary` / `.chip` / `.card-tap`, etc.)
- **Screens:** `web/src/app/page.tsx` (home), `web/src/app/t/[id]/page.tsx` (hub),
  `web/src/app/t/[id]/chat/page.tsx` (coach), `web/src/app/t/[id]/brief/page.tsx`
  (brief), `web/src/app/gym/page.tsx`, `web/src/app/you/page.tsx`
- **Key components:** `web/src/components/` — `coach.tsx` (read + replies),
  `dna-radar.tsx`, `resonance-panel.tsx`, `persona-panel.tsx`, `share-card.tsx`
- Stack: Next.js 16 (App Router), Tailwind CSS v4, TypeScript. Fonts via `next/font`.

## How to give this Claude visual context

The fastest way to a good critique is **screenshots**. On your phone or desktop open
**banter-tau.vercel.app** and screenshot: the home, a person hub, the coach screen,
the date brief, and the /you page. Attach those to the chat along with this brief.
(If nothing's been coached yet, the landing page has an auto-playing demo.)
