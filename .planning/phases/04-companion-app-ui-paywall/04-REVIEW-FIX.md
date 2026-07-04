---
phase: 04-companion-app-ui-paywall
fixed_at: 2026-07-05T00:00:00Z
review_path: .planning/phases/04-companion-app-ui-paywall/04-REVIEW.md
iteration: 1
findings_in_scope: 15
fixed: 15
skipped: 0
status: all_fixed
---

# Phase 4: Code Review Fix Report

**Fixed at:** 2026-07-05
**Source review:** .planning/phases/04-companion-app-ui-paywall/04-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 15 (CR-01..CR-03, WR-01..WR-12; fix_scope critical_warning — IN-* excluded)
- Fixed: 15
- Skipped: 0

**Verification note (environment):** no local Swift toolchain exists on this
machine — all Swift changes were verified by careful re-read + grep only.
Compile verification is CI-deferred to the `Build BanterApp (simulator)` and
`swift test --package-path BanterShared` gates. The shell/YAML changes
(WR-12) were verified live (`bash -n` + a real `--check` run, which passed).

**Phase invariants re-verified after all fixes:**
- Tag chip renders unconditionally, no tier branch (grep: no isPremium/Entitlement in SuggestionCardView).
- Onboarding demo-path files: zero code references to EntitlementManager/DailyCapTracker (comment-only mentions pre-date this pass).
- SentimentTimelineStore: conversationId-only keying; forbidden-token scan (matchName/matchId/matchIdentity) still 0.
- No `$<digit>` price literals in Swift source (all grep hits are `$0`/`$1` closure shorthand).
- CoachingClient still sends only the structured-text `AnalyzeConversationRequest` DTO.

## Fixed Issues

### CR-01: PaywallView trial-eligibility uses nonexistent RevenueCat property

**Files modified:** `BanterApp/Paywall/PaywallView.swift`
**Commit:** 4ea98dd
**Applied fix:** Replaced `.trialOrIntroEligibility` with the verified v5 API: bind the returned `IntroEligibility` and compare `eligibility.status == .eligible`.

### CR-02: OnboardingFlowTests has no backend to reach in CI

**Files modified:** `BanterApp/Onboarding/ValueDemoCoordinatorView.swift`, `BanterUITests/OnboardingFlowTests.swift`
**Commit:** 62e53f0
**Applied fix:** Added a `--seed-sample-replies` DEBUG launch argument (mirroring `--seed-sample-transcript`): `startCoaching()` seeds `CoachingResultModel` via its existing `replies:` init parameter from a static 3-reply fixture (tags are real taxonomy.json tagNames so TagExplainerSheet expansion works) and skips the network call entirely. Test now passes the argument. The seeded path still never references EntitlementManager/DailyCapTracker (ONBD-01 preserved).

### CR-03: UI test queries buttons["Copy"] but label is "Copy reply"

**Files modified:** `BanterApp/Coaching/SuggestionCardView.swift`
**Commit:** b4cc9ca
**Applied fix:** Added `.accessibilityIdentifier("Copy")` to the copy button (kept the user-facing VoiceOver label "Copy reply" unchanged).

### WR-01: Purchases.shared used but Purchases.configure never called

**Files modified:** `BanterApp/BanterAppApp.swift`, `BanterApp/Paywall/RevenueCatEntitlementSource.swift`, `BanterApp/Paywall/PaywallView.swift`
**Commit:** 9ae4963
**Applied fix:** `BanterAppApp.init` now calls `Purchases.configure(withAPIKey:)` guarded by `RevenueCatConfig.hasRealKey` (sentinel comparison lives next to the placeholder declaration). `RevenueCatEntitlementSource.fetchState` and `PaywallView.loadOffering` guard `Purchases.isConfigured` and degrade (`.free` / error message) instead of tripping the SDK's not-configured fatalError.

### WR-02: Paywall/cap/banner/health surfaces have zero live call sites

**Files modified:** `.planning/phases/04-companion-app-ui-paywall/deferred-items.md` (created)
**Commit:** b22368d
**Applied fix:** Took the review's option B (per fix-pass guidance: full wiring requires a new post-onboarding surface — a feature build too large/risky for a review-fix commit with no compiler, and half-wiring risks the ONBD-01 ungated-demo invariant). Created phase deferred-items.md explicitly recording that MONE-01/MONE-02 UI enforcement is NOT delivered in Phase 4, listing every inert surface and the wiring requirements, so verification cannot count it as shipped.

### WR-03: TagExplainer traps on duplicate tagName

**Files modified:** `BanterShared/Sources/BanterShared/TagExplainer.swift`
**Commit:** 9b7cbc8
**Applied fix:** `Dictionary(uniqueKeysWithValues:)` → `Dictionary(_:uniquingKeysWith:)` with first-entry-wins, so a hand-edited taxonomy can no longer crash the client.

### WR-04: selectTone lacks in-flight cancellation — stale responses overwrite newer tone

