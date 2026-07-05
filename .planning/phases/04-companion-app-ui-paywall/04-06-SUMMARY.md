---
phase: 04-companion-app-ui-paywall
plan: 06
subsystem: paywall
tags: [ios, swiftui, revenuecat, paywall, entitlement, monetization, wiring]

# Dependency graph
requires:
  - phase: 04-companion-app-ui-paywall
    plan: 05
    provides: EntitlementManager, DailyCapTracker, RevenueCatEntitlementSource, PaywallView, DowngradeBanner, CoachingResultModel's optional capGate/onAnalysisRecorded closures (all built but zero production call sites before this plan)
  - phase: 04-companion-app-ui-paywall
    plan: 02
    provides: CoachingResultModel, TonePickerView, SuggestionCardView (reused verbatim by the new Home surface)
  - phase: 04-companion-app-ui-paywall
    plan: 01
    provides: ValueDemoCoordinatorView/OnboardingFlowModel ungated onboarding demo (ONBD-01) and ImportFlowModel's import/confirm state machine (from Phase 2), both reused/extended here
provides:
  - HomeModel (BanterApp/Home) — @Observable @MainActor controller; the FIRST production construction site for EntitlementManager + DailyCapTracker; builds a cap-gated CoachingResultModel; detects premium->free transitions for the downgrade banner
  - HomeView (BanterApp/Home) — post-onboarding surface: gated import->coach loop, daily-cap banner (cards stay visible) -> PaywallView sheet, non-modal DowngradeBanner -> same sheet
  - ContentView routing between ValueDemoCoordinatorView and HomeView via @AppStorage("hasCompletedOnboarding"), with DEBUG seed-arg override for CI determinism
  - ValueDemoCoordinatorView(onComplete:) completion hook + "Continue to Banter" affordance on the suggestions screen
affects: [Phase 5 keyboard extension (shares the App Group entitlement/cap state HomeModel now writes), any future settings/premium entry point]

tech-stack:
  added: []
  patterns:
    - "HomeModel is the sole production construction site for EntitlementManager/DailyCapTracker; ValueDemoCoordinatorView and OnboardingFlowModel remain permanently ungated by construction (ONBD-01), not by a conditional flag"
    - "Downgrade-banner dedup uses two AppGroupStore bools: a persisted last-known-premium status and DowngradeBannerStorageKey.lastSeenDowngrade. Both are re-armed (cleared) whenever the user is currently premium, so a SECOND trial/subscription cycle can show the banner again instead of staying deduped forever after the first downgrade"
    - "HomeView's top-level branch is `model.coaching != nil ? suggestionsContent : importFlowContent` — the Home-surface analog of ValueDemoCoordinatorView's outer onboardingModel.state switch, since HomeModel has no separate onboarding-style state enum"

key-files:
  created:
    - BanterApp/Home/HomeModel.swift
    - BanterApp/Home/HomeView.swift
  modified:
    - BanterApp/ContentView.swift
    - BanterApp/Onboarding/ValueDemoCoordinatorView.swift

key-decisions:
  - "Daily-cap banner and downgrade banner are rendered via direct @Observable property reads in the view body (if coaching.dailyCapReached / if model.showDowngradeBanner), not an explicit .onChange side-effect — SwiftUI's Observation tracking already re-renders on these reads (same pattern ValueDemoCoordinatorView uses for isLoading/errorMessage); the plan's '.onChange(of: ...)' mention was offered as an example ('e.g.'), not a mandated mechanism, and the verify greps only require the token to appear, which direct reads satisfy"
  - "DowngradeBannerStorageKey.lastSeenDowngrade and the new last-known-premium marker are both cleared back to false whenever entitlement.isPremium is currently true — a plain 'set once, never reset' dedup would permanently silence the banner after the FIRST downgrade, contradicting the must-have's 'once per premium->free transition' (plural transitions implied)"
  - "ContentView's DEBUG force-onboarding check covers only --seed-fresh-install/--reset-onboarding-state, not --seed-sample-transcript or --skip-onboarding, per the plan's explicit carve-out — those two argument combinations must keep routing exactly as before (ScreenshotArtifactTests/PermissionPrimingTests depend on it) and are unaffected in practice since no test flips hasCompletedOnboarding to true"

