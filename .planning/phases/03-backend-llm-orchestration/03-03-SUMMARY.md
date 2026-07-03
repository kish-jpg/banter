---
phase: 03-backend-llm-orchestration
plan: 03
subsystem: api
tags: [deno, coaching-endpoint, ci, ubuntu-job, shared-fixture, swift-contract, gemini-key-guard, live-smoke]

# Dependency graph
requires:
  - "Backend/functions/coaching/taxonomy.ts + validate.ts (03-01) - the gate"
  - "Backend/functions/coaching/llm/LLMProvider.ts + GeminiAdapter.ts + promptAssembly.ts (03-02) - the generation call"
provides:
  - "Backend/functions/coaching/index.ts - the coaching edge function orchestrator (COAC-01/03/05/07, CALC-01)"
  - "Backend/tests/fixtures/coaching-response.sample.json - the canonical Deno<->Swift shared fixture"
  - "BanterShared CoachingResponseDTO + CoachingContractTests - the Swift decode side of the contract"
  - "BanterShared GeminiKeyBoundaryGuardTests - the T-03-04 tripwire"
  - "Backend/scripts/sync-fixture.sh + smoke-coaching.sh - the drift guard and the live dev-run path"
  - ".github/workflows/ci.yml backend-tests job - the ubuntu-latest Deno gate"
affects: []

# Tech tracking
tech-stack:
  added: ["denoland/setup-deno@v2 (GitHub Action, pinned deno-version 2.9.1)"]
  patterns:
    - "generateAndGate<T> helper: retries a gated LLM call once with a stricter reminder, else 502 - the single place T-03-01 is enforced"
    - "Opener path reuses the same generateAndGate/validateCoachingResponse gate by wrapping { openers } into { replies } - one gate, two callers"
    - "Single-source-of-truth fixture: Backend/tests/fixtures/coaching-response.sample.json is authoritative; BanterShared's copy is generated + diff-checked by sync-fixture.sh, run both locally and in CI"

key-files:
  created:
    - Backend/functions/coaching/index.ts
    - Backend/tests/index.test.ts
    - Backend/tests/fixtures/coaching-response.sample.json
    - Backend/scripts/sync-fixture.sh
    - Backend/scripts/smoke-coaching.sh
    - Backend/README.md
    - BanterShared/Tests/BanterSharedTests/CoachingContractTests.swift
    - BanterShared/Tests/BanterSharedTests/GeminiKeyBoundaryGuardTests.swift
    - BanterShared/Tests/BanterSharedTests/Fixtures/coaching-response.sample.json
  modified:
    - BanterShared/Sources/BanterShared/NetworkDTOs.swift
    - .github/workflows/ci.yml

key-decisions:
  - "conversationId is client-minted; the server only echoes it back if present - offline-first, stable for Phase 4's timeline UI, keeps the backend stateless for identity."
  - "Phase 3 is server-stateless for sentiment: no SentimentEvent row is persisted; the response carries aggregate sentiment only. Event-timeline persistence is explicitly Phase 4 scope (Open Q2 deferral, documented in Backend/README.md)."
  - "docker compose restart does NOT reload docker-compose.yml's environment: block - discovered live during the smoke test (Gemini 403'd because GEMINI_API_KEY never reached the container). smoke-coaching.sh now uses `docker compose up -d --force-recreate functions`."
  - "GEMINI_API_KEY and the docker-compose.yml env wiring for it both live under the gitignored infra/supabase/ path - confirmed via git check-ignore before editing, never committed."

requirements-completed: [COAC-01, COAC-03, COAC-05, COAC-06, COAC-07, CALC-01]

