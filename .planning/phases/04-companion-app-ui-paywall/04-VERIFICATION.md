---
phase: 04-companion-app-ui-paywall
verified: 2026-07-05T00:00:00Z
status: gaps_found
score: 3/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
gaps:
  - truth: "Free tier caps daily analyses but always shows psychology tags; a 14-day full-access reverse trial downgrades gracefully to free; premium unlocks unlimited analyses + calculator depth via RevenueCat/StoreKit 2 (Roadmap SC4 / MONE-01, MONE-02, MONE-03)"
    status: failed
    reason: "PaywallView, DowngradeBanner, EntitlementManager, and DailyCapTracker are built and unit-testable in isolation, but have ZERO production call sites. CoachingResultModel's capGate/onAnalysisRecorded closures default to nil and the only production instantiation (ValueDemoCoordinatorView, the onboarding demo) never supplies them. Confirmed by direct grep across the entire repo: `PaywallView(`, `ConversationHealthView(`, `DowngradeBanner(` match nothing outside their own declaration files; `EntitlementManager(` and `DailyCapTracker(` are constructed only inside their own XCTest files. No user, in any real session of the shipping app, can ever be capped, ever see the paywall, ever start/expire a trial, or ever see a downgrade banner. The phase's own code-review-fix pass (WR-02) reached the same conclusion and recorded it explicitly in deferred-items.md: 'do NOT count MONE-01/MONE-02 UI enforcement as delivered in Phase 4.'"
    artifacts:
      - path: "BanterApp/Paywall/PaywallView.swift"
        issue: "No production call site anywhere in the app; never presented to a user"
      - path: "BanterApp/Paywall/DowngradeBanner.swift"
        issue: "No production call site; DowngradeBannerStorageKey.lastSeenDowngrade is written/read by nothing"
      - path: "BanterShared/Sources/BanterShared/Paywall/EntitlementManager.swift"
        issue: "Never constructed outside its own unit test; isPremium/isLoaded never observed by any view"
      - path: "BanterShared/Sources/BanterShared/Paywall/DailyCapTracker.swift"
        issue: "Never constructed outside its own unit test; the only CoachingResultModel instantiation passes no capGate, so every analysis in the shipping app is uncapped"
      - path: "BanterApp/Coaching/CoachingResultModel.swift"
        issue: "capGate/onAnalysisRecorded are optional closures defaulting to nil with no production caller supplying non-nil values"
    missing:
      - "A post-onboarding home/settings surface that constructs EntitlementManager + DailyCapTracker and supplies capGate/onAnalysisRecorded to a non-onboarding CoachingResultModel instance"
      - "A presentation call site for PaywallView (triggered when dailyCapReached flips true)"
      - "A presentation call site for DowngradeBanner (triggered on trial-expiry-to-free transition)"
      - "A production call site writing to SentimentTimelineStore.append (currently only test-invoked), and a navigation path reaching ConversationHealthView"
  - truth: "User can view a per-conversation health score with an emotional-factor timeline, scoped to that conversation only (Roadmap SC3 / CALC-02, CALC-03)"
    status: failed
    reason: "ConversationHealthView is well-built (score card, Charts timeline, factor grid, CALC-03 scope caption, empty/single-point states, VoiceOver summary) and SentimentTimelineStore's append/read/isolation logic is structurally sound and unit-tested (Wave-0 scaffold, CI-deferred). However nothing in production ever calls SentimentTimelineStore.append (only the ValueDemoCoordinatorView onboarding path exists, and it does not append sentiment events), and ConversationHealthView itself has zero call sites (confirmed by repo-wide grep: `ConversationHealthView(` matches nothing outside its own file). The artifact exists and is internally correct but is unreachable dead code in the current app — same root cause and same WR-02 finding as SC4."
    artifacts:
      - path: "BanterApp/Calculator/ConversationHealthView.swift"
        issue: "No production call site; would always render the empty state even if reached, since nothing writes to the store"
      - path: "BanterShared/Sources/BanterShared/Calculator/SentimentTimelineStore.swift"
        issue: "append() is never invoked by production code — only by SentimentTimelineStoreTests"
    missing:
      - "A production call site that appends a SentimentEvent from each CoachingResponseDTO.sentiment (e.g. inside CoachingResultModel.selectTone or ValueDemoCoordinatorView.startCoaching)"
      - "A navigation path from the coaching/suggestions surface to ConversationHealthView for a given conversationId"
