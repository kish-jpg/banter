---
phase: 04-companion-app-ui-paywall
plan: 02
subsystem: ui
tags: [ios, swiftui, coaching, network, taxonomy, wave-1]

# Dependency graph
requires:
  - phase: 04-companion-app-ui-paywall
    plan: 01
    provides: TaxonomyEntry model, bundled taxonomy.json (BanterApp), 7 failing Wave-0 test scaffolds (TonePickerTests, TagExplainerTests among them)
provides:
  - CoachingClient (BanterApp) — first outbound network call, POSTs AnalyzeConversationRequest, decodes CoachingResponseDTO
  - TonePicker (BanterShared) — pure request-builder for a selected ReplyStyle
  - TagExplainer (BanterShared) — offline taxonomy lookup by tagName, no network call
  - CoachingResultModel (@Observable) — replies/selectedTone/loading/error/expandedTagIndices/dailyCapReached state
  - SuggestionCardView, TonePickerView, TagExplainerSheet (BanterApp SwiftUI views)
  - BanterShared package now bundles its own copy of taxonomy.json (Resources/), synced by an extended sync-taxonomy.sh
affects: [04-03, 04-04, 04-05]

tech-stack:
  added: []
  patterns:
    - "Pure-logic helpers (TonePicker, TagExplainer) live in BanterShared so they compile and run under `swift test --package-path BanterShared`, even though their SwiftUI consumers (TonePickerView, TagExplainerSheet) live in BanterApp — Wave-0 test scaffolds from 04-01 already fixed this symbol placement by referencing TonePicker/TagExplainer directly, not a View type"
    - "CoachingClient mirrors OCRPipeline's async-throws style; single URLSession-based struct, no class, no protocol"

key-files:
  created:
    - BanterApp/Coaching/CoachingClient.swift
    - BanterApp/Coaching/SuggestionCardView.swift
    - BanterApp/Coaching/TonePickerView.swift
    - BanterApp/Coaching/TagExplainerSheet.swift
    - BanterApp/Coaching/CoachingResultModel.swift
    - BanterShared/Sources/BanterShared/CoachingRequestBuilder.swift
    - BanterShared/Sources/BanterShared/TagExplainer.swift
    - BanterShared/Sources/BanterShared/Resources/taxonomy.json
  modified:
    - BanterShared/Package.swift
    - Backend/scripts/sync-taxonomy.sh

key-decisions:
  - "TonePicker and TagExplainer implemented in BanterShared (not BanterApp) — the Wave-0 test files (TonePickerTests.swift, TagExplainerTests.swift) run under `swift test --package-path BanterShared`, which never compiles BanterApp, so the symbols they reference by name must live in the package under test"
  - "taxonomy.json bundled a second time inside BanterShared/Sources/BanterShared/Resources/ (alongside the existing BanterApp/Resources/ copy) so TagExplainer can decode it via Bundle.module inside the BanterShared test target; sync-taxonomy.sh extended to keep both copies byte-identical with the backend-authoritative source, preserving the single-source-of-truth drift guard rather than forking an unsynced copy"
  - "CoachingClient defaults baseURL to a localhost dev value (http://localhost:54321), injectable via init — no production URL or secret hardcoded"
  - "CoachingResultModel marked @MainActor at the class level (not just the selectTone method) since all its mutable state is UI-bound; satisfies the plan's '@MainActor async tone method' requirement by inheritance"

patterns-established:
  - "Inline-expand tag explainer (not .sheet()) per UI-SPEC override — SuggestionCardView conditionally renders TagExplainerSheet inline based on CoachingResultModel.expandedTagIndices, multiple cards expandable simultaneously"

requirements-completed: [COAC-02, COAC-04]

