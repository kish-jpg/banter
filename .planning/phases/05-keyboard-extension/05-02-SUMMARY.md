---
phase: 05-keyboard-extension
plan: 02
subsystem: keyboard-extension
tags: [swift, swiftui, uikit, uihostingcontroller, appgroup, custom-keyboard]

# Dependency graph
requires:
  - phase: 05-keyboard-extension (05-01)
    provides: Public CachedSuggestionsStorageKey.suggestions and the real HomeModel production write of the latest [ReplySuggestion] into the App Group
provides:
  - KeyboardSuggestionsView — the SwiftUI keyboard surface (3-row suggestion list + empty state + globe key)
  - Rewritten KeyboardViewController hosting KeyboardSuggestionsView via child UIHostingController, reading the App Group cache and inserting on tap
affects: [05-VERIFICATION.md (phase gate manual/device checks), any future keyboard-surface visual iteration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "UIInputViewController hosting a SwiftUI view via child UIHostingController (addChild/edge-anchor constraints/didMove(toParent:))"
    - "viewWillAppear re-read: mutate hostingController.rootView in place rather than rebuilding the UIHostingController"
    - "Host-appearance resolution: textDocumentProxy.keyboardAppearance consulted ahead of traitCollection.userInterfaceStyle"

key-files:
  created:
    - BanterKeyboard/KeyboardSuggestionsView.swift
  modified:
    - BanterKeyboard/KeyboardViewController.swift

key-decisions:
  - "isDark is threaded through KeyboardSuggestionsView as a stored Bool per the plan's contract, even though Banter.Colors.* are asset-catalog colors that already auto-adapt to light/dark via their own asset variants — kept as the documented seam for a future keyboard-specific override rather than removed, since removing it would deviate from the plan's explicit param list"
  - "Globe key rendered with Banter.Colors.textSecondary only, never accent, matching the UI-SPEC's explicit 'looks like a standard system key' requirement"
  - "KeyboardViewController's makeRootView() is a private helper called from both viewDidLoad and viewWillAppear so the read-and-resolve logic has one source of truth, not duplicated inline"

patterns-established:
  - "Child-VC SwiftUI hosting inside a UIInputViewController subclass — the first (and likely only) place this codebase hosts SwiftUI inside a non-app-process UIKit extension"

requirements-completed: [KEYS-01, KEYS-02, KEYS-03]

coverage:
  - id: D1
    description: "KeyboardSuggestionsView renders up to 3 tappable cached suggestion rows (or empty-state copy) plus a neutral globe key, verified via grep-based structural acceptance criteria"
    requirement: "KEYS-01"
    verification:
      - kind: unit
        ref: "grep -q 'suggestions.prefix(3)' BanterKeyboard/KeyboardSuggestionsView.swift"
        status: pass
      - kind: other
        ref: "SwiftUI #Preview (3-suggestions + empty state) — CI-renderable, not yet executed on this Windows host (no local Swift toolchain)"
        status: unknown
    human_judgment: true
    rationale: "No local Swift toolchain on this Windows host (Phase 1-4 precedent) — CI build/preview render is the actual compile proof, deferred to the next CI run."
  - id: D2
    description: "KeyboardViewController hosts KeyboardSuggestionsView, reads the App Group cache, re-reads on viewWillAppear, and inserts a tapped suggestion via textDocumentProxy.insertText"
    requirement: "KEYS-02"
    verification:
      - kind: unit
        ref: "grep -q 'textDocumentProxy.insertText' BanterKeyboard/KeyboardViewController.swift"
        status: pass
      - kind: manual_procedural
        ref: "Device/simulator check: switch to Banter keyboard in a real chat app, tap a suggestion, confirm exact text inserts (05-VALIDATION.md Manual-Only table)"
        status: unknown
    human_judgment: true
    rationale: "Cross-app keyboard-switching and real text-field insertion cannot be exercised via XCUITest (05-RESEARCH.md Pitfall 3) — this is an outstanding device-only human check for the phase gate."
  - id: D3
    description: "No network-capable code path anywhere in BanterKeyboard/; RequestsOpenAccess stays false"
    requirement: "KEYS-03"
    verification:
      - kind: unit
        ref: "grep -riE 'URLSession|import RevenueCat|import Network' BanterKeyboard/ (confirmed empty)"
        status: pass
      - kind: unit
        ref: "grep -A1 'RequestsOpenAccess' BanterKeyboard/Info.plist (confirmed <false/>)"
        status: pass
      - kind: unit
        ref: "BanterShared/Tests/BanterSharedTests/KeyboardNetworkBoundaryGuardTests.swift#testBanterKeyboardSourcesContainNoNetworkOrRevenueCatTokens (Plan 01 guard, re-run against these new sources)"
        status: unknown
    human_judgment: true
    rationale: "No local Swift toolchain — swift test execution deferred to CI (Phase 1-4 precedent). Local grep mirror already confirms zero matches against the new/rewritten sources."

duration: 8min
completed: 2026-07-06
status: complete
---

# Phase 5 Plan 2: Keyboard Suggestion Surface (Read + Tap-to-Insert) Summary

**KeyboardViewController rewritten to host a minimal SwiftUI KeyboardSuggestionsView via child UIHostingController — reads the App Group cache, inserts on tap through textDocumentProxy, re-reads on viewWillAppear, and always shows the globe key — zero network code anywhere in BanterKeyboard/**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-06T04:19:00Z
- **Completed:** 2026-07-06T04:27:00Z
- **Tasks:** 2
- **Files modified:** 2 (1 created, 1 rewritten)

## Accomplishments
- `KeyboardSuggestionsView` renders up to 3 tappable suggestion rows (or the exact empty-state copy) plus a neutral, never-accent-tinted globe key, with static `#Preview`s for both states — the CI screenshot artifact this phase's UI contract requires.
- `KeyboardViewController` is now a thin `UIInputViewController` that hosts the SwiftUI view as a child VC, reads `AppGroupStore.read([ReplySuggestion].self, forKey: CachedSuggestionsStorageKey.suggestions)` — the exact consumer of Plan 01's producer write — and re-reads fresh on every `viewWillAppear` by mutating `hostingController.rootView` in place (never rebuilding the hosting controller).
- Tap-to-insert (`textDocumentProxy.insertText`) and globe-key switching (`advanceToNextInputMode`) are both wired through `KeyboardSuggestionsView`'s closures back into the controller — completing the KEYS-02 chain end to end at the source level.
- Host-appearance resolution (`textDocumentProxy.keyboardAppearance` consulted ahead of `traitCollection.userInterfaceStyle`) implemented exactly per 05-UI-SPEC.md's Appearance Strategy, so a chat app that forces `.dark`/`.light` on its text field is respected even if it differs from ambient device mode.
- Zero network-capable tokens anywhere in `BanterKeyboard/`; `RequestsOpenAccess` confirmed still `<false/>`.

## Task Commits

Each task was committed atomically:

1. **Task 1: KeyboardSuggestionsView — minimal SwiftUI 3-row list + globe key** - `93c260b` (feat)
2. **Task 2: Rewrite KeyboardViewController to host SwiftUI + read cache + insert + globe** - `95b9c43` (feat)

**Plan metadata:** (final docs commit follows this SUMMARY)

## Files Created/Modified
- `BanterKeyboard/KeyboardSuggestionsView.swift` - new SwiftUI view: 3-row suggestion list, empty state, globe key, two `#Preview`s
- `BanterKeyboard/KeyboardViewController.swift` - rewritten from the Phase 1 `UILabel` placeholder to a `UIHostingController<KeyboardSuggestionsView>`-hosting controller with App Group read, tap-to-insert, viewWillAppear re-read, and keyboardAppearance resolution

## Decisions Made
- `isDark` is threaded through `KeyboardSuggestionsView` as a stored `Bool` exactly per the plan's parameter contract, even though `Banter.Colors.*` are asset-catalog colors that already resolve their own light/dark variants automatically — kept as the documented seam the plan requires rather than dropped, since dropping it would deviate from the locked artifact signature in `must_haves.key_links`.
- The App-Group-read-plus-appearance-resolution logic lives in one private `makeRootView()` helper on `KeyboardViewController`, called from both `viewDidLoad` and `viewWillAppear`, so there is a single source of truth for how the root view is constructed rather than two near-duplicate blocks.
- Globe key uses `Banter.Colors.textSecondary` exclusively, never `Banter.Colors.accent`, matching the UI-SPEC's explicit "must look like a standard system key" requirement — verified structurally (no `Banter.Colors.accent` token appears near the globe `Image`).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. No local Swift toolchain on this Windows host — per Phase 1-4 established precedent, `swift test`/Xcode build verification is deferred to CI; every acceptance criterion that IS locally verifiable (grep-based structural checks against the new/rewritten source files) was run and passes, including the KEYS-03 negative-token scan across the whole `BanterKeyboard/` directory and the `RequestsOpenAccess=false` check.

## User Setup Required

None - no external service configuration required.

## Manual/Device-Only Verification (Outstanding for Phase Gate)

Per 05-VALIDATION.md's Manual-Only table and this plan's own `<verification>` block, the following are NOT CI-automatable and remain outstanding human checks at the phase gate (05-VERIFICATION.md):

- Enable the Banter keyboard in Settings (Full Access left OFF), open Notes/Messages, switch to it via the globe key, tap a suggestion, and confirm the exact text inserts into the host field (KEYS-02 runtime).
- Confirm suggestions render and insert correctly with Full Access OFF (KEYS-03 runtime half).
- Confirm the globe key switches back to the system keyboard.

## Next Phase Readiness

The complete keyboard-side vertical slice exists at the source level: app writes suggestions -> keyboard reads and displays them -> tap inserts into the host app's text field -> globe key switches keyboards -> no network path anywhere in the target. CI build/test run and the three device-only checks above are the only remaining proof points before the phase can be marked fully verified. No blockers for any subsequent plan.

## Self-Check: PASSED

Both files confirmed present on disk; both task commit hashes (`93c260b`, `95b9c43`) confirmed in `git log --oneline`.

---
*Phase: 05-keyboard-extension*
*Completed: 2026-07-06*
