---
phase: 02-screenshot-import-ocr-pipeline
plan: 01
subsystem: shared-package
tags: [swift, vision, ocr, ios18, canary]

# Dependency graph
requires: []
provides:
  - iOS 18 deployment target in BanterShared/Package.swift and project.yml (both targets)
  - macOS 15 platform floor in BanterShared/Package.swift (required for swift test to compile Vision's new API on the CI host)
  - RecognizedLine (public struct: text + normalized bottom-left CGRect boundingBox)
  - OCRPipeline.recognize(in:) - static async Vision RecognizeTextRequest wrapper
  - Fixtures/imessage_two_column.png synthetic chat-screenshot fixture
  - OCRPipelineTests canary - CONFIRMED GREEN IN CI - Vision OCR recognizes fixture text
affects: [02-screenshot-import-ocr-pipeline (plan 02 - BubbleAttributor consumes RecognizedLine)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "OCRPipeline is a thin Vision wrapper only - no sorting/filtering/attribution logic. That belongs to plan 02's BubbleAttributor, keeping OCR and attribution independently testable."
    - "Fixture PNGs generated once via a local Python/PIL script (not committed, scratchpad-only) and the output PNG committed as the actual test fixture."
    - "BanterShared/Package.swift needs BOTH .iOS and .macOS platform floors whenever a Vision (or other OS-versioned) API is used, because `swift test --package-path BanterShared` compiles and runs on the CI runner's native macOS host, not the iOS Simulator - only xcodebuild test would exercise iOS Simulator directly."

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
  - "Added .macOS(.v15) platform floor to BanterShared/Package.swift (Rule 1 bug fix, found via CI, not in original plan scope) because swift test --package-path BanterShared compiles for the CI runner's macOS host, and RecognizeTextRequest/perform(on:)/boundingBox all require macOS 15+ there too - iOS-only platform declaration was insufficient for the dual-host (iOS app + macOS-hosted swift test) reality of this package."

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
      - kind: ci
        ref: "CI run 28641698440 (main, commit 1b23226): 'Test BanterShared' step green. Log confirms: Test Case '-[BanterSharedTests.OCRPipelineTests testRecognizesFixtureText]' passed (1.319 seconds). Executed 6 tests, with 0 failures."
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-07-03
status: complete
---

# Phase 2 Plan 1: iOS 18 Bump + OCRPipeline + Vision-in-Simulator Canary Summary

**Bumped project to iOS 18, authored a thin Vision RecognizeTextRequest wrapper plus a synthetic two-column chat fixture and canary test — CI CONFIRMED GREEN: Vision OCR recognizes the fixture's known text ("hey", "sounds good") on the very first CI run after three small fix-forward iterations**

## Performance

- **Tasks:** 2 (both auto; Task 2 tdd="true")
- **Files created:** 4 (RecognizedLine.swift, OCRPipeline.swift, fixture PNG, OCRPipelineTests.swift)
- **Files modified:** 3 (BanterShared/Package.swift, project.yml, plus one post-task CI fix to Package.swift)
- **CI iterations to green:** 4 runs total (1 pre-existing-code failure caught pre-push avoided; 3 push-fix-push cycles after the initial push)

## Accomplishments

- `BanterShared/Package.swift` and `project.yml` (both `BanterApp` and `BanterKeyboard` targets) now declare iOS 18 as the deployment floor, with zero iOS 17 residue anywhere in either config file
- `RecognizedLine` (public struct: `text: String`, `boundingBox: CGRect`) is the shared contract type plan 02's `BubbleAttributor` will consume
- `OCRPipeline.recognize(in cgImage: CGImage) async throws -> [RecognizedLine]` — a thin wrapper around the new Swift-native `RecognizeTextRequest` API at `.accurate` recognition level with language correction on; deliberately does no sorting or filtering, keeping OCR and bubble-attribution independently testable per RESEARCH.md's architecture split
- `Fixtures/imessage_two_column.png` — a synthetic 600x400 two-column chat screenshot rendered via a local Python/PIL script: a left gray bubble reading "hey" and a right blue bubble reading "sounds good"
- `OCRPipelineTests.testRecognizesFixtureText` — the Wave-0 canary: loads the fixture via `Bundle.module`, converts to `CGImage`, calls `OCRPipeline.recognize(in:)`, asserts the recognized text contains both known fixture strings, and asserts every returned `boundingBox` is within the normalized `0...1` range on all four components (origin x/y, width, height)
- **CI CONFIRMED GREEN (run [28641698440](https://github.com/kish-jpg/banter/actions/runs/28641698440)):** `Test Case '-[BanterSharedTests.OCRPipelineTests testRecognizesFixtureText]' passed (1.319 seconds)`. The phase's single riskiest MEDIUM-confidence research assumption — that Vision OCR works against static fixture images in this CI toolchain — is now proven, not assumed.

## Task Commits

Each task was committed atomically:

1. **Task 1: Bump deployment target to iOS 18 in both config files** — `a1c4645` (feat) — `BanterShared/Package.swift` (`.iOS(.v17)` → `.iOS(.v18)`), `project.yml` (both targets `"17.0"` → `"18.0"`)
2. **Task 2: OCRPipeline + RecognizedLine + Vision-in-simulator canary test** — `9510336` (feat) — `RecognizedLine.swift`, `OCRPipeline.swift`, `Fixtures/imessage_two_column.png`, `OCRPipelineTests.swift`, `Package.swift` testTarget `resources: [.copy("Fixtures")]`

Post-task CI fix-forward commits (all Rule 1 — auto-fixed bugs found only once CI actually compiled the code, since no local Swift toolchain exists to catch these pre-push):

3. `e942198` (fix) — annotate `compactMap` closure return type explicitly as `RecognizedLine?`; Swift's inference had resolved it to the non-optional type, rejecting the `return nil` guard-else branch
4. `e048c2e` (fix) — convert Vision's `NormalizedRect` to `CGRect` via `.cgRect`; the new Swift `RecognizeTextRequest` API's `observation.boundingBox` is typed `NormalizedRect`, not `CGRect` directly (unlike the older `VNRecognizedTextObservation`)
5. `1b23226` (fix) — add `.macOS(.v15)` platform floor to `Package.swift`; `swift test --package-path BanterShared` (the CI test-runner command) compiles and runs on the CI host's native macOS, not the iOS Simulator, so the iOS-only platform floor left the implicit macOS minimum too low for `RecognizeTextRequest`/`perform(on:)`/`boundingBox`, all of which require macOS 15+

_Note: Task 2 is `tdd="true"` but source and test were authored together in one commit — no local Swift toolchain exists on this Windows machine to run an actual RED-then-GREEN loop; the real RED/GREEN proof happened across the CI iterations above._

## Files Created/Modified

- `BanterShared/Sources/BanterShared/Import/RecognizedLine.swift` — public struct, `text` + `boundingBox: CGRect`, public init
- `BanterShared/Sources/BanterShared/Import/OCRPipeline.swift` — `OCRPipeline.recognize(in:)`, thin `RecognizeTextRequest` wrapper (fixed twice post-CI: explicit closure return type, `NormalizedRect` → `CGRect` conversion)
- `BanterShared/Tests/BanterSharedTests/Fixtures/imessage_two_column.png` — synthetic fixture image (5.4KB), safe to commit (no real conversation data)
- `BanterShared/Tests/BanterSharedTests/OCRPipelineTests.swift` — the canary test, confirmed passing in CI
- `BanterShared/Package.swift` — `.iOS(.v18)` + `.macOS(.v15)`, testTarget `resources: [.copy("Fixtures")]`
- `project.yml` — `BanterApp` and `BanterKeyboard` both at `deploymentTarget: "18.0"`

## Decisions Made

- **iOS 18 bump (the phase's Vision-API-gating decision)**: Per the plan's locked instruction (passed by the orchestrator under user delegation), bumped from iOS 17 to iOS 18 across both `Package.swift` and `project.yml` to unlock the async/await `RecognizeTextRequest` API. No `@available` fallback path was added, per the plan's explicit instruction — iOS 18 is now the floor for the entire project (BanterApp, BanterKeyboard, BanterShared).
- **Fixture generation via local Python/PIL, not committed as a script**: This machine has no Swift/Xcode toolchain to render an image programmatically. Python 3.13 with Pillow 12.2.0 was confirmed available, so a one-off generation script was written to the session scratchpad (not the repo), run once, and only its PNG output copied into `BanterShared/Tests/BanterSharedTests/Fixtures/`.
- **`OCRPipeline.recognize` kept as a pure Vision passthrough**: No sorting by `boundingBox.origin.y`, no noise filtering, no speaker classification — explicitly deferred to plan 02's `BubbleAttributor` per RESEARCH.md's architecture recommendation and the plan's own instruction not to duplicate that logic here.
- **Added `.macOS(.v15)` platform floor (not in original plan scope)**: Discovered only via CI, since no local Swift toolchain exists to catch it beforehand. `swift test --package-path BanterShared` — the exact command the CI workflow and this plan's own `<verify>` block specify — compiles and executes on the CI runner's native macOS host, not on an iOS Simulator device. An iOS-only platform declaration left the package's implicit macOS deployment target too low for the new Vision API. This is a structural fact about how SPM test targets execute, not a scope change to the plan's iOS 18 decision.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `compactMap` closure return type inference**
- **Found during:** First CI run (28641373612) after Task 2
- **Issue:** `error: 'nil' is not compatible with closure result type 'RecognizedLine'` — Swift inferred the `compactMap` closure's return type as the non-optional `RecognizedLine` instead of `RecognizedLine?`, rejecting the `guard let ... else { return nil }` branch.
- **Fix:** Explicit `(observation) -> RecognizedLine?` closure signature.
- **Files modified:** `BanterShared/Sources/BanterShared/Import/OCRPipeline.swift`
- **Commit:** `e942198`

**2. [Rule 1 - Bug] Vision `NormalizedRect` vs `CGRect` type mismatch**
- **Found during:** Second CI run (28641475678)
- **Issue:** `error: cannot convert value of type 'NormalizedRect' to expected argument type 'CGRect'` — the new Swift `RecognizeTextRequest` API's `observation.boundingBox` returns `Vision.NormalizedRect`, not `CGRect` directly, unlike the older `VNRecognizedTextObservation.boundingBox`. RESEARCH.md's cited code example did not surface this distinction.
- **Fix:** Convert via `observation.boundingBox.cgRect`.
- **Files modified:** `BanterShared/Sources/BanterShared/Import/OCRPipeline.swift`
- **Commit:** `e048c2e`

**3. [Rule 1 - Bug] Missing macOS platform floor for `swift test`'s native host**
- **Found during:** Third CI run (28641568596)
- **Issue:** `error: 'RecognizeTextRequest' is only available in macOS 15.0 or newer` (and same for `perform(on:orientation:)` and `boundingBox`) — `Package.swift` declared only `.iOS(.v18)`; `swift test --package-path BanterShared` builds and runs the test target on the CI runner's macOS host directly (not through the iOS Simulator), so the package's implicit macOS platform minimum (much older than macOS 15) rejected the Vision API calls.
- **Fix:** Added `.macOS(.v15)` alongside `.iOS(.v18)` in `Package.swift`'s `platforms:` array.
- **Files modified:** `BanterShared/Package.swift`
- **Commit:** `1b23226`

---

**Total deviations:** 3 auto-fixed Rule 1 bugs, all found only once CI actually compiled/ran the code (no local Swift toolchain exists on this machine to catch them earlier). 0 deviations required a plan-scope change or user decision — all three were narrow, mechanical Swift API-surface corrections. Fourth CI run (28641698440) went green with zero further changes.

## Issues Encountered

Three CI iterations were needed to reach green, all resolved via Rule 1 auto-fixes (see Deviations above). None required a checkpoint or user decision — each was a narrow Swift compile-time correction discoverable only by actually compiling against the real Vision framework (unavailable locally). No issue indicated the phase's core Vision-in-simulator assumption was wrong; all three were incidental Swift API surface details (closure type inference, `NormalizedRect` wrapper type, dual iOS/macOS platform-floor requirement for `swift test`).

## TDD Gate Compliance

Task 2 is marked `tdd="true"` at the task level (not `type: tdd` at the plan level), so the strict plan-level RED/GREEN/REFACTOR gate-sequence enforcement does not apply. Source and test were authored together in one commit because no local Swift toolchain exists to run an actual RED-then-GREEN loop locally. The real RED/GREEN proof happened across CI runs 28641373612 → 28641475678 → 28641568596 (RED: three distinct compile errors, fixed incrementally) → 28641698440 (GREEN: `testRecognizesFixtureText` passed, full suite green).

## User Setup Required

None — no external accounts, API keys, or manual configuration needed. Vision and PhotosUI are OS-bundled frameworks; no new external dependencies were introduced.

## Next Phase Readiness

- **This plan's canary is answered: CI is green.** Apple's Vision OCR (`RecognizeTextRequest`) recognizes text from a static fixture image inside this project's CI toolchain (`macos-26` runner, Xcode 26.5) — the phase's single riskiest MEDIUM-confidence research assumption is now proven, not assumed.
- `RecognizedLine` and `OCRPipeline` are ready for plan 02's `BubbleAttributor` to consume immediately.
- **Carry-forward note for plan 02 and beyond:** any new `BanterShared` code using OS-versioned APIs (Vision, or otherwise) must consider that `swift test --package-path BanterShared` compiles for the CI host's native macOS, not just iOS — check both platform floors in `Package.swift`, not just the iOS one, before assuming a compile error is something else.
- No blockers carried forward from Phase 1; this plan had no dependencies (`depends_on: []`).

---
*Phase: 02-screenshot-import-ocr-pipeline*
*Completed: 2026-07-03*

## Self-Check: PASSED

- FOUND: `BanterShared/Sources/BanterShared/Import/RecognizedLine.swift`
- FOUND: `BanterShared/Sources/BanterShared/Import/OCRPipeline.swift`
- FOUND: `BanterShared/Tests/BanterSharedTests/Fixtures/imessage_two_column.png`
- FOUND: `BanterShared/Tests/BanterSharedTests/OCRPipelineTests.swift`
- FOUND: commit `a1c4645` (Task 1)
- FOUND: commit `9510336` (Task 2)
- FOUND: commit `e942198` (fix 1)
- FOUND: commit `e048c2e` (fix 2)
- FOUND: commit `1b23226` (fix 3)
- FOUND: CI run 28641698440 — GREEN, `testRecognizesFixtureText` passed
