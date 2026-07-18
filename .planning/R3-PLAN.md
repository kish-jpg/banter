# R3 Depth — Build Plan

**Status: reviewed via workflow map (claude.ai/code/artifact/6b6a4ade-d3dc-4539-8f22-6686695176b8),
decisions locked 2026-07-17 on the recommended options. This file is the execution
workflow: 3 sessions, each shipped + verified independently.**

---

## Locked decisions (with the reasoning)

| # | Decision | Locked choice | Why |
|---|---|---|---|
| 1 | Bucket list | The 10 case-study buckets, **added to** the existing 7 types (additive union, no migration) | Old types stay valid so zero data migration risk; new extractions use the full vocabulary. Buckets came from a real successful corpus, not speculation — add more only when a gap shows in use |
| 2 | Build order | A→G (data → engine → gym → learning) | A+B are foundations everything reads; C is pure compute over them; D+E share one engine deploy; F needs B (self-persona); G needs the full round-trip live |
| 3 | Self-persona scope | Per-relationship facts + one global "you" (single store, facts tagged with optional personaId; null = global) | Chat-self demonstrably differs per relationship (case study §4); global powers DNA/Gym, per-relationship powers authenticity debt + readiness. One store, one tag — cheap |
| 4 | Resonance surfaces | Persona page + date brief only | Calm > dense; the thread screen keeps one primary action. Resonance is a reflection surface, not an in-flow one |
| 5 | Gym XP | +8 per completed drill (1 drill/day cap), ×1.5 streak multiplier from day 7 (=12) | Below own-attempt XP (8–40) so the Gym can never outfarm real conversation; daily cap kills volume farming; Goodhart guard holds |
| 6 | Engine deploys | Bundle D+E into one deploy | One test cycle, one smoke; E's citation verification is the long pole and D rides along free |

---

## Session 1 — Foundations (workstreams A + B + C, web only)

### A. Attribute buckets v2
- `lib/persona.ts`: extend `FactType` additively with `food · people-animals ·
  values · humor · love-language · style · open-question` (old 7 remain valid).
- `lib/salience.ts`: STAGE_WEIGHTS rows for new types (food/interests high in
  rapport, values/love-language high in depth, open-question = curiosity fuel
  for the coach in opening/rapport, style never injected — it tunes tone, not content).
- `/api/facts` prompt v2: bucket definitions + the provenance/blocklist rules
  unchanged; max 8/pass (denser corpus, same review UX).
- `persona-panel.tsx`: group facts by bucket; `open-question` renders as
  "still don't know — worth asking" suggestions.
- Tests: salience weights for new types; type-guard test that old stored facts load.

### B. User-self persona
- `lib/self.ts` (`banter.self`): same PersonaFact shape + `personaId: string | null`
  (null = global you). Same sensitive blocklist. clearAll wipes it.
- `/api/self-facts`: extraction over the USER side (traits, stories, claims,
  humor register, style, values) — quote provenance from your own words.
- Wiring: runs post-coaching alongside facts/loops (persona threads only);
  suggested-never-silently-saved review UI (reuse FactSuggestions pattern).
- Surfaces: "you in this chat" in thread coaching options; global "who you are
  in chat" section on /you.
- Tests: store round-trip, blocklist on self-facts, global-vs-relationship split.

### C. Resonance map
- `lib/resonance.ts` (pure): 
  - **Locks**: keyword-overlap matches between both personas' facts, weighted by
    a static rarity table (non-drinker 5, dietary alignment 4, shared-boundary
    respect 4, overthinker/values 3, pets 2, generic interest 1). Every lock
    carries both quotes — traceable or it doesn't render.
  - **Tensions**: boundary/value facts from either side flagged as candidate
    tensions; user confirms keep/drop (provenance-honest, no inferred conflict);
    states open / bridged / paused.
  - **Bits**: loops of kind `bit` gain `seenCount` (incremented when extraction
    re-detects an existing bit instead of dedupe-dropping it). Alive = seen ≥ 2.
- UI: resonance section on persona panel + date brief ("locked · tension · alive bits").
- Tests: lock weighting order, quote traceability, seenCount increment.

**Done when:** tests green (target ~50 web units), tsc/lint/build clean, browser
verify with the Tamsyn-shaped seed, deploy, HANDOFF-WEB + TRANSFER updated.