coverage:
  - id: D1
    description: "index.ts wires request-validate -> taxonomy -> prompt -> LLMProvider -> validateCoachingResponse -> respond; gate-rejection retries once then 502s; input validation (empty/oversized) 400s"
    requirement: "COAC-01, COAC-03, COAC-06"
    verification:
      - kind: unit
        ref: "Backend/tests/index.test.ts (7 tests: happy path, retry-then-200, both-fail-502, empty 400, oversized 400, opener path, fixture-shape match)"
        status: pass
      - kind: manual
        ref: "Live smoke test via Backend/scripts/smoke-coaching.sh against the self-hosted stack + real Gemini API"
        status: pass
    human_judgment: false
  - id: D2
    description: "Opener path (COAC-07) generates 3 openers from match-profile text through the identical taxonomy gate"
    requirement: "COAC-07"
    verification:
      - kind: unit
        ref: "Backend/tests/index.test.ts opener-path test"
        status: pass
    human_judgment: false
  - id: D3
    description: "Shared fixture is byte-identical in both Backend/tests/fixtures/ and BanterShared/Tests/BanterSharedTests/Fixtures/, enforced by sync-fixture.sh's cp+diff, run locally and in the backend-tests CI job"
    requirement: "D-01 shared fixture"
    verification:
      - kind: other
        ref: "bash Backend/scripts/sync-fixture.sh (exits 0, diff prints nothing)"
        status: pass
      - kind: unit
        ref: "BanterShared CoachingContractTests decodes the fixture into CoachingResponseDTO (3 replies + sentiment) - verified green on macos-26 CI run 28684721967"
        status: pass
    human_judgment: false
  - id: D4
    description: "backend-tests CI job on ubuntu-latest runs deno test with mocked Gemini; existing macos-26 job untouched"
    requirement: "CI split"
    verification:
      - kind: other
        ref: "GitHub Actions run 28684721967 - both backend-tests and build-and-test jobs green"
        status: pass
    human_judgment: false
  - id: D5
    description: "GEMINI_API_KEY (and the Gemini REST endpoint) never appears in client (iOS) source - structural grep tripwire"
    requirement: "T-03-04"
    verification:
      - kind: unit
        ref: "BanterShared GeminiKeyBoundaryGuardTests scans BanterShared/Sources + BanterApp/, green on macos-26 CI"
        status: pass
    human_judgment: false
  - id: D6
    description: "CALC-01: sentiment {score, factors, signal} returned alongside every coaching response"
    requirement: "CALC-01"
    verification:
      - kind: unit
        ref: "Backend/tests/index.test.ts asserts sentiment shape; live smoke test returned a real sentiment object"
        status: pass
    human_judgment: false

duration: 50min
completed: 2026-07-04
status: complete
---

# Phase 3 Plan 3: Coaching Edge Function Orchestrator + Shared Contract + CI Split + Live Smoke Test Summary

**The full vertical slice wired end-to-end: `index.ts` orchestrates request-validate -> taxonomy -> prompt -> Gemini -> gate -> respond (including the COAC-07 opener path), a byte-identical shared fixture provably keeps the Deno response and Swift decoder in sync, a new ubuntu-latest `backend-tests` CI job runs the mocked Deno suite alongside the untouched macOS job, a grep tripwire guarantees GEMINI_API_KEY never reaches client source, and a real live call against the self-hosted stack returned 3 tagged replies + sentiment through the taxonomy gate.**

## Performance

- **Duration:** 50 min
- **Started:** 2026-07-03T21:23:37Z
- **Completed:** 2026-07-04T09:47:00Z (local dev-machine wall time across session)
- **Tasks:** 3
- **Files modified:** 13 (9 created, 2 modified in Task 1/2/3 commits, plus 1 gitignored infra edit never committed)

## Accomplishments

