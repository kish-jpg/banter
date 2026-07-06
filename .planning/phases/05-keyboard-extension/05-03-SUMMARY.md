---
phase: 05-keyboard-extension
plan: 03
subsystem: keyboard-extension
tags: [swiftui, onboarding, home, deep-link, banner]

# Dependency graph
requires:
  - phase: 04-companion-app-ui-paywall
    provides: PermissionPrimingView generic component + DowngradeBanner visual family + HomeView top-of-VStack conditional-banner slot
provides:
  - PermissionPrimingView.keyboard(...) factory (guided keyboard-enable flow, KEYS-04)
  - KeyboardEnableBanner (Home-surface nudge) + isKeyboardLikelyEnabled(bundleID:) fail-open detection
  - prefs URL type registered in BanterApp/Info.plist (enables prefs:root=General&path=Keyboard)
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Additive nil-defaulted params on an existing generic component (steps/reassurance) to add a new factory without touching the existing call site"
    - "Fail-open best-effort detection: an uncertain/undocumented UserDefaults read only ever changes copy/CTA visibility, never gates functionality"

key-files:
  created:
    - BanterApp/Home/KeyboardEnableBanner.swift
  modified:
    - BanterApp/Onboarding/PermissionPrimingView.swift
    - BanterApp/Home/HomeView.swift
    - BanterApp/Info.plist

key-decisions:
  - "steps/reassurance added as nil-defaulted init params (not a subclass/new component) so ValueDemoCoordinatorView's existing .photos(...) call site required zero changes"
  - "KeyboardEnableBanner implemented as a Button-wrapped label (not .contentShape+.onTapGesture) for the whole-banner tap target — same tap-through result, fewer modifiers"
  - "BanterKeyboard's bundle id derived as com.banter.BanterKeyboard from project.yml's bundleIdPrefix + XcodeGen's default per-target suffix (no explicit bundleIdSuffix override in project.yml) — used only for the fail-open detection helper, never for anything functional"
  - "dismissKeyboardBanner()/openKeyboardSettings() live in HomeView (not HomeModel) since they are pure UI/system-URL actions with no state HomeModel needs to own; only the dismissed flag is persisted, via the existing AppGroupStore idiom (not a new @AppStorage wrapper)"

requirements-completed: [KEYS-04]

coverage:
  - id: D1
    description: "PermissionPrimingView gains additive steps/reassurance params + a .keyboard(...) factory; existing .photos(...) factory and call site unchanged"
    requirement: "KEYS-04"
    verification:
      - kind: unit
        ref: "grep -q 'steps: \\[String\\]? = nil' / 'reassurance: String? = nil' / 'static func keyboard(onContinue' / 'static func photos(onContinue' BanterApp/Onboarding/PermissionPrimingView.swift"
        status: pass
    human_judgment: true
    rationale: "No local Swift toolchain on this Windows host (Phase 1-4 precedent) — grep-based acceptance criteria confirmed locally; swift/xcodebuild compile + PermissionPrimingTests pass deferred to CI."
  - id: D2
    description: "KeyboardEnableBanner exists (DowngradeBanner visual family), with a co-located dismissal storage key and fail-open best-effort AppleKeyboards detection"
    requirement: "KEYS-04"
    verification:
      - kind: unit
        ref: "grep -q 'struct KeyboardEnableBanner: View' / 'Enable the Banter keyboard' / 'Insert suggestions in any chat app' / 'AppleKeyboards' / 'KeyboardEnableBannerStorageKey' / '#Preview' BanterApp/Home/KeyboardEnableBanner.swift"
        status: pass
    human_judgment: true
    rationale: "CI builds BanterApp scheme and renders #Preview; local grep confirms structure and copy ahead of that run."
  - id: D3
    description: "HomeView renders KeyboardEnableBanner, taps present PermissionPrimingView.keyboard(...), Continue opens the registered prefs deep link, dismissal persists — KEYS-04 has a real production call site"
    requirement: "KEYS-04"
    verification:
      - kind: unit
        ref: "grep -q 'PermissionPrimingView.keyboard' / 'KeyboardEnableBanner(' / 'prefs:root=General&path=Keyboard' / 'KeyboardEnableBannerStorageKey.dismissed' BanterApp/Home/HomeView.swift; grep -q 'CFBundleURLTypes' / '<string>prefs</string>' BanterApp/Info.plist; grep -q 'DowngradeBanner(' BanterApp/Home/HomeView.swift (unchanged)"
        status: pass
    human_judgment: true
    rationale: "No local Swift toolchain — swift build/XCUITest screenshot suite deferred to CI (Phase 1-4 precedent). Manual device checks (Settings navigation, copy legibility) are documented below as outstanding human items, per the plan's <output> instruction."

