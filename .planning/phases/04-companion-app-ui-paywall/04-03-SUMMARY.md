---
phase: 04-companion-app-ui-paywall
plan: 03
subsystem: ui
tags: [ios, swiftui, onboarding, permissions, mvp-slice]

# Dependency graph
requires:
  - phase: 04-companion-app-ui-paywall
    plan: 02
    provides: CoachingResultModel, CoachingClient, SuggestionCardView, TonePickerView (BanterApp/Coaching)
provides:
  - OnboardingFlowModel (@Observable state machine, BanterApp/Onboarding)
  - WelcomeView, PermissionPrimingView (generic), ValueDemoCoordinatorView (SwiftUI views)
  - App root now enters onboarding on fresh install (ContentView -> ValueDemoCoordinatorView)
  - BanterUITests/XCUITestHelpers.swift shared launch/capture extension
affects: [04-04, 04-05]

tech-stack:
  added: []
  patterns:
    - "OnboardingFlowModel mirrors ImportFlowModel's @Observable/private(set)-state/named-methods shape, including the #if DEBUG + CommandLine.arguments seed pattern"
    - "PermissionPrimingView is a generic (icon/heading/body/onContinue/onSkip) reusable component, with a .photos() static convenience instance for this plan's use — Phase 5 keyboard priming reuses the base component directly"
    - "XCUITest launch/capture helpers extracted to a shared XCTestCase extension (BanterUITests/XCUITestHelpers.swift) once a third consumer needed them"

key-files:
  created:
    - BanterApp/Onboarding/OnboardingFlowModel.swift
    - BanterApp/Onboarding/WelcomeView.swift
    - BanterApp/Onboarding/PermissionPrimingView.swift
    - BanterApp/Onboarding/ValueDemoCoordinatorView.swift
    - BanterUITests/XCUITestHelpers.swift
  modified:
    - BanterApp/ContentView.swift
    - BanterUITests/OnboardingFlowTests.swift
    - BanterUITests/PermissionPrimingTests.swift
    - BanterUITests/ScreenshotArtifactTests.swift

key-decisions:
  - "OnboardingFlowModel's fresh-install seed argument matches the Wave-0 XCUITest scaffolds' existing `--seed-fresh-install` (not a new `--reset-onboarding-state` name) — `--reset-onboarding-state` is kept as a functionally-identical alias so the plan's literal spec text is also satisfied"
  - "Added a third CI seed, `--skip-onboarding`, so pre-Phase-4 tests (ScreenshotArtifactTests' Import Entry sub-test) keep reaching .entry directly now that the app root is ValueDemoCoordinatorView instead of ImportEntryView — avoids rewriting that Phase 2 test's intent"
  - "ValueDemoCoordinatorView detects ImportFlowModel's own pre-seeded .confirm state (from --seed-sample-transcript) at init and branches: skip onboarding entirely if no fresh-install arg is present (Phase 2 CI path unchanged), or show Welcome once then skip priming on tap if a fresh-install arg is also present (OnboardingFlowTests' combined-seed path)"

patterns-established:
  - "Two onChange watchers (importModel.state and onboardingModel.state) both call startCoaching() — onChange only fires on transitions after a view first appears, so a model pre-seeded into .confirm before the coordinator renders needs the second watcher to catch the already-.confirm case once onboarding reaches .importFlow"

requirements-completed: [ONBD-01, ONBD-02]

coverage:
  - id: T1
    description: "PermissionPrimingView is generic (icon/heading/body/onContinue/onSkip); WelcomeView contains exact copy; OnboardingFlowModel has a --reset-onboarding-state DEBUG argument; Photos priming body contains 'never leaves your device'"
    verification:
      - kind: other
        ref: "grep 'init(icon' PermissionPrimingView.swift; grep 'Never freeze on a reply again|Try It Now' WelcomeView.swift; grep 'reset-onboarding-state' OnboardingFlowModel.swift; grep 'never leaves your device' PermissionPrimingView.swift"
        status: pass
      - kind: unit
        ref: "swift test --package-path BanterShared (deferred — no local Swift toolchain, CI is the compile gate)"
        status: unknown
    human_judgment: true
    rationale: "Grep proves the structural/copy requirements; actual compile-time proof is CI-only on this Windows host, consistent with every prior phase."
  - id: T2
    description: "ValueDemoCoordinatorView uses a switch-based dispatcher (no NavigationStack push) and calls CoachingClient/CoachingResultModel after confirm; neither file contains DailyCapTracker/EntitlementManager tokens; app root routes fresh installs into the onboarding coordinator"
    verification:
      - kind: other
        ref: "grep 'switch onboardingModel.state' + grep 'CoachingResultModel|selectTone' ValueDemoCoordinatorView.swift; grep -Lq -e DailyCapTracker -e EntitlementManager ValueDemoCoordinatorView.swift OnboardingFlowModel.swift; grep ValueDemoCoordinatorView ContentView.swift"
        status: pass
    human_judgment: false
  - id: T3
    description: "OnboardingFlowTests asserts a suggestions element exists and asserts absence of paywall elements; PermissionPrimingTests asserts the priming heading precedes the system prompt; both reuse shared XCUITest helpers"
    verification:
      - kind: other
        ref: "grep 'Start Free Trial' OnboardingFlowTests.swift; grep 'Let Banter read your screenshot' PermissionPrimingTests.swift; grep -rn 'private func waitForLaunchAnimationToSettle|private func capture' BanterUITests/*.swift (no matches = fully shared)"
        status: pass
      - kind: e2e
        ref: "CI XCUITest run (GitHub Actions macOS runner) — deferred, no local Swift/Simulator toolchain"
        status: unknown
    human_judgment: true
    rationale: "Structural assertions verified via grep; actual XCUITest pass/fail (including the seeded-transcript coaching-call round trip) can only be confirmed on CI."

