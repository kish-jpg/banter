---
phase: 2
slug: screenshot-import-ocr-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-03
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | XCTest: `swift test` for BanterShared logic (OCR parsing, attribution, paste parsing) + XCUITest on simulator for UI/screenshot artifacts |
| **Config file** | Existing `.github/workflows/ci.yml` (extend with UI-test + artifact-upload steps) |
| **Quick run command** | CI: `swift test --package-path BanterShared` step |
| **Full suite command** | Full CI workflow: generate → build both targets → swift test → XCUITest with screenshot attachments → upload-artifact |
| **Estimated runtime** | ~10-15 min per CI run (macOS runner, UI tests add time) |

---

## Sampling Rate

- **After every task commit:** push triggers CI; review run status before next wave
- **After every plan wave:** full CI must be green
- **Before `/gsd:verify-work`:** full suite green + screenshot artifacts downloadable
- **Max feedback latency:** one CI run (~15 min)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| (populated by planner) | | | CAPT-01 | | OCR runs on-device only (fixture unit tests) | unit | swift test | ❌ W0 | ⬜ pending |
| (populated by planner) | | | CAPT-02 | | Attribution flip/edit before any analysis | unit+UI | swift test / xcodebuild test | ❌ W0 | ⬜ pending |
| (populated by planner) | | | CAPT-03 | | Paste fallback reaches same confirm gate | unit | swift test | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Synthetic chat-screenshot fixture images bundled in BanterShared test resources
- [ ] XCUITest target added to project.yml (for screenshot artifacts)
- [ ] CI workflow extended: UI test step + actions/upload-artifact@v4 for screenshots

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Attribution accuracy on real Tinder/Hinge/Bumble screenshots | CAPT-02 (supporting) | No real screenshots collected yet; x-threshold constant (0.4) needs tuning against real data | Kish reviews CI screenshot artifacts + later real-device testing; tune threshold constant |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 900s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
