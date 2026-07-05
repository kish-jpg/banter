---
phase: 04-companion-app-ui-paywall
plan: 07
subsystem: love-calculator
tags: [ios, swiftui, charts, love-calculator, sentiment, wiring, gap-closure]

# Dependency graph
requires:
  - phase: 04-companion-app-ui-paywall
    plan: 06
    provides: HomeModel/HomeView post-onboarding surface, startCoaching()'s CoachingResultModel construction site
  - phase: 04-companion-app-ui-paywall
    plan: "?"
    provides: SentimentTimelineStore, ConversationHealthView, SentimentEvent (built and unit-tested in an earlier Wave-0 plan, previously unreachable dead code)
provides:
  - "CoachingResultModel.onResponse — additive optional (CoachingResponseDTO) -> Void hook fired once per non-stale coaching response"
  - "HomeModel.conversationId (client-minted UUID) + HomeModel.sentimentStore (SentimentTimelineStore) — the first production write path for the love-calculator timeline"
  - "HomeView NavigationLink to ConversationHealthView(conversationId: model.conversationId, store: model.sentimentStore) — the first production read/nav path"
affects: [Phase 5 keyboard extension (if it ever surfaces conversation health from the shared App Group store), any future settings/premium entry point]

tech-stack:
  added: []
  patterns:
    - "CoachingResultModel's response-hook shape (capGate/onAnalysisRecorded/onResponse) is now a 3-closure injected side-effect trio, each independently optional and defaulted nil — the onboarding demo path stays ungated/append-free by never supplying any of them"
    - "HomeModel is the sole production construction site for SentimentTimelineStore, mirroring its existing role as sole construction site for EntitlementManager/DailyCapTracker (04-06) — one HomeModel instance == one conversationId"

key-files:
  created: []
  modified:
    - BanterApp/Coaching/CoachingResultModel.swift
    - BanterApp/Home/HomeModel.swift
    - BanterApp/Home/HomeView.swift

key-decisions:
  - "onResponse's append call is written as a single-line sentimentStore.append(from: ...) statement (not the plan's illustrative multi-line form) specifically so the plan's own grep verify (sentimentStore\\.append\\(from:) matches on one line — grep has no multiline mode here and the plan's acceptance criteria is grep-authoritative"
  - "messageIndex uses max(0, importModel.transcript.count - 1) exactly as specified — the plan explicitly calls out that the exact index is not load-bearing since the chart keys marks by array offset, not messageIndex uniqueness"
  - "speaker: .match is used (not .user) because the aggregate sentiment from a coaching response reflects the exchange's match-facing engagement, per the plan's explicit rationale"

requirements-completed: [CALC-02, CALC-03]

coverage:
  - id: D1
    description: "CoachingResultModel gains an additive onResponse hook, called within the newest-generation guard right after onAnalysisRecorded, with the demo path's nil default preserving ONBD-01 byte-for-byte"
    requirement: "CALC-02"
    verification:
      - kind: other
        ref: "grep -Eq 'onResponse: *\\(\\(CoachingResponseDTO\\) *-> *Void\\)\\?' and 'onResponse?(response)' and 'guard generation == requestGeneration' in CoachingResultModel.swift — all three present"
        status: pass
    human_judgment: true
    rationale: "Grep proves the additive shape and call-site placement; actual Swift compile correctness (closure capture semantics, actor isolation) cannot be confirmed on this Windows host with no local Swift toolchain — deferred to CI per Phase 1-4 precedent."
  - id: D2
    description: "HomeModel mints conversationId = UUID() and constructs SentimentTimelineStore(), then calls sentimentStore.append(from:conversationId:messageIndex:speaker:) inside the onResponse closure passed to CoachingResultModel — the store's first production write path (CALC-02), keyed strictly by conversationId (CALC-03, no match-identity parameter anywhere)"
    requirement: "CALC-02"
    verification:
      - kind: other
        ref: "grep 'SentimentTimelineStore()'/'conversationId *= *UUID\\(\\)'/'sentimentStore\\.append\\(from:' in HomeModel.swift — all present; grep -riE 'matchName|matchIdentity' across BanterApp/Home + BanterApp/Coaching — zero matches"
        status: pass
    human_judgment: true
    rationale: "Grep proves construction + write-call shape and the absence of any match-identity parameter; whether the append actually populates AppGroupStore correctly at runtime requires a simulator run, unavailable on this host."
  - id: D3
    description: "HomeView adds a NavigationLink presenting ConversationHealthView(conversationId: model.conversationId, store: model.sentimentStore) — the same instances used for writes — giving the view its first production call site outside its own declaration file (CALC-02)"
    requirement: "CALC-03"
    verification:
      - kind: other
        ref: "grep 'ConversationHealthView(conversationId:' in HomeView.swift; grep -rl 'ConversationHealthView(' BanterApp excluding Calculator/ConversationHealthView.swift finds Home — both present"
        status: pass
    human_judgment: true
    rationale: "Grep proves the call-site wiring and that it passes the same model instances; actual chart/factor-grid rendering with real data requires a simulator run."

duration: ~8min
completed: 2026-07-05
status: complete
---

# Phase 4 Plan 7: Wire the Love-Calculator Write Path and Navigation Summary

**CoachingResultModel gains an additive onResponse hook that HomeModel uses to append a conversationId-scoped SentimentEvent on every real coaching response, and HomeView adds a NavigationLink to ConversationHealthView — closing the gap where the well-built, unit-tested love-calculator was unreachable dead code**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-07-05T04:05:00Z (approx)
- **Completed:** 2026-07-05
- **Tasks:** 2 (both `type="auto"`)
- **Files modified:** 3 (0 created, 3 modified)

## Accomplishments

