---
phase: 5
slug: keyboard-extension
status: planned
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-05
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | XCTest via `swift test --package-path BanterShared` (cached-suggestions store contract, enable-flow state logic) on macOS CI; `xcodebuild build` for BanterKeyboard target (extension compile gate); XCUITest limited — third-party keyboards cannot be driven end-to-end in simulator UI tests |
| **Config file** | `.github/workflows/ci.yml` — existing iOS job builds BOTH targets (BanterApp + BanterKeyboard) since Phase 1; backend deno job untouched |
| **Quick run command** | `swift test --package-path BanterShared` |
| **Full suite command** | Full CI: xcodegen generate + build both targets on iOS Simulator + swift test + XCUITest screenshots |
| **Estimated runtime** | quick ~60s local (grep-based on this Windows host — no local toolchain); full CI ~10–15 min |
| **Live smoke** | Keyboard insertion into a real host app (Messages/Notes) is DEVICE-ONLY — simulator + CI cannot verify tap-to-insert end-to-end; human verification item |

---

## Sampling Rate

- **After every task commit:** grep-based structural checks (no local toolchain) + `swift test` expectations recorded for CI
- **After every plan wave:** push and confirm full CI green (both targets build + swift test + XCUITest)
- **Before `/gsd:verify-work`:** Full suite must be green on CI
- **Max feedback latency:** one CI round (~15 min)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-T1 | 05-01 | 1 | KEYS-01 | T-05-02 | Public typed key; array round-trips through App Group | unit (BanterShared) | `swift test --package-path BanterShared --filter CachedSuggestionsRoundTripTests` | ❌ new (Wave 0) | ⬜ pending |
| 01-T2 | 05-01 | 1 | KEYS-01 | T-05-03 | Single overwrite write; sole producer; no cross-process write race | structural/grep + CI build | `grep -q 'AppGroupStore.write(response.replies, forKey: CachedSuggestionsStorageKey.suggestions)' BanterApp/Home/HomeModel.swift` | ✅ modify | ⬜ pending |
| 01-T3 | 05-01 | 1 | KEYS-03 | T-05-01 | No network/RevenueCat token anywhere under BanterKeyboard/ | structural negative-guard (XCTest) | `swift test --package-path BanterShared --filter KeyboardNetworkBoundaryGuardTests` | ❌ new (Wave 0) | ⬜ pending |
| 02-T1 | 05-02 | 2 | KEYS-01, KEYS-02 | T-05-06 | ≤3 tappable rows, empty-state copy, neutral globe; trivial view tree | structural/grep + CI build + #Preview | `grep -q 'onInsert(suggestion.text)' BanterKeyboard/KeyboardSuggestionsView.swift` | ❌ new | ⬜ pending |
| 02-T2 | 05-02 | 2 | KEYS-01, KEYS-02, KEYS-03 | T-05-04, T-05-05 | Reads App Group, re-reads on viewWillAppear, inserts via proxy, no network path, RequestsOpenAccess=false | structural/grep + CI build + guard test | `grep -q 'textDocumentProxy.insertText' BanterKeyboard/KeyboardViewController.swift` | ❌ rewrite | ⬜ pending |
| 03-T1 | 05-03 | 1 | KEYS-04 | T-05-09 | Additive steps + reassurance ("Full Access not needed"); Photos site unchanged | structural/grep + CI build | `grep -q 'static func keyboard(onContinue' BanterApp/Onboarding/PermissionPrimingView.swift` | ✅ modify | ⬜ pending |
| 03-T2 | 05-03 | 1 | KEYS-04 | T-05-07 | Banner (DowngradeBanner family) + fail-open AppleKeyboards detection | structural/grep + CI build + #Preview | `grep -q 'struct KeyboardEnableBanner' BanterApp/Home/KeyboardEnableBanner.swift` | ❌ new | ⬜ pending |
| 03-T3 | 05-03 | 1 | KEYS-04 | T-05-08 | Production call site in HomeView; prefs: deep link (exact string only); persistent dismissal | structural/grep + CI build + XCUITest | `grep -q 'PermissionPrimingView.keyboard' BanterApp/Home/HomeView.swift` | ✅ modify | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Cached-suggestions storage key + round-trip test stub in BanterSharedTests (app-writes → keyboard-reads contract, extends Phase 1 round-trip proof)
- [ ] Structural negative guard stub: BanterKeyboard target source contains no `URLSession`/network tokens and no RevenueCat import (KEYS-03 boundary, extends existing grep-guard test pattern)

*Existing infrastructure (both-targets CI build from Phase 1, swift test, XCUITest screenshots) covers the rest.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Tap suggestion inserts text into another app | KEYS-02 | Third-party keyboard cannot be driven by XCUITest in a host app; simulator keyboard switching is unreliable | On device/simulator: enable Banter keyboard, open Notes, switch keyboard, tap a suggestion, confirm insertion |
| Keyboard functions with Full Access OFF | KEYS-03 (runtime half) | Full Access toggle is Settings-level system UI | Leave Allow Full Access off; confirm suggestions render and insert |
| Guided enable flow deep link lands on Keyboard settings | KEYS-04 | Settings navigation is system UI | Tap enable CTA; confirm Settings opens at the Banter app settings page (openSettingsURLString) |
| Globe key switches back to system keyboard | HIG/4.4.1 | System keyboard switching | With multiple keyboards enabled, confirm globe key present and functional |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency ≤ one CI round
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