**Files modified:** `BanterApp/Coaching/CoachingResultModel.swift`
**Commit:** 6588590
**Applied fix:** Added a monotonic `requestGeneration` counter; stale completions (success AND failure paths) are dropped, `onAnalysisRecorded` fires only for the newest generation (no double cap count), and the `defer { isLoading = false }` is generation-guarded so a stale completion cannot clear the newer request's spinner. **Requires human/CI verification** — this is concurrency logic that grep-level verification cannot prove; the CI build plus a manual rapid-tone-tap check should confirm.

### WR-05: Onboarding suggestions screen renders neither loading nor error state

**Files modified:** `BanterApp/Onboarding/ValueDemoCoordinatorView.swift`
**Commit:** b3f6965
**Applied fix:** `suggestionsContent` now renders a `ProgressView` while `coachingModel.isLoading` and, on `errorMessage`, the message plus a Retry button re-invoking `selectTone(selectedTone)` — the first-run demo can no longer dead-end on a silent blank screen.

### WR-06: loadOffering swallows all failures — CTA disabled forever

**Files modified:** `BanterApp/Paywall/PaywallView.swift`
**Commit:** 7d0a05e
**Applied fix:** `loadOffering` now uses do/catch: sets `errorMessage` on fetch failure and on empty offering; body shows a Retry button (re-runs `loadOffering`) whenever an error is displayed and no package loaded.

### WR-07: DailyCapTrackerTests non-idempotent — fixed date keys persist

**Files modified:** `BanterShared/Tests/BanterSharedTests/DailyCapTrackerTests.swift`
**Commit:** b487555
**Applied fix:** Added `setUp`/`tearDown` removing both hardcoded keys (`dailyCap.2026-07-04`, `dailyCap.2026-07-05`) from `UserDefaults(suiteName: AppGroupStore.suiteName)` before and after every test.

### WR-08: Chart ForEach keyed by non-unique messageIndex

**Files modified:** `BanterApp/Calculator/ConversationHealthView.swift`
**Commit:** 6c5b288
**Applied fix:** `ForEach(events, id: \.messageIndex)` → `ForEach(Array(events.enumerated()), id: \.offset)`, matching the existing suggestions-list pattern (chose the review's second option — no `SentimentEvent` schema change, so persisted Codable data stays decodable).

### WR-09: EntitlementManager mutates UI-observed state off the main actor

**Files modified:** `BanterShared/Sources/BanterShared/Paywall/EntitlementManager.swift`, `BanterShared/Tests/BanterSharedTests/EntitlementManagerTests.swift`
**Commit:** 5364975
**Applied fix:** Marked `EntitlementManager` `@MainActor` (matching `CoachingResultModel`); marked the test class `@MainActor` so init/refresh calls compile under BanterShared's Swift 6 language mode (the nested mock becomes MainActor-isolated and thereby implicitly Sendable, satisfying `EntitlementSource: Sendable`). **Requires CI verification** — Swift 6 isolation checking is exactly what cannot be verified without a compiler.

### WR-10: Unsynchronized read-modify-write over the shared App Group store

**Files modified:** `BanterShared/Sources/BanterShared/Paywall/DailyCapTracker.swift`, `BanterShared/Sources/BanterShared/Calculator/SentimentTimelineStore.swift`, `BanterShared/Tests/BanterSharedTests/DailyCapTrackerTests.swift`, `BanterShared/Tests/BanterSharedTests/SentimentTimelineStoreTests.swift`
**Commit:** cd3e7b7
**Applied fix:** Marked both classes `@MainActor` (in-process guarantee) with a documented cross-process ceiling: when the Phase 5 keyboard extension writes the same keys, UserDefaults has no atomic increment — file coordination/atomic scheme flagged for that phase's threat register. Both test classes annotated `@MainActor`. Forbidden-token scan of SentimentTimelineStore still passes (0 hits). **Requires CI verification** (same Swift 6 isolation caveat as WR-09).

### WR-11: Release builds POST the onboarding demo to http://localhost:54321

**Files modified:** `BanterApp/Coaching/CoachingClient.swift`, `.planning/phases/04-companion-app-ui-paywall/deferred-items.md`
**Commit:** 8f07d54
**Applied fix:** Introduced `CoachingClient.defaultBaseURL`: localhost only under `#if DEBUG`; release resolves to an unroutable `.invalid` sentinel host so a missing production endpoint fails fast at WR-05's new error+Retry surface instead of silently POSTing to localhost. Production-endpoint deployment + xcconfig/Info.plist migration recorded in deferred-items.

### WR-12: Taxonomy drift guard structurally cannot fail and CI never runs it

**Files modified:** `Backend/scripts/sync-taxonomy.sh`, `.github/workflows/ci.yml`
**Commit:** eaeae24
**Applied fix:** Added a `--check` mode that diffs WITHOUT copying (exit 1 on mismatch or missing destination); default mode remains local sync (copy only, no dead diff). Added a `backend-tests` CI step running `sync-taxonomy.sh --check`. Verified live: `bash -n` clean, `--check` run passes on the current byte-identical copies.

## Skipped Issues

None — all 15 in-scope findings were fixed (WR-02 via the review's documented option B).

---

_Fixed: 2026-07-05_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
