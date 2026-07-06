---
phase: 05-keyboard-extension
fixed_at: 2026-07-06T00:00:00Z
review_path: .planning/phases/05-keyboard-extension/05-REVIEW.md
iteration: 1
findings_in_scope: 8
fixed: 8
skipped: 0
status: all_fixed
---

# Phase 5: Code Review Fix Report

**Fixed at:** 2026-07-06
**Source review:** .planning/phases/05-keyboard-extension/05-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 8 (3 Critical, 5 Warning; fix_scope=critical_warning, IN-01..IN-04 excluded)
- Fixed: 8
- Skipped: 0

**Verification note:** No local Swift toolchain (Windows host) — all Swift edits verified by re-read + pattern-match against existing codebase conventions (Tier 1/Tier 3); CI compile is the final gate. Phase invariants confirmed intact: BanterKeyboard gained no imports or network-capable code, keyboard remains read-only on shared state, globe-key logic untouched, RequestsOpenAccess untouched.

## Fixed Issues

### CR-01: `prefs:root=` deep link is a private URL scheme

**Files modified:** `BanterApp/Home/HomeView.swift`, `BanterApp/Info.plist`, `BanterApp/Onboarding/PermissionPrimingView.swift`
**Commit:** 605d5ef
**Applied fix:** `openKeyboardSettings()` now opens `UIApplication.openSettingsURLString` (the only supported Settings destination per QA1924). Deleted the incorrect `CFBundleURLTypes` `prefs` handler registration from Info.plist. Rewrote the priming-sheet step copy to describe the actual destination (Settings opens on Banter's page → Keyboards → toggle Banter, Full Access stays off) and updated the factory doc-comment.

### CR-02: BanterKeyboard never embedded in BanterApp

**Files modified:** `project.yml`, `BanterApp/Home/HomeView.swift`
**Commit:** 99455aa
**Applied fix:** Added `- target: BanterKeyboard` to BanterApp's dependencies in project.yml (XcodeGen embeds appex target dependencies automatically). Set explicit `PRODUCT_BUNDLE_IDENTIFIER: com.banter.BanterApp.BanterKeyboard` on the extension (App Store requires the child-of-app form) and updated `HomeView.keyboardExtensionBundleID` to match, keeping the fail-open AppleKeyboards check alive.

### CR-03: CI builds a `BanterKeyboard` scheme that project.yml does not generate

**Files modified:** `.github/workflows/ci.yml`
**Commit:** c46d53d
**Applied fix:** Removed the separate "Build BanterKeyboard (simulator)" step — after CR-02 the `BanterApp` scheme build compiles the embedded extension as a dependency (the smaller of the two options the review offered). Renamed the BanterApp build step and documented why no separate scheme exists.

### WR-01: In-flight coaching response records wrong `messageIndex` after `startNewConversation()`

**Files modified:** `BanterApp/Home/HomeModel.swift`
**Commit:** 59b2aab
**Applied fix:** `messageIndex` is now computed once in `startCoaching()` (transcript is frozen for the session) and captured by value in `onResponse`; the `importModel` reference capture was removed from the closure. Note: logic fix — requires human verification (no compiler ran locally; behavior matches the reviewer's suggested fix exactly).

### WR-02: KEYS-03 guard test passes vacuously if path derivation breaks

**Files modified:** `BanterShared/Tests/BanterSharedTests/KeyboardNetworkBoundaryGuardTests.swift`
**Commit:** 4cd565f
**Applied fix:** Added a `scanned` counter incremented per .swift file and `XCTAssertGreaterThanOrEqual(scanned, 2, ...)` after the loop, so a broken `keyboardDirURL` fails the test instead of silently disarming the tripwire.

### WR-03: `ForEach(..., id: \.text)` breaks on duplicate suggestion texts

**Files modified:** `BanterKeyboard/KeyboardSuggestionsView.swift`
**Commit:** f06ff34
**Applied fix:** Switched to `ForEach(Array(suggestions.prefix(3).enumerated()), id: \.offset)` — the same pattern HomeView already uses for its reply list.

### WR-04: Suggestion row text renders in default button tint

**Files modified:** `BanterKeyboard/KeyboardSuggestionsView.swift`
**Commit:** 90f4b61
**Applied fix:** Added `.foregroundStyle(Banter.Colors.textPrimary)` to the suggestion `Text`, matching the 05-UI-SPEC color contract.

### WR-05: Keyboard-enable flow has no completion path

**Files modified:** `BanterApp/Home/HomeView.swift`
**Commit:** 3dd77cf
**Applied fix:** `onContinue` now sets `showKeyboardEnable = false` before opening Settings, and a new `@State keyboardCheckTick` (read inside `shouldShowKeyboardEnableBanner`, bumped by an `.onChange(of: scenePhase)` handler when the scene becomes `.active`) forces the banner to re-evaluate when the user returns from Settings. Note: state-flow fix — requires human verification on device (banner disappearance after enabling the keyboard).

---

_Fixed: 2026-07-06_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
