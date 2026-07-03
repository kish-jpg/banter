---
phase: 01-foundation-privacy-boundary
plan: 04
subsystem: infra
tags: [github-actions, ci, xcodegen, xcodebuild, swift-test, macos-runner]

# Dependency graph
requires:
  - phase: 01-foundation-privacy-boundary (plan 01)
    provides: Dedicated private GitHub repo kish-jpg/banter with origin remote
  - phase: 01-foundation-privacy-boundary (plan 02)
    provides: BanterShared package (models, AppGroupStore, NetworkDTOs, AppGroupRoundTripTests, NetworkBoundaryGuardTests)
  - phase: 01-foundation-privacy-boundary (plan 03)
    provides: project.yml (BanterApp + BanterKeyboard targets, App Group entitlements)
provides:
  - .github/workflows/ci.yml — green on push/pull_request on macos-26
  - First proven green CI run (Phase 1's entire verification surface, no local Mac)
  - Corrected #filePath navigation depth in NetworkBoundaryGuardTests.swift (was pointing at a nonexistent path)
  - Established pattern: local SPM package test targets run via `swift test --package-path`, not via an Xcode scheme's test action (XcodeGen cannot wire this — confirmed via upstream issues)
affects: [all future phases — CI is the only build/test surface for this project; any new BanterShared test target follows the swift test pattern, not xcodebuild -scheme test]

# Tech tracking
tech-stack:
  added:
    - "GitHub Actions macos-26 runner (Xcode 26.5 pinned via xcode-select)"
    - "XcodeGen 2.45.4 (brew-installed in CI, pinned with a latest-brew fallback)"
    - "actions/checkout@v4, actions/cache@v4 (SPM cache keyed on Package.resolved hash)"
  patterns:
    - "BanterShared (local SPM package) is tested via `swift test --package-path BanterShared` directly, independent of the generated Xcode project — XcodeGen cannot attach an SPM package's test target to an Xcode scheme's test action (confirmed: XcodeGen issues #983, #1028 describe this as an unsupported combination, not a config mistake)."
    - "Entitlement-survival assertion: CI greps the generated .entitlements files for the App Group string and fails the job explicitly, rather than trusting xcodegen's exit code alone (RESEARCH Pitfall 2)."

key-files:
  created:
    - .github/workflows/ci.yml
  modified:
    - project.yml (schemes: block added then reverted after XcodeGen rejected it as invalid — net diff is zero against plan 03's version)
    - BanterShared/Tests/BanterSharedTests/NetworkBoundaryGuardTests.swift (fixed #filePath navigation depth)

key-decisions:
  - "Test BanterShared via `swift test --package-path BanterShared` instead of `xcodebuild test -scheme BanterApp`, after CI proved XcodeGen has no supported mechanism to attach a local SPM package's test target to an Xcode scheme's test action. This still satisfies the plan's requirement to run the full BanterShared suite in CI — same test binary, same 5 assertions, just invoked via the SPM toolchain directly rather than routed through the Xcode scheme."
  - "Xcode pinned to 26.5 (the macos-26 runner's current default), not 26.4.1 as RESEARCH's illustrative skeleton assumed — verified against the live actions/runner-images macos-26-arm64-Readme.md at authoring time, per RESEARCH's own instruction to treat the first CI run as the version-verification step."
  - "iPhone 17 simulator destination confirmed available under both iOS 26.4 and 26.5 runtime rows in the runner-images readme before committing to it in the workflow."

patterns-established:
  - "Task commits use `feat(01-04): ...` / `fix(01-04): ...` scoped to phase-plan, continuing the 01-01/02/03 convention; CI fix-iteration commits are scoped `fix(01-04)` and each names the specific failing CI run ID they address."

requirements-completed: []

coverage:
  - id: D1
    description: "GitHub Actions workflow triggers on push and pull_request on a macos-26 runner, installs pinned XcodeGen, runs xcodegen generate, and asserts the generated entitlements carry the App Group ID"
    verification:
      - kind: e2e
        ref: "gh run view 28639232382 (https://github.com/kish-jpg/banter/actions/runs/28639232382) — steps 'Install XcodeGen', 'Generate project', 'Assert App Group entitlement survived generation' all succeeded"
        status: pass
    human_judgment: false
  - id: D2
    description: "Workflow builds both BanterApp and BanterKeyboard schemes against the iOS Simulator with no code signing"
    verification:
      - kind: e2e
        ref: "gh run view 28639232382 — steps 'Build BanterApp (simulator)' and 'Build BanterKeyboard (simulator)' both succeeded, CODE_SIGNING_ALLOWED=NO, destination iPhone 17 simulator"
        status: pass
    human_judgment: false
  - id: D3
    description: "Full BanterShared test suite (AppGroupRoundTripTests x4 + NetworkBoundaryGuardTests CAPT-04 guard) runs green in CI"
    verification:
      - kind: unit
        ref: "gh run view 28639232382 --log | grep 'Test Case' — Executed 5 tests, with 0 failures (0 unexpected)"
        status: pass
    human_judgment: false
  - id: D4
    description: "A green CI run on the dedicated banter GitHub repo is the Phase 1 gate — no local Mac verification exists"
    verification:
      - kind: e2e
        ref: "https://github.com/kish-jpg/banter/actions/runs/28639232382 — conclusion: success, all 13 steps succeeded"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-07-03
status: complete
---

# Phase 1 Plan 4: CI Workflow — Green Run Summary

**GitHub Actions workflow (macos-26, Xcode 26.5) generates the Xcode project via XcodeGen, asserts the App Group entitlement survived generation, builds both BanterApp and BanterKeyboard on the simulator with no signing, and runs the full BanterShared test suite via `swift test` — first green run confirmed at https://github.com/kish-jpg/banter/actions/runs/28639232382**

## Performance

- **Duration:** 20 min (including 3 CI fix-and-repush iterations)
- **Started:** 2026-07-03T04:44:00Z (approx)
- **Completed:** 2026-07-03T04:54:00Z (approx)
- **Tasks:** 2 (1 auto, 1 checkpoint:human-verify resolved via direct CI observation per orchestrator environment facts)
- **Files modified:** 2 created/modified in the final green state (.github/workflows/ci.yml, BanterShared/Tests/BanterSharedTests/NetworkBoundaryGuardTests.swift); project.yml's net diff versus plan 03 is zero (a schemes: block was added then reverted during fix iteration 2)

## Accomplishments

- `.github/workflows/ci.yml` authored and pushed: triggers on push/pull_request, runs on `macos-26`, pins Xcode 26.5, caches SPM via `actions/cache@v4` keyed on `Package.resolved`, installs XcodeGen 2.45.4, runs `xcodegen generate`, asserts both targets' generated `.entitlements` carry `group.com.banter.shared`, builds `BanterApp`, tests `BanterShared`, builds `BanterKeyboard` — all simulator-only with `CODE_SIGNING_ALLOWED=NO`
- First CI run (`28639002651`) surfaced a real gap: XcodeGen's auto-generated `BanterApp` scheme does not attach the SPM `BanterSharedTests` test target to its test action by default — `xcodebuild test` failed with "Scheme BanterApp is not currently configured for the test action"
- Second fix attempt (explicit `schemes:` block in `project.yml`) was itself rejected by `xcodegen generate` at validation time ("Scheme BanterApp has invalid test target BanterSharedTests") — confirmed via XcodeGen's own issue tracker (#983, #1028) that attaching a local SPM package's test target to an Xcode scheme's test action is an unsupported combination, not a config mistake
- Third fix: switched the test step to `swift test --package-path BanterShared`, testing the package directly and independent of the generated Xcode project — reverted the invalid `schemes:` block back to plan 03's original `project.yml`
- That run (`28639140661`) got further — build succeeded, 4/5 tests passed — but surfaced a real bug in `NetworkBoundaryGuardTests.swift`: the `#filePath`-based navigation to `NetworkDTOs.swift` was one directory level short, resolving to a nonexistent `BanterShared/Tests/Sources/BanterShared/NetworkDTOs.swift` instead of `BanterShared/Sources/BanterShared/NetworkDTOs.swift`
- Fourth push (`28639232382`) went green: all 13 workflow steps succeeded, all 5 BanterShared tests passed (`AppGroupRoundTripTests` x4 + `NetworkBoundaryGuardTests` x1) — **Phase 1's success gate is met**

## Task Commits

Each task was committed atomically, including CI fix-iteration commits:

1. **Task 1: Author the CI workflow** - `de86908` (feat) — `.github/workflows/ci.yml` initial authoring
2. **CI fix iteration 1** - `9a224cf` (fix) — attempted `schemes:` block in `project.yml` to wire `BanterSharedTests` into `BanterApp`'s test action (this attempt itself failed `xcodegen generate` validation — see iteration 2)
3. **CI fix iteration 2** - `c22408e` (fix) — reverted the invalid `schemes:` block; switched CI's test step to `swift test --package-path BanterShared`
4. **CI fix iteration 3** - `d1fcf44` (fix) — corrected `#filePath` navigation depth (2 → 3 `deletingLastPathComponent()` calls) in `NetworkBoundaryGuardTests.swift`

**Task 2 (checkpoint:human-verify, gate="blocking"): Confirm green CI run** — resolved without a user pause, per the orchestrator's `<environment_facts>` explicitly authorizing direct CI observation (`gh run watch`/`gh run view`) and up to 4 fix iterations. Reached green on iteration 3 of 4 (`28639232382`). Confirmed via `gh run view --json jobs` (all 13 steps `success`) and `gh run view --log` (5/5 tests passed) rather than a screenshot, since this is a headless CI pipeline with no visual surface — the run's completed status and step-by-step logs are the equivalent verification artifact.

## Files Created/Modified

- `.github/workflows/ci.yml` - CI workflow: checkout → select Xcode 26.5 → cache SPM → install XcodeGen 2.45.4 → `xcodegen generate` → entitlement-grep assertion → build BanterApp → `swift test --package-path BanterShared` → build BanterKeyboard
- `BanterShared/Tests/BanterSharedTests/NetworkBoundaryGuardTests.swift` - fixed `#filePath`-relative path navigation (was missing one `deletingLastPathComponent()` call, causing the guard test to look for `NetworkDTOs.swift` inside `Tests/` instead of the package root)
- `project.yml` - net unchanged versus plan 03 (a `schemes:` block was added in fix iteration 1, proven invalid by `xcodegen generate` itself, and reverted in fix iteration 2)

## Decisions Made

- **`swift test --package-path BanterShared` instead of `xcodebuild test -scheme BanterApp`**: XcodeGen has no supported way to attach a local SPM package's test target to an Xcode scheme's test action (this is a known, documented XcodeGen limitation — confirmed via issues #983 "Test target from a Swift package cannot be added to a scheme" and #1028 "How to add package unit tests to main target" on yonaskolb/XcodeGen, not something project.yml could be reconfigured to fix). Testing the package directly with `swift test` is simpler, faster (no simulator boot needed for a pure-Swift package with no UIKit/SwiftUI dependency), and exercises the identical test binary and assertions the plan specifies.
- **Xcode 26.5, not 26.4.1**: RESEARCH.md's illustrative workflow skeleton used `26.4.1` as a placeholder and explicitly flagged it `[ASSUMED — verify latest tag before use]`. Checked the live `actions/runner-images` `macos-26-arm64-Readme.md` at authoring time: the runner's current default is `26.5` (`17F42`, at `/Applications/Xcode_26.5.app`). Pinned to the verified value.
- **XcodeGen 2.45.4**: confirmed via the GitHub API (`releases/latest` for `yonaskolb/XcodeGen`) at authoring time, matching RESEARCH's instruction not to trust the document's guessed version number. Install step uses `brew install xcodegen@2.45.4 || brew install xcodegen` as a defensive fallback in case the versioned brew formula isn't available on the runner's Homebrew tap.
- **iPhone 17 simulator destination**: confirmed present in the runner-images readme's simulator device list for both the iOS 26.4 and iOS 26.5 runtime rows before committing to it in the workflow — matches the scheme names (`BanterApp`, `BanterKeyboard`) declared in plan 03's `project.yml`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] BanterSharedTests not wired into BanterApp's xcodebuild test action**
- **Found during:** Task 2, first CI run (`28639002651`)
- **Issue:** `xcodebuild test -scheme BanterApp` failed with "Scheme BanterApp is not currently configured for the test action." XcodeGen's auto-generated scheme for an `application`-type target does not automatically attach a dependency package's test target to that scheme's test action.
- **Fix (attempt 1, itself failed):** Added an explicit `schemes:` block to `project.yml` naming `BanterSharedTests` under `BanterApp`'s `test.targets`. This failed `xcodegen generate`'s own spec validation ("Scheme BanterApp has invalid test target BanterSharedTests") — confirmed via XcodeGen's issue tracker that this is an unsupported combination for SPM package test targets, not a syntax error to correct.
- **Fix (attempt 2, succeeded):** Reverted the `schemes:` block; changed the CI test step to `swift test --package-path BanterShared`, testing the package independently of the generated Xcode project.
- **Files modified:** `project.yml` (net zero diff versus plan 03), `.github/workflows/ci.yml`
- **Verification:** CI run `28639140661` — build succeeded, `swift test` ran and reported 4/5 tests passed (5th failure was the separate path-navigation bug below).
- **Committed in:** `9a224cf` (attempt 1), `c22408e` (attempt 2 — the one that stuck)

**2. [Rule 1 - Bug] Incorrect #filePath navigation depth in NetworkBoundaryGuardTests.swift**
- **Found during:** Task 2, third CI run (`28639140661`)
- **Issue:** `testNetworkDTOsContainNoBinaryImagePayloadTokens` failed: `String(contentsOf:)` threw "no such file" for `/Users/runner/work/banter/banter/BanterShared/Tests/Sources/BanterShared/NetworkDTOs.swift`. The test file lives at `BanterShared/Tests/BanterSharedTests/NetworkBoundaryGuardTests.swift`; reaching the package root (`BanterShared/`) requires three `deletingLastPathComponent()` calls (drop filename → drop `BanterSharedTests/` → drop `Tests/`), but the code only called it twice, landing at `BanterShared/Tests/` and then appending `Sources/BanterShared/NetworkDTOs.swift` on top of that wrong base.
- **Fix:** Added the missing third `deletingLastPathComponent()` call, with an inline comment naming what each step removes, so the resolved path is `BanterShared/Sources/BanterShared/NetworkDTOs.swift`.
- **Files modified:** `BanterShared/Tests/BanterSharedTests/NetworkBoundaryGuardTests.swift`
- **Verification:** CI run `28639232382` — `testNetworkDTOsContainNoBinaryImagePayloadTokens` passed (0.001s); all 5 BanterShared tests green.
- **Committed in:** `d1fcf44`

---

**Total deviations:** 2 auto-fixed (1 blocking — XcodeGen/SPM test-target scheme limitation required a workflow-step change, not just a project.yml tweak; 1 bug — off-by-one path navigation in a test file authored in plan 01-02, only exercisable once a real `swift test` toolchain existed in CI).
**Impact on plan:** Both fixes were required to reach the plan's explicit gate ("full BanterShared test suite... reports green"). No scope creep — the workflow's shape (generate → assert entitlement → build both targets → test BanterShared) is unchanged from the plan; only the *mechanism* of running BanterShared's tests changed (`swift test` instead of `xcodebuild test -scheme`), which is a corrected implementation detail, not a new feature.

## Issues Encountered

Three CI fix-iterations were needed to reach green (within the environment's stated 4-iteration budget):
1. XcodeGen cannot wire an SPM package's test target into an Xcode scheme's test action (structural tooling limitation, resolved by testing the package directly).
2. The `schemes:` workaround itself failed XcodeGen's spec validation (immediate feedback, no CI minutes wasted beyond the generate step).
3. A genuine `#filePath` navigation bug in plan 01-02's `NetworkBoundaryGuardTests.swift`, only detectable once a real Swift test runner executed the file (no local Swift toolchain existed until this CI run).

All three were resolved without needing to pause for user input — matching the orchestrator's explicit environment facts authorizing autonomous CI fix-and-repush up to 4 iterations.

## User Setup Required

None — GitHub auth was pre-verified (`gh auth status`, logged in as `kish-jpg`) and CI is fully self-contained (no secrets, no paid Apple Developer account needed for simulator-only builds per RESEARCH.md's Code Signing Reality table).

## Next Phase Readiness

- **Phase 1 is complete.** All four success criteria are proven by the green CI run at https://github.com/kish-jpg/banter/actions/runs/28639232382:
  1. Both `BanterApp` and `BanterKeyboard` targets build on the simulator, sharing `BanterShared` via the common App Group entitlement (`group.com.banter.shared`, asserted present in both generated `.entitlements` files).
  2. The App Group round-trip test (`AppGroupRoundTripTests`, 4 tests) passes.
  3. The CAPT-04 structural guard test (`NetworkBoundaryGuardTests`) passes — no binary-payload token found in `NetworkDTOs.swift`.
  4. Shared model types (`ConversationMessage`, `ReplySuggestion`, `SentimentEvent`) are compiled once in `BanterShared` and imported (not redefined) by both targets — proven by the successful build of both schemes against the same package.
- **Established pattern for future phases:** any new BanterShared (or future shared-package) test target should be run via `swift test --package-path <dir>` in CI, not via an `xcodebuild test -scheme` pointed at a package dependency — this is a hard XcodeGen/Xcode limitation, not a one-off workaround.
- **Simulator-vs-device caveat carried forward** (per RESEARCH Pitfall 1, Assumption A3): this green run proves the App Group round-trip on the iOS Simulator only. Simulator entitlement enforcement is understood to be more lenient than a real device's provisioning-profile-based enforcement. On-device confirmation remains deferred until a phase that adds a paid Apple Developer account and physical-device testing (RESEARCH flags Phase 5 as the likely first such phase, certainly required by Phase 8).
- No blockers carried forward. Phase 1 (Foundation & Privacy Boundary) is ready to close.

---
*Phase: 01-foundation-privacy-boundary*
*Completed: 2026-07-03*

## Self-Check: PASSED

- FOUND: `.github/workflows/ci.yml`
- FOUND: `.planning/phases/01-foundation-privacy-boundary/01-04-SUMMARY.md`
- FOUND: commit `de86908` (Task 1 — CI workflow)
- FOUND: commit `9a224cf` (fix iteration 1)
- FOUND: commit `c22408e` (fix iteration 2)
- FOUND: commit `d1fcf44` (fix iteration 3 — reached green)
- FOUND: commit `c91cce6` (SUMMARY docs commit)
- FOUND: green CI run `28639232382` — https://github.com/kish-jpg/banter/actions/runs/28639232382
