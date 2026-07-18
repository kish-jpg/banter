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

## R2 BRIDGE SHIPPED (2026-07-17 — the founder's release, PRD §7.3–7.5)

Kish picked R2 over R1 explicitly. All web-side; the Deno engine is untouched
(no engine deploy this session). Deployed to prod, smoke-tested live.

- **Draft coach (F5)**: `lib/draft.ts` — pure pre-send checks shown live in
  YourTurn as "before you send ·" notes. Banned-term scan (taxonomy bannedTerms,
  now exported from `lib/taxonomy.ts` and injected — node --test can't import
  JSON), frame classifier (prize-framing regexes incl. the case study's
  "'re earned" pattern), question-stacking (>1 `?`-group), em-dash/semicolon
  AI-tells. Warn-never-block; the deep read stays the mode:"grade" round-trip.
- **Open-loop ledger + debt list (F4)**: `lib/loops.ts` store (`banter.loops`;
  kinds story/plan/bit/claim, owner user/match/mutual, status
  open/owned/closed/dismissed) + `/api/loops` Gemini temp-0 extraction route
  (modeled on /api/facts, quote provenance, suggested-never-silently-saved) +
  `LoopSuggestions` component wired into /t/[id] after coaching (persona
  threads only). Debt list = user-owned story/claim loops.
- **Spaced fact quiz**: `lib/quiz.ts` — Leitner boxes over persona facts,
  intervals 1/3/7/14d, 5 cards/day, self-graded ("say it out loud, then check"
  → had it cold / not yet). Mastery = fraction of facts at box ≥2.
- **Readiness score**: `lib/readiness.ts` — 0.4·factsCold + 0.35·storiesOwned +
  0.25·independence, banded with the shared 0.45/0.70 cutoffs (never a raw
  percentage headline). Independence uses new optional `GradeRecord.threadId`
  (recordGrade now takes threadId; older records simply lack it) vs
  thread.sentReplies.
- **Date brief**: `/t/[id]/brief` — readiness band, quiz drill, debt list with
  owned-it toggle, loops to close + bits as safety net, do-not-force (boundary
  facts), their comfort logistics. Entry: "date brief" pill on /t/[id] header
  (persona threads). Empty state teaches.
- Tests: 36 web units green (was 22; +draft/quiz/readiness), 56 backend
  untouched-green, tsc + lint clean, prod build clean.
- Browser-verified via DOM (seeded localStorage): brief sections, quiz
  reveal→answer→next card, owned-it toggle, draft-coach notes firing live,
  /api/loops extraction correct on the caffeine-story/paper-planes/hot-chocolate
  fixture — owners and quotes exact.
- Gotcha honored: Date.now() deferred off the render path in QuizDrill
  (React Compiler purity lint — TRANSFER §6 pattern).
- NOT built (R2 slice deliberately lean): story rehearsal recording (v2.1 per
  PRD), LLM frame classification (R3 rides with Framework Library v2), quiz XP
  (Goodhart guard until Practice Gym defines practice XP properly).

## R1 LOOP SHIPPED (2026-07-17, same session as R2 — Kish said "go ahead with R1"
## and asked for a design relook)

Deployed to prod, all three cards smoke-tested live. Design relook ran under the
impeccable skill: verdict was polish-and-elevate, NOT a rebrand (the warm-coral
OKLCH system is deliberate; a new identity would need mockups + a Kish decision).

