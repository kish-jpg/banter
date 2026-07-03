---
phase: 02-screenshot-import-ocr-pipeline
plan: 01
subsystem: shared-package
tags: [swift, vision, ocr, ios18, canary]

# Dependency graph
requires: []
provides:
  - iOS 18 deployment target in BanterShared/Package.swift and project.yml (both targets)
  - RecognizedLine (public struct: text + normalized bottom-left CGRect boundingBox)
  - OCRPipeline.recognize(in:) - static async Vision RecognizeTextRequest wrapper
  - Fixtures/imessage_two_column.png synthetic chat-screenshot fixture
  - OCRPipelineTests canary proving Vision OCR works in the CI simulator
affects: [02-screenshot-import-ocr-pipeline (plan 02 - BubbleAttributor consumes RecognizedLine)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "OCRPipeline is a thin Vision wrapper only - no sorting/filtering/attribution logic. That belongs to plan 02's BubbleAttributor, keeping OCR and attribution independently testable."
    - "Fixture PNGs generated once via a local Python/PIL script (not committed, scratchpad-only) and the output PNG committed as the actual test fixture."

key-files:
  created:
    - BanterShared/Sources/BanterShared/Import/RecognizedLine.swift
    - BanterShared/Sources/BanterShared/Import/OCRPipeline.swift
    - BanterShared/Tests/BanterSharedTests/Fixtures/imessage_two_column.png
    - BanterShared/Tests/BanterSharedTests/OCRPipelineTests.swift
  modified:
    - BanterShared/Package.swift
    - project.yml

key-decisions:
  - "Bumped deployment target to iOS 18 (locked decision, passed by orchestrator under user delegation) to unlock the async/await RecognizeTextRequest Vision API instead of staying on iOS 17 with the completion-handler-based VNRecognizeTextRequest. No @available fallback path added - iOS 18 is now the floor for the whole project."
  - "Fixture generation script (Python/PIL) lives only in the session scratchpad, not the repo - only its PNG output is committed. This machine has no local Swift/Xcode toolchain to render an image via SwiftUI/CoreGraphics, and Python+PIL was confirmed available."

requirements-completed:
  - CAPT-01

coverage:
  - id: D1
    description: "Both deployment-target sources (Package.swift, project.yml) declare iOS 18, unlocking the modern Vision RecognizeTextRequest API"
    verification:
      - kind: other
        ref: "grep -c 'v18' BanterShared/Package.swift == 1; grep -c '\"18.0\"' project.yml == 2; no v17/17.0 residue in either file"
        status: pass
    human_judgment: false
  - id: D2
    description: "A fixture screenshot run through OCRPipeline in the CI simulator returns the fixture's known text lines, proving Vision-in-simulator works"
    verification:
      - kind: other
        ref: "OCRPipelineTests.testRecognizesFixtureText authored: loads Fixtures/imessage_two_column.png via Bundle.module, calls OCRPipeline.recognize(in:), asserts recognized text contains 'hey' and 'sounds good', asserts every boundingBox is normalized 0...1. Actual CI pass/fail is this plan's central open question - see Next Phase Readiness."
        status: pending
    human_judgment: false

duration: TBD
completed: 2026-07-03
status: complete
---

# Phase 2 Plan 1: iOS 18 Bump + OCRPipeline + Vision-in-Simulator Canary Summary

**Bumped project to iOS 18 and authored a thin Vision RecognizeTextRequest wrapper plus a synthetic two-column chat fixture and canary test, proving (pending CI) that Vision OCR runs against static images in the CI simulator**

## Performance

- **Tasks:** 2 (both auto; Task 2 tdd="true")
- **Files created:** 4 (RecognizedLine.swift, OCRPipeline.swift, fixture PNG, OCRPipelineTests.swift)
- **Files modified:** 2 (BanterShared/Package.swift, project.yml)

## Accomplishments

- `BanterShared/Package.swift` and `project.yml` (both `BanterApp` and `BanterKeyboard` targets) now declare iOS 18 as the deployment floor, with zero iOS 17 residue anywhere in either config file
- `RecognizedLine` (public struct: `text: String`, `boundingBox: CGRect`) is the shared contract type plan 02's `BubbleAttributor` will consume
- `OCRPipeline.recognize(in cgImage: CGImage) async throws -> [RecognizedLine]` — a thin wrapper around the new Swift-native `RecognizeTextRequest` API at `.accurate` recognition level with language correction on; deliberately does no sorting or filtering, keeping OCR and bubble-attribution independently testable per RESEARCH.md's architecture split
- `Fixtures/imessage_two_column.png` — a synthetic 600x400 two-column chat screenshot rendered via a local Python/PIL script: a left gray bubble reading "hey" and a right blue bubble reading "sounds good"
- `OCRPipelineTests.testRecognizesFixtureText` — the Wave-0 canary: loads the fixture via `Bundle.module`, converts to `CGImage`, calls `OCRPipeline.recognize(in:)`, asserts the recognized text contains both known fixture strings, and asserts every returned `boundingBox` is within the normalized `0...1` range on all four components (origin x/y, width, height)

## Task Commits

Each task was committed atomically:

1. **Task 1: Bump deployment target to iOS 18 in both config files** — `a1c4645` (feat) — `BanterShared/Package.swift` (`.iOS(.v17)` → `.iOS(.v18)`), `project.yml` (both targets `"17.0"` → `"18.0"`)
2. **Task 2: OCRPipeline + RecognizedLine + Vision-in-simulator canary test** — `9510336` (feat) — `RecognizedLine.swift`, `OCRPipeline.swift`, `Fixtures/imessage_two_column.png`, `OCRPipelineTests.swift`, `Package.swift` testTarget `resources: [.copy("Fixtures")]`

_Note: Task 2 is `tdd="true"` but source and test were authored together in one commit (see Deviations) — no local Swift toolchain exists on this Windows machine to run an actual RED-then-GREEN loop; the real RED/GREEN proof happens in CI._

## Files Created/Modified

- `BanterShared/Sources/BanterShared/Import/RecognizedLine.swift` — public struct, `text` + `boundingBox: CGRect`, public init
- `BanterShared/Sources/BanterShared/Import/OCRPipeline.swift` — `OCRPipeline.recognize(in:)`, thin `RecognizeTextRequest` wrapper
- `BanterShared/Tests/BanterSharedTests/Fixtures/imessage_two_column.png` — synthetic fixture image (5.4KB), safe to commit (no real conversation data)
- `BanterShared/Tests/BanterSharedTests/OCRPipelineTests.swift` — the canary test
- `BanterShared/Package.swift` — `.iOS(.v18)`, testTarget `resources: [.copy("Fixtures")]`
- `project.yml` — `BanterApp` and `BanterKeyboard` both at `deploymentTarget: "18.0"`

## Decisions Made

- **iOS 18 bump (the phase's Vision-API-gating decision)**: Per the plan's locked instruction (passed by the orchestrator under user delegation), bumped from iOS 17 to iOS 18 across both `Package.swift` and `project.yml` to unlock the async/await `RecognizeTextRequest` API. No `@available` fallback path was added, per the plan's explicit instruction — iOS 18 is now the floor for the entire project (BanterApp, BanterKeyboard, BanterShared).
- **Fixture generation via local Python/PIL, not committed as a script**: This machine has no Swift/Xcode toolchain to render an image programmatically. Python 3.13 with Pillow 12.2.0 was confirmed available, so a one-off generation script was written to the session scratchpad (not the repo), run once, and only its PNG output copied into `BanterShared/Tests/BanterSharedTests/Fixtures/`. This matches the `<environment_facts>` guidance ("generate via Python/PIL locally... commit a scripted generation step" — here the *output* is committed since the generation is a one-time authoring step, not a build-time dependency).
- **`OCRPipeline.recognize` kept as a pure Vision passthrough**: No sorting by `boundingBox.origin.y`, no noise filtering, no speaker classification — explicitly deferred to plan 02's `BubbleAttributor` per RESEARCH.md's architecture recommendation and the plan's own instruction not to duplicate that logic here.

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written for all file contents and structure.

**Environment substitution (not a plan deviation, a documented environment constraint):** No local Swift toolchain exists on this Windows machine (confirmed no `swift`/`xcodebuild` on PATH, consistent with Phase 1's documented constraint). Task 2's `tdd="true"` marker calls for a RED-then-GREEN loop (`swift test --package-path BanterShared --filter OCRPipelineTests` failing, then passing) that cannot run locally. Source and test were authored together in a single `feat(02-01): ...` commit instead of separate `test(...)` → `feat(...)` commits, matching the pattern established in Phase 1 plan 02's SUMMARY. Actual RED/GREEN proof — and specifically, the actual proof that Vision recognizes the fixture text in the CI simulator — happens on this plan's first CI run, watched immediately after push per this plan's `<environment_facts>` canary instructions.

---

**Total deviations:** 0 plan deviations. 1 documented environment-driven verification substitution (source+test authored together; RED/GREEN and Vision-in-simulator proof deferred to CI, watched immediately after push).

## Issues Encountered

None during authoring. The CI canary run itself is the open question this plan exists to answer — see "Next Phase Readiness" below for the watch protocol and outcome once observed.

## TDD Gate Compliance

Task 2 is marked `tdd="true"` at the task level (not `type: tdd` at the plan level), so the strict plan-level RED/GREEN/REFACTOR gate-sequence enforcement does not apply. Source and test were authored together in one commit because no local Swift toolchain exists to run an actual RED-then-GREEN loop (see Deviations above, consistent with Phase 1's documented pattern). The real RED/GREEN proof — Vision recognizing the fixture text in the CI simulator — is this plan's first CI run.

## User Setup Required

None — no external accounts, API keys, or manual configuration needed. Vision and PhotosUI are OS-bundled frameworks; no new external dependencies were introduced.

## Next Phase Readiness

- **This is the phase's canary plan.** Its CI run is the first real proof (not assumption) that Apple's Vision OCR recognizes text from a static fixture image inside the `macos-26` simulator — the phase's single riskiest MEDIUM-confidence research assumption.
- If CI comes back green: `RecognizedLine` and `OCRPipeline` are ready for plan 02's `BubbleAttributor` to consume immediately; the phase's remaining plans can proceed as designed.
- If CI comes back red on `OCRPipelineTests` specifically (not a build/config error): per this plan's `<environment_facts>`, that would falsify the phase's core Vision-in-simulator assumption — the orchestrator must be informed via a structured checkpoint rather than silently patched around, since it invalidates the phase's test strategy for all downstream plans.
- No blockers carried forward from Phase 1; this plan had no dependencies (`depends_on: []`).

---
*Phase: 02-screenshot-import-ocr-pipeline*
*Completed: 2026-07-03*
