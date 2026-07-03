---
phase: 02-screenshot-import-ocr-pipeline
plan: 02
subsystem: shared-package
tags: [swift, vision, ocr, geometry, attribution]

# Dependency graph
requires:
  - phase: 02-screenshot-import-ocr-pipeline (plan 01)
    provides: RecognizedLine, OCRPipeline.recognize(in:), Fixtures/imessage_two_column.png, macOS 15 platform floor
provides:
  - BubbleAttributor.attribute(_:) - [RecognizedLine] -> ordered, speaker-attributed [ConversationMessage]
  - BubbleAttributor.userSideXThreshold - public tunable 0.4 x-alignment constant
  - Fixtures/timestamp_noise.png - two-column chat fixture with timestamp + Delivered noise
  - End-to-end OCR-to-attribution integration test proving composition
affects: [02-screenshot-import-ocr-pipeline (plan 04 - confirm UI renders this [ConversationMessage] output and must align its flip-default with userSideXThreshold)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "BubbleAttributor is a pure-geometry enum (no UI/platform dependency beyond CGRect) - testable in-memory with synthetic RecognizedLine arrays, no fixture image needed for the unit-level reading-order/attribution/noise tests."
    - "The x-alignment threshold is a single documented public constant (userSideXThreshold) rather than a magic number, so a future confirm-UI 'flip' default and this attribution logic can never silently drift apart."
    - "Noise filtering uses an exact-match Set for delivery-status words and a single anchored/bounded regex for time-of-day strings - deliberately avoids a more 'clever' combined/nested regex per the ReDoS mitigation in RESEARCH.md's Security Domain."

key-files:
  created:
    - BanterShared/Sources/BanterShared/Import/BubbleAttributor.swift
    - BanterShared/Tests/BanterSharedTests/BubbleAttributorTests.swift
    - BanterShared/Tests/BanterSharedTests/Fixtures/timestamp_noise.png
  modified:
    - BanterShared/Tests/BanterSharedTests/OCRPipelineTests.swift

key-decisions:
  - "userSideXThreshold = 0.4 shipped as a documented public constant with a ponytail-style deferral comment naming the ceiling (untuned against real screenshots) and upgrade path (real Tinder/Hinge/Bumble screenshot collection, per STATE.md's existing tracked blocker) - matches RESEARCH.md's Open Questions #2 recommendation exactly."
  - "Reading-order sort uses descending boundingBox.origin.y (Pitfall 2 fix) - implemented and unit-tested with deliberately shuffled input, not just happy-path ordered input, to prove the fix actually matters."
  - "Noise detection kept as two simple, independently-bounded checks (exact-match Set + single anchored regex) rather than one combined pattern, preserving the ReDoS mitigation RESEARCH.md flagged."

requirements-completed: [CAPT-01]

coverage:
  - id: D1
    description: "BubbleAttributor.attribute(_:) produces correctly-ordered top-to-bottom transcript from bottom-left-origin Vision bounding boxes, fed shuffled input"
    requirement: "CAPT-01"
    verification:
      - kind: unit
        ref: "BubbleAttributorTests.swift#testReadingOrderTopToBottomFromBottomLeftOrigin"
        status: pass
    human_judgment: false
  - id: D2
    description: "x-alignment attribution: leading edge < 0.4 -> .match, >= 0.4 -> .user"
    requirement: "CAPT-01"
    verification:
      - kind: unit
        ref: "BubbleAttributorTests.swift#testAttributionByXThreshold"
        status: pass
    human_judgment: false
  - id: D3
    description: "Noise lines (timestamps, Delivered/Read/Today/Yesterday, empty) are dropped from the transcript entirely"
    requirement: "CAPT-01"
    verification:
      - kind: unit
        ref: "BubbleAttributorTests.swift#testNoiseLinesAreDropped"
        status: pass
    human_judgment: false
  - id: D4
    description: "Real screenshot fixture (timestamp_noise.png) flows OCRPipeline.recognize -> BubbleAttributor.attribute into exactly 2 correctly-attributed messages with noise absent, proven in the CI simulator"
    requirement: "CAPT-01"
    verification:
      - kind: integration
        ref: "OCRPipelineTests.swift#testFixtureThroughAttributionDropsNoiseAndAttributes"
        status: pass
      - kind: other
        ref: "CI run 28642226580 (main, commit 97645ef): 'Test BanterShared' step green, all 10 tests passed including BubbleAttributorTests (3) and testFixtureThroughAttributionDropsNoiseAndAttributes"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-07-03
status: complete
---

# Phase 2 Plan 2: BubbleAttributor Summary

**Turned raw OCR lines into an ordered, speaker-attributed transcript: bottom-left-origin-aware reading-order sort, documented 0.4 x-alignment threshold, and a ReDoS-safe noise filter — CI green on the first push, all 10 tests passing**

## Performance

- **Duration:** 12 min
- **Tasks:** 2 (both auto, tdd="true")
- **Files created:** 3 (BubbleAttributor.swift, BubbleAttributorTests.swift, timestamp_noise.png)
- **Files modified:** 1 (OCRPipelineTests.swift)

## Accomplishments

- `BubbleAttributor.attribute(_:)` — the deterministic geometry heart of CAPT-01: sorts `[RecognizedLine]` descending by `boundingBox.origin.y` (Pitfall 2's bottom-left-origin fix, explicitly implemented and tested against shuffled input, not just already-ordered input), drops noise, and maps surviving lines to `ConversationMessage` with sequential `order` starting at 0
- `userSideXThreshold: CGFloat = 0.4` — a public, documented, tunable constant (not a magic number) marked with a `ponytail:` comment naming its ceiling (untuned against real screenshots) and upgrade path (real Tinder/Hinge/Bumble screenshot collection during later execution)
- Noise filter drops empty/whitespace lines, an exact-match `Set` of delivery-status words (`Delivered`, `Read`, `Today`, `Yesterday`), and time-of-day strings via a single anchored, bounded regex (`^\d{1,2}:\d{2}\s?(AM|PM)?$`) — deliberately two simple checks instead of one combined pattern, preserving RESEARCH.md's ReDoS mitigation
- `BubbleAttributorTests` — 3 unit tests proving reading order (shuffled input), x-threshold attribution (including the exact-boundary case `x == 0.4`), and noise-dropping, all pure in-memory `RecognizedLine` arrays, no image/simulator needed
- `timestamp_noise.png` — a new synthetic fixture (Python/PIL, same generation approach as plan 01) rendering a left gray bubble, a right blue bubble, a centered timestamp, and a centered "Delivered" receipt line
- `OCRPipelineTests.testFixtureThroughAttributionDropsNoiseAndAttributes` — the real end-to-end integration proof: fixture PNG → `OCRPipeline.recognize` → `BubbleAttributor.attribute` → asserts exactly 2 messages, correct `.match`/`.user` attribution, and zero noise leakage, run for real in the CI simulator
- **CI CONFIRMED GREEN on the first push** (run [28642226580](https://github.com/kish-jpg/banter/actions/runs/28642226580), commit `97645ef`): all 10 tests in `BanterSharedTests` passed in 1.626s, including all 3 `BubbleAttributorTests` and the new fixture integration test — zero fix-forward iterations needed this plan

## Task Commits

Each task was committed atomically:

1. **Task 1: BubbleAttributor — reading-order sort + x-alignment attribution + noise filter** — `a45bb32` (feat) — `BubbleAttributor.swift`, `BubbleAttributorTests.swift`
2. **Task 2: End-to-end fixture test — screenshot PNG through OCR + attribution** — `97645ef` (test) — `timestamp_noise.png`, `OCRPipelineTests.swift` (extended)

_Note: Both tasks are `tdd="true"`. Source and test were authored together per task (no local Swift toolchain on this Windows machine to run an actual local RED-then-GREEN loop), with the real RED/GREEN proof happening via CI compilation and test execution — consistent with plan 01's established pattern. Unlike plan 01, CI went green on the very first push with zero fix-forward commits required._

## Files Created/Modified

- `BanterShared/Sources/BanterShared/Import/BubbleAttributor.swift` — `attribute(_:)`, `userSideXThreshold`, private `isNoise` helper
- `BanterShared/Tests/BanterSharedTests/BubbleAttributorTests.swift` — 3 tests: reading order, x-threshold attribution, noise dropping
- `BanterShared/Tests/BanterSharedTests/Fixtures/timestamp_noise.png` — synthetic fixture (Python/PIL, not committed as a script, only the PNG output)
- `BanterShared/Tests/BanterSharedTests/OCRPipelineTests.swift` — added `testFixtureThroughAttributionDropsNoiseAndAttributes`

## Decisions Made

- **0.4 threshold, public + documented, not silently embedded:** Matches RESEARCH.md's explicit recommendation ("Ship with a documented constant... treat exact tuning as expected iteration"). The `ponytail:` comment names the deferred calibration path so a future plan/tuning pass has a clear pointer instead of rediscovering the same open question.
- **Reading-order fix tested against shuffled input, not just correctly-ordered input:** A test that only feeds already-top-to-bottom lines would pass even with a bug in the sort direction (identity behavior). Testing shuffled input is the only way to actually prove the bottom-left-origin fix works.
- **Noise detection kept as two independent, bounded checks:** An exact-match `Set` for status words plus one anchored regex for timestamps, rather than a single combined/nested pattern — directly follows RESEARCH.md's Security Domain guidance not to "improve" the noise regex into something more permissive without re-checking backtracking behavior.

## Deviations from Plan

None — plan executed exactly as written. No Rule 1/2/3 auto-fixes were needed; CI passed on the first push.

## Issues Encountered

None. Unlike plan 01 (which needed 3 fix-forward CI iterations for closure-type inference, `NormalizedRect`→`CGRect` conversion, and the macOS platform floor), this plan's CI run went green immediately — the carry-forward macOS 15 floor from plan 01 already covered this plan's new code, and no new OS-versioned API surface was introduced.

## User Setup Required

None — no external accounts, API keys, or manual configuration needed.

## Next Phase Readiness

- `BubbleAttributor.attribute(_:)` and `userSideXThreshold` are ready for plan 04's confirm/correct UI to consume directly — the UI's "flip" button default must read from `userSideXThreshold`, not a separate hardcoded value, to avoid drift.
- The two documented hard pitfalls (bottom-left bounding-box origin, x-alignment threshold) are now both explicitly implemented and unit-tested, closing the plan's stated risk.
- STATE.md's existing tracked blocker ("Per-app OCR bubble-parsing heuristics need real screenshot collection; post-launch tuning expected") remains open and unaffected by this plan — the constant is shipped as intentionally provisional, matching that blocker's framing.
- No new blockers introduced. Plan 03 (paste-text fallback, per RESEARCH.md's `PasteTextParser`) can proceed independently — it does not depend on `BubbleAttributor`.

---
*Phase: 02-screenshot-import-ocr-pipeline*
*Completed: 2026-07-03*
