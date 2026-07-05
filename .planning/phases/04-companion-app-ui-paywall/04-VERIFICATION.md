---
phase: 04-companion-app-ui-paywall
verified: 2026-07-05T14:00:00Z
status: passed
score: 5/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 3/5
  gaps_closed:
    - "User can view a per-conversation health score with an emotional-factor timeline, scoped to that conversation only (Roadmap SC3 / CALC-02, CALC-03)"
    - "Free tier caps daily analyses but always shows psychology tags; a 14-day full-access reverse trial downgrades gracefully to free; premium unlocks unlimited analyses + calculator depth via RevenueCat/StoreKit 2 (Roadmap SC4 / MONE-01, MONE-02, MONE-03)"
  gaps_remaining: []
  regressions: []
deferred: []
---

# Phase 4: Companion App UI & Paywall Verification Report

**Phase Goal:** The end-to-end core loop is a polished, monetized product — a user onboards, sees value before any paywall, gets tagged suggestions with expandable "why," reads a per-conversation love-calculator timeline, and hits a freemium reverse trial.
**Verified:** 2026-07-05
**Status:** passed
**Re-verification:** Yes — after gap closure (plans 04-06, 04-07 + scoped code review 04-REVIEW.md/04-REVIEW-FIX.md)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A first-run user experiences the core value (screenshot → tagged replies) before any signup or paywall (SC1 / ONBD-01) | VERIFIED (regression-checked) | `ContentView` still routes a fresh install (`hasCompletedOnboarding == false`, or a DEBUG fresh-install/reset-onboarding seed) to `ValueDemoCoordinatorView(onComplete:)`. Comment-stripped grep of `ValueDemoCoordinatorView.swift` AND `OnboardingFlowModel.swift` for `EntitlementManager\|DailyCapTracker` returns zero matches (re-ran myself, exit 1/no match on both files) — the ONBD-01 invariant survived the new Home-surface wiring. `OnboardingFlowTests.testFreshInstallReachesSuggestionsWithNoPaywallOrSignupUI` still drives Welcome → "Try It Now" → suggestions (Copy button) and asserts absence of paywall/signup UI; its seed path (`--seed-fresh-install --seed-sample-transcript --seed-sample-replies`) is untouched by any 04-06/04-07 commit. |
| 2 | User can pick a tone (playful/sincere/witty/direct) and tap any psychology tag to expand a plain-English, cited "why this works" (SC2 / COAC-02, COAC-04) | VERIFIED (regression-checked) | `TonePickerView`/`TagExplainer`/`TagExplainerSheet`/`SuggestionCardView` are unmodified by the gap-closure commits (`git log` shows only Home/ContentView/ValueDemoCoordinatorView/ImportFlowModel/CoachingResultModel touched). Re-ran the tag-tier grep myself: `grep -n "isPremium\|dailyCapReached" BanterApp/Coaching/SuggestionCardView.swift` returns nothing — tags still render unconditionally in both the demo and the new Home surface (`HomeView.swift`'s `ForEach(... SuggestionCardView(...))` has no tier guard around it either). |
| 3 | User can view a per-conversation health score with an emotional-factor timeline, scoped to that conversation only — no match dossier (SC3 / CALC-02, CALC-03) | VERIFIED — gap closed | `CoachingResultModel` gained an additive `onResponse: ((CoachingResponseDTO) -> Void)? = nil` parameter, invoked as `onResponse?(response)` inside the same `guard generation == requestGeneration else { return }` block as `onAnalysisRecorded?()` (confirmed by direct read of `CoachingResultModel.swift:63-89`). `HomeModel` now owns `let sentimentStore = SentimentTimelineStore()` and `private(set) var conversationId = UUID()`, and `startCoaching()` supplies `onResponse: { ... sentimentStore.append(from: response, conversationId: conversationId, messageIndex: ..., speaker: .match) }` — a real production write path, confirmed present in `HomeModel.swift:60-71`. `HomeView.swift:116-123` adds a `NavigationLink` to `ConversationHealthView(conversationId: model.conversationId, store: model.sentimentStore)`, passing the SAME store/id used for writes — repo-wide grep confirms this is the only call site outside `ConversationHealthView.swift` itself. `ConversationHealthView`'s own scope caption ("Scoped to this conversation only — never shared across matches.") and `conversationId`-only init are unchanged. CALC-03 boundary re-verified: `grep -rniE "matchName\|matchIdentity" BanterApp/Home BanterApp/Coaching` returns zero matches. |
| 4 | Free tier caps daily analyses but always shows psychology tags; a 14-day full-access reverse trial downgrades gracefully to free; premium unlocks unlimited analyses + calculator depth via RevenueCat/StoreKit 2 (SC4 / MONE-01, MONE-02, MONE-03) | VERIFIED — gap closed | `HomeModel` is now the first production construction site for `EntitlementManager(source: RevenueCatEntitlementSource())` and a per-call `DailyCapTracker(dailyLimit: 3, dateString:)` (re-checked myself; matches the WR-02 fix that moved the tracker from a frozen init-time property to a `makeCapTracker()` call built fresh at gate/record time, fixing the midnight-rollover bug found in code review). `startCoaching()` builds `CoachingResultModel` with a non-nil `capGate` (`capTracker.canAnalyze(isPremium: entitlement.isPremium)`) and `onAnalysisRecorded` (`capTracker.recordAnalysis()`) — every real (post-onboarding) analysis is now cap-gated, confirmed by direct read of `HomeModel.swift:60-71`. `HomeView.swift` presents `PaywallView(entitlementManager: model.entitlement, onDismiss:)` as a `.sheet` when the cap banner's "See Premium" is tapped (`coaching.dailyCapReached` renders the banner ABOVE the still-mounted `SuggestionCardView` `ForEach` — confirmed by reading `HomeView.swift:81-139`, no teardown of the card list), and `DowngradeBanner(onGoPremium: { showPaywall = true })` renders when `model.showDowngradeBanner` is true, with `HomeModel.refreshEntitlement()` detecting a premium→free transition via `AppGroupStore`-persisted `lastKnownPremiumKey` and deduping through `DowngradeBannerStorageKey.lastSeenDowngrade` (both read AND written, confirmed at `HomeModel.swift:33-55`). `PaywallView(`/`ConversationHealthView(`/`DowngradeBanner(` each now have exactly one production call site (`HomeView.swift`), confirmed by repo-wide grep excluding their own declaration files and test files. Re-verified myself: no `$<digit>` price literal anywhere in `BanterApp/Home`, `BanterApp/Paywall`, `BanterApp/Onboarding`, or `ContentView.swift`; `RevenueCatEntitlementSource` reads the price at runtime from the fetched `StoreProduct`/`Package` (unchanged, `PaywallView.swift`). |
| 5 | Photos and keyboard permissions are primed with contextual explainers at the moment of need (SC5 / ONBD-02) | VERIFIED (regression-checked) | `PermissionPrimingView`/`PermissionPrimingTests.swift` are untouched by any gap-closure commit; `ValueDemoCoordinatorView`'s Welcome → PermissionPriming → import flow is unchanged (only the trailing `onComplete`/"Continue to Banter" affordance was added on the suggestions screen, after this flow completes). |

**Score:** 5/5 truths verified (0 present-but-behavior-unverified)

### Deferred Items Re-Check

`deferred-items.md`'s WR-02 entry ("MONE-01/MONE-02 UI is structurally inert as shipped in Phase 4... do NOT count MONE-01/MONE-02 UI enforcement as delivered") is now **satisfied**: `EntitlementManager`, `DailyCapTracker`, `PaywallView`, and `DowngradeBanner` all have live production construction/presentation sites in `BanterApp/Home/HomeModel.swift` and `BanterApp/Home/HomeView.swift`, closing exactly the gap that entry recorded. The companion `ConversationHealthView`/`SentimentTimelineStore` finding (called out in the same deferred-items entry and extended in the prior VERIFICATION.md to cover CALC-02) is also closed by plan 04-07. The remaining deferred item (WR-11 — no production coaching endpoint URL yet; `CoachingClient.defaultBaseURL` still resolves to `localhost`/an `.invalid` sentinel) is unrelated to this phase's UI/paywall reachability goal and correctly remains deferred to a pre-TestFlight deployment step, not a Phase 4 gap.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `BanterApp/Home/HomeModel.swift` | Constructs EntitlementManager/DailyCapTracker, gated coaching, sentiment write, downgrade detection | ✓ VERIFIED | New, 105 lines, read in full — matches must_haves exactly |
| `BanterApp/Home/HomeView.swift` | Post-onboarding surface: gated import→coach loop, paywall/downgrade/health-nav presentation | ✓ VERIFIED | New, 169 lines, read in full — cap banner above cards, sheet presentation, NavigationLink to health view, "New Conversation" reset |
| `BanterApp/ContentView.swift` | Routes onboarding ↔ Home via persisted completion flag | ✓ VERIFIED | `@AppStorage("hasCompletedOnboarding")`, DEBUG seed-arg override, constructs no entitlement/cap types itself |
| `BanterApp/Onboarding/ValueDemoCoordinatorView.swift` | Gains `onComplete` hook; stays ungated | ✓ VERIFIED | `onComplete: () -> Void = {}` param + "Continue to Banter" button; comment-stripped grep for EntitlementManager/DailyCapTracker = 0 hits |
| `BanterApp/Coaching/CoachingResultModel.swift` | Gains additive `onResponse` hook; capGate/onAnalysisRecorded unchanged | ✓ VERIFIED | `onResponse?(response)` called inside the same generation guard as `onAnalysisRecorded?()`; existing behavior/signature otherwise untouched |
| `BanterApp/Import/ImportFlowModel.swift` | Gains `.confirmed` state entered only by the user's `confirm()` tap (CR-01 fix) | ✓ VERIFIED | `case confirmed` added to `State`; `confirm()` sets `.confirmed`, not the parse-completion `.confirm` |
| `BanterApp/Paywall/PaywallView.swift` | Runtime-priced paywall | ✓ VERIFIED — now WIRED | Unmodified internally; now has a real call site in HomeView.swift |
| `BanterApp/Paywall/DowngradeBanner.swift` | Downgrade reassurance banner | ✓ VERIFIED — now WIRED | Unmodified internally; now has a real call site + dedup marker read/write |
| `BanterShared/.../EntitlementManager.swift` | RevenueCat-backed entitlement | ✓ VERIFIED — now WIRED | Unmodified internally; now constructed in HomeModel |
| `BanterShared/.../DailyCapTracker.swift` | Date-scoped cap counter | ✓ VERIFIED — now WIRED | Unmodified internally; constructed per-call in HomeModel (WR-02 fix resolved the frozen-date-key bug found in review) |
| `BanterApp/Calculator/ConversationHealthView.swift` | Health score + Charts + factor grid | ✓ VERIFIED — now WIRED | Unmodified internally; now has a NavigationLink call site in HomeView.swift |
| `BanterShared/.../SentimentTimelineStore.swift` | Per-conversationId timeline | ✓ VERIFIED — now WIRED | Unmodified internally; `.append(from:...)` now called from HomeModel's `onResponse` closure |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `CoachingResultModel` | `DailyCapTracker`/`EntitlementManager` | `capGate`/`onAnalysisRecorded` closures | **WIRED** (was NOT_WIRED) | `HomeModel.startCoaching()` supplies non-nil closures on every real coaching call; re-read confirms `capGate: { [entitlement] in HomeModel.makeCapTracker().canAnalyze(isPremium: entitlement.isPremium) }` |
| `SentimentTimelineStore.append` | Coaching response ingestion | production write path | **WIRED** (was NOT_WIRED) | `HomeModel`'s `onResponse` closure calls `sentimentStore.append(from:conversationId:messageIndex:speaker:)` on every non-stale response |
| `PaywallView`/`ConversationHealthView`/`DowngradeBanner` | App navigation | presentation call site | **WIRED** (was NOT_WIRED) | Repo-wide grep for each type's initializer now matches exactly one production file (`HomeView.swift`), outside each type's own declaration file |
| `ImportFlowModel.confirm()` | `HomeView` coaching trigger | `.confirmed` state transition | **WIRED** (new, CR-01 fix) | `ConfirmTranscriptView`'s "Confirm & Continue" button calls `model.confirm()`, which sets `.confirmed`; `HomeView.onChange(of: model.importModel.state)` triggers `startCoaching()` only on `.confirmed`, not on parse-completion `.confirm` — CAPT-04 consent gate now actually gates the real (non-demo) surface |
| `ContentView` | `HomeView` / `ValueDemoCoordinatorView` | `@AppStorage("hasCompletedOnboarding")` + DEBUG seed override | **WIRED** | Confirmed by direct read; onComplete hook flips the flag on the demo's new "Continue to Banter" tap |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `ConversationHealthView` | `events(forConversationId:)` | `SentimentTimelineStore`, written by `HomeModel`'s `onResponse` closure on every real coaching response | Yes — write and read use the same store instance and conversationId | ✓ FLOWING (was DISCONNECTED) |
| `PaywallView` | `packageToPurchase` | `Purchases.shared.offerings()`, reached via the cap banner's "See Premium" or the downgrade banner's "Go Premium" | Yes, and the view is now reachable in production | ✓ FLOWING (was N/A unreachable) |
| `SuggestionCardView` (both demo and Home) | `coaching.replies` | `CoachingClient.send` (real) / `--seed-sample-replies` fixture (CI only, demo path only) | Yes | ✓ FLOWING (unchanged) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Taxonomy drift guard (backend ↔ 2 client copies byte-identical) | `bash Backend/scripts/sync-taxonomy.sh --check` | "taxonomy files byte-identical" | ✓ PASS |
| Backend Deno suite | `deno test Backend/ --allow-env --allow-read` | 40 passed / 0 failed | ✓ PASS |
| ONBD-01 invariant (comment-stripped grep, re-run by verifier) | `grep -vE '^\s*(///\|//\|/\*\|\*)' ValueDemoCoordinatorView.swift \| grep -Ei 'EntitlementManager\|DailyCapTracker'` and same for `OnboardingFlowModel.swift` | zero matches, both files | ✓ PASS |
| MONE-01 invariant (re-run by verifier) | `grep -n 'isPremium\|dailyCapReached' SuggestionCardView.swift` | no matches | ✓ PASS |
| No price literal (re-run by verifier) | `grep -rnE '\$[0-9]' BanterApp/Home BanterApp/Paywall BanterApp/Onboarding ContentView.swift` | no matches | ✓ PASS |
| CALC-03 invariant (re-run by verifier) | `grep -rniE 'matchName\|matchIdentity' BanterApp/Home BanterApp/Coaching` | no matches | ✓ PASS |
| Production call-site grep for `PaywallView(`/`ConversationHealthView(`/`DowngradeBanner(`/`EntitlementManager(`/`DailyCapTracker(` (re-run by verifier) | `grep -rln "TypeName(" --include=*.swift . \| grep -v Tests` | each matches exactly `HomeModel.swift`/`HomeView.swift` (outside own declaration/test files) | ✓ PASS — this is the exact reversal of the prior verification's failing finding |
| CAPT-04 consent gate (re-run by verifier) | Direct read of `ImportFlowModel.confirm()`, `ConfirmTranscriptView`'s "Confirm & Continue" button, `HomeView`'s `.onChange` trigger | `confirm()` sets `.confirmed`; HomeView triggers coaching only on `.confirmed` | ✓ PASS (this was CR-01, fixed in `f918d7b`) |
| Swift compile/unit tests | `swift test` / `xcodebuild` | Not runnable — no local Swift toolchain (Windows host) | ? SKIP (CI-deferred, consistent with Phases 1-4 precedent; explicitly acknowledged as unresolved in 04-06/04-07-SUMMARY.md and 04-REVIEW-FIX.md) |

### Probe Execution

No `scripts/*/tests/probe-*.sh` files exist in this repository and no plan/summary declares a probe. Skipped — not applicable to this project's structure.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| ONBD-01 | 04-03, 04-06 (invariant) | Onboarding demonstrates core value before signup/paywall | ✓ SATISFIED | Unchanged demo path + invariant re-verified after gap-closure wiring |
| ONBD-02 | 04-03 | Permissions primed contextually | ✓ SATISFIED | Unchanged, re-confirmed no regression |
| COAC-02 | 04-02 | Tone selection steers suggestions | ✓ SATISFIED | Unchanged, reused verbatim in Home surface |
| COAC-04 | 04-01, 04-02 | Tap tag to expand cited explanation | ✓ SATISFIED | Unchanged, reused verbatim |
| CALC-02 | 04-04, 04-07 | Per-conversation health score + emotional-factor timeline | ✓ SATISFIED | Write path + navigation now real and production-reachable |
| CALC-03 | 04-04, 04-07 | Insights scoped per-conversation only, no persistent match dossier | ✓ SATISFIED | conversationId-only keying re-verified across the new wiring; forbidden-token guard clean |
| MONE-01 | 04-05, 04-06 | Free tier daily cap; tags always visible | ✓ SATISFIED | DailyCapTracker constructed + consulted on every real analysis; tags render unconditionally |
| MONE-02 | 04-05, 04-06 | Premium subscription unlocks unlimited analyses/calculator depth/progression | ✓ SATISFIED | EntitlementManager/PaywallView now reachable; runtime-priced |
| MONE-03 | 04-05, 04-06 | 14-day reverse trial, graceful downgrade | ✓ SATISFIED | DowngradeBanner now presented on detected premium→free transition, deduped, re-armed on re-upgrade |

**Orphaned requirements check:** All 9 requirement IDs traced in ROADMAP.md Phase 4 row and REQUIREMENTS.md appear in at least one plan's `requirements:` frontmatter (04-06 claims MONE-01/02/03; 04-07 claims CALC-02/03). No orphans.

### Anti-Patterns Found

No `TODO`/`FIXME`/`XXX`/`TBD`/`HACK`/`PLACEHOLDER` markers found in any of the six gap-closure-touched files (`HomeModel.swift`, `HomeView.swift`, `ContentView.swift`, `ValueDemoCoordinatorView.swift`, `ImportFlowModel.swift`, `CoachingResultModel.swift`) — re-checked directly. The pre-existing `RevenueCatEntitlementSource.swift` `TODO(deferred)` marker (untouched by this gap-closure pass) still references a named follow-up in `deferred-items.md`, so it does not trip the debt-marker gate. No dead/orphaned monetization or calculator code remains — this was the central finding of the prior verification and it is now closed.

### Human Verification Required

None required to resolve the status. The prior verification's two failing truths were resolved by direct, reproducible grep and code reads (production call sites now exist where none did before) — a structural/wiring fix, not a behavior only a human can observe. The scoped code review (`04-REVIEW.md`) independently found and the fix pass (`04-REVIEW-FIX.md`) independently closed 1 Critical (CR-01: coaching was triggering on parse-completion instead of the user's Confirm tap, bypassing CAPT-04) + 3 Warnings (WR-01 stale downgrade banner after re-upgrade, WR-02 daily-cap date key frozen at init causing no midnight rollover, WR-03 no path to a second conversation) before this re-verification began; this report independently re-read all four fixes against the source and confirms they are present and structurally correct.