**✅ SESSION 1 SHIPPED 2026-07-19** (45 tests; details in HANDOFF-WEB.md).
Note: built on the new Mono design system (see web/DESIGN.md — full reskin
happened between planning and this session).

---

## Session 2 — Engine (workstreams D + E, ONE engine deploy)

### E first (long pole): Framework Library v2
1. **Verify citations** (web research, one targeted pass per framework):
   Active-Constructive Responding (Gable et al.), Five Secrets (Burns),
   observation-vs-evaluation (Rosenberg NVC), conversation-type matching
   (Duhigg), message-rhythm variance + open loops (Giang adaptation, craft-
   sourced — cite as practice, not research, or cut). **Unverifiable = cut.**
2. `Backend/functions/coaching/taxonomy.json` v2 → `sync-taxonomy.sh` → CI check.
3. Gate v2 validators in `validate.ts`: frame classifier (prize-framing),
   question-stacking (>1 per reply), good-news-passed-over, evaluation-language.
   Generated replies violating them are discarded, never repaired.
4. Prompt: rhythm-variance directive (vary length, drop the reflex question,
   let a beat land) added to the anti-AI-tell block.

### D. Conversation-type signal
- Read schema + `conversationType: practical | emotional | social` (one field).
- Web: type chip in the read strip; mismatch watch-out when user's last message
  type ≠ theirs ("she's sharing feelings, you're solving logistics").

**Done when:** Deno tests extended (~70), `deploy-cloud.sh` run, prod smoke
(3 replies + sentiment + conversationType), web chip live, docs updated.
Client draft.ts stays as the instant pre-send path (fast, offline).

**✅ SESSION 2 SHIPPED 2026-07-19** (61 Deno + 45 web tests; all four citations
verified before ship, Giang material demoted to prompt directives; prod smoke
returned the mismatch scenario perfectly. Details in HANDOFF-WEB.md).

---

## Session 3 — Gym + Learning (workstreams F + G, web only)

### F. Practice Gym v1
- `lib/gym.ts` (`banter.gym`): drill = { momentRef (past match message, theirs
  redacted in display), constraint, targetDim, grade, at }.
  - Generator: weakest DNA dim → constraint pool (naturalness: "no question this
    time" / "two words max" / "let it land"; reciprocity: "give before you ask";
    warmth: "respond to the good news"; specificity: "name the detail").
  - 1 drill/day; spacing 1/3/7/14 per constraint type like the fact quiz.
  - Constraint pre-check client-side (e.g. no-question = no `?`), then the
    normal `mode:"grade"` round-trip; grade recorded to the same history.
- Route `/gym` + entry on /you next to the streak. XP per decision #5: +8 per
  completed drill, ×1.5 (=12) from a 7-day streak, hard 1/day cap.
- Tests: generator targets weakest dim, constraint checks, daily cap.

### G. Outcome attribution
- `lib/flywheel.ts` (`banter.flywheel`): on each import AFTER a sent reply,
  compute response delta: their reply length ratio, question-back (bool),
  warmth/interest delta from the new read.
- Fact scoring: injected facts of that round get `score += delta` (bounded);
  `lib/salience.ts` multiplies by `1 + clamp(score)` — promoted facts surface,
  flopped facts sink below the novelty penalty.
- Surfaced honestly: persona panel shows "landed well ↑ / hasn't landed ↓" on
  scored facts (transparency = trust; nothing invisible shapes the coaching).
- Tests: delta math, promotion changes selectFacts order, demotion floors.

**Done when:** full-loop browser test (send → import reply → fact promoted),
deploy, HANDOFF/TRANSFER/memory updated. R3 complete.

---

## Carried invariants (every session)
1. Facts from stated words only, exact quote, both personas. No inference.
2. Sensitive blocklist at every intake including self-persona.
3. Resonance renders nothing that can't be traced to a quote.
4. No framework ships without a verified citation — cut beats fudge.
5. XP never rewards volume; the fade curve stays the success metric.
6. Everything localStorage row-ready; delete-everything wipes all of it.

## Explicitly out of R3
Voice rehearsal recording (audio UX, v3.1) · trained reranker (needs R4 accounts
+ data volume; the flywheel log is its future training set) · live message
reading (platform wall, R5 ladder) · accounts/payments (R4).
