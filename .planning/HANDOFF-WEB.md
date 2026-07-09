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

## The ONE blocker: Supabase cloud access

`supabase login` (CLI v2.109.1 installed at `C:\Users\Nexdo\.local\bin\supabase.exe`)
needs Kish's browser to authorize. No access token exists anywhere on this machine.
Everything below is staged and waits on it:

1. `supabase login` (Kish, ~1 min, browser)
2. Create project (dashboard or `supabase projects create banter --org-id ...`),
   then `supabase link --project-ref <ref>`
3. `supabase secrets set GEMINI_API_KEY=<key from .env.local>`
4. `bash Backend/scripts/deploy-cloud.sh` (syncs tracked source → `supabase/functions/coaching`, deploys)
5. Smoke: POST to `https://<ref>.supabase.co/functions/v1/coaching` with anon-key Bearer
6. Vercel deploy (`vercel` CLI already authed as kish-5252): set env
   `GEMINI_API_KEY`, `COACHING_URL=https://<ref>.supabase.co/functions/v1/coaching`,
   `SUPABASE_ANON_KEY` → ship URL to test users
7. Then Supabase Postgres/auth sync for threads+XP (shapes in `web/src/lib/threads.ts`
   and `useXP.ts` are row-ready; localStorage is the current store)

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
