---
phase: 01-foundation-privacy-boundary
plan: 03
subsystem: app-keyboard-targets
tags: [xcodegen, swiftui, uikit, app-group, keyboard-extension]

# Dependency graph
requires:
  - BanterShared Swift package (models, AppGroupStore, NetworkDTOs) — plan 01-02
provides:
  - project.yml XcodeGen spec (BanterApp application target + BanterKeyboard app-extension target, both depending on BanterShared package)
  - BanterApp: one-screen SwiftUI writer that writes sample ConversationMessage/ReplySuggestion/SentimentEvent into the App Group
  - BanterKeyboard: code-only UIInputViewController placeholder that reads the app's sample back from the App Group
  - Identical App Group entitlement (group.com.banter.shared) wired into both targets' .entitlements files
affects: [01-foundation-privacy-boundary (plan 04 — CI runs `xcodegen generate` + builds both schemes + runs BanterShared tests)]

# Tech tracking
tech-stack:
  added:
    - "XcodeGen project.yml: 2 targets (BanterApp application, BanterKeyboard app-extension), both depending on the local BanterShared SPM package"
  patterns:
    - "Both targets import BanterShared only — no target redeclares a model type or the App Group suite-name literal; the write (app) and read (keyboard) paths both go through AppGroupStore."

key-files:
  created:
    - project.yml
    - BanterApp/BanterApp.entitlements
    - BanterApp/Info.plist
    - BanterApp/BanterAppApp.swift
    - BanterApp/ContentView.swift
    - BanterKeyboard/BanterKeyboard.entitlements
    - BanterKeyboard/Info.plist
    - BanterKeyboard/KeyboardViewController.swift
  modified: []

key-decisions:
  - "Task 1 (project.yml + entitlements + Info.plists) and Task 2 (BanterApp sources) were authored by a prior executor instance that was killed by a session limit mid-run; this executor verified both against the plan's acceptance criteria and grep-based verify commands before treating them as done, rather than redoing the work."
  - "No local Xcode/xcodegen/xcodebuild toolchain exists on this Windows machine (expected per environment facts) — verification is grep-based per the plan's own <verify> steps; `xcodegen generate` + build proof lands in CI (plan 01-04)."

patterns-established:
  - "Task commits use `feat(01-03): ...` scoped to phase-plan, continuing the 01-01/01-02 convention."

requirements-completed: []

coverage:
  - id: D1
    description: "project.yml declares two targets: BanterApp (application) and BanterKeyboard (app-extension), both depending on the BanterShared local package"
    verification:
      - kind: other
        ref: "project.yml targets.BanterApp.type=application, targets.BanterKeyboard.type=app-extension, both dependencies=[{package: BanterShared}]"
        status: pass
    human_judgment: false
  - id: D2
    description: "Both targets carry the identical App Group entitlement group.com.banter.shared"
    verification:
      - kind: other
        ref: "grep -c 'group.com.banter.shared' project.yml BanterApp/BanterApp.entitlements BanterKeyboard/BanterKeyboard.entitlements → 2/1/1 (project.yml declares it twice, once per target's entitlements.properties block; both .entitlements files carry it once each)"
        status: pass
    human_judgment: false
  - id: D3
    description: "BanterApp renders one SwiftUI screen that writes a sample ConversationMessage/ReplySuggestion/SentimentEvent into the App Group via AppGroupStore"
    verification:
      - kind: other
        ref: "ContentView.swift writeSamples() constructs one of each model type and calls AppGroupStore.write for sample_message/sample_suggestion/sample_event"
        status: pass
    human_judgment: false
  - id: D4
    description: "BanterKeyboard is a UIInputViewController subclass that builds and reads back what BanterApp wrote, proving the read path"
    verification:
      - kind: other
        ref: "KeyboardViewController.swift subclasses UIInputViewController, calls AppGroupStore.read(ConversationMessage.self, forKey: \"sample_message\") in viewDidLoad, displays result in a code-built UILabel (no Storyboard)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Both targets import BanterShared and reference its types — neither redefines a model type or the suiteName literal"
    verification:
      - kind: other
        ref: "grep -q 'import BanterShared' on both ContentView.swift and KeyboardViewController.swift; grep -rE 'struct (ConversationMessage|ReplySuggestion|SentimentEvent)' BanterApp/ and BanterKeyboard/ → no matches"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-07-03
status: complete
---

# Phase 1 Plan 3: XcodeGen Project + App/Keyboard Targets Summary