duration: 35min
completed: 2026-07-05
status: complete
---

# Phase 4 Plan 3: Onboarding Value-Before-Paywall Slice Summary

**Welcome -> Photos-permission priming -> real import/confirm/coaching demo loop as the app's first-run entry, with zero entitlement/cap code on the path (ONBD-01, ONBD-02)**

## Performance

- **Duration:** 35 min
- **Started:** 2026-07-05 (fresh dispatch — prior attempt was killed by a provider quota limit before any work was done)
- **Completed:** 2026-07-05
- **Tasks:** 3 (all auto)
- **Files modified:** 9 (5 created, 4 modified)

## Accomplishments

- `OnboardingFlowModel`: `@Observable` state machine (`.welcome` / `.permissionPriming(type:)` / `.importFlow` / `.suggestionsShown`), mutated only via named methods (`start()`, `advanceToPermissionPriming()`, `continueToImport()`, `skipPriming()`, `showSuggestions()`), with `#if DEBUG` CI seed arguments (`--seed-fresh-install`, `--reset-onboarding-state` alias, `--skip-onboarding`).
- `WelcomeView`: reuses `ImportEntryView`'s scroll/VStack shell, exact copy ("Never freeze on a reply again" / "Try It Now"), routes into the onboarding flow via `model.start()`.
- `PermissionPrimingView`: a fully generic `(icon:heading:body:onContinue:onSkip:)` component (built once, reusable by Phase 5's keyboard priming per the plan's explicit instruction), plus a `.photos()` static convenience instance carrying the exact CAPT-04-consistent copy.
- `ValueDemoCoordinatorView`: wraps the existing `ImportFlowModel` state machine unchanged, adds one terminal step after `.confirm` that mints a `CoachingResultModel` and calls `selectTone` directly — zero `DailyCapTracker`/`EntitlementManager` references anywhere on this file or `OnboardingFlowModel.swift` (grep-verified). `ContentView` now routes every launch through this coordinator.
- XCUITest scaffolds from Wave 0 (`OnboardingFlowTests`, `PermissionPrimingTests`) already contained the ONBD-01/ONBD-02 assertions this plan required — verified those assertions are present and wired the underlying UI/seed-argument support so they can pass on CI. Extracted the launch/capture boilerplate into a shared `BanterUITests/XCUITestHelpers.swift` `XCTestCase` extension (now used by all three UI test files).

## Task Commits

Each task was committed atomically:

1. **Task 1: OnboardingFlowModel + WelcomeView + generic PermissionPrimingView** — `8d9680e` (feat)
2. **Task 2: ValueDemoCoordinatorView — wire the ungated demo loop to the coaching surface** — `374ca59` (feat)
3. **Task 3: XCUITest ONBD-01/ONBD-02 flow assertions** — `9ae6916` (test)

**Plan metadata:** commit pending (this SUMMARY + STATE/ROADMAP update)

## Files Created/Modified

- `BanterApp/Onboarding/OnboardingFlowModel.swift` — state machine + CI seed args
- `BanterApp/Onboarding/WelcomeView.swift` — Screen 4.1
- `BanterApp/Onboarding/PermissionPrimingView.swift` — Screen 4.2, generic + `.photos()` instance
- `BanterApp/Onboarding/ValueDemoCoordinatorView.swift` — coordinator wiring Welcome -> priming -> import -> coaching
- `BanterApp/ContentView.swift` — app root now enters `ValueDemoCoordinatorView`
- `BanterUITests/XCUITestHelpers.swift` — shared launch/capture `XCTestCase` extension
- `BanterUITests/OnboardingFlowTests.swift` — removed duplicate private helper (now uses shared extension)
- `BanterUITests/PermissionPrimingTests.swift` — removed duplicate private helper (now uses shared extension)
- `BanterUITests/ScreenshotArtifactTests.swift` — removed duplicate private helpers; added `--skip-onboarding` to its Import Entry sub-test so it still reaches `.entry` directly under the new app root

## Decisions Made

