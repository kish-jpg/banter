# Banter Web — Session Handoff (written 2026-07-10)

**Audience:** the next session picking up the Banter Web pivot (web-first validation of the
proven engine; iOS work is parked, see HANDOFF.md for its state).

## What exists and is VERIFIED working (all on branch `feat/web`, pushed to origin)

Repo: fresh clone at `C:\Users\Nexdo\Nex_Doc\10-19 Apps\Banter\banter` (the old working
copy in `20-29 Projects\.claude\worktrees\beautiful-gould-3cb355\banter` also still exists
and has UNPUSHED Phase-6 planning docs — `.planning/phases/06-profile-engine-xp-grading/`).

- **Backend engine untouched + extended.** 51 Deno tests green
  (`deno test Backend/ --allow-env --allow-read`). New since the iOS phases:
  - `mode:"grade"` branch in `handleCoachingRequest` — own-attempt grading per the
    06-RESEARCH validated design (4-dimension rubric, reasoning-before-score
    propertyOrdering, temperature-0 judge, `[ATTEMPT]` injection fencing,
    `validateGradeResponse` riding the same taxonomy/banlist/AI-tell gate).
  - `generateAndGate` now takes a validator param (coaching/openers use
    `validateReplies`, grading uses the grade validator).
- **Web app** (`web/`, Next.js 16 App Router + Tailwind v4 + shadcn, dark-first,
  coral #FF5C7A): full loop browser-verified on mobile viewport —
  paste AND screenshot OCR capture (`/api/extract`, Gemini vision, schema-enforced,
  images never persisted) → confirm/edit transcript (tap to swap speaker, ✎ to edit)
  → coaching (signal read w/ 4 factor bars, 3 replies w/ taxonomy-cited "why", tone
  re-coach chips) → "your turn" grading (+XP, near-duplicate paste detection BEFORE any
  network call) → threads (localStorage, reload-safe, append flow re-coaches with
  context) → "delete everything". First-run "try an example" path = coached in seconds.
- `npm run build` green. `npx tsc --noEmit` and `npm run lint` clean.
  XP unit tests: `node --test src/lib/xp.test.ts` (6 green).
- Local dev: `deno run --allow-net --allow-env Backend/functions/coaching/index.ts`
  (serves :8000, needs GEMINI_API_KEY env) + `npm run dev` in `web/`
  (`web/.env.local` has GEMINI_API_KEY + COACHING_URL=http://localhost:8000/).
- GEMINI_API_KEY recovered from the old worktree's `.env.local`, verified live, copied
  to both `banter/.env.local` and `banter/web/.env.local` (gitignored).

## DEPLOYED TO PRODUCTION (2026-07-10, second session)

**Live URL: https://banter-tau.vercel.app** — publicly smoke-tested: home 200,
/api/extract parses, /api/coach returns 3 gated replies (via Supabase cloud),
mode:"grade" returns 5/5 rubric. Kish provided a Supabase access token
(stored in user env SUPABASE_ACCESS_TOKEN via setx).

- Supabase project: org "Banter", ref `wfqmgnczeeqwzjksxdpz` (ap-south-1,
  Kish created it 2026-07-10; repo linked via `supabase link`)
- Function URL: `https://wfqmgnczeeqwzjksxdpz.supabase.co/functions/v1/coaching`
  (GEMINI_API_KEY set via `supabase secrets set`; deploy via
  `bash Backend/scripts/deploy-cloud.sh`)
- Vercel: project `banter` (team kish-5252s-projects), linked from `web/`
  (`web/.vercel/project.json`); prod env vars GEMINI_API_KEY, COACHING_URL,
  SUPABASE_ANON_KEY (legacy anon JWT); redeploy = `vercel deploy --prod` from `web/`

## PERSONA ENGINE SHIPPED (2026-07-10, third session)

Full INTENT-PERSONA-ENGINE build (see that doc for confirmed intent) deployed to prod:
- Receiver personas: typed facts w/ exact-quote provenance, sensitive blocklist,
  visible/editable panel, picker on confirm screen (`lib/persona.ts`, `persona-panel.tsx`)
- Salience retrieval: relevance x recency x novelty x stage, top-4 -> engine's new
  personaFacts field (`lib/salience.ts`); /api/facts extraction w/ keep/drop review
- Openers: /api/extract-profile -> hooks seed persona -> COAC-07 opener path w/ UI
- Timing: optional ts on TranscriptEntry, pace analysis + anti-scarcity gated advice,
  late-night notes (`lib/timing.ts`)
- Stage machine (opening/rapport/depth/momentum), banded reads, walk-away card,
  own-attempt gate w/ adaptive cadence (5->2 by level, holds until explicit unlock),
  date check-in (+100xp) (`lib/stage.ts`)
- Backend engine: personaFacts + paceContext additive fields, 56 Deno tests; web 22
  unit tests. Prod smoke: coach+personaFacts, extract-profile, facts all 200.

## IA + ONBOARDING + COACH REDESIGN SHIPPED (2026-07-12, phases A/B/C of the
## billion-dollar-journey plan; Kish approved A,B,C explicitly)

- Real routes: / (auto-demo landing for new users, threads home for returning),
  /new, /t/[id] (refresh-safe, auto-coaches fresh threads), /openers, /you
- Landing = scripted 8s product demo (components/demo.tsx, no LLM)
- PWA: manifest + ImageResponse-generated icons (coral speech-bubble mark)
- Coach redesign: conversation bubbles + scan shimmer, compact expandable read
  strip, replies-as-hero with **"I sent this"** (persists thread.sentReplies,
  fires markFactsUsed on thread.injectedFactIds -> callback ledger CLOSED, +10xp),
  secondary controls behind disclosure
- lib/coaching.ts = single requestCoaching() (salience+pace+context assembly)
- Gotcha fixed: StrictMode mount-cleanup-mount cancelled the auto-coach; the
  started-ref guard must live INSIDE the deferred timeout callback

## PHASES D+E SHIPPED (2026-07-12, second push of the day)

- Phase D via the **impeccable skill**: PRODUCT.md + DESIGN.md now live at web/
  root (context for all future design work - read them first). Warm OKLCH palette
  (coral-hue-tinted neutrals, no more blue-black; theme-color #151112 everywhere),
  component vocabulary in globals.css @layer components (.btn-primary/.btn-secondary/
  .chip/.chip-active/.card-tap - use these, never inline button styles), focus-visible
  base rule, landing brand moment (glow + gradient demo frame), threads home = avatar
  rows (identical-card grid is a banned pattern), skeleton loading (.skeleton class).
  Framer Motion deliberately NOT added (product register: 150-250ms state motion,
  CSS covers it).
- Phase E: lib/grades.ts (grade history + textingDNA + practiceStreak), DnaRadar
  SVG component, /you rebuilt (level bar + streak, DNA card, sent/dates/attempts
  stats). recordGrade() fires inside YourTurn on every successful grade.
- Stitch skill evaluated and skipped: direction was fully determined by
  impeccable's laws + DESIGN.md; external mockups added no information.
- Note: preview-browser screenshots are broken in this harness session (DOM/style
  verification works); visual QA on a real phone still pending - Kish should look.

## Next phase (not yet built)

- Phase F: PostHog funnel analytics; paywall skeleton at value moments
- Shareable signal-read card (image export) - deferred from E
- Supabase Postgres/auth sync for threads+XP+personas+grades (row-ready shapes)
- Fact promotion loop: sentReplies ground truth exists; score fact ->
  next-turn signal delta and promote/demote
- Business-context technique set (currently a tone tag only, by design)
- Replace native confirm() dialogs with inline confirmation (harden pass)

## Remaining v1 spec items

- ~~Profile personalization~~ DONE (ProfileCard post-first-value, picked-style drift,
  profileSummary injected into coach+grade AND into buildSystemInstruction server-side).
- ~~Watch-out notes~~ DONE (client-derived from the engine's own signal factors,
  lowest factor < 0.5, no invented claims).
- Final Wispr polish audit (loading shimmer, copy pass) before shipping the URL —
  entrance animations are in.

## Conventions that bit previous sessions

- Windows: PowerShell 5.1 quirks; use Bash tool for git commits with long messages.
- Repo is NESTED — always run git from `...\10-19 Apps\Banter\banter`.
- `web/AGENTS.md`: Next 16 differs from training data — read `node_modules/next/dist/docs/`.
- Taxonomy: `Backend/functions/coaching/taxonomy.json` is source of truth;
  `web/src/lib/taxonomy.json` is a sync copy (`Backend/scripts/sync-taxonomy.sh`, CI-checked).
- Port 3000 is taken on this machine (PRIMAL lookbook); dev server auto-ports.