deferred: []
---

# Phase 4: Companion App UI & Paywall Verification Report

**Phase Goal:** The end-to-end core loop is a polished, monetized product — a user onboards, sees value before any paywall, gets tagged suggestions with expandable "why," reads a per-conversation love-calculator timeline, and hits a freemium reverse trial.
**Verified:** 2026-07-05
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

Derived from ROADMAP.md Phase 4 Success Criteria (the roadmap contract) merged with PLAN frontmatter must_haves.

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A first-run user experiences the core value (screenshot → tagged replies) before any signup or paywall (SC1 / ONBD-01) | VERIFIED | `ContentView -> ValueDemoCoordinatorView` is the actual app root. `ValueDemoCoordinatorView.startCoaching()` calls `CoachingResultModel(messages:)` with no `capGate`, and neither `ValueDemoCoordinatorView.swift` nor `OnboardingFlowModel.swift` contains a code reference to `DailyCapTracker`/`EntitlementManager` (only doc-comment mentions, confirmed by grep). `OnboardingFlowTests.testFreshInstallReachesSuggestionsWithNoPaywallOrSignupUI` asserts a suggestions element (`Copy` button, fixed post-CR-03 to match the real accessibility identifier) appears and asserts absence of "Unlock unlimited coaching"/"Start Free Trial"/an "Email" field. WR-05 fix adds loading/error+Retry states so the demo cannot silently dead-end. CR-02 fix adds a `--seed-sample-replies` fixture so the UI test doesn't need a live backend in CI. |
| 2 | User can pick a tone (playful/sincere/witty/direct) and tap any psychology tag to expand a plain-English, cited "why this works" (SC2 / COAC-02, COAC-04) | VERIFIED | `TonePickerView` iterates `ReplyStyle`'s 4 cases and calls `model.selectTone`, confirmed present in `TonePickerView.swift`. `TagExplainerSheet`/`TagExplainer.swift` decode the bundled `taxonomy.json` offline (no `URLSession`/network call in either file) and return `TaxonomyEntry` by `tagName` match; `SuggestionCardView.swift` renders `reply.psychologyTag` with no `isPremium`/`dailyCapReached` guard anywhere in the file (confirmed by grep — tags always visible, MONE-01's tag half holds). WR-03 fix makes the taxonomy dictionary tolerate duplicate `tagName`s instead of trapping. |
| 3 | User can view a per-conversation health score with an emotional-factor timeline, scoped to that conversation only — no match dossier (SC3 / CALC-02, CALC-03) | FAILED | `ConversationHealthView.swift` and `SentimentTimelineStore.swift` both exist and are structurally correct (CALC-03 negative-token guard passes at 0 hits; scope caption "Scoped to this conversation only — never shared across matches." present; `import Charts` present; WR-08 fix keys chart marks by array offset). But repo-wide grep confirms `ConversationHealthView(` has zero call sites and `SentimentTimelineStore.append` is invoked only by its own unit test — nothing in the shipping app ever writes a sentiment event or ever navigates to this view. See Gap 2. |
| 4 | Free tier caps daily analyses but always shows psychology tags; a 14-day full-access reverse trial downgrades gracefully to free; premium unlocks unlimited analyses + calculator depth via RevenueCat/StoreKit 2 (SC4 / MONE-01, MONE-02, MONE-03) | FAILED | `EntitlementManager`, `DailyCapTracker`, `PaywallView`, `DowngradeBanner` all exist, are individually well-built (CR-01 fixed the RevenueCat API misuse; WR-01 fixed the `Purchases.configure` crash risk; WR-06 fixed silent offering-load failure; WR-09/WR-10 fixed concurrency isolation), and are unit-tested via Wave-0 scaffolds. But zero of them have a production call site. `CoachingResultModel.capGate`/`onAnalysisRecorded` default to `nil` and no caller ever supplies non-nil values. The phase's own review-fix pass reached the identical conclusion (WR-02) and recorded it in `deferred-items.md`, explicitly instructing verification not to count this as delivered. See Gap 1. |
| 5 | Photos and keyboard permissions are primed with contextual explainers at the moment of need (SC5 / ONBD-02) | VERIFIED | `PermissionPrimingView` is a generic, parameterized component (`icon:heading:body:onContinue:onSkip:`); its `.photos()` static instance carries the heading "Let Banter read your screenshot" and body containing "never leaves your device", both confirmed present by grep. `PermissionPrimingTests.swift` asserts this heading precedes the system Photos prompt. Declining ("Not Now") routes to `ImportFlowModel`'s existing paste-text fallback per 04-03-SUMMARY — no dead end. |

