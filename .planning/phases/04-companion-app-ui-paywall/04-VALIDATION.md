---
phase: 4
slug: companion-app-ui-paywall
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-04
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | XCTest via `swift test --package-path BanterShared` (models, quota/trial state machines, timeline persistence) on macos CI; XCUITest (BanterUITests) for screen flows + CI screenshot artifacts; StoreKit Testing (local `.storekit` configuration file) for purchase/trial paths |
| **Config file** | `.github/workflows/ci.yml` — existing iOS job (build both targets + swift test + XCUITest); Backend deno job untouched by this phase |
| **Quick run command** | `swift test --package-path BanterShared` |
| **Full suite command** | Full CI: xcodegen generate + build BanterApp/BanterKeyboard on iOS Simulator + swift test + XCUITest screenshots |
| **Estimated runtime** | quick ~60s local; full CI job ~10–15 min |
| **Live smoke** | Developer-run: app against self-hosted Supabase coaching function + real Gemini (NOT in CI); RevenueCat sandbox purchases require a device/simulator with StoreKit config — manual |

---

## Sampling Rate

- **After every task commit:** Run `swift test --package-path BanterShared`
- **After every plan wave:** Push and confirm full CI green (build + swift test + XCUITest)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~90 seconds local (swift test)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| *(filled by planner — one row per task)* | | | | | | | | | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] StoreKit configuration file (`Banter.storekit`) + XCTest StoreKitTest session harness — no purchase testing infra exists yet
- [ ] Test stubs for quota/reverse-trial state machine (MONE-01/MONE-02) in BanterShared tests
- [ ] Timeline persistence round-trip stub (CALC-02/CALC-03) — per-conversationId, on-device only

*Existing infrastructure (swift test + XCUITest + CI screenshots) covers UI-flow requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| RevenueCat sandbox purchase + entitlement unlock | MONE-03 | Requires RevenueCat dashboard project + sandbox Apple ID; not CI-reproducible | Run app with StoreKit config, purchase premium, confirm entitlement gates lift |
| Photos permission explainer timing | ONBD-02 | Permission dialogs are system UI, flaky in XCUITest | Fresh install, tap import, confirm explainer precedes system prompt |
| Reverse-trial downgrade after 14 days | MONE-02 | Clock-dependent | Simulate via debug date override; confirm graceful downgrade to free tier |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