duration: 9min
completed: 2026-07-06
status: complete
---

# Phase 5 Plan 3: Guided Keyboard-Enable Flow + Home Entry Point Summary

**Extended PermissionPrimingView with additive steps/reassurance + a .keyboard(...) factory, added a DowngradeBanner-family KeyboardEnableBanner with fail-open AppleKeyboards detection, and wired both into HomeView with a prefs:root=General&path=Keyboard deep link — KEYS-04 now has a real production call site.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-07-06T04:12:40Z
- **Completed:** 2026-07-06T04:21:40Z
- **Tasks:** 3
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments

- `PermissionPrimingView` gained two nil-defaulted, additive params (`steps: [String]?`, `reassurance: String?`) rendered between the body copy and the primary CTA, plus a new `.keyboard(onContinue:onSkip:)` factory carrying the exact KEYS-04 guided-enable copy (heading, body, 3 numbered steps, and the required "never needs Full Access" reassurance line). The existing `.photos(...)` factory and its `ValueDemoCoordinatorView` call site are byte-unchanged in behavior — both new params default to `nil`.
- `KeyboardEnableBanner` is a new DowngradeBanner-family SwiftUI view (`BanterApp/Home/KeyboardEnableBanner.swift`) with a co-located `KeyboardEnableBannerStorageKey` dismissal key and a best-effort `isKeyboardLikelyEnabled(bundleID:)` helper reading the undocumented `AppleKeyboards` UserDefaults array — explicitly documented as fail-open: an uncertain/false read only ever shows the banner, never hides KEYS-04 functionality.
- `HomeView` now renders the banner in a new conditional slot mirroring the existing `DowngradeBanner` one, presents `PermissionPrimingView.keyboard(...)` in a sheet on tap, and wires the primary CTA to open `prefs:root=General&path=Keyboard` via `UIApplication.shared.open(_:)`. `BanterApp/Info.plist` gained the `CFBundleURLTypes`/`prefs` scheme entry (QA1924) that makes that deep link callable. Dismissal writes `KeyboardEnableBannerStorageKey.dismissed` through the existing `AppGroupStore` idiom, so the nudge does not reappear once dismissed.
- The full KEYS-04 chain (`HomeView` -> `KeyboardEnableBanner` -> `PermissionPrimingView.keyboard(...)` -> prefs deep link) is grep-verifiable end to end, closing the Phase 4 "built but unwired" lesson before this phase closes.

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend PermissionPrimingView additively + .keyboard(...) factory** - `76c74f8` (feat)
2. **Task 2: KeyboardEnableBanner + best-effort fail-open detection** - `904837a` (feat)
3. **Task 3: Wire banner into HomeView + present guided flow + prefs URL type + deep link** - `afe8165` (feat)

**Plan metadata:** (final docs commit follows this SUMMARY)

## Files Created/Modified

- `BanterApp/Onboarding/PermissionPrimingView.swift` - additive `steps`/`reassurance` params + rendering + new `.keyboard(...)` factory
- `BanterApp/Home/KeyboardEnableBanner.swift` - new DowngradeBanner-family banner, dismissal storage key, fail-open detection helper, `#Preview`
- `BanterApp/Home/HomeView.swift` - renders the banner, presents the guided flow in a sheet, `openKeyboardSettings()`/`dismissKeyboardBanner()` helpers, `import UIKit` added for `UIApplication.shared.open(_:)`
- `BanterApp/Info.plist` - `CFBundleURLTypes` array registering the `prefs` scheme

