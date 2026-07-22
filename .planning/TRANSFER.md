# Banter — Session Transfer / Cold-Start Instructions

**Written 2026-07-12 for a fresh chat (possibly a different model). Read this FIRST,
top to bottom, before touching anything. It is the single source of truth for picking
up Banter.**

---

## 0. First actions in the new chat (do these in order)

1. Read this file fully.
2. Read `.planning/PRD.md` (the canonical product spec — thesis, intelligence stack,
   roadmap R1–R5, business model). This is the most important doc.
3. Read `.planning/CASE-STUDY-TAMSYN.md` (the real-conversation validation corpus that
   the PRD's feature roadmap F1–F8 is derived from).
4. Skim `.planning/INTENT-PERSONA-ENGINE.md` (confirmed intent for the persona engine)
   and `.planning/HANDOFF-WEB.md` (chronological build log of what shipped when).
5. `web/PRODUCT.md` + `web/DESIGN.md` — design system context; read before any UI work.
6. Confirm the live app still works: open https://banter-tau.vercel.app and/or
   `curl` the smoke test in §5.

Do NOT re-plan or re-derive. The plan exists (PRD §13, R1–R5). Ask Kish which release to
start, or if he already said, start it.

---

## 1. What Banter is (one paragraph)

Banter is an AI **texting coach** (web-first, live at banter-tau.vercel.app). You give it
a dating/social conversation (screenshot or paste); it shows a **signal read** (interest/
warmth/reciprocity/momentum as bands + a conversation stage), hands you **3 replies each
citing real communication psychology** (a hard taxonomy gate bans all PUA/manipulation),
lets you **write your own attempt and get it graded** 1–5 on four dimensions, and **fades
its own assistance as you improve** (XP rewards doing it yourself > copying). It remembers
each person as a consent-clean **persona** (facts only from their own words). The thesis:
in the AI era human connection is the last scarce skill, and every competitor makes you
MORE dependent — Banter is the only one built to make you need it less. Dating first,
friendship close behind. Founder (Kish) is an anxious introvert whose own AI-reliance
eroded his communication; the product is designed to break that loop. **Teaching >
replacement is non-negotiable.**

---

## 2. Where everything lives

| Thing | Location |
|---|---|
| Repo | `github.com/kish-jpg/banter` (PRIVATE), branch **`feat/web`** (NOT merged to master) |
| Local clone | `C:\Users\Nexdo\Nex_Doc\10-19 Apps\Banter\banter` |
| Live app | https://banter-tau.vercel.app |
| Web app source | `banter/web/` (Next.js 16 App Router, Tailwind v4, TypeScript) |
| Coaching engine | `banter/Backend/functions/coaching/` (Deno edge fn — the fundable core, 56 tests) |
| Planning docs | `banter/.planning/` (PRD, case study, intents, handoffs, THIS file) |
| Old working copy | `Nex_Doc\20-29 Projects\.claude\worktrees\beautiful-gould-3cb355\banter` — has UNPUSHED Phase-6 planning docs + the original `.env.local` GEMINI key came from here |
| Tamsyn transcript | `C:\KenLab\Temp Nalysis\Copy of Tamsyn_Full_Transcript.md` (outside repo; founder's private data) |

---

## 3. Access / credentials (state)

- **GEMINI_API_KEY**: recovered, verified working. Stored in `banter/.env.local` AND
  `banter/web/.env.local` (both gitignored). Also set as a Supabase secret on the cloud
  project.
- **SUPABASE_ACCESS_TOKEN**: Kish provided it; stored in Windows **user env**
  (`setx SUPABASE_ACCESS_TOKEN ...`). A new shell has it via `$env:SUPABASE_ACCESS_TOKEN`.
- **Supabase project**: org "Banter", ref **`wfqmgnczeeqwzjksxdpz`** (ap-south-1),
  linked. Coaching function live at
  `https://wfqmgnczeeqwzjksxdpz.supabase.co/functions/v1/coaching`.
  Anon key is set as a Vercel env var (`SUPABASE_ANON_KEY`).
- **Vercel**: authed as `kish-5252`, project **`banter`** (team `kish-5252s-projects`),
  linked in `web/.vercel/`. Prod env vars set: `GEMINI_API_KEY`, `COACHING_URL`
  (the Supabase fn URL), `SUPABASE_ANON_KEY`.
- **supabase CLI**: installed at `C:\Users\Nexdo\.local\bin\supabase.exe` (not on PATH by
  default — call with full path or add `/c/Users/Nexdo/.local/bin` to PATH in Bash).
- **GitHub**: `gh` authed as `kish-jpg`.
- **MCP servers needing auth** (Notion, Slack, etc.) are NOT authorized in headless
  sessions — ignore unless Kish authorizes via an interactive `claude` terminal.

Nothing further is blocked on Kish for credentials. Deploys work end-to-end.

---

## 4. What's SHIPPED vs NEXT

**Shipped and live (feat/web):** engine + taxonomy gate (56 Deno tests) · screenshot/paste
OCR capture · signal read + stage machine + pace/timing engine · grading + XP + adaptive
coach-mode gate · personas + salience-scored fact injection + fact extraction · opener
flow from profile screenshots · localStorage threads (refresh-safe) · walk-away card ·
date check-in · routes (`/`, `/new`, `/t/[id]`, `/openers`, `/you`) · auto-playing demo
landing · PWA (manifest + icons) · warm design system + component classes · Texting DNA
radar + practice streak on `/you` · **R2 Bridge (2026-07-17)**: draft coach (live
pre-send checks incl. frame classifier) · open-loop ledger + debt list (`/api/loops`) ·
spaced fact quiz (Leitner 1/3/7/14d) · readiness score · date brief at `/t/[id]/brief` ·
**R1 Loop (2026-07-17, same day)**: The Read / Texting DNA / We-Met share cards
(`/api/card/[kind]`, consent preview, quote picker, bands only) · 12-archetype DNA
table (`lib/dna.ts`) · referral `/r/[code]` · PostHog funnel (env-gated,
**NEXT_PUBLIC_POSTHOG_KEY not set yet — ask Kish**) · design polish pass
(40 web unit tests). All browser-verified. Details: HANDOFF-WEB.md R2/R1 sections.

**NEXT — the roadmap is PRD §13 (R1–R5). R1 and R2 are DONE (lean slices; deferred:
rehearsal recording, LLM frame classifier, sharer-XP settlement → R3/R4). Summary:**
- **R1 Loop (growth):** 3 share cards (The Read / DNA / We-Met) via @vercel/og,
  referral plumbing, consent+redaction gate, PostHog funnel. Spec in PRD §7.8 + the
  cached growth-expert brief (see §8 below).
- **R2 Bridge:** open-loop ledger, debt list, spaced fact quiz, date brief, readiness
  score, draft coach + frame classifier. (PRD §7.3–7.5 — the founder's own feature.)
- **R3 Depth:** dual-persona buckets + user-self persona, resonance map + bit tracker,
  conversation-type signal, Framework Library v2 into the taxonomy (verify citations
  first), Practice Gym v1. (PRD §6, §7.1–7.2, §7.6.)
- **R4 Accounts & revenue:** Supabase auth + Postgres sync (all localStorage stores are
  already row-ready shapes), Plus subscription ($9.99/mo) + Deep Thread Review SKU +
  Fluent graduation tier. (PRD §9.)
- **R5 Reach:** PWA share-target, Friend/Reconnect mode, desktop extension spike.

R2 + R1 shipped 2026-07-17. **DESIGN IS NOW "BLOOM"** (2026-07-19, commit f6ba5db,
the current live identity — Mono/violet retired): cream editorial paper + forest-green
signal #4f7a52 + Instrument Serif voice, committed light theme; see web/DESIGN.md.
**THE MIRROR shipped 2026-07-19** (commit 252ac61) — Kish's anti-chatfishing
core-thesis feature: chat-you vs real-you voice fingerprint (lib/voice.ts, 4
personality axes), /mirror screen + per-person "meeting as yourself" on hubs;
persists own-attempt text (GradeRecord.text). **Mono design overhaul (superseded
by Bloom) + ALL of R3 (Sessions 1-3) shipped 2026-07-19.** Buckets v2 + self-persona
+ resonance; Framework Library v2 (10 verified-citation entries) + gate v2 +
conversationType signal (engine deployed, 61 Deno tests); Practice Gym `/gym` +
outcome-attribution flywheel with "landed ↑" transparency (57 web tests). R3 is
DONE. **Person-first IA also shipped 2026-07-19** (founder-user friction fix from
first real use): home = "your people", tap → a person HUB at `/t/[id]` (read +
resonance + readiness + what-you-know + Continue), coach moved to `/t/[id]/chat`,
/new leads with "who's this with?". Details in HANDOFF-WEB.md. Next candidates:
**R4 Accounts & revenue** (PRD §9 — Supabase auth + Postgres sync, Plus
subscription, Deep Thread Review SKU, unlocks sharer-side referral XP) or Phase F
paywall skeleton. **PostHog is LIVE** (key set + verified). Blocked on Kish:
real-phone QA of the new design + person-first flow.

---

## 5. How to run / test / deploy

**Local dev (two processes):**
```bash
# 1. the engine on :8000 (needs the key in env)
cd "C:\Users\Nexdo\Nex_Doc\10-19 Apps\Banter\banter"
# PowerShell: $env:GEMINI_API_KEY=(gc .env.local | sls '^GEMINI_API_KEY=').ToString().Split('=',2)[1]
deno run --allow-net --allow-env Backend/functions/coaching/index.ts
# 2. the web app (uses .env.local COACHING_URL=http://localhost:8000/)
cd web && npm run dev    # port 3000 is sometimes taken; it auto-ports
```

**Tests (all must stay green):**
```bash
deno test Backend/ --allow-env --allow-read          # 56 backend tests
cd web && node --test src/lib/*.test.ts              # 22 web unit tests
cd web && npx tsc --noEmit && npm run lint           # types + lint clean
```

**Deploy engine (after Backend changes):**
```bash
export SUPABASE_ACCESS_TOKEN=<from user env>
export PATH="$PATH:/c/Users/Nexdo/.local/bin"
bash Backend/scripts/deploy-cloud.sh    # syncs source -> supabase/functions -> deploys
```

**Deploy web (after web changes):**
```bash
cd web && vercel deploy --prod --yes    # aliases to banter-tau.vercel.app automatically
```

**Prod smoke test (paste into Bash):**
```bash
curl -s -X POST https://banter-tau.vercel.app/api/coach -H "Content-Type: application/json" \
  -d '{"messages":[{"speaker":"match","text":"hey how was your weekend","order":0}]}' \
  -w "\nSTATUS:%{http_code}\n"    # expect 3 replies + sentiment, 200
```

---

## 6. Environment gotchas (these bit us — don't relearn them)

- **Windows / PowerShell 5.1**: no `&&` chaining, no ternary. Use the **Bash tool** for
  git commits with long messages and for anything POSIX. Don't `cd`-prefix in PowerShell
  (working dir is already set).
- **Next.js 16 is NOT your training data** (see `web/AGENTS.md`). Route handlers, config,
  and React Compiler rules differ. The compiler's **`react-hooks/set-state-in-effect`**
  and **`purity`** lints are strict: never call `setState` or `Date.now()` directly in an
  effect body — defer via `setTimeout(…, 0)` and put any StrictMode guard INSIDE the
  deferred callback (the auto-coach on `/t/[id]` broke exactly this way; fix is in
  `web/src/app/t/[id]/page.tsx`).
- **Stores use `useSyncExternalStore`**, not `useState`+effect (threads, xp, personas,
  profile, grades in `web/src/lib/*.ts`). Follow that pattern for new stores; they're all
  localStorage-backed and row-ready for Supabase later.
- **Preview-browser screenshots were flaky/broken** this session — DOM/`get_page_text`/
  `javascript_tool` verification works fine; visual eyeball QA on a real phone is still
  pending. Ask Kish to look, or use `computer`/screenshot if it recovers.
- **CRLF warnings on every commit** are harmless (LF→CRLF), ignore them.
- **Background workflows hit "session limit" (rate limit)** twice — deep-research and the
  expert panel both got throttled mid-run. If you relaunch a Workflow, expect the
  fetch/verify stages to possibly fail; resume from `resumeFromRunId` replays cached
  agents free. Don't burn retries in a loop.
- **PowerShell mangles em-dashes** when rewriting files via `-replace`/`Set-Content`
  (UTF-16 issue). Use the Edit tool for text with `—` in it, not PowerShell string ops.
- **taxonomy.json is single-sourced**: `Backend/functions/coaching/taxonomy.json` is
  authoritative; `web/src/lib/taxonomy.json` is a synced copy (`Backend/scripts/
  sync-taxonomy.sh`, CI-checked byte-identical). Never hand-edit the web copy.

---

## 7. Research findings on file (sourced, NOT fully verified)

The competitive teardown ran but its **adversarial-verify stage was rate-limited both
times** — so the numbers are sourced-but-not-cross-verified. Treat as directional, verify
before anything external-facing. Key findings (in PRD §1 and used throughout):
- Rizz App: ~7.5M users, **$7/WEEK**, single-screenshot capture, pure generation.
  Complaints: canned replies, renews-after-cancel, PUA vibe, privacy fear.
- Plug AI: **card required before trial**, 2.6★ Android ("payment ambush", $60 surprise).
- Keys AI: keyboard capture = privacy liability. ROAST: profile review $6.99/$12.99/**$97**
  (proves people pay à la carte for feedback → our Deep Thread Review SKU).
- Rizz got ~550M TikTok views via **faceless FAKE-screenshot** accounts. A reviewer
  named the gap nobody fills: AI reply generation "becomes a crutch that stops you
  developing your own skills." That gap is Banter's entire thesis.

---

## 8. Expert-panel status (important nuance)

A 6-expert workflow (Vinh-Giang comms, clinical social-anxiety, learning science,
relationship science, business model, growth) was launched to inform the PRD. It was
**killed mid-run; only the GROWTH expert brief completed and is cached** at:
`.claude/projects/…/subagents/workflows/wf_e133633b-dae/journal.jsonl` (line 7, the
`"type":"result"` line — the R1 share-card specs, K-factor math, content pillars, and
the "never fabricate conversations" moat rule all come from it and are in PRD §7.8/§11).

The other five domains in the PRD (Framework Library v2, learning-science mechanics,
business model, clinical anti-dependency framing) were written **by me from domain
knowledge**, clearly marked `(m)` = memory-based where citations aren't web-verified.
**Before shipping Framework Library v2 into the live taxonomy (R3), verify each citation**
— the whole product promise is "no fabricated citations." If you want the full expert
panel, re-run the workflow (script at `.claude/…/workflows/scripts/
banter-prd-expert-panel-wf_e133633b-dae.js`, resume with `resumeFromRunId:
"wf_e133633b-dae"`); the growth agent replays from cache, the other five run live.

---

## 9. The non-negotiable invariants (do not violate in any change)

1. **Every generated reply/grade passes the taxonomy gate** or nothing ships (no PUA,
   no fabricated citations, anti-AI-tell punctuation rejected). A bad reply is discarded,
   never repaired into compliance.
2. **Persona facts only from the other person's own words**, with the exact quote;
   sensitive-attribute blocklist (religion/health/orientation/ethnicity/politics/money)
   at every intake; user-editable; one-tap delete-everything wipes all of it.
3. **Teaching > replacement.** XP asymmetry (own attempt 8–40 > sent 10 > copy 5) and the
   fading assistance gate are the mission encoded as arithmetic. Never add a mechanic that
   rewards volume or deepens dependency. The fade curve is a public success metric.
4. **The win is offline** (dates met, friendships revived), never thread length or
   engagement time. The walk-away card (recommend quitting a dead thread) stays.
5. **Timing advice mirrors energy, never manufactures distance** ("wait to seem busy" =
   banned scarcity tactic).
6. Raw screenshots never persist beyond OCR; conversation data strictly user-keyed.

---

## 10. Founder context (why this matters — keep this in view)

Kish is an introvert with severe social anxiety who struggles to communicate even with
friends, and who found heavy AI use eroded his own skills further. He is building the
product he needs. He validated it against his own real 2-week conversation (Tamsyn) that
was going well WITH heavy AI help — and his actual stated goal is: **reach the version of
himself he is in chat, in real life, before they meet — through learning along the way,
not last-minute rote memorization.** That is the R2 Bridge feature. Design and talk to him
as that user: calm, encouraging, honest, never salesy. He thinks big and creative; he
responds well to expert-level depth, decisive recommendations, and being told the honest
tradeoff rather than flattered.

His working style (from feedback memory): lean research (1 targeted search per
decision, not agent swarms — the big workflows this session were exceptions he asked
for); write a handoff after every session; prefers monthly-not-weekly thinking; wants the
"mind-blowing detail" but also a working business model, not just vibes.

---

## 11. Task list state

Tasks #1–#18 in the tracker are all COMPLETE (deploy, persona engine, opener flow, timing,
stage machine, phases A–E, PRD). The new chat starts a fresh task list for whichever
release (R1–R5) Kish picks. Nothing is mid-flight in code — the tree is clean, everything
is committed and pushed to `feat/web`.

---

**TL;DR for the new session:** Banter is live and fully working at banter-tau.vercel.app.
The complete plan is in `.planning/PRD.md`. Read PRD + case study + this file, confirm the
smoke test passes, ask Kish which release (R1 growth-loop or R2 IRL-bridge is my pick) to
build, then go — respecting the §9 invariants and the §6 gotchas. Everything deploys with
`deploy-cloud.sh` (engine) and `vercel deploy --prod` (web).