requirements-completed: [MONE-01, MONE-02, MONE-03]

coverage:
  - id: D1
    description: "HomeModel constructs EntitlementManager(source: RevenueCatEntitlementSource()) and a date-scoped DailyCapTracker(dailyLimit: 3), and builds every real CoachingResultModel with a non-nil capGate (consulting capTracker.canAnalyze(isPremium:)) and onAnalysisRecorded (capTracker.recordAnalysis()) — every real session is cap-gated for the first time (MONE-01)"
    requirement: "MONE-01"
    verification:
      - kind: other
        ref: "grep -E 'EntitlementManager\\(source: *RevenueCatEntitlementSource\\(\\)\\)' and 'DailyCapTracker\\(dailyLimit: *3' in HomeModel.swift; grep 'capGate:'/'canAnalyze(isPremium:'/'recordAnalysis()' in HomeModel.swift — all present"
        status: pass
    human_judgment: true
    rationale: "Grep proves the construction/wiring shape exactly as specified; actual Swift compile correctness (init signatures, actor isolation of the @MainActor HomeModel/EntitlementManager/DailyCapTracker types) cannot be confirmed on this Windows host with no local Swift toolchain — deferred to the CI GitHub Actions macOS runner per the Phase 1-4 precedent."
  - id: D2
    description: "PaywallView has a production call site in HomeView, reached by tapping 'See Premium' on the daily-cap banner (shown above, not instead of, already-loaded tagged SuggestionCardViews); no dollar-and-digit price literal introduced (MONE-01/MONE-02)"
    requirement: "MONE-02"
    verification:
      - kind: other
        ref: "grep 'PaywallView\\(' and 'dailyCapReached' in HomeView.swift (outside Paywall/PaywallView.swift); grep -E '\\$[0-9]' HomeView.swift/HomeModel.swift finds nothing; manual read confirms the ForEach of SuggestionCardView is unconditional (not wrapped by the dailyCapReached check)"
        status: pass
    human_judgment: true
    rationale: "Grep + direct code read prove the reachability and tag-visibility structure; whether the sheet actually renders correctly at runtime (RevenueCat Offerings fetch, layout) requires a simulator/device run, unavailable on this host."
  - id: D3
    description: "DowngradeBanner has a production call site in HomeView (Go Premium -> paywall sheet); HomeModel.refreshEntitlement() detects a premium->free transition and dedupes via DowngradeBannerStorageKey.lastSeenDowngrade, read AND written (MONE-03)"
    requirement: "MONE-03"
    verification:
      - kind: other
        ref: "grep 'DowngradeBanner\\(' in HomeView.swift; grep 'DowngradeBannerStorageKey.lastSeenDowngrade' in HomeModel.swift (both a read via AppGroupStore.read and a write via AppGroupStore.write are present)"
        status: pass
    human_judgment: true
    rationale: "Grep proves both the call site and the dedup marker's read+write; observing an actual premium->free transition requires a RevenueCat sandbox trial-expiry, which is Manual-Only scope per 04-VALIDATION.md, not exercised here."
  - id: D4
    description: "ContentView routes to HomeView() once hasCompletedOnboarding is set (via ValueDemoCoordinatorView's new onComplete hook) and DEBUG seed args force the onboarding branch; ValueDemoCoordinatorView.swift and OnboardingFlowModel.swift remain comment-stripped-grep-zero for EntitlementManager/DailyCapTracker (ONBD-01 invariant untouched)"
    verification:
      - kind: other
        ref: "grep 'HomeView()'/'hasCompletedOnboarding' in ContentView.swift; grep 'onComplete' in ValueDemoCoordinatorView.swift; grep -vE comment-lines ValueDemoCoordinatorView.swift/OnboardingFlowModel.swift piped to grep 'EntitlementManager|DailyCapTracker' — zero matches in both"
        status: pass
    human_judgment: false

duration: ~19min
completed: 2026-07-05
status: complete
---

# Phase 4 Plan 6: Home Surface — Wiring Monetization Into a Real Post-Onboarding Screen Summary

