---
phase: 3
slug: backend-llm-orchestration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-04
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Deno test (edge-function logic, mocked Gemini fetch) on ubuntu-latest + XCTest `swift test` (BanterShared CoachingClient contract tests) on macos-26 |
| **Config file** | `.github/workflows/ci.yml` — new `backend-tests` job (ubuntu), existing iOS job untouched |
| **Quick run command** | `deno test Backend/` locally (Deno available cross-platform incl. Windows) |
| **Full suite command** | Full CI: backend job (deno test) + iOS job (build + swift test + XCUITest) |
| **Estimated runtime** | backend job ~1-2 min (ubuntu, cheap); iOS job ~10-15 min |
| **Live smoke** | Developer-run script against self-hosted Supabase + real Gemini (NOT in CI) — requires Docker Desktop (in progress) + GEMINI_API_KEY (present in .env.local) |

---

## Sampling Rate

- **After every task commit:** `deno test` runs locally on Windows (Deno is cross-platform — first phase with a local test loop!); push triggers CI
- **After every plan wave:** full CI green
- **Before `/gsd:verify-work`:** full CI green + developer smoke script documented (executed once Docker ready)
- **Max feedback latency:** local deno test = seconds; CI ~15 min

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| (populated by planner) | | | COAC-06 | | Off-allowlist tag or banned term → response rejected | deno unit | deno test | ❌ W0 | ⬜ pending |
| (populated by planner) | | | COAC-01/03 | | Exactly 3 replies, each with allowlisted tag | deno unit | deno test | ❌ W0 | ⬜ pending |
| (populated by planner) | | | COAC-05 | | AI-tell lint rejects em-dash/triad/listy outputs | deno unit | deno test | ❌ W0 | ⬜ pending |
| (populated by planner) | | | COAC-07 | | Opener path through same gated pipeline | deno unit | deno test | ❌ W0 | ⬜ pending |
| (populated by planner) | | | CALC-01 | | Sentiment score present in same structured response | deno + swift contract | deno test / swift test | ❌ W0 | ⬜ pending |
| (populated by planner) | | | CAPT-04 (regression) | | CoachingClient DTOs remain text-only | swift unit (existing guard) | swift test | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `Backend/` directory with Deno test scaffolding + mocked Gemini fetch harness
- [ ] Shared JSON contract fixtures (CoachingResponse) consumed by BOTH deno tests and BanterShared swift tests
- [ ] `backend-tests` job added to ci.yml (ubuntu-latest, deno test)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live end-to-end: edge function on self-hosted stack calls real Gemini | COAC-01..07 integration | CI must not run docker stack or spend real API quota | Developer smoke script (documented in plan) once Docker Desktop installed; verify 3 tagged replies + sentiment from a real transcript |
| Gemini free-tier rate limits (~10 RPM/250 RPD, Assumption A3) | dev cadence | Secondary-source figures | Check AI Studio dashboard quotas during smoke test |
| Reply QUALITY (not slop, matches tone) | COAC-05 | Subjective; automated lint only catches tells | Kish reviews smoke-script outputs; feeds Phase 6 grading design |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s local (deno test)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