coverage:
  - id: T1
    description: "CoachingClient POSTs AnalyzeConversationRequest to {baseURL}/functions/v1/coaching and decodes CoachingResponseDTO, typed error on non-2xx, no new DTOs, no secret literal"
    verification:
      - kind: other
        ref: "grep 'AnalyzeConversationRequest|CoachingResponseDTO' + grep '/functions/v1/coaching' + grep -i 'api-key|GEMINI_API_KEY' (absent), BanterApp/Coaching/CoachingClient.swift"
        status: pass
      - kind: unit
        ref: "swift test --package-path BanterShared --filter TonePickerTests (deferred — no local Swift toolchain, CI is the compile/run gate)"
        status: unknown
    human_judgment: true
    rationale: "Actual test execution (TonePicker's 4-case round-trip against AnalyzeConversationRequest.tone) can only be confirmed by running swift test on CI — no local Swift toolchain available on this Windows host, consistent with every prior phase."
  - id: T2
    description: "SuggestionCardView renders psychologyTag unconditionally (no isPremium/dailyCapReached guard); TonePickerView iterates 4 ReplyStyle cases and calls model.selectTone; CoachingResultModel is @Observable final class with private(set) state and @MainActor async tone method"
    verification:
      - kind: other
        ref: "grep 'isPremium|dailyCapReached' SuggestionCardView.swift (absent) + grep 'ReplyStyle|selectTone' TonePickerView.swift + grep '@Observable|private(set)|@MainActor' CoachingResultModel.swift"
        status: pass
      - kind: unit
        ref: "swift test --package-path BanterShared --filter TonePickerTests (deferred to CI)"
        status: unknown
    human_judgment: true
    rationale: "Same CI-deferred compile/run gate as T1 — grep proves the structural shape, CI proves it compiles and the tone round-trip actually passes."
  - id: T3
    description: "TagExplainer lookup returns correct TaxonomyEntry for a known tagName and nil for unknown; TagExplainerSheet reads bundled taxonomy with no network call; expanded content shows framework/explanation/Source citation"
    verification:
      - kind: other
        ref: "grep 'URLSession' TagExplainerSheet.swift (absent) + manual review of TagExplainer.swift decode logic against taxonomy.json's {version, allowed:[...]} shape"
        status: pass
      - kind: unit
        ref: "swift test --package-path BanterShared --filter TagExplainerTests (deferred to CI)"
        status: unknown
    human_judgment: true
    rationale: "Lookup-hit/lookup-miss correctness (TagExplainerTests) requires an actual test run; deferred to CI per this project's established Windows-host/no-local-toolchain precedent."

duration: 22min
completed: 2026-07-04
status: complete
---

# Phase 4 Plan 2: Coaching Result Surface Summary

**CoachingClient's first outbound network call, 3 tagged suggestion cards with a tone picker, and an inline tag explainer reading the offline taxonomy — the core Phase 4 vertical slice every later plan builds on**

## Performance

- **Duration:** 22 min
- **Started:** 2026-07-04
- **Completed:** 2026-07-04
- **Tasks:** 3 (all auto/tdd)
- **Files modified:** 10 (8 created, 2 modified)

## Accomplishments