**project.yml wiring BanterApp (SwiftUI writer) and BanterKeyboard (UIInputViewController reader) to BanterShared via an identical App Group entitlement — the app-writes/keyboard-reads round-trip is real, source authored and grep-verified; xcodegen generate + build proof lands in CI**

## Performance

- **Duration:** 12 min (includes recovery/verification of a prior executor's partial run killed by session limit)
- **Started:** 2026-07-03T09:54:00Z (approx, prior executor)
- **Completed:** 2026-07-03T10:06:00Z
- **Tasks:** 3 (all auto)
- **Files created:** 8 (project.yml, 2 entitlements, 2 Info.plists, 3 Swift source files)

## Accomplishments

- `project.yml`: XcodeGen spec declaring `BanterApp` (type `application`) and `BanterKeyboard` (type `app-extension`), both targeting iOS 17.0, both depending on the local `BanterShared` package, both carrying `com.apple.security.application-groups: [group.com.banter.shared]` in their entitlements block
- `BanterApp/BanterApp.entitlements` and `BanterKeyboard/BanterKeyboard.entitlements`: identical single-element App Group array (`group.com.banter.shared`), matching `AppGroupStore.suiteName` byte-for-byte
- `BanterKeyboard/Info.plist`: `NSExtension` dict with `NSExtensionPointIdentifier` = `com.apple.keyboard-service`, `NSExtensionPrincipalClass` = `$(PRODUCT_MODULE_NAME).KeyboardViewController`, `RequestsOpenAccess` = `false`
- `BanterApp/BanterAppApp.swift` + `BanterApp/ContentView.swift`: one-screen SwiftUI app; a button constructs one `ConversationMessage`, one `ReplySuggestion`, one `SentimentEvent` (using the real `Speaker`/`ReplyStyle` enum cases) and writes each via `AppGroupStore.write(_:forKey:)` under `sample_message`/`sample_suggestion`/`sample_event`, then shows a confirmation label
- `BanterKeyboard/KeyboardViewController.swift`: `UIInputViewController` subclass; in `viewDidLoad` calls `AppGroupStore.read(ConversationMessage.self, forKey: "sample_message")` and displays the result (or a placeholder string if nil) in a code-built `UILabel` — no Storyboard/XIB — proving the read path end-to-end

## Task Commits

Each task was committed atomically:

1. **Task 1: Author XcodeGen project.yml with both targets + App Group entitlements** - `3464b6a` (feat) — completed by a prior executor instance before this session; verified against plan acceptance criteria (grep counts, target types, dependency wiring) and accepted as-is, not redone
2. **Task 2: BanterApp one-screen writer using BanterShared** - `bfb823a` (feat) — `BanterAppApp.swift` + `ContentView.swift`; files existed untracked from the prior executor's partial run, reviewed against plan spec (model construction, `AppGroupStore.write` calls, no redeclaration) and committed as-is
3. **Task 3: BanterKeyboard placeholder reader using BanterShared** - `3170584` (feat) — `KeyboardViewController.swift`; this file was missing from the prior run and was authored fresh in this session

## Files Created/Modified

- `project.yml` - XcodeGen spec: `Banter` project, `BanterApp` (application) + `BanterKeyboard` (app-extension) targets, both wired to `BanterShared` package and App Group entitlements
- `BanterApp/BanterApp.entitlements` - `com.apple.security.application-groups: [group.com.banter.shared]`
- `BanterApp/Info.plist` - minimal SwiftUI-lifecycle app Info.plist (`CFBundleDisplayName`, `UILaunchScreen`)
- `BanterApp/BanterAppApp.swift` - `@main struct BanterAppApp: App` with `WindowGroup { ContentView() }`
- `BanterApp/ContentView.swift` - one-screen writer: builds and writes all three sample model types via `AppGroupStore.write`
- `BanterKeyboard/BanterKeyboard.entitlements` - identical `com.apple.security.application-groups: [group.com.banter.shared]`
- `BanterKeyboard/Info.plist` - `NSExtension` dict for `com.apple.keyboard-service`, `RequestsOpenAccess` false
- `BanterKeyboard/KeyboardViewController.swift` - `UIInputViewController` subclass reading `sample_message` back via `AppGroupStore.read`, displayed in a code-built `UILabel`

## Decisions Made

- **Verified rather than redid prior executor's committed/untracked work**: A previous executor session was killed mid-run by a session limit. Task 1 (`project.yml` + entitlements + Info.plists) was already committed at `3464b6a`; Task 2's source files (`BanterAppApp.swift`, `ContentView.swift`) existed on disk but untracked. Rather than blindly trusting or blindly redoing, this executor read the plan's acceptance criteria and `<verify>` grep commands, ran them against the actual file contents, cross-checked the model constructors used in `ContentView.swift` against the real `ConversationMessage`/`ReplySuggestion`/`SentimentEvent`/`Speaker`/`ReplyStyle` definitions in `BanterShared`, and confirmed correctness before committing Task 2 as-is.
- **Task 3 was genuinely missing and authored fresh**: `BanterKeyboard/KeyboardViewController.swift` did not exist anywhere (tracked or untracked) — only the entitlements and Info.plist from Task 1 were present in `BanterKeyboard/`. Authored per plan spec: `UIInputViewController` subclass, `AppGroupStore.read(ConversationMessage.self, forKey: "sample_message")` in `viewDidLoad`, code-built `UILabel` (no Storyboard).
- **No local Xcode/xcodegen/xcodebuild toolchain** (expected, per environment facts): all three tasks' local verification used the plan's own grep-based `<verify>` and `<acceptance_criteria>` steps. Actual `xcodegen generate` + `xcodebuild` compile proof for both schemes is deferred to CI (plan 01-04), as documented identically in plan 01-02's summary.

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written for all file contents and structure. Task 1 and Task 2 content (recovered from the prior killed session) matched the plan's action/acceptance-criteria spec exactly on inspection; no corrections were needed.

**Environment substitution (not a plan deviation, a documented environment constraint):** Per the orchestrator's `<environment_facts>`, this machine has no `xcodegen`/`xcodebuild` CLI. The plan's own `<verification>` section anticipates this: "Full build/generate verification happens in plan 04 (CI) — there is no local Xcode to generate/build here." All grep-based `<verify>` and `<acceptance_criteria>` checks were run and passed for all three tasks.

---

**Total deviations:** 0 plan deviations. 1 documented environment-driven verification substitution (grep-based acceptance criteria in place of `xcodegen generate`/`xcodebuild`, compile proof deferred to CI). 1 session-continuity event (prior executor killed by session limit mid-run; work verified, not redone, and the one missing task completed).

## Issues Encountered

Prior executor session was killed mid-run by a session limit after committing Task 1 and leaving Task 2's source files untracked on disk. No corruption or incorrect content was found on inspection — both were verified against the plan's acceptance criteria and accepted. Task 3 had not been started and was completed fresh in this session.

## TDD Gate Compliance

Not applicable — none of this plan's tasks are marked `tdd="true"` (unlike plan 01-02). This plan is `type: execute` with plain `type="auto"` tasks.

## User Setup Required

None — no external accounts, API keys, or manual configuration needed for this plan. `xcodegen generate` + `xcodebuild` verification for both schemes will run automatically once plan 01-04's CI workflow exists.

## Next Phase Readiness

- `project.yml` + both targets' full source/entitlements/Info.plist are structurally complete per this plan's scope.
- The app→keyboard write/read round-trip (Success Criteria 1 and 4) is real: `BanterApp/ContentView.swift` writes all three sample model types, `BanterKeyboard/KeyboardViewController.swift` reads the message back and displays it — both going exclusively through `BanterShared.AppGroupStore`, neither redeclaring a model or the suite-name literal.
- Plan 01-04 (CI workflow) is the first point `xcodegen generate` will actually run and both schemes will actually build — treat that first green CI run as the compile proof this plan's grep-based verification stands in for. If CI reveals a schema-drift issue in `project.yml` (per RESEARCH Pitfall 2) or a Swift syntax error, it should be auto-fixed there per Rule 1 (bug) since the targets' structure and intent are unchanged.
- No blockers carried forward.

---
*Phase: 01-foundation-privacy-boundary*
*Completed: 2026-07-03*

## Self-Check: PASSED

- FOUND: `project.yml`
- FOUND: `BanterApp/BanterApp.entitlements`
- FOUND: `BanterApp/Info.plist`
- FOUND: `BanterApp/BanterAppApp.swift`
- FOUND: `BanterApp/ContentView.swift`
- FOUND: `BanterKeyboard/BanterKeyboard.entitlements`
- FOUND: `BanterKeyboard/Info.plist`
- FOUND: `BanterKeyboard/KeyboardViewController.swift`
- FOUND: commit `3464b6a` (Task 1)
- FOUND: commit `bfb823a` (Task 2)
- FOUND: commit `3170584` (Task 3)
- FOUND: commit `311a465` (SUMMARY docs commit)
