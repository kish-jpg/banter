---
phase: 04-companion-app-ui-paywall
fixed_at: 2026-07-05T12:00:00Z
review_path: .planning/phases/04-companion-app-ui-paywall/04-REVIEW.md
iteration: 2
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 4: Code Review Fix Report (gap-closure re-review)

**Fixed at:** 2026-07-05
**Source review:** .planning/phases/04-companion-app-ui-paywall/04-REVIEW.md (gap-closure re-review of `3b71c5b..bedb277`)
**Iteration:** 2

**Summary:**
- Findings in scope: 4 (CR-01, WR-01..WR-03; fix_scope critical_warning — IN-01/02/03 excluded and left recorded in REVIEW.md)
- Fixed: 4
- Skipped: 0

**Verification note (environment):** no local Swift toolchain on this machine —
every fix was verified by full re-read, brace/paren balance counts, and
invariant greps. Compile verification is CI-deferred to the
`Build BanterApp (simulator)` and `swift test --package-path BanterShared` gates.

**Phase invariants re-verified after all fixes (grep, comment-stripped where relevant):**
- ONBD-01: zero functional EntitlementManager/DailyCapTracker refs in all onboarding files + ContentView (0 hits each after `//`-comment strip). The demo's coaching trigger is unchanged (`newState == .confirm`, ValueDemoCoordinatorView:67).
- MONE-01: SuggestionCardView untouched (empty diff vs bedb277), no isPremium/Entitlement refs; cap banner still renders above cards, never in place of them.
- CALC-03: conversationId is UUID-only everywhere; forbidden-token scan hits only PasteTextParser's `matchNamePrefix` verb helper and the test's own forbidden list (both pre-existing, outside the diff).
- No `$<digit>` price literals in Swift source.
- CoachingClient untouched (empty diff vs bedb277).
- Files touched across all four fixes: HomeModel.swift, HomeView.swift, ImportFlowModel.swift, ValueDemoCoordinatorView.swift — nothing else.

## Fixed Issues

### CR-01: Coaching starts on parse completion, not on the Confirm tap — CAPT-04 gate bypassed

**Files modified:** `BanterApp/Import/ImportFlowModel.swift`, `BanterApp/Home/HomeView.swift`, `BanterApp/Onboarding/ValueDemoCoordinatorView.swift`
**Commit:** f918d7b
**Applied fix:** Added an additive `.confirmed` case to `ImportFlowModel.State`, entered ONLY by `confirm()` (the CAPT-04 tap) — `guard !transcript.isEmpty` retained. HomeView's trigger moved from `.confirm` to `.confirmed`, so the Confirm screen (CAPT-02 flip/edit/delete) is now reachable and reviewable before anything leaves the device, and a daily-cap unit is only consumed by an action the user took. Both dispatchers handle the new case: HomeView renders `ConfirmTranscriptView` for `.confirm, .confirmed` (`.confirmed` shows at most one frame before `coaching` flips the surface); ValueDemoCoordinatorView handles `.confirmed` for switch exhaustiveness only — its trigger stays `.confirm` (intentional instant-demo behavior), so onboarding is behaviorally unchanged. The CI seed path (`--seed-sample-transcript` → `.confirm`) still lands on the Confirm screen: the seed sets `.confirm`, not `.confirmed`, and HomeView renders that as `ConfirmTranscriptView` without auto-starting coaching.
**Verification:** re-read all three files; brace/paren balance 22/22-42/42, 37/37-73/73, 39/39-83/83; grep confirms demo trigger unchanged and ONBD-01 comment-stripped refs = 0.

### WR-01: Downgrade banner stale after in-session re-upgrade; entitlement bookkeeping reconciled once per lifetime

**Files modified:** `BanterApp/Home/HomeModel.swift`, `BanterApp/Home/HomeView.swift`
**Commit:** 63fc586
**Applied fix:** `refreshEntitlement()`'s `isPremiumNow` branch now also sets `showDowngradeBanner = false` (alongside the existing `lastSeenDowngrade` clear), so a re-upgrade hides a showing banner. HomeView adds `.onChange(of: showPaywall)` that re-runs `refreshEntitlement()` whenever the paywall closes — this also rewrites `lastKnownPremiumKey` to the post-purchase truth, so a purchase-then-expiry-before-next-launch still detects the NEXT downgrade (MONE-03 preserved). Existing dedup semantics (set marker on show, clear on premium) unchanged.
**Verification:** re-read; brace balance 10/10 and 40/40; `lastKnownPremiumKey` write still unconditional at the end of `refreshEntitlement()`.

### WR-02: Daily-cap date key frozen at HomeModel init — no midnight rollover

**Files modified:** `BanterApp/Home/HomeModel.swift`
**Commit:** 88d7826
**Applied fix:** Removed the stored `capTracker` property (it had no consumers outside HomeModel). Added `private static func makeCapTracker()` which constructs `DailyCapTracker(dailyLimit: 3, dateString: todayDateString)` at USE time; the `capGate`/`onAnalysisRecorded` closures now call `HomeModel.makeCapTracker()` per invocation (explicit type name — no `self`/`Self` capture, so the no-retain-cycle property from the review holds). A session spanning midnight now gates/records against the new day's key. `DateFormatter` cached in `static let dateKeyFormatter` since date-string resolution became per-call. DailyCapTracker itself untouched (stateless; all state in AppGroupStore, per its date-scoped-key design).
**Verification:** re-read; brace balance 12/12; grep confirms zero remaining `capTracker` stored-property refs anywhere in BanterApp; closures capture only `[entitlement]` / nothing / `[sentimentStore, conversationId, importModel]` — never self.

### WR-03: One-way trip into the suggestions surface — no path to a second conversation

**Files modified:** `BanterApp/Home/HomeModel.swift`, `BanterApp/Home/HomeView.swift`
**Commit:** ccd72d4
**Applied fix:** `conversationId` became `private(set) var`; added `startNewConversation()` (sets `coaching = nil`, mints a fresh `UUID`, calls `importModel.startOver()`) — resets conversation-scoped state while keeping session-long cap/entitlement/banner state. HomeView's `suggestionsContent` gains a "New Conversation" button (44pt min height, accent style, below Conversation Health) that calls it, returning the dispatcher to `importFlowContent` at `.entry`. Any in-flight coaching response still lands in the OLD timeline because the old model's `onResponse` closure captured the old `conversationId` by value. No history/persistence built — one conversation at a time, per constraint.
**Verification:** re-read; brace balance 13/13 and 42/42; CALC-03 grep clean (UUID-only, no identity tokens introduced).

## Skipped Issues

None — all four in-scope findings fixed. IN-01/IN-02/IN-03 are out of scope for this pass and remain recorded in 04-REVIEW.md.

---

_Fixed: 2026-07-05_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 2_