- **Design polish**: global `prefers-reduced-motion` support in globals.css,
  em-dash removals from UI copy (the app's own anti-AI-tell rule), screen-h1
  scale drift fixed (thread title input + brief h1 → text-2xl per DESIGN.md).
- **Share cards** (`/api/card/[kind]`, kinds read|dna|met, fmt story 9:16 |
  post 4:5): next/og ImageResponse, node runtime, Geist TTFs from the new
  `geist` npm dep. All card content arrives via query params the client chose
  AFTER the consent preview — the route never sees threads/personas. Bands
  only, never percentages. Verified by eye: all three rendered and reviewed.
- **Texting DNA archetypes**: `lib/dna.ts` — 12-entry table keyed by top-two
  grading dims, growth edge from the lowest (the Tamsyn corpus profile maps to
  The Rememberer / "less polish, more you"). Qualitative rarity cues, no
  fabricated stats.
- **ShareCard component**: inline preview-before-share (the preview IS the
  exact PNG), quote picker for the Read card (their words only if explicitly
  chosen), 9:16/4:5 toggle, navigator.share files with download fallback.
  XP rule per growth brief: DNA + We-Met earn +5 share XP; the Read card earns
  NOTHING (other-party content is never XP-rewarded).
- **We-Met card wiring**: thread page celebration section when outcome="met";
  new additive `Thread.outcomeAt` (set at check-in) gives days-to-date;
  `fadeSeries()` in lib/readiness.ts buckets assisted-vs-own events into the
  fade sparkline, returns [] rather than fabricate a curve from thin data.
- **Referral**: `lib/referral.ts` (banter.ref.code / banter.ref.by),
  `/r/[code]` records referrer + drops into the landing auto-demo. Sharer-side
  XP settlement NEEDS ACCOUNTS — deferred to R4, honestly noted.
- **PostHog**: `lib/analytics.ts`, posthog-js, hard-gated on
  NEXT_PUBLIC_POSTHOG_KEY (no key = every call no-ops; key not set yet — Kish
  needs to create the PostHog project and add the env var in Vercel).
  Events: landing_view, capture_start, read_shown, own_attempt_graded,
  card_previewed, card_shared, ref_visit. autocapture OFF, no message content
  in any event, ever.
- Tests: 40 web units green (dna + fade added), tsc/lint/build clean.
- Verified in browser via DOM (preview-pane CLICKS are flaky in this harness,
  use javascript_tool dispatch — get_page_text/DOM work fine): read strip →
  share preview loads, quote picker + consent + fmt chips render, ref code in
  URL, /r/[code] → banter.ref.by set + redirect to /.
- NOT built: featured-story human-review pipeline (needs content ops), sharer
  XP settlement (R4), PostHog dashboards (need the key first).

## MONO RESKIN + R3 SESSION 1 SHIPPED (2026-07-18/19)

**Mono identity (complete overhaul, Kish rejected the coral system entirely):**
white/blacks, system-following light+dark (forced dark class REMOVED — media
variant), ink-filled CTAs, Plus Jakarta Sans everywhere, violet signal
(#6d4aff/#9b85ff) ONLY on genuinely good news (strong bands, ready, rare locks,
wordmark dot). Cards/icons/manifest moved over; DESIGN.md rewritten. Gotcha:
Turbopack served STALE CSS after the token rewrite — `rm -rf .next` before
trusting dev-server verification of globals.css changes.

**R3 Session 1 (workstreams A+B+C per R3-PLAN.md):**
- A · buckets v2: FactType extended additively (food, people-animals, values,
  humor, love-language, style, open-question — old 7 stay valid, zero
  migration); salience stage-weights per bucket (style weight 0 everywhere: it
  tunes tone, never content); /api/facts prompt v2 (max 8/pass); persona panel
  grouped by bucket with "still don't know — worth asking".
- B · self-persona: lib/self.ts (`banter.self`, facts tagged personaId|null),
  /api/self-facts (user-side extraction, same blocklist/provenance),
  SelfFactSuggestions ("this is how you showed up" — keep what real-you wants
  to own), SelfPanel in thread coaching options + global on /you.
- C · resonance: lib/resonance.ts — computeLocks (static rarity table;
  rare-pattern hit on BOTH sides is evidence alone, fixing the
  "drinking"/"drinker" morphology gap; generic needs 2+ shared keywords; every
  lock carries both quotes or doesn't render), tension registry
  (`banter.tensions`, candidates = boundary/values facts, user-confirmed
  track/skip, states open→bridged→paused, lock-facts excluded from candidates),
  bits gain seenCount (addLoops increments on re-detection instead of dropping
  dupes; ResonancePanel shows ×N in signal violet). Surfaces: coaching options
  + date brief.
- 45 web tests green, tsc/lint/build clean, browser-verified on a Tamsyn-shaped
  seed (lock computed rare with both quotes, tension track/cycle, bit ×4),
  prod smoke: /api/self-facts extracting correctly, coach regression 200.

## Next phase (not yet built)

- R3 Session 2 (R3-PLAN.md): verify citations → Framework Library v2 +
  gate v2 validators + conversationType — ONE engine deploy
- R3 Session 3: Practice Gym + outcome attribution
- Phase F: paywall skeleton at value moments (PostHog wired, key pending)
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