**Score:** 3/5 truths verified (0 present-but-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `BanterApp/Coaching/CoachingClient.swift` | URLSession POST to /functions/v1/coaching | VERIFIED | Exists, 59 lines, sends only locked DTOs, no secret literal |
| `BanterApp/Coaching/SuggestionCardView.swift` | Reply card, always-visible tag | VERIFIED | Exists, 99 lines, no tier guard around tag |
| `BanterApp/Coaching/TonePickerView.swift` | 4-way tone picker | VERIFIED | Exists, 49 lines, calls `model.selectTone` |
| `BanterApp/Coaching/TagExplainerSheet.swift` | Inline tag explainer | VERIFIED | Exists, 33 lines, no network call |
| `BanterApp/Coaching/CoachingResultModel.swift` | @Observable result state | VERIFIED | Exists, 89 lines, `@MainActor`, generation-guarded (WR-04 fix) |
| `BanterApp/Onboarding/WelcomeView.swift` | Screen 4.1 | VERIFIED | Exact copy present |
| `BanterApp/Onboarding/PermissionPrimingView.swift` | Generic priming component | VERIFIED | Parameterized, `.photos()` instance |
| `BanterApp/Onboarding/OnboardingFlowModel.swift` | Onboarding state machine | VERIFIED | `#if DEBUG` seed args present |
| `BanterApp/Onboarding/ValueDemoCoordinatorView.swift` | Ungated demo coordinator | VERIFIED | Zero DailyCapTracker/EntitlementManager code refs |
| `BanterApp/Calculator/ConversationHealthView.swift` | Health score + Charts + factor grid | ⚠️ ORPHANED | Exists, 180 lines, structurally correct, zero call sites |
| `BanterShared/Sources/BanterShared/Calculator/SentimentTimelineStore.swift` | Per-conversationId timeline | ⚠️ ORPHANED | Exists, 66 lines, `append` never called in production |
| `BanterShared/Sources/BanterShared/Paywall/EntitlementManager.swift` | RevenueCat-backed entitlement | ⚠️ ORPHANED | Exists, 47 lines, never constructed in production |
| `BanterShared/Sources/BanterShared/Paywall/DailyCapTracker.swift` | Date-scoped cap counter | ⚠️ ORPHANED | Exists, 51 lines, never constructed in production |
| `BanterApp/Paywall/PaywallView.swift` | Runtime-priced dismissible paywall | ⚠️ ORPHANED | Exists, 224 lines, no hardcoded price, never presented |
| `BanterApp/Paywall/DowngradeBanner.swift` | Downgrade reassurance banner | ⚠️ ORPHANED | Exists, 46 lines, never presented |
| `BanterApp/Paywall/RevenueCatEntitlementSource.swift` | Production EntitlementSource | ⚠️ ORPHANED | Exists, 51 lines, guarded against unconfigured SDK, never constructed |
| `Banter.storekit` | StoreKit config, weekly premium + 14-day trial | VERIFIED | Present, from Plan 01 |
| `BanterApp/Resources/taxonomy.json` + `BanterShared/.../Resources/taxonomy.json` | Byte-synced bundled taxonomy | VERIFIED | `sync-taxonomy.sh --check` exits 0 locally (re-run, confirmed) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `SuggestionCardView` | `TagExplainer`/bundled taxonomy | `taxonomyEntry(for:)` lookup by `tagName` | WIRED | Confirmed by direct read of `TagExplainer.swift` and `TagExplainerSheet.swift` |
| `TonePickerView` | `CoachingResultModel.selectTone` | direct method call | WIRED | Confirmed in `TonePickerView.swift` |
| `ValueDemoCoordinatorView` | `CoachingClient`/`CoachingResultModel` | `startCoaching()` after `.confirm` | WIRED | Confirmed; ungated (no capGate supplied) |
| `PermissionPrimingView` | `ImportFlowModel` paste fallback | "Not Now" → `.entry(startInPasteMode: true)` | WIRED | Per 04-03-SUMMARY, confirmed by design (ContentView/coordinator routing read) |
| `CoachingResultModel` | `DailyCapTracker`/`EntitlementManager` | `capGate`/`onAnalysisRecorded` closures | **NOT_WIRED** | Closures exist but every production call site passes the `nil` default — no caller ever constructs or injects a real gate |
| `SentimentTimelineStore.append` | Coaching response ingestion | production write path | **NOT_WIRED** | No production code path calls `append`; only its own XCTest does |
| `PaywallView`/`ConversationHealthView`/`DowngradeBanner` | App navigation | any presentation call site | **NOT_WIRED** | Repo-wide grep for each type's initializer call (`TypeName(`) outside its own declaration file returns zero matches |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `ConversationHealthView` | `events(forConversationId:)` | `SentimentTimelineStore` (AppGroupStore-backed) | No — store is never appended to in production | ✗ DISCONNECTED |
| `SuggestionCardView` | `coachingModel.replies` | `CoachingClient.send` (real network) or `--seed-sample-replies` fixture (CI only) | Yes, in both the live and CI-seeded paths | ✓ FLOWING |
| `PaywallView` | `packageToPurchase` | `Purchases.shared.offerings()` | Yes when reached, but the view itself is never reached in production | N/A (unreachable) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Taxonomy drift guard (backend ↔ 2 client copies byte-identical) | `bash Backend/scripts/sync-taxonomy.sh --check` | "taxonomy files byte-identical" | ✓ PASS |
| Backend Deno suite (Phase 3 dependency, re-checked) | `deno test Backend/ --allow-env --allow-read` | 40 passed / 0 failed | ✓ PASS |
| Swift compile/unit tests (BanterShared + BanterApp + XCUITest) | `swift test --package-path BanterShared`, `xcodebuild build/test` | Not runnable — no local Swift toolchain (Windows host) | ? SKIP (CI-deferred, consistent with Phases 1-3 precedent) |
| Repo-wide production call-site grep for `PaywallView(`/`ConversationHealthView(`/`DowngradeBanner(`/`EntitlementManager(`/`DailyCapTracker(` | `grep -rn "TypeName(" --include="*.swift" .` | Zero matches outside own file (PaywallView/ConversationHealthView/DowngradeBanner); matches only inside own XCTest (EntitlementManager/DailyCapTracker) | ✓ PASS (confirms the gap, not a pass on the truth) |

### Probe Execution

No `scripts/*/tests/probe-*.sh` files exist in this repository and no plan/summary declares a probe. Skipped — not applicable to this project's structure (iOS/Deno, not probe-driven).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| ONBD-01 | 04-03 | Onboarding demonstrates core value before signup/paywall | ✓ SATISFIED | ValueDemoCoordinatorView + tests, verified above |
| ONBD-02 | 04-03 | Permissions primed contextually | ✓ SATISFIED | PermissionPrimingView + tests, verified above |
| COAC-02 | 04-02 | Tone selection steers suggestions | ✓ SATISFIED | TonePickerView, verified above |
| COAC-04 | 04-01, 04-02 | Tap tag to expand cited explanation | ✓ SATISFIED | TagExplainer/TagExplainerSheet, verified above |
| CALC-02 | 04-04 | Per-conversation health score + emotional-factor timeline | ✗ BLOCKED | ConversationHealthView built but unreachable; SentimentTimelineStore never appended to in production — no user can ever view this |
| CALC-03 | 04-04 | Insights scoped per-conversation only, no persistent match dossier | ✓ SATISFIED (structural) | Negative structural guard passes; the *boundary* holds even though the *feature* is unreachable — this requirement is about a privacy invariant, which the code enforces by construction |
| MONE-01 | 04-05 | Free tier daily cap; tags always visible | ✗ BLOCKED | DailyCapTracker exists and is correct in isolation, but is never constructed/consulted in production — no analysis is ever capped |
| MONE-02 | 04-05 | Premium subscription unlocks unlimited analyses/calculator depth/progression | ✗ BLOCKED | EntitlementManager/PaywallView exist but are never reachable — no user can ever purchase or unlock anything from this build |
| MONE-03 | 04-05 | 14-day reverse trial, graceful downgrade | ✗ BLOCKED | DowngradeBanner exists but never presented; trial/downgrade path is entirely unreachable |

**Orphaned requirements check:** All 9 requirement IDs traced in ROADMAP.md Phase 4 row appear in at least one plan's `requirements:` frontmatter. No orphans.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `BanterApp/Paywall/RevenueCatEntitlementSource.swift` | 41 | `TODO(deferred): replace via Info.plist/xcconfig once the RevenueCat dashboard project exists` | Info | Acceptable — references a named, tracked follow-up (also recorded in deferred-items.md), not a bare debt marker; does not trip the debt-marker gate |
| (repo-wide) | — | `PaywallView`, `ConversationHealthView`, `DowngradeBanner`, `EntitlementManager`, `DailyCapTracker` | 🛑 Blocker | Dead/orphaned code as shipped — built, individually correct, structurally wired to nothing. This is the central finding of this verification. |

No `FIXME`/`XXX`/unreferenced `TBD` markers found in any Phase 4 file.

### Human Verification Required

None required to resolve the status. The two failing truths (SC3, SC4) are resolved by direct, reproducible repo-wide grep (zero production call sites) — this is a structural/wiring gap, not a behavior that needs a human to observe. The gap is not ambiguous: the phase's own code-review-fix pass (WR-02, committed `b22368d`) independently reached and documented the identical conclusion in `deferred-items.md` before this verification began.

The following items remain CI-only (consistent with Phases 1-3 precedent, not new findings requiring a human):
- `swift test --package-path BanterShared` actually flipping all Wave-0 scaffolds from red to green (no local Swift toolchain on this Windows host).
- `xcodebuild build/test` compiling `BanterApp`/`BanterKeyboard`/`BanterUITests` (same reason).
- WR-04 (request-generation cancellation) and WR-09/WR-10 (Swift 6 actor-isolation fixes) are concurrency-correctness claims that only a compiler/CI run can confirm — REVIEW-FIX.md itself flags these as "Requires CI verification."

### Gaps Summary

Phase 4 delivers a genuinely working, tested, and fixed core loop for the first three success criteria: onboarding-before-paywall (SC1), tone-picker + tag-explainer (SC2), and contextual permission priming (SC5). These are not just present — they are wired end-to-end, covered by XCUITest assertions that were themselves debugged and fixed during the phase's own code-review pass (CR-01/02/03), and the ungated-demo invariant is enforced structurally (grep-provable absence of `DailyCapTracker`/`EntitlementManager` tokens on the onboarding path).

However, the phase's title and goal are "Companion App UI & **Paywall**" and "...hits a freemium reverse trial" — and the monetization and love-calculator halves of the phase are not reachable in the shipping app. `PaywallView`, `DowngradeBanner`, `ConversationHealthView`, `EntitlementManager`, and `DailyCapTracker` are all well-built, individually testable components with zero live call sites. `CoachingResultModel`'s `capGate` mechanism was deliberately designed as an optional injection point specifically so the ungated onboarding path stays structurally safe — but the corollary is that nothing else in the app ever supplies a non-nil gate, so the cap, paywall, trial, and downgrade banner are all inert. The love-calculator timeline (`ConversationHealthView`) is likewise fully built but never navigated to, and its data source (`SentimentTimelineStore`) is never appended to outside its own unit test.

This is not a disagreement with the executors' own assessment — the phase's code-review-fix pass (04-REVIEW.md WR-02, then 04-REVIEW-FIX.md and `deferred-items.md`) reached this exact conclusion and explicitly instructed: "do NOT count MONE-01/MONE-02 UI enforcement as delivered in Phase 4." This verification extends that same finding to CALC-02/ConversationHealthView, which has the identical unreached-artifact shape and was not separately called out in deferred-items.md but should be, since it is one of the phase's five roadmap success criteria.

**What would close these gaps:** a single post-onboarding surface (a "home" or "settings" screen reached after the first suggestions are shown) that (a) constructs `EntitlementManager` + `DailyCapTracker` and passes `capGate`/`onAnalysisRecorded` into subsequent `CoachingResultModel` instances, (b) presents `PaywallView` when `dailyCapReached` flips true, (c) presents `DowngradeBanner` on trial-expiry, and (d) provides a navigation entry point to `ConversationHealthView` for the current conversation, with a production call to `SentimentTimelineStore.append` wired into the coaching response-handling path. `deferred-items.md` already scopes items (a)-(c); this verification adds (d) to that same scope.

---

_Verified: 2026-07-05_
_Verifier: Claude (gsd-verifier)_
