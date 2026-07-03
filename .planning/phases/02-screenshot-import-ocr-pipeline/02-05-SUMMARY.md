---
phase: 02-screenshot-import-ocr-pipeline
plan: 05
subsystem: ci
tags: [xcuitest, ci, screenshot-artifact, xcodegen, github-actions]

# Dependency graph
requires:
  - phase: 02-screenshot-import-ocr-pipeline (plan 04)
    provides: ImportEntryView, ConfirmTranscriptView, --seed-sample-transcript launch argument
provides:
  - BanterUITests XCUITest target (project.yml) attached to BanterApp's scheme test action
  - ScreenshotArtifactTests.testCaptureKeyScreens - captures 00_import_entry and 01_confirm_transcript as .keepAlways XCTAttachments
  - CI steps "Run UI screenshot tests" + "Upload screenshot artifacts" (ui-screenshots, actions/upload-artifact@v4)
affects: [phase-2 verification (human visual sign-off channel), future phases needing screenshot-based CI verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "XCUITest target IS natively schemeable via XcodeGen (unlike Phase 1's SPM-test-into-scheme problem) - bundle.ui-testing type + dependencies: [{target: BanterApp}] + schemes.BanterApp.test.targets wiring, no custom XcodeGen workaround needed"
    - "Screenshot Entry screen via plain XCUIApplication().launch() (no launch arg -> default .entry state); screenshot Confirm screen via a second app instance with launchArguments = [--seed-sample-transcript] -> jumps straight to .confirm, never driving the system PhotosPicker (XCUITest cannot reliably automate the out-of-process system picker)"

key-files:
  created:
    - BanterUITests/ScreenshotArtifactTests.swift
  modified:
    - project.yml
    - .github/workflows/ci.yml

key-decisions:
  - "Two separate XCUIApplication instances (one default-launch, one seeded) rather than one app instance navigated across screens - avoids needing to drive the system PhotosPicker at all to reach Confirm; matches RESEARCH.md Assumption A3's recommended pattern exactly"

requirements-completed: [CAPT-02]

coverage:
  - id: D1
    description: "project.yml declares BanterUITests (bundle.ui-testing) targeting BanterApp, wired to its scheme test action"
    requirement: "CAPT-02"
    verification:
      - kind: other
        ref: "grep -q 'bundle.ui-testing' project.yml"
        status: pass
      - kind: other
        ref: "CI run 28654191833: 'Generate project' + 'Run UI screenshot tests' steps both green - proves the scheme wiring is valid, not just textually present"
        status: pass
    human_judgment: false
  - id: D2
    description: "ScreenshotArtifactTests captures 00_import_entry and 01_confirm_transcript with .keepAlways XCTAttachments, using --seed-sample-transcript instead of driving the system PhotosPicker"
    requirement: "CAPT-02"
    verification:
      - kind: other
        ref: "grep -q 'keepAlways' && grep -q 'seed-sample-transcript' BanterUITests/ScreenshotArtifactTests.swift"
        status: pass
      - kind: other
        ref: "CI run 28654191833 ui-screenshots artifact downloaded and inspected: 2 valid PNGs (magic bytes 89504e470d0a1a0a) at 201074 and 203728 bytes, visually confirmed as Import Entry and Confirm Transcript screens matching 02-UI-SPEC.md (coral CTA, You/Match chips, light background)"
        status: pass
    human_judgment: true
    rationale: "Automated verification proves the artifact exists, contains 2 non-trivial PNGs, and (via this executor's own visual inspection) shows the correct screens - but the plan's Task 3 checkpoint requires the human (Kish) to independently confirm the screens against 02-UI-SPEC.md before the phase's visual-verification loop is considered closed."
  - id: D3
    description: "CI runs the BanterUITests screenshot test via xcodebuild test -only-testing:BanterUITests with a resultBundlePath, and actions/upload-artifact@v4 uploads TestResults.xcresult as ui-screenshots, if: always(), 14-day retention"
    requirement: "CAPT-02"
    verification:
      - kind: other
        ref: "grep -q 'actions/upload-artifact@v4' && grep -q 'TestResults.xcresult' && grep -q 'only-testing:BanterUITests' && grep -q 'if: always()' .github/workflows/ci.yml"
        status: pass
      - kind: other
        ref: "CI run 28654191833 (main, commit f37e41c): full job green in 6m15s including 'Run UI screenshot tests' and 'Upload screenshot artifacts' steps; ui-screenshots artifact downloaded via gh run download and confirmed non-empty"
        status: pass
    human_judgment: false
---

# Phase 2 Plan 5: XCUITest Screenshot Artifacts + CI Summary

**CI now uploads a downloadable `ui-screenshots` artifact (Import Entry + Confirm Transcript, seeded via `--seed-sample-transcript`, never real data) on every run — first-try green, no fix-forward iterations needed**

## Performance

- **Duration:** ~15 min (tasks 1-2 authoring + CI wait)
- **Started:** 2026-07-03T10:15:00Z
- **Completed:** 2026-07-03T10:30:00Z (tasks 1-2; task 3 checkpoint pending human review)
- **Tasks:** 2 of 3 (auto tasks complete; task 3 is a human-verify checkpoint, not yet resolved)
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments

- `BanterUITests` XCUITest target added to `project.yml`: `bundle.ui-testing` type, iOS platform, deploymentTarget 18.0, `dependencies: [{target: BanterApp}]`, wired into `schemes.BanterApp.test.targets` — confirmed by CI as the natively-schemeable case XcodeGen supports (unlike Phase 1's SPM-test-target problem, per 01-04-SUMMARY)
- `ScreenshotArtifactTests.testCaptureKeyScreens` — two `XCUIApplication` instances: one default-launched (lands on Import Entry, no seed arg) and one launched with `--seed-sample-transcript` (lands directly on Confirm Transcript) — each captured via `XCUIScreen.main.screenshot()` → `XCTAttachment(screenshot:)` with `.name` and `.lifetime = .keepAlways`, never driving the system PhotosPicker (RESEARCH.md Assumption A3)
- CI extended with two new steps in the existing `build-and-test` job: "Run UI screenshot tests" (`xcodebuild test -only-testing:BanterUITests -resultBundlePath TestResults.xcresult`) and "Upload screenshot artifacts" (`actions/upload-artifact@v4`, name `ui-screenshots`, `if: always()`, 14-day retention)
- **CI CONFIRMED GREEN first try** (run [28654191833](https://github.com/kish-jpg/banter/actions/runs/28654191833), commit `f37e41c`), full job in 6m15s — no fix-forward iterations required, unlike plan 04's 3-iteration Swift/toolchain saga
- **Artifact contents independently verified** by this executor: downloaded `ui-screenshots` via `gh run download`, identified 2 valid PNGs by magic-byte sniffing (the `.xcresult` package has no file extensions on its internal CAS blobs — no `xcresulttool` available on this Windows/no-Mac machine) at 201074 bytes and 203728 bytes (both far above the 20KB "non-trivial" threshold), and visually confirmed via the Read tool: one shows "Import a conversation" / "Choose Screenshot" coral CTA (Import Entry), the other shows "Confirm your conversation" with Match/You chips and "Confirm & Continue" (Confirm Transcript) — both matching 02-UI-SPEC.md's dark-accent-on-light design language

## Task Commits

Each task was committed atomically:

1. **Task 1: BanterUITests target + ScreenshotArtifactTests** — `0a2ce79` (feat) — `project.yml`, `BanterUITests/ScreenshotArtifactTests.swift`
2. **Task 2: CI screenshot-test + artifact-upload steps** — `f37e41c` (feat) — `.github/workflows/ci.yml`

## Files Created/Modified

- `BanterUITests/ScreenshotArtifactTests.swift` — new XCUITest target's only test file
- `project.yml` — `BanterUITests` target declaration + `schemes.BanterApp.test.targets` wiring
- `.github/workflows/ci.yml` — "Run UI screenshot tests" + "Upload screenshot artifacts" steps

## Decisions Made

- **Two separate `XCUIApplication` instances instead of one navigated instance:** Reaching the Confirm screen from Import Entry inside a single running app instance would require either driving the real screenshot-import flow (impossible — XCUITest cannot automate the system PhotosPicker, a separate out-of-process UI) or adding test-only in-app navigation shortcuts. Launching a second app instance with `--seed-sample-transcript` is simpler and was exactly the pattern the plan and RESEARCH.md's Assumption A3 anticipated.

## Deviations from Plan

None — plan executed exactly as written. CI went green on the first push, no Rule 1/2/3 fixes needed (unlike plan 04's 3-iteration Swift/toolchain fix-forward sequence).

## Issues Encountered

- **`xcresulttool` unavailable on this Windows/no-Mac machine** for inspecting the downloaded `.xcresult` package (it's a CAS-style blob store with no file extensions on its internal `Data/` files, not a flat directory of named PNGs). Worked around by sniffing PNG magic bytes (`89 50 4E 47 0D 0A 1A 0A`) across all blobs to identify exactly 2 image files, then reading them directly via the Read tool's image-rendering support to visually confirm content. This is a one-off inspection technique for this executor's own verification pass, not a code change — the CI artifact itself is a standard `.xcresult` any Mac-based Xcode/`xcrun xcresulttool` can browse normally.

## User Setup Required

None — no external accounts, API keys, or manual configuration needed. `actions/upload-artifact@v4` is an existing pinned first-party GitHub Action; no new dependency introduced.

## Next Phase Readiness

- **Tasks 1-2 complete, CI green, artifact verified non-trivial and visually correct by this executor.** Task 3 (human-verify checkpoint) is the only remaining step — Kish must independently download `ui-screenshots` from run 28654191833 and confirm the two screens against `02-UI-SPEC.md` before this plan (and the phase's visual-verification loop) is considered fully closed.
- **How to review:**
  1. Open https://github.com/kish-jpg/banter/actions/runs/28654191833
  2. Scroll to "Artifacts", download `ui-screenshots`
  3. Or run: `gh run download 28654191833 -n ui-screenshots -D ./ui-screenshots-review` then inspect the PNG blobs inside `ui-screenshots-review/Data/` (no file extensions — identify by size: ~196KB and ~199KB, or open each in an image viewer that sniffs content type)
  4. Confirm against 02-UI-SPEC.md: Import Entry shows "Import a conversation" heading + coral "Choose Screenshot" CTA; Confirm Transcript shows "Confirm your conversation" + Match/You chips + coral "Confirm & Continue"
- No new blockers. STATE.md's existing `userSideXThreshold` real-screenshot-tuning blocker (plan 02) remains open and unaffected.

---
*Phase: 02-screenshot-import-ocr-pipeline*
*Completed: 2026-07-03 (tasks 1-2; task 3 pending human checkpoint)*

## Self-Check: PASSED

- FOUND: `BanterUITests/ScreenshotArtifactTests.swift`
- FOUND: `project.yml` contains `bundle.ui-testing`
- FOUND: `.github/workflows/ci.yml` contains `actions/upload-artifact@v4`, `TestResults.xcresult`, `only-testing:BanterUITests`, `if: always()`
- FOUND: commit `0a2ce79` (Task 1)
- FOUND: commit `f37e41c` (Task 2)
- FOUND: CI run 28654191833 — GREEN, full job in 6m15s, all steps including UI screenshot tests + artifact upload passed
- FOUND: `ui-screenshots` artifact downloaded, 2 PNGs confirmed (201074 bytes, 203728 bytes), visually verified as Import Entry and Confirm Transcript screens
