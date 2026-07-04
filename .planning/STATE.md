---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 4
current_phase_name: Companion App UI & Paywall
status: executing
stopped_at: Completed 04-01-PLAN.md
last_updated: "2026-07-04T04:47:01.168Z"
last_activity: 2026-07-04
last_activity_desc: Phase 4 execution started
progress:
  total_phases: 8
  completed_phases: 3
  total_plans: 17
  completed_plans: 14
  percent: 38
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-03)

**Core value:** The user gets instant relief (great replies, right now) while becoming a measurably better texter over time — real skill transfer, backed by citable psychology.
**Current focus:** Phase 4 — Companion App UI & Paywall

## Current Position

Phase: 4 (Companion App UI & Paywall) — EXECUTING
Plan: 3 of 5
Status: Ready to execute
Last activity: 2026-07-04 — Phase 4 execution started

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**

- Total plans completed: 12
- Average duration: —
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 | 4 | - | - |
| 2 | 5 | - | - |
| 3 | 3 | - | - |

**Recent Trend:**

- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
| Phase 01-foundation-privacy-boundary P01 | 4min | 2 tasks | 1 files |
| Phase 01-foundation-privacy-boundary P02 | 5min | 3 tasks | 8 files |
| Phase 01-foundation-privacy-boundary P03 | 12min | 3 tasks | 8 files |
| Phase 01-foundation-privacy-boundary P04 | 20min | 2 tasks | 2 files |
| Phase 02-screenshot-import-ocr-pipeline P01 | 15min | 2 tasks | 6 files |
| Phase 02-screenshot-import-ocr-pipeline P02 | 12min | 2 tasks | 4 files |
| Phase 02-screenshot-import-ocr-pipeline P03 | 8min | 1 tasks | 2 files |
| Phase 02-screenshot-import-ocr-pipeline P04 | 25min | 3 tasks | 15 files |
| Phase 03-backend-llm-orchestration P01 | 12min | 2 tasks | 7 files |
| Phase 03-backend-llm-orchestration P02 | 8min | 2 tasks | 6 files |
| Phase 03-backend-llm-orchestration P03 | 50min | 3 tasks | 13 files |
| Phase 4 P1 | 18min | 3 tasks | 12 files |
| Phase 04-companion-app-ui-paywall PP02 | 22min | 3 tasks | 10 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Companion-app-first, keyboard-second — keyboard depends on the app's App Group data contract (Phase 5 after Phase 4).
- [Roadmap]: Psychology allowlist/banlist artifact locked in Phase 3 *before* prompt engineering, to avoid schema-rework risk.
- [Roadmap]: Privacy designed into the backend (Phases 1/3) and verified in a dedicated hardening pass (Phase 7).
- [Phase 01-foundation-privacy-boundary]: Created kish-jpg/banter as PRIVATE despite 10x GitHub Actions macOS-runner minutes cost — commercial product with future proprietary backend logic
- [Phase 01-foundation-privacy-boundary]: GSD .planning/ scaffolding committed into the new dedicated kish-jpg/banter repo alongside the code it describes, per RESEARCH.md Git Topology recommendation
- [Phase 01-foundation-privacy-boundary]: BanterShared source+tests authored together per task (no local Swift toolchain); grep-based acceptance criteria substituted for swift build/test, compile proof deferred to CI (plan 01-04)
- [Phase ?]: [Phase 01-foundation-privacy-boundary]: XcodeGen cannot attach a local SPM package test target to an Xcode scheme's test action - BanterShared tested via swift test --package-path, not xcodebuild test -scheme
- [Phase ?]: [Phase 01-foundation-privacy-boundary]: Phase 1 CI gate reached green on run 28639232382 - both targets build on iOS Simulator, App Group round-trip + CAPT-04 guard tests pass
- [Phase ?]: Bumped deployment target to iOS 18 (Package.swift + project.yml) to unlock async/await RecognizeTextRequest Vision API; no @available fallback, iOS 18 is now the floor
- [Phase ?]: CI-only discovery: BanterShared/Package.swift needs BOTH .iOS and .macOS platform floors when using OS-versioned APIs (Vision), because swift test --package-path compiles on the CI host's native macOS, not the iOS Simulator - added .macOS(.v15) alongside .iOS(.v18)
- [Phase 02-screenshot-import-ocr-pipeline]: userSideXThreshold = 0.4 shipped as documented public constant with ponytail-deferral comment; real-screenshot tuning deferred, matches RESEARCH.md recommendation
- [Phase 02-screenshot-import-ocr-pipeline]: Reading-order fix (descending boundingBox.origin.y sort) unit-tested against shuffled input to prove Pitfall 2 fix actually works, not just happy-path ordering
- [Phase ?]: First distinct speaker name in paste text defaults to .match, not .user - matches RESEARCH.md Pattern 3/Assumptions A2; confirm screen (plan 04) corrects wrong guesses
- [Phase ?]: Banter.Type renamed to Banter.TextStyle - X.Type is a reserved Swift metatype expression, backticks fix declaration but not use sites
- [Phase ?]: Added placeholder AppIcon.appiconset (1024x1024) - xcodebuild's actool defaults to --app-icon AppIcon and fails asset-catalog compile if none exists
- [Phase ?]: Confirm & Continue and Start Over are pure local-state mutations, no network call, preserving CAPT-04 boundary until Phase 3
- [Phase 02-screenshot-import-ocr-pipeline]: CI screenshot letterboxing (Task 3 checkpoint defect) was XCUIScreen.main.screenshot() whole-canvas capture, not an app layout bug - fixed by screenshotting app.windows.firstMatch instead; app-side .preferredColorScheme(.dark) and .safeAreaInset(edge: .bottom) fixes for dark-mode-default and bottom-bar pinning were also applied and are independently correct
- [Phase ?]: Used Deno's with { type: "json" } import attribute directly (Deno 2.9.1 supports it natively, no readTextFile fallback needed)
- [Phase ?]: validate.ts is provider-agnostic - takes a minimal structural type, never a Gemini-specific response type
- [Phase 03-backend-llm-orchestration]: CoachingResponse.replies has NO confidence field, matching Swift ReplySuggestion.swift exactly; sentiment.factors is a fixed-key object, not Record<string, number>
- [Phase 03-backend-llm-orchestration]: Anti-AI-tell directives in buildSystemInstruction describe banned constructions rather than quoting them literally, so promptAssembly.ts never trips validate.ts negative-grep checks
- [Phase 03-backend-llm-orchestration]: requirements.mark-complete deferred to 03-03 for COAC-01/COAC-03/COAC-05/CALC-01 since 03-03 wires validate.ts into the actual HTTP response path
- [Phase ?]: conversationId is client-minted; server echoes it back, no server-side minting (offline-first, stable for Phase 4 timeline)
- [Phase ?]: Phase 3 is server-stateless: no SentimentEvent persistence; response carries aggregate sentiment only, event-timeline persistence deferred to Phase 4
- [Phase ?]: docker compose restart does not reload docker-compose.yml environment block - smoke-coaching.sh uses up -d --force-recreate to pick up env changes
- [Phase ?]: RevenueCat/purchases-ios T-04-SC checkpoint approved by human exactly as specified (official org, SPM URL, from: 5.80.2 pin)
- [Phase ?]: Bundled-copy-of-taxonomy.json approach used (not a new backend endpoint), per 04-RESEARCH.md Open Question 2 default
- [Phase ?]: EntitlementManagerTests defines its own EntitlementSource/EntitlementState protocol seam so tests never require import RevenueCat to compile
- [Phase 04-companion-app-ui-paywall]: TonePicker/TagExplainer live in BanterShared (not BanterApp) so Wave-0 test scaffolds compile under swift test --package-path BanterShared
- [Phase 04-companion-app-ui-paywall]: taxonomy.json bundled a second time inside BanterShared package resources; sync-taxonomy.sh extended to keep both client copies + backend source byte-identical

### Pending Todos

None yet.

### Blockers/Concerns

- [Roadmap]: REQUIREMENTS.md header states 27 v1 requirements but the list contains 32 (CAPT×4, COAC×7, CALC×3, PROF×3, GROW×3, KEYS×4, ONBD×2, MONE×3, PRIV×3). All 32 are mapped; the header/coverage count needs reconciling.
- [Research]: Own-attempt LLM grading (Phase 6) is novel — needs a prompt-engineering spike with real attempts.
- [Research]: ~$7/wk pricing anchor has conflicting sources — verify against live App Store listings before setting price (Phase 4).
- [Research]: Per-app OCR bubble-parsing heuristics (Hinge/Tinder/Bumble) need real screenshot collection; post-launch tuning expected (Phase 2).

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none)* | | | |

## Session Continuity

Last session: 2026-07-04T04:42:07.825Z
Stopped at: Completed 04-01-PLAN.md
Resume file: None