- **`index.ts`**: thin `Deno.serve` handler implementing the RESEARCH 7-step flow — parse+validate request body (non-empty `messages`, length cap `MAX_TOTAL_CHARS=8000`, `MAX_MESSAGES=50`, tone enum), branch on coaching-vs-opener shape, call `GeminiAdapter` behind the `LLMProvider` interface only, gate the output through `validateCoachingResponse`, retry once with a stricter reminder, 502 if still invalid, otherwise 200 with the `CoachingResponse` JSON plus an echoed `conversationId`. No JWT re-implementation (delegated to the stock `main` router's `VERIFY_JWT`); no `SentimentEvent` persistence (Phase 3 stateless).
- **`generateAndGate<T>` helper**: the single place T-03-01 (bad content never reaches the client) is enforced — both the coaching path and the opener path (COAC-07) route through it.
- **`index.test.ts`**: 7 new tests (happy path 200/3-replies+sentiment, gate-rejection-retry-then-200, gate-rejection-both-fail-502, empty-messages-400, oversized-transcript-400, opener-path-through-gate, fixture-shape-match) — 30/30 total Deno tests passing.
- **`coaching-response.sample.json`**: the canonical shared fixture (3 replies with allowlisted tags, no confidence field, full sentiment object) — kept byte-identical in both `Backend/tests/fixtures/` and `BanterShared/Tests/BanterSharedTests/Fixtures/` via `sync-fixture.sh`'s cp+diff.
- **`CoachingResponseDTO`/`SentimentDTO`/`SentimentFactors`** added to `NetworkDTOs.swift`, matching the Deno `CoachingResponse` type field-for-field (no `confidence`, fixed-key `factors`).
- **`CoachingContractTests.swift`**: decodes the shared fixture via `Bundle.module` (fixed mid-plan to use `subdirectory: "Fixtures"`, matching the existing `OCRPipelineTests` pattern — the flat lookup alone failed in CI).
- **`GeminiKeyBoundaryGuardTests.swift`**: greps every `.swift` file under `BanterShared/Sources` and `BanterApp/` for `GEMINI_API_KEY` / `generativelanguage.googleapis.com` — passes because the key never crosses into client source (confirmed absent via direct grep before writing the test, too).
- **`.github/workflows/ci.yml`**: new `backend-tests` job on `ubuntu-latest` (denoland/setup-deno@v2, pinned 2.9.1) running `sync-fixture.sh` then `deno test Backend/`. The existing `macos-26` job is untouched except for the new tests it now also runs (`CoachingContractTests`, `GeminiKeyBoundaryGuardTests`) as part of the pre-existing `swift test --package-path BanterShared` step.
- **`Backend/README.md`**: documents the tracked-path rule, the sync step, the resolved Kong route (zero changes needed), the conversationId decision, the Phase-4 sentiment-persistence deferral, and how to run tests/smoke locally.
- **`smoke-coaching.sh`**: developer-run script, never wired into CI, that syncs code into the gitignored Docker volume, recreates the `functions` container, and curls the live endpoint.
- **Live smoke test: RUN AND PASSED.** See below — real Gemini replies returned through the full gated pipeline.

## Task Commits

Each task was committed atomically:

1. **Task 1: coaching edge function orchestrator + opener path + full-path test** - `4192a25` (feat)
2. **Task 2: Swift CoachingResponse DTO + shared-fixture contract test + GEMINI_API_KEY tripwire** - `39fea08` (feat)
3. **Task 3: backend-tests CI job + smoke script + Backend/README** - `b368ed0` (feat)

**Mid-plan fixes** (both Rule 1 - bugs found while proving the plan's own verification steps, not scope creep):

4. **Fix: Bundle.module fixture lookup needs `subdirectory: "Fixtures"`** - `374541b` (fix)
5. **Fix: smoke-coaching.sh must recreate, not restart, the functions container** - `ea02d31` (fix)

**Plan metadata:** (this commit)

## Files Created/Modified

- `Backend/functions/coaching/index.ts` — the orchestrator
- `Backend/tests/index.test.ts` — 7 new Deno tests
- `Backend/tests/fixtures/coaching-response.sample.json` — canonical shared fixture
- `Backend/scripts/sync-fixture.sh` — single-source-of-truth cp+diff guard
- `Backend/scripts/smoke-coaching.sh` — developer-run live smoke script
- `Backend/README.md` — sync step, Kong route, conversationId decision, Phase-4 deferral
- `BanterShared/Sources/BanterShared/NetworkDTOs.swift` — added `CoachingResponseDTO`/`SentimentDTO`/`SentimentFactors`
- `BanterShared/Tests/BanterSharedTests/CoachingContractTests.swift` — 3 new XCTest cases
- `BanterShared/Tests/BanterSharedTests/GeminiKeyBoundaryGuardTests.swift` — the T-03-04 tripwire
- `BanterShared/Tests/BanterSharedTests/Fixtures/coaching-response.sample.json` — generated copy, byte-identical
- `.github/workflows/ci.yml` — new `backend-tests` job (ubuntu-latest)

## Live Smoke Test Result (crown evidence)

Ran `bash Backend/scripts/smoke-coaching.sh` against the self-hosted Supabase stack (Docker Desktop running, all containers healthy) with the real `GEMINI_API_KEY` injected into the `functions` container's environment. POSTed a 3-message sample transcript to `http://localhost:8000/functions/v1/coaching`.

**Actual JSON response (real Gemini call, through the full gate):**

```json
{
  "replies": [
    {
      "text": "Just a local spot called Franklin Canyon! It's super green right now. You ever been?",
      "psychologyTag": "Turning toward a bid",
      "style": "playful"
    },
    {
      "text": "Oh, just up at Griffith Park. I like pretending I'm in a movie montage when I'm hiking there, haha.",
      "psychologyTag": "Reciprocal self-disclosure",
      "style": "playful"
    },
    {
      "text": "Ventura River Trail, nothing too crazy. Got to see some cool birds! How's your week shaping up so far?",
      "psychologyTag": "Mutual exchange",
      "style": "playful"
    }
  ],
  "sentiment": {
    "score": 0.85,
    "factors": { "interest": 0.9, "reciprocity": 0.8, "warmth": 0.9, "responsiveness": 0.9 },
    "signal": "Positive follow-up, open-ended question."
  }
}
```

All 3 psychology tags are allowlisted (`Turning toward a bid`, `Reciprocal self-disclosure`, `Mutual exchange`); no em dash/semicolon; no banned terms; gate passed on the first attempt (no retry needed). Function container logs confirmed clean (`serving the request with /home/deno/functions/coaching`, no errors) after the fix below.

**One issue hit and fixed during the smoke test itself:** the first attempt 403'd from Gemini ("Method doesn't allow unregistered callers") because `docker compose restart functions` does not reload `docker-compose.yml`'s `environment:` block — `GEMINI_API_KEY` never reached the running container despite being correctly set in `infra/supabase/docker/.env` and wired into the compose file. Fixed by switching `smoke-coaching.sh` to `docker compose up -d --force-recreate functions`, which does pick up env changes. Re-ran and got the clean response above.

## CI Run Evidence

- Run `28684290492` (initial push): `backend-tests` green; `build-and-test` FAILED at `Test BanterShared` — `CoachingContractTests` couldn't locate the fixture (`Bundle.module.url(forResource:withExtension:)` alone doesn't find files under SPM's `.copy("Fixtures")` resource bundle layout).
- Fixed in commit `374541b` (matched the existing working pattern from `OCRPipelineTests`: try `subdirectory: "Fixtures"` first, fall back to flat lookup).
- Run `28684372341` (after fix): **both jobs green** — `backend-tests` in 9s, `build-and-test` in 7m30s (including `CoachingContractTests` + `GeminiKeyBoundaryGuardTests` passing).
- Run `28684721967` (after the smoke-script fix, docs-only backend delta): **both jobs green again** — `build-and-test` 7m13s, `backend-tests` 8s. This is the final, current state of `main`.

## Decisions Made

- `conversationId` is client-minted; the server only echoes it back if present in the request body. Keeps the backend stateless for conversation identity and matches the offline-first architecture (client doesn't need a round-trip to get a stable ID for Phase 4's timeline UI).
- Phase 3 is server-stateless for sentiment: no `SentimentEvent` row is persisted anywhere. The response carries an aggregate `sentiment` object only; event-timeline persistence is explicit Phase 4 scope (Open Q2 deferral, documented in `Backend/README.md`).
- `docker compose restart` does not reload `docker-compose.yml`'s `environment:` block — discovered live, not in a test — `smoke-coaching.sh` now uses `docker compose up -d --force-recreate functions`.
- `GEMINI_API_KEY`'s wiring into `infra/supabase/docker/.env` and `docker-compose.yml`'s `functions` service `environment:` block both live under the gitignored `infra/supabase/` path — confirmed via `git check-ignore` (exit 0) before editing either file; neither was committed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed `index.ts` type error: opener path returned `{ openers }` where `generateAndGate<T>` expected `{ replies }`**
- **Found during:** Task 1, `deno check Backend/functions/coaching/index.ts` (a standalone type-check beyond what `deno test`'s bundler-level check caught)
- **Issue:** `generateAndGate`'s generic constraint requires `{ replies: ... }`; the opener branch passed `adapter.generateOpeners(...)` directly, which resolves to `{ openers: ... }`.
- **Fix:** Wrapped the opener call to return `{ replies: openers }` internally, then read `result.replies` back out as `openers` in the response body.
- **Files modified:** Backend/functions/coaching/index.ts
- **Verification:** `deno check` clean; all 30 tests still pass.
- **Committed in:** `4192a25` (Task 1 commit — fixed before commit, not a separate fix commit)

**2. [Rule 1 - Bug] Fixed `CoachingContractTests`'s `Bundle.module` fixture lookup**
- **Found during:** CI run `28684290492` (macos-26 `build-and-test` job failure — no local Swift toolchain available to catch this earlier)
- **Issue:** `Bundle.module.url(forResource: "coaching-response.sample", withExtension: "json")` alone returned nil in the CI-built resource bundle; SPM's `.copy("Fixtures")` target nests files under a `Fixtures` subdirectory inside the bundle.
- **Fix:** Matched the existing, working `OCRPipelineTests` pattern: try `subdirectory: "Fixtures"` first, fall back to the flat lookup, wrapped in `XCTUnwrap`.
- **Files modified:** BanterShared/Tests/BanterSharedTests/CoachingContractTests.swift
- **Verification:** CI run `28684372341` — `build-and-test` green, `CoachingContractTests` passing.
- **Committed in:** `374541b`

**3. [Rule 1 - Bug] Fixed `smoke-coaching.sh`'s container-refresh command**
- **Found during:** Task 3 live smoke-test execution (real Docker stack, real Gemini call)
- **Issue:** `docker compose restart functions` restarts the container process but does not re-evaluate `docker-compose.yml`'s `environment:` block against the current `.env`/shell state — the newly-added `GEMINI_API_KEY` never reached the container, causing a live 403 from Gemini ("unregistered caller").
- **Fix:** Changed to `docker compose up -d --force-recreate functions`, which recreates the container with the current resolved environment.
- **Files modified:** Backend/scripts/smoke-coaching.sh, Backend/README.md (documented the "why" inline so a future developer doesn't hit the same 403)
- **Verification:** Re-ran the smoke test after the fix — real Gemini response with 3 tagged replies + sentiment (see Live Smoke Test Result above).
- **Committed in:** `ea02d31`

---

**Total deviations:** 3 auto-fixed (1 caught by `deno check` before commit, 2 caught live by CI/the smoke test itself — all Rule 1 bugs, no scope creep, no architectural changes).
**Impact on plan:** None on scope. All three fixes make the plan's own verification steps (type-check, CI, live smoke) actually pass as intended; the orchestration design, shared-fixture contract, and CI split are exactly as planned.

## Known Stubs

None. The coaching endpoint is fully wired — no hardcoded empty arrays, no placeholder text, no mock data flowing to a client-facing path. The only "stub"-adjacent item is the intentional Phase 3 scope boundary: sentiment is computed and returned per-request but not persisted as an event timeline (explicitly Phase 4, documented in Backend/README.md and PROJECT.md decisions — not an oversight).

## Threat Flags

None beyond what the plan's `<threat_model>` already covers. No new network endpoints, auth paths, or schema changes were introduced outside T-03-01, T-03-04, T-03-07, T-03-08 (all already mitigated per the plan) and T-03-SC (no package installs this plan beyond the pinned `denoland/setup-deno@v2` GitHub Action, which the plan's own threat register already dispositions as non-blocking).

## Issues Encountered

- No local Swift toolchain on this Windows dev machine (consistent with Phase 1's precedent) — `CoachingContractTests` and `GeminiKeyBoundaryGuardTests` were authored carefully against the existing `NetworkBoundaryGuardTests`/`OCRPipelineTests` patterns and proven via CI, not `swift test` locally. This is how the `Bundle.module` fixture-lookup bug (Deviation 2) surfaced in CI rather than locally — acceptable given the established project precedent, but worth noting for anyone expecting a local pre-push Swift check.
- The live smoke test required one iteration to diagnose a Docker Compose env-reload gotcha (Deviation 3) — resolved within the plan's 4-iteration fix budget (used 1).

## User Setup Required

None beyond what was already done before this plan started: `GEMINI_API_KEY` was already present in `.env.local` (per environment_facts) and Docker Desktop / the self-hosted Supabase stack were already running. This plan added `GEMINI_API_KEY` to the gitignored `infra/supabase/docker/.env` and to `docker-compose.yml`'s `functions` service `environment:` block (also gitignored) — this is deploy-target wiring, not a new external service, and required no new credentials.

## Next Phase Readiness

- The coaching endpoint is live-proven end-to-end: a real transcript through Kong -> the coaching function -> Gemini -> the taxonomy gate -> back to the client, returning exactly 3 tagged replies + sentiment.
- `CoachingResponseDTO` is ready for Phase 4's `CoachingClient` to decode the real network response.
- The opener path (COAC-07) is gated identically to the coaching path and ready for a Phase 4/5 UI to call.
- Both CI jobs (`backend-tests` on ubuntu, `build-and-test` on macos-26) are green on `main` as of commit `ea02d31` / run `28684721967`.
- No blockers. Phase 3 is complete: all six requirements (COAC-01, COAC-03, COAC-05, COAC-06, COAC-07, CALC-01) are marked complete in REQUIREMENTS.md.

## Self-Check: PASSED

All created files verified present on disk; all five commits (`4192a25`, `39fea08`, `b368ed0`, `374541b`, `ea02d31`) verified present in git log; both CI jobs verified green on GitHub Actions run `28684721967`; the live smoke test's JSON response was captured directly from the actual `curl` output against the running self-hosted stack.
