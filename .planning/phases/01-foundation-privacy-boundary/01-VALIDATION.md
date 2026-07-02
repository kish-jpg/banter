---
phase: 1
slug: foundation-privacy-boundary
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-03
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | XCTest (Swift Package tests + xcodebuild test on simulator) |
| **Config file** | none — Wave 0 installs (XcodeGen project.yml + CI workflow) |
| **Quick run command** | `swift test --package-path BanterShared` (Linux-runnable subset) / CI: `xcodebuild test` |
| **Full suite command** | GitHub Actions workflow: xcodebuild test on iOS Simulator (macos-26 runner) |
| **Estimated runtime** | ~5-10 min per CI run (macOS runner) |

---

## Sampling Rate

- **After every task commit:** Run package-level tests where locally runnable; push triggers CI
- **After every plan wave:** Full CI workflow must be green
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** one CI run (~10 min)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| (populated by planner) | | | CAPT-04 | | Raw image types cannot reach network layer | unit | TBD | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] XcodeGen project.yml + generated targets build in CI
- [ ] BanterShared package test target with stub tests for CAPT-04 guard + App Group round-trip
- [ ] GitHub Actions macOS workflow (build + test on simulator)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| App Group container on real device | CAPT-04 (supporting) | Simulator entitlement checks are looser than device (flagged LOW-confidence risk in RESEARCH.md); no device/paid account in Phase 1 | Re-verify round-trip on physical device once Apple Developer account exists (Phase 5 or later) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 600s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