- `CoachingClient` (BanterApp): a thin `URLSession`-based struct that JSON-encodes `AnalyzeConversationRequest`, POSTs to `{baseURL}/functions/v1/coaching`, and decodes `CoachingResponseDTO` — no new request/response model invented, no secret literal, typed error (`CoachingClientError`) on non-2xx.
- `TonePicker` (BanterShared): a pure request-builder (`makeRequest(messages:)`) proving the COAC-02 tone round-trip for all 4 `ReplyStyle` cases — lives in BanterShared because the Wave-0 `TonePickerTests.swift` scaffold (from Plan 01) compiles and runs only under `swift test --package-path BanterShared`.
- `CoachingResultModel`: `@Observable`, `@MainActor` class exposing `replies`/`selectedTone`/`isLoading`/`errorMessage`/`expandedTagIndices`/`dailyCapReached` as `private(set)` state, mutated only via `selectTone(_:)` and `toggleTagExpanded(at:)`.
- `SuggestionCardView`: renders reply text + an always-visible psychology tag chip (never behind an `isPremium`/`dailyCapReached` guard, per MONE-01) + a Copy-to-clipboard action with a "Copied" toast, reusing `ConfirmTranscriptView`'s toast/chip patterns.
- `TonePickerView`: 4-segment picker over the existing `ReplyStyle` enum (not a parallel enum), active segment = surface pill + accent 2pt bottom border, inactive = textSecondary — calls `model.selectTone` on tap.
- `TagExplainer` (BanterShared): offline lookup decoding the bundled `taxonomy.json`'s `allowed` array once, returning the `TaxonomyEntry` whose `tagName` matches, or `nil` for unknown tags — zero network calls.
- `TagExplainerSheet`: an inline disclosure (per UI-SPEC's override of the "Sheet" name) showing framework/explanation/"Source: {citation}", or the raw tag text if no entry exists (graceful degradation, no crash).

## Task Commits

Each task was committed atomically:

1. **Task 1: CoachingClient — first outbound network call, DTO-only** — `e468b5e` (feat)
2. **Task 2: SuggestionCardView + TonePickerView + CoachingResultModel** — `b5bef0a` (feat)
3. **Task 3: TagExplainerSheet — inline expand from bundled taxonomy (COAC-04)** — `a72d305` (feat)

**Plan metadata:** commit pending (this SUMMARY + STATE/ROADMAP update)

## Files Created/Modified

- `BanterApp/Coaching/CoachingClient.swift` — URLSession transport, POSTs/decodes the locked DTOs
- `BanterApp/Coaching/SuggestionCardView.swift` — reply card, always-visible tag chip, Copy action + toast
- `BanterApp/Coaching/TonePickerView.swift` — 4-segment tone picker
- `BanterApp/Coaching/TagExplainerSheet.swift` — inline tag explainer content
- `BanterApp/Coaching/CoachingResultModel.swift` — `@Observable` result state
- `BanterShared/Sources/BanterShared/CoachingRequestBuilder.swift` — `TonePicker` pure request-builder
- `BanterShared/Sources/BanterShared/TagExplainer.swift` — offline taxonomy lookup
- `BanterShared/Sources/BanterShared/Resources/taxonomy.json` — second bundled copy (BanterShared package resource)
- `BanterShared/Package.swift` — declared `Resources/taxonomy.json` as a target resource
- `Backend/scripts/sync-taxonomy.sh` — extended to sync both `BanterApp/Resources/` and `BanterShared/Sources/BanterShared/Resources/` destinations

## Decisions Made

- `TonePicker`/`TagExplainer` placed in BanterShared, not BanterApp: the Wave-0 test scaffolds (`TonePickerTests.swift`, `TagExplainerTests.swift`) run under `swift test --package-path BanterShared`, which never compiles BanterApp — the referenced symbols must live in the package under test. The SwiftUI views (`TonePickerView`, `TagExplainerSheet`) in BanterApp consume these BanterShared helpers rather than duplicating the logic.
- `taxonomy.json` bundled a second time inside `BanterShared/Sources/BanterShared/Resources/` so `TagExplainer` can `Bundle.module`-load it during `swift test --package-path BanterShared` runs. `sync-taxonomy.sh` extended (not replaced) to copy the backend-authoritative source to both client destinations, preserving the single-source-of-truth drift guard from Plan 01 rather than introducing an unsynced fork.
- `CoachingClient.baseURL` defaults to a localhost dev value, injectable via `init`, per the plan's explicit "do not hardcode a production secret or key" instruction.
- `CoachingResultModel` is `@MainActor` at the class level (all state is UI-bound), which satisfies the plan's "`@MainActor func selectTone(_:) async`" requirement by inheritance rather than a per-method annotation.

## Deviations from Plan

**1. [Rule 3 - Blocking issue] Extended BanterShared's Package.swift + sync-taxonomy.sh to bundle taxonomy.json inside BanterShared itself**
- **Found during:** Task 3
- **Issue:** `TagExplainerTests.swift` (Wave-0 scaffold) is a BanterShared test that must decode the bundled taxonomy at runtime via `TagExplainer`, but the only bundled copy that existed (from Plan 01) was `BanterApp/Resources/taxonomy.json` — unreachable from a `swift test --package-path BanterShared` run, which has no BanterApp bundle context.
- **Fix:** Added `BanterShared/Sources/BanterShared/Resources/taxonomy.json` as a package resource (`Package.swift` `resources: [.copy(...)]`), and extended `Backend/scripts/sync-taxonomy.sh` to sync both client destinations from the single backend-authoritative source, so the drift guard still covers both copies.
- **Files modified:** `BanterShared/Package.swift`, `Backend/scripts/sync-taxonomy.sh`, `BanterShared/Sources/BanterShared/Resources/taxonomy.json` (new)
- **Commit:** `a72d305`

## Issues Encountered

None beyond the above. No local Swift toolchain is available in this environment (Windows host) — per Phases 1-3 and Plan 01 precedent, all acceptance criteria were verified via grep-based structural checks (DTO usage, forbidden-token absence, unconditional tag rendering, symbol shape) rather than `swift test`. Actual compile/test-green verification (`TonePickerTests`, `TagExplainerTests` flipping from Wave-0 red to green) is deferred to CI (GitHub Actions macOS runner).

## User Setup Required

None — no external service configuration required. `CoachingClient`'s dev baseURL is a plain localhost default; no live backend call is exercised locally in this environment.

## Next Phase Readiness

- `CoachingResultModel` + `SuggestionCardView`/`TonePickerView`/`TagExplainerSheet` form a complete, self-contained coaching-result surface — later plans (onboarding demo coordinator, timeline ingest, paywall gating) can construct a `CoachingResultModel` and drop these views in without further plumbing.
- `dailyCapReached` defaults to `false` on `CoachingResultModel`, keeping this plan's surface ungated — Plan 05 (paywall) is expected to set it via a later wiring pass, per RESEARCH.md Pitfall 4 (never gate the onboarding demo path).
- CI remains the sole environment that can confirm `TonePickerTests`/`TagExplainerTests` actually flip green — flag for the next executor/verifier to check the CI run once pushed.
- The two-copies-of-taxonomy.json pattern (BanterApp + BanterShared) is now established; any future taxonomy edit must run `Backend/scripts/sync-taxonomy.sh` to keep all three locations (backend-authoritative + 2 client copies) byte-identical.

---
*Phase: 04-companion-app-ui-paywall*
*Completed: 2026-07-04*

## Self-Check: PASSED

All 8 created/modified source files verified present on disk; all 3 task commits (e468b5e, b5bef0a, a72d305) verified in git log.