The following remain CI-only (consistent with Phases 1-4 precedent, not new findings requiring a human):
- `swift test --package-path BanterShared` / `xcodebuild build/test` actually compiling and passing (actor-isolation correctness for `@MainActor HomeModel`, closure capture semantics, RevenueCat/Charts API usage) — no local Swift toolchain on this Windows host.
- Manual RevenueCat sandbox purchase / 14-day trial-expiry verification (real paywall render, real downgrade transition) — explicitly scoped to `04-VALIDATION.md`'s Manual-Only section, not exercised in this environment on any prior or current verification pass.
- IN-01/IN-02/IN-03 (info-severity findings from `04-REVIEW.md`, explicitly left out of the fix pass's scope: seed-argument coupling in HomeModel's ImportFlowModel default, cosmetic cap-banner lag after upgrade, a bare AppStorage key string) — cosmetic/low-severity, do not block the phase goal, and remain recorded in `04-REVIEW.md` for a future pass.

### Gaps Summary

Both gaps from the prior verification (2026-07-05, `gaps_found`, 3/5) are closed. Truth 3 (SC3 / CALC-02, CALC-03 — the love-calculator timeline) and Truth 4 (SC4 / MONE-01, MONE-02, MONE-03 — the freemium reverse trial) previously failed because `PaywallView`, `DowngradeBanner`, `EntitlementManager`, `DailyCapTracker`, `ConversationHealthView`, and `SentimentTimelineStore` were all individually correct but had zero production call sites — dead code the user could never reach. Gap-closure plans 04-06 and 04-07 built a new post-onboarding `HomeModel`/`HomeView` surface that constructs the entitlement/cap machinery, wires it into a real (non-demo) `CoachingResultModel` via the pre-existing `capGate`/`onAnalysisRecorded` injection points, adds an additive `onResponse` hook for the sentiment write path, and presents `PaywallView`/`DowngradeBanner`/a `ConversationHealthView` navigation entry — all confirmed present, correctly wired, and internally unmodified by direct reading of the source (not by trusting SUMMARY.md's claims). A scoped code review (`04-REVIEW.md`) caught one genuine correctness bug in this new wiring — coaching was starting on parse-completion (`.confirm`) rather than the user's actual Confirm tap, bypassing the CAPT-04 consent gate — plus three lower-severity issues (stale downgrade banner, frozen cap date key, no second-conversation path); all four were fixed (`04-REVIEW-FIX.md`) and this re-verification independently confirmed each fix is present and correct by reading the current source, not the review's own claims. The ONBD-01 (ungated demo), MONE-01 (tags always visible), and CALC-03 (conversationId-only, no match dossier) invariants were re-verified end-to-end after all this new wiring landed and hold cleanly. The backend test suite (40/40) and taxonomy drift guard remain green. No regressions were found in the three previously-verified truths (SC1, SC2, SC5) — none of their supporting files were touched by the gap-closure or review-fix commits except for the additive, backward-compatible `onComplete`/`.confirmed`/`onResponse` extensions, each confirmed by direct read to be source-compatible with existing call sites and non-breaking to existing test seed paths.

---

_Verified: 2026-07-05_
_Verifier: Claude (gsd-verifier)_