- `CoachingResultModel` (`BanterApp/Coaching/CoachingResultModel.swift`): added a third additive optional closure, `onResponse: ((CoachingResponseDTO) -> Void)? = nil`, placed after `onAnalysisRecorded` in the initializer so both existing call sites (`HomeModel.startCoaching()`, `ValueDemoCoordinatorView`'s two constructions) keep compiling unchanged via trailing defaults. Invoked as `onResponse?(response)` immediately after `onAnalysisRecorded?()`, inside the same `guard generation == requestGeneration else { return }` newest-generation block — a stale/superseded tone-switch request can never append a sentiment event.
- `HomeModel` (`BanterApp/Home/HomeModel.swift`): added `let conversationId = UUID()` (client-minted, CALC-03-safe) and `let sentimentStore = SentimentTimelineStore()`. `startCoaching()` now passes `onResponse: { [sentimentStore, conversationId, importModel] response in sentimentStore.append(from: response, conversationId: conversationId, messageIndex: max(0, importModel.transcript.count - 1), speaker: .match) }` — the store's first production write path, using the store's own `append(from:conversationId:messageIndex:speaker:)` convenience initializer rather than hand-building a `SentimentEvent`.
- `HomeView` (`BanterApp/Home/HomeView.swift`): added a `NavigationLink` (label "Conversation Health", `heart.text.square` SF Symbol) inside `suggestionsContent`'s card list, presenting `ConversationHealthView(conversationId: model.conversationId, store: model.sentimentStore)` — the same store instance and conversationId the writes use, so the view renders the current conversation's real accumulated events, not a fresh empty store. `HomeView` was already inside `ContentView`'s `NavigationStack` (from 04-06), so no navigation container changes were needed.
- `SentimentTimelineStore.swift` and `ConversationHealthView.swift` internals are untouched — confirmed via `git status --short` on both files showing no diff.
- `SuggestionCardView.swift` is untouched — confirmed the same way (MONE-01 holds, no tier branch around psychology-tag rendering).

## Task Commits

Each task was committed atomically:

1. **Task 1: Add an optional onResponse injection point to CoachingResultModel** — `c326ab1` (feat)
2. **Task 2: Append sentiment + navigate to ConversationHealthView from the Home surface** — `09e9f92` (feat)

**Plan metadata:** this SUMMARY + STATE/ROADMAP/REQUIREMENTS update commit (see final commit below)

## Files Created/Modified

- `BanterApp/Coaching/CoachingResultModel.swift` — modified: additive `onResponse` closure, stored property, and call site
- `BanterApp/Home/HomeModel.swift` — modified: `conversationId`/`sentimentStore` properties, `onResponse` wiring in `startCoaching()`
- `BanterApp/Home/HomeView.swift` — modified: `NavigationLink` to `ConversationHealthView`

## Decisions Made

- The `sentimentStore.append(from: ...)` call was written as a single-line statement rather than the plan's illustrative multi-line form. The plan's own automated verify (`grep -Eq 'sentimentStore\.append\(from:'`) requires the pattern to appear on one physical line since grep has no cross-line matching by default here; a first-pass multi-line version failed that specific check locally before this fix, so the single-line form was kept to satisfy the plan's own acceptance criteria exactly.
- `messageIndex: max(0, importModel.transcript.count - 1)` and `speaker: .match` were used exactly as the plan specified, including its explicit rationale that the index is not load-bearing (the chart keys marks by array offset) and that `.match` reflects match-facing engagement.

## Deviations from Plan

None — plan executed exactly as written. The single-line vs. multi-line append call is a formatting choice within the plan's own instructions, not a deviation from any acceptance criterion (the plan's action text describes the call by its arguments, not by exact line-wrapping).

## Issues Encountered

No local Swift toolchain is available on this Windows host. All acceptance criteria were verified via the plan's own grep-based structural checks (construction-site regexes, `.append(from:` call-site presence, `ConversationHealthView(conversationId:` navigation call-site outside its own declaration file, absence of any `matchName`/`matchIdentity` token, absence of any `$<digit>` price literal) plus manual reads confirming `SentimentTimelineStore.swift`, `ConversationHealthView.swift`, and `SuggestionCardView.swift` have zero diff. Brace counts were balance-checked on all three touched files (10/10, 37/37, 13/13). Actual `xcodebuild`/`swift build` compile-green confirmation (closure capture-list correctness, actor isolation, `Charts`/`SwiftUI` API usage) is deferred to the CI GitHub Actions macOS runner, consistent with Phases 1-4.

## User Setup Required

None. This plan wires existing, already-tested primitives (`SentimentTimelineStore`, `ConversationHealthView`, `SentimentEvent`) into a reachable production surface — it introduces no new external-service configuration.

## Next Phase Readiness

- Roadmap SC3 / CALC-02 is closed: a real user hitting "Get Suggestions" now writes a conversationId-scoped `SentimentEvent` on every response, and can navigate to a populated `ConversationHealthView` for that conversation from the Home surface.
- CALC-03's no-dossier boundary provably holds by construction (every access path is `conversationId: UUID`-only) and remains tripwired by `SentimentTimelineStoreTests`' pre-existing forbidden-token guard, which was not touched.
- `deferred-items.md`'s companion finding from 04-06 (`ConversationHealthView`/`SentimentTimelineStore` having zero write path) is now closed.
- CI remains the sole environment that can confirm this compiles and that the closure-capture-list pattern (`[sentimentStore, conversationId, importModel]`) type-checks against the real Swift 5.9+/iOS 18 toolchain — flag for the next verifier to check the CI run once pushed.

---
*Phase: 04-companion-app-ui-paywall*
*Completed: 2026-07-05*

## Self-Check: PASSED

All 3 modified source files verified present on disk with expected content; both task commits (c326ab1, 09e9f92) verified in `git log --oneline`.