- Matched the existing Wave-0 XCUITest scaffolds' `--seed-fresh-install` argument name rather than introducing a differently-named `--reset-onboarding-state` as the sole seed — both are supported (`--reset-onboarding-state` as a functional alias) so the plan's literal instruction is satisfied without breaking the tests already written in Plan 01.
- Added a third CI seed, `--skip-onboarding`, and used it in `ScreenshotArtifactTests`' Import Entry sub-test — this is the one file not listed in the plan's `files_modified`, but leaving it unfixed would have broken an existing Phase 2 CI test as a direct, in-scope consequence of this plan's ContentView change (Rule 1: auto-fix a bug directly caused by this plan's own edits).
- `ValueDemoCoordinatorView`'s `init` inspects whether `ImportFlowModel` was already pre-seeded into `.confirm` (via `--seed-sample-transcript`) and branches on whether a fresh-install seed argument is also present, so three different CI launch-argument combinations (Phase 2's `ScreenshotArtifactTests`, this plan's `OnboardingFlowTests`/`PermissionPrimingTests`) each reach their expected first screen without one test's seed breaking another's assumptions.

## Deviations from Plan

**1. [Rule 1 - Bug] Added `--skip-onboarding` seed and updated `ScreenshotArtifactTests.swift` (file not in this plan's `files_modified` list)**
- **Found during:** Task 2 (after routing `ContentView` into `ValueDemoCoordinatorView`)
- **Issue:** Phase 2's `ScreenshotArtifactTests.testCaptureKeyScreens` launches the app with no arguments and expects to land immediately on Import Entry ("Choose Screenshot" button). Once `ContentView` roots into the onboarding coordinator, a bare launch now lands on the Welcome screen instead, breaking that existing CI test as a direct consequence of this plan's required Task 2 change.
- **Fix:** Added an `OnboardingFlowModel.skipOnboardingArgument` (`--skip-onboarding`) DEBUG seed that starts `OnboardingFlowModel` straight in `.importFlow`, and passed it in `ScreenshotArtifactTests`' first sub-test launch arguments.
- **Files modified:** `BanterApp/Onboarding/OnboardingFlowModel.swift`, `BanterUITests/ScreenshotArtifactTests.swift`
- **Commit:** `9ae6916`

**2. [Rule 1 - Bug] `onChange(of: onboardingModel.state)` added alongside `onChange(of: importModel.state)` to trigger coaching**
- **Found during:** Task 2, while tracing the combined `--seed-fresh-install` + `--seed-sample-transcript` launch path used by `OnboardingFlowTests`
- **Issue:** `ImportFlowModel`'s own debug seed puts it in `.confirm` before `ValueDemoCoordinatorView`'s body ever renders. SwiftUI's `.onChange` only fires on transitions after the view appears, not on the initial value, so the original single `onChange(of: importModel.state)` never fired for this pre-seeded case and the demo path would hang on Welcome/priming without ever calling `CoachingClient`.
- **Fix:** Added a second `onChange(of: onboardingModel.state)` watcher that, when onboarding transitions into `.importFlow` and `importModel.state` is already `.confirm`, calls the same `startCoaching()` path.
- **Files modified:** `BanterApp/Onboarding/ValueDemoCoordinatorView.swift`
- **Commit:** `374ca59`

## Issues Encountered

No local Swift toolchain is available in this environment (Windows host) — per Phases 1-3 and Plan 01/02 precedent, all acceptance criteria were verified via grep-based structural checks (file existence, exact copy/token presence, forbidden-token absence) rather than `swift test`/`xcodebuild`. Actual compile-time and XCUITest pass/fail verification (including whether the seeded-transcript coaching call round-trips correctly end-to-end in the Simulator) is deferred to CI (GitHub Actions macOS runner), consistent with every prior phase in this project.

## User Setup Required

None — no external service configuration required. This plan introduces no new third-party dependency; it wires existing Plan 01/02 surfaces (RevenueCat SPM package, `CoachingClient`, `CoachingResultModel`) into a new first-run entry point.

## Next Phase Readiness

- The onboarding demo path (Welcome -> Photos priming -> import -> coaching) is fully wired and structurally verified to contain zero entitlement/cap tokens, satisfying the phase's first success criterion ("core value before any paywall").
- `PermissionPrimingView` is generic and ready for Phase 5's keyboard-enable priming to reuse directly, with no duplication.
- `PermissionPrimingView.photos()`'s "Not Now" path routes to `ImportFlowModel`'s existing paste-text fallback (`.entry(startInPasteMode: true)`) via `ValueDemoCoordinatorView`'s `importFlowContent` — no dead end.
- CI (GitHub Actions macOS runner) remains the sole environment that can confirm `OnboardingFlowTests`/`PermissionPrimingTests` actually flip green, and that the three-way CI-seed branching in `ValueDemoCoordinatorView.init` compiles and behaves as traced in this summary — flag for the next executor/verifier to check the CI run once pushed.
- Plans 04-04 and 04-05 (daily cap / paywall wiring) must continue to respect the ONBD-01 boundary this plan established: the onboarding demo path itself must never gain a `DailyCapTracker`/`EntitlementManager` reference, even as those systems are built out elsewhere in the app.

---
*Phase: 04-companion-app-ui-paywall*
*Completed: 2026-07-05*

## Self-Check: PASSED

All 9 created/modified source files (plus this SUMMARY.md) verified present on disk; all 3 task commits (8d9680e, 374ca59, 9ae6916) verified in git log.