**A new post-onboarding HomeView/HomeModel constructs the RevenueCat-backed EntitlementManager and a date-scoped DailyCapTracker(dailyLimit: 3), runs every real coaching call through capGate/onAnalysisRecorded, and gives PaywallView and DowngradeBanner their first production call sites — closing the Phase 4 code-review gap where all four monetization components existed but were unreachable dead code**

## Performance

- **Duration:** ~19 min
- **Started:** 2026-07-05T03:35:35Z
- **Completed:** 2026-07-05T03:54:11Z
- **Tasks:** 3 (all `type="auto"`)
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments

- `HomeModel` (`BanterApp/Home/HomeModel.swift`): `@Observable @MainActor` controller owning `entitlement` (`EntitlementManager(source: RevenueCatEntitlementSource())`), `capTracker` (`DailyCapTracker(dailyLimit: 3, dateString:)` keyed off a `yyyy-MM-dd`/`en_US_POSIX`/`TimeZone.current` formatted today-string), and `importModel` (`ImportFlowModel()`, reused unchanged). `startCoaching()` builds the real, gated `CoachingResultModel` — the first production call site where `capGate`/`onAnalysisRecorded` are non-nil.
- `refreshEntitlement()` resolves entitlement on appear AND detects a premium->free transition: it persists a last-known-premium bool via `AppGroupStore`, and when that flips true->false it sets `showDowngradeBanner = true` exactly once, deduped through `DowngradeBannerStorageKey.lastSeenDowngrade` — both markers reset back to false whenever the user is currently premium so a later, second downgrade can show the banner again.
- `HomeView` (`BanterApp/Home/HomeView.swift`): mirrors `ValueDemoCoordinatorView`'s `Group { switch importModel.state { ... } }` dispatcher (Entry/Parsing/Confirm/Failure, reusing `ImportEntryView`/`ParsingProgressView`/`ConfirmTranscriptView` verbatim) and its `suggestionsContent` shape (`TonePickerView` + `SuggestionCardView` `ForEach` + loading/error states), minus the onboarding Welcome/priming states, plus the gate.
- Daily-cap surface: when `coaching.dailyCapReached` flips true, a banner ("You've used today's free analyses" / "Tags are still yours — come back tomorrow, or go unlimited now." / "See Premium") renders ABOVE the existing card `ForEach` — the cards and their psychology tags are never removed or wrapped in a tier check. "See Premium" sets `showPaywall = true`, presenting `PaywallView(entitlementManager: model.entitlement, onDismiss:)` as a `.sheet` (cards persist underneath, MONE-01 intact).
- Downgrade surface: `DowngradeBanner(onGoPremium: { showPaywall = true })` renders non-modally at the top of `HomeView` whenever `model.showDowngradeBanner` is true; "Go Premium" opens the same paywall sheet.
- `ContentView` now holds `@AppStorage("hasCompletedOnboarding")` and routes `HomeView()` vs. `ValueDemoCoordinatorView(onComplete: { hasCompletedOnboarding = true })`; a DEBUG-only `forcesOnboarding` check (fresh-install/reset-onboarding seed args) prevents a stale persisted flag from skipping onboarding on a reused CI simulator. `ContentView` itself constructs no entitlement/cap types — that stays exclusively inside `HomeModel`.
- `ValueDemoCoordinatorView` gained `onComplete: () -> Void = {}` (source-compatible default) and a "Continue to Banter" button below the suggestion cards that calls it. The file still contains zero functional `EntitlementManager`/`DailyCapTracker` references (verified by comment-stripped grep) — ONBD-01 holds.

## Task Commits

Each task was committed atomically:

1. **Task 1: Post-onboarding Home surface with gated coaching** — `0933ce8` (feat)
2. **Task 2: Present PaywallView on cap + DowngradeBanner on trial-expiry** — `561ca0b` (feat)
3. **Task 3: Route ContentView onboarding -> Home + ValueDemoCoordinatorView completion hook** — `42187a9` (feat)

**Plan metadata:** this SUMMARY + STATE/ROADMAP/REQUIREMENTS update commit (see final commit below)

## Files Created/Modified

