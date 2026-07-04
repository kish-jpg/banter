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
| 01-T1 | 04-01 | 0 | COAC-04 | T-04-SC | RevenueCat add human-vetted before resolve | checkpoint | (blocking-human) | n/a | ⬜ pending |
| 01-T2 | 04-01 | 0 | COAC-04 | T-04-01-DRIFT | Offline taxonomy decodes; bundled copy not drifted | unit + script | `swift test --package-path BanterShared --filter TaxonomyEntry`; `bash Backend/scripts/sync-taxonomy.sh` | ❌ Wave 0 | ⬜ pending |
| 01-T3 | 04-01 | 0 | ONBD-01/02,COAC-02/04,CALC-02/03,MONE-01/02/03 | — | 7 test scaffolds fail-red on missing symbols | unit + XCUITest | `swift test --package-path BanterShared` | ❌ Wave 0 | ⬜ pending |
| 02-T1 | 04-02 | 1 | COAC-02 | T-04-02-LEAK | CoachingClient DTO-only, no secret literal | unit | `swift test --package-path BanterShared --filter TonePickerTests` | ❌ Wave 0 | ⬜ pending |
| 02-T2 | 04-02 | 1 | COAC-02 | T-04-02-TAG | Tags rendered unconditionally (never paywalled) | unit + snapshot | `swift test --package-path BanterShared --filter TonePickerTests` | ❌ Wave 0 | ⬜ pending |
| 02-T3 | 04-02 | 1 | COAC-04 | — | Offline taxonomy lookup, no network per tap | unit | `swift test --package-path BanterShared --filter TagExplainerTests` | ❌ Wave 0 | ⬜ pending |
| 03-T1 | 04-03 | 2 | ONBD-02 | T-04-03-PERM | Photos explainer at moment of need; paste fallback | XCUITest | `xcodebuild test -only-testing:BanterUITests/PermissionPrimingTests` | ❌ Wave 0 | ⬜ pending |
| 03-T2 | 04-03 | 2 | ONBD-01 | T-04-03-GATE | Demo path has zero entitlement/cap tokens (grep guard) | grep + integration | grep guard on demo-path files | ❌ Wave 0 | ⬜ pending |
| 03-T3 | 04-03 | 2 | ONBD-01 | T-04-03-GATE | Fresh install reaches suggestions, no paywall element | XCUITest | `xcodebuild test -only-testing:BanterUITests/OnboardingFlowTests` | ❌ Wave 0 | ⬜ pending |
| 04-T1 | 04-04 | 2 | CALC-02,CALC-03 | T-04-04-DOSSIER | conversationId-only keying; negative structural guard | unit | `swift test --package-path BanterShared --filter SentimentTimelineStoreTests` | ❌ Wave 0 | ⬜ pending |
| 04-T2 | 04-04 | 2 | CALC-02,CALC-03 | T-04-04-DOSSIER | Scope caption present; no match name displayed; accessible chart | grep + snapshot | grep guard + CI XCUITest render | ❌ Wave 0 | ⬜ pending |
| 05-T1 | 04-05 | 3 | MONE-02,MONE-03 | — | Entitlement/product config + API confirmed pre-wire | checkpoint | (blocking-human) | n/a | ⬜ pending |
| 05-T2 | 04-05 | 3 | MONE-01,MONE-02,MONE-03 | T-04-05-SPOOF | Premium only from RevenueCat; cap resets by date; premium uncapped | unit (mocked) | `swift test --package-path BanterShared --filter EntitlementManagerTests`; `--filter DailyCapTrackerTests` | ❌ Wave 0 | ⬜ pending |
| 05-T3 | 04-05 | 3 | MONE-01,MONE-03 | T-04-05-TAGGATE | Runtime price (no hardcode); tags visible at cap; graceful downgrade | grep + unit | grep guard + `swift test --package-path BanterShared --filter DailyCapTrackerTests` | ❌ Wave 0 | ⬜ pending |

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