## Decisions Made

- `steps`/`reassurance` are nil-defaulted additive init params (not a new component/subclass) so the Phase 4 `.photos(...)` call site required literally zero changes — matches the component's own doc-comment intent to be reused generically.
- `KeyboardEnableBanner`'s whole-banner tap target is a `Button` wrapping the `HStack` label (rather than `.contentShape(Rectangle()).onTapGesture`) — equivalent tap-through UX with one fewer modifier chain (ponytail rung 6/7).
- The keyboard extension's bundle id (`com.banter.BanterKeyboard`) was derived from `project.yml`'s `bundleIdPrefix: com.banter` plus XcodeGen's default per-target-name suffix (no explicit `bundleIdSuffix` override exists in `project.yml`). This string is used only inside the fail-open detection helper — if it's ever wrong, the helper simply always returns `false` and the banner always shows, which is the correct fail-open behavior, not a functional break.
- `openKeyboardSettings()`/`dismissKeyboardBanner()` live directly in `HomeView` rather than `HomeModel`, since they are pure UI/system-URL side effects with no shared state `HomeModel` needs to own; only the one dismissal boolean persists, via the same `AppGroupStore.read/write` idiom already used for `DowngradeBannerStorageKey` (not a new `@AppStorage` property wrapper), per `05-PATTERNS.md`'s explicit guidance to match `HomeModel`'s established persistence mechanism.

## Deviations from Plan

None - plan executed exactly as written. `KeyboardEnableBanner`'s `Button`-wrapped-label tap-target implementation is a ponytail-rung simplification within the plan's own "or wrap in a Button" allowance (Task 2 action text explicitly permitted either shape).

## Known Stubs

None. All three artifacts (guided flow content, banner, HomeView wiring) are wired to real production call sites — no hardcoded empty/placeholder data.

## Threat Flags

None beyond what the plan's own `<threat_model>` already anticipated (T-05-07/08/09, all addressed by this plan's fail-open detection, exact-string prefs deep link, and required reassurance copy respectively). No new unaddressed surface introduced.

## Issues Encountered

None. No local Swift toolchain on this Windows host — per Phase 1-4 established precedent, `swift build`/`xcodebuild`/XCUITest verification is deferred to CI; all locally-verifiable acceptance criteria (grep-based structural/copy checks) were run against the final state and pass.

## User Setup Required

None - no external service configuration required. The `prefs` URL scheme registration is a static Info.plist change with no runtime setup.

## Manual/Device-Only Verification (outstanding at phase gate, per plan `<verification>`)

- Tap the "Open Keyboard Settings" CTA and confirm Settings opens at General → Keyboard (system deep-link navigation cannot be verified from CI/grep).
- Confirm the guided-flow step copy is legible on-device and the "Full Access not needed" reassurance line reads correctly at Dynamic Type default and larger accessibility sizes.
- Confirm the Home-surface banner and guided-flow post-enable ("You're all set") state render correctly once a real device has the Banter keyboard actually enabled via Settings (the fail-open `AppleKeyboards` detection path is only meaningfully exercisable on-device).

## Next Phase Readiness

KEYS-04 is now fully wired to a production entry point (HomeView -> KeyboardEnableBanner -> PermissionPrimingView.keyboard(...) -> prefs deep link), completing Phase 5's three plans. No blockers for the phase gate beyond the manual/device-only checks listed above and the standard CI compile gate (BanterApp scheme build, PermissionPrimingTests, XCUITest screenshot suite).

## Self-Check: PASSED

All created/modified files confirmed present on disk; all three task commit hashes (`76c74f8`, `904837a`, `afe8165`) confirmed in `git log`.

---
*Phase: 05-keyboard-extension*
*Completed: 2026-07-06*