- `BanterApp/Home/HomeModel.swift` — new: constructs EntitlementManager/DailyCapTracker/ImportFlowModel, gated `startCoaching()`, downgrade-transition detection
- `BanterApp/Home/HomeView.swift` — new: post-onboarding import->coach loop, daily-cap banner + paywall sheet, downgrade banner
- `BanterApp/ContentView.swift` — modified: `@AppStorage`-driven routing between onboarding and Home
- `BanterApp/Onboarding/ValueDemoCoordinatorView.swift` — modified: `onComplete` hook + "Continue to Banter" affordance (ONBD-01 invariant preserved)

## Decisions Made

- Cap/downgrade banner visibility uses direct `@Observable` property reads in the view body rather than an explicit `.onChange` — matches the codebase's existing convention (`ValueDemoCoordinatorView`'s `isLoading`/`errorMessage` handling) and satisfies the plan's own "e.g." (example, not mandated) framing of `.onChange`.
- The downgrade dedup marker and the last-known-premium marker are both re-armed (cleared) on returning to premium, so the "once per transition" guarantee holds across multiple trial/subscription cycles, not just the first one ever observed.
- HomeView's top-level content switch is `model.coaching != nil ? suggestionsContent : importFlowContent`, the Home-surface equivalent of `ValueDemoCoordinatorView`'s `onboardingModel.state` switch (HomeModel has no analogous state enum, so `coaching` presence is the signal).
- `ContentView`'s `forcesOnboarding` override list intentionally excludes `--seed-sample-transcript`/`--skip-onboarding`, per the plan's explicit instruction — those two must keep routing exactly as before.

## Deviations from Plan

None — plan executed exactly as written. Task 1's `refreshEntitlement()` was deliberately built as the minimal `await entitlement.refresh()` stub the plan specified, then extended by Task 2 in the same function (not a new one), matching the plan's explicit "leave a single call site here for Task 2 to extend" instruction.

## Issues Encountered

No local Swift toolchain is available on this Windows host. All acceptance criteria were verified via grep-based structural checks (construction-site regexes, forbidden-token absence for ONBD-01 and the price-literal ban, call-site presence outside owning-declaration files) plus manual reads confirming the unconditional `ForEach`/tag rendering, consistent with the Phase 1-4 precedent. Brace/paren counts were balanced-checked on every touched file as an additional local sanity pass. Actual `xcodebuild`/`swift build` compile-green confirmation (actor-isolation correctness for the `@MainActor HomeModel`/`@State private var model = HomeModel()` pattern, RevenueCat API usage) is deferred to the CI GitHub Actions macOS runner.

## User Setup Required

None new. RevenueCat dashboard/App Store Connect setup remains the pre-existing Manual-Only requirement documented in 04-05-SUMMARY.md / 04-VALIDATION.md — this plan wires existing primitives into a reachable surface, it does not add new external-service configuration.

## Next Phase Readiness

- MONE-01/MONE-02/MONE-03 UI enforcement is reachable in the shipping app for the first time: a real user can now hit the daily cap, see the paywall, and see a downgrade reassurance banner, all without ever hiding a psychology tag or touching the onboarding demo path.
- The Phase 4 code-review's WR-02 finding ("monetization surfaces built but not wired") is closed for `EntitlementManager`/`DailyCapTracker`/`PaywallView`/`DowngradeBanner`. `deferred-items.md`'s companion finding — `ConversationHealthView`/`SentimentTimelineStore` having zero write path — is explicitly out of this plan's scope and is plan 04-07's job.
- CI remains the sole environment that can confirm this compiles and that the `@MainActor`/`@Observable` actor-isolation patterns used here (`@State private var model = HomeModel()` where `HomeModel` is `@MainActor`) type-check against the real Swift 5.9+/iOS 18 toolchain — flag for the next verifier to check the CI run once pushed.
- Manual RevenueCat sandbox purchase/trial-expiry verification (real paywall render, real downgrade transition) remains 04-VALIDATION.md's Manual-Only scope, unexercised in this environment.

---
*Phase: 04-companion-app-ui-paywall*
*Completed: 2026-07-05*

## Self-Check: PASSED

All 4 created/modified source files verified present on disk; all 3 task commits (0933ce8, 561ca0b, 42187a9) verified in git log.
