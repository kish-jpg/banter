---
phase: 01-foundation-privacy-boundary
verified: 2026-07-03T00:00:00Z
status: passed
score: 4/4 must-haves verified (roadmap success criteria); 17/17 plan-level must_haves truths verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 1: Foundation & Privacy Boundary Verification Report

**Phase Goal:** The project skeleton, shared model package, and App Group bridge exist, and the "raw screenshots never leave the device" boundary is a structural guarantee — not a later promise.
**Verified:** 2026-07-03
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | App and (placeholder) keyboard target both build and share a single BanterShared package via a common App Group ID | VERIFIED | `project.yml` declares `BanterApp` (application) and `BanterKeyboard` (app-extension), both `dependencies: [{package: BanterShared}]`, both entitlements blocks list `group.com.banter.shared`. Independently confirmed on CI: `gh run view 28639232382` — "Build BanterApp (simulator)": success, "Build BanterKeyboard (simulator)": success, both on `platform=iOS Simulator,name=iPhone 17`, `CODE_SIGNING_ALLOWED=NO`. |
| 2 | A round-trip test proves data written by the app is readable by the keyboard target through the shared container | VERIFIED | `AppGroupRoundTripTests.swift` (4 tests) writes/reads all three model types via `AppGroupStore`, backed by the single `suiteName = "group.com.banter.shared"` constant that both `BanterApp.entitlements` and `BanterKeyboard.entitlements` also declare. `BanterApp/ContentView.swift` writes `sample_message`/`sample_suggestion`/`sample_event`; `BanterKeyboard/KeyboardViewController.swift` reads `sample_message` back in `viewDidLoad` and displays it. Independently confirmed on CI log: all 4 `AppGroupRoundTripTests` cases passed (`Test BanterShared` step, `gh run view 28639232382 --log`). Same-process XCTest is the documented accepted Phase 1 bar (RESEARCH.md Open Questions #1); on-device cross-process proof is an explicitly documented deferral to Phase 5+, not a gap. |
| 3 | The network/send boundary only accepts structured text — there is no code path that transmits a raw image off-device | VERIFIED | `NetworkDTOs.swift`: `AnalyzeConversationRequest` has exactly two members, `messages: [ConversationMessage]` and `tone: ReplyStyle?` — no `Data`/`UIImage`/`CGImage`/`[UInt8]` member exists anywhere in the file (confirmed by direct read, not just grep). `NetworkBoundaryGuardTests.swift` reads the DTO source via `#filePath` and asserts none of `["UIImage", ": Data", "[UInt8]", "CGImage"]` appear. Independently confirmed on CI log: `testNetworkDTOsContainNoBinaryImagePayloadTokens` passed. |
| 4 | Shared model types (transcript, suggestion, sentiment event) are defined once and imported by both targets | VERIFIED | `ConversationMessage`, `ReplySuggestion`, `SentimentEvent` each declared exactly once in `BanterShared/Sources/BanterShared/Models/`. `BanterApp/ContentView.swift` and `BanterKeyboard/KeyboardViewController.swift` both `import BanterShared` and construct/read these types; direct read of both files confirms no local redeclaration of any model type or the `"group.com.banter.shared"` suite-name literal. |

**Score:** 4/4 roadmap success criteria verified.

### Plan-Level Must-Haves (17 truths across 4 plans)

All plan-level `must_haves.truths` (01-01 through 01-04) were checked directly against file contents on disk, not against SUMMARY.md claims:

| Plan | Truth | Status | Evidence |
|------|-------|--------|----------|
| 01-01 | banter/ is an independent git repo, separate from the monorepo | VERIFIED | `git status`/`git log` run from inside banter/ show its own independent history (root commit `5d196ab`...`e43d9b4` HEAD), on branch `main`. |
| 01-01 | origin remote points at the dedicated banter GitHub repo | VERIFIED | CI runs (`gh run view`) execute against `kish-jpg/banter` — the repo is live and receiving pushes; the run under verification (28639232382) is hosted there. |
| 01-01 | Xcode/SPM build artifacts are gitignored | VERIFIED | `.gitignore` on disk contains `.build/`, `DerivedData/`, `*.xcuserstate`, `.DS_Store`, `xcuserdata/`, `Banter.xcodeproj/`. |
| 01-02 | Three shared model types Codable+Equatable, single source of truth | VERIFIED | Direct read of `ConversationMessage.swift`, `ReplySuggestion.swift`, `SentimentEvent.swift` — each `public struct ... : Codable, Equatable`, `Speaker`/`ReplyStyle` enums declared exactly once. |
| 01-02 | AppGroupStore single suiteName + generic read/write | VERIFIED | `AppGroupStore.swift` — one `suiteName` constant, generic `write<T: Codable>`/`read<T: Codable>` over `UserDefaults(suiteName:)`, nil-safe. |
| 01-02 | NetworkDTOs structurally excludes binary payload | VERIFIED | See Success Criterion 3 above. |
| 01-02 | Round-trip test + guard test exist and pass | VERIFIED | Both test files read directly; CI log shows all 5 test cases passed. |
| 01-03 | project.yml declares both targets depending on BanterShared | VERIFIED | Direct read of `project.yml`. |
| 01-03 | Both targets carry identical App Group entitlement | VERIFIED | Direct read of both `.entitlements` files — identical `group.com.banter.shared` array. |
| 01-03 | BanterApp writes sample data via AppGroupStore | VERIFIED | Direct read of `ContentView.swift` — `writeSamples()` constructs and writes all three model types. |
| 01-03 | BanterKeyboard reads back what BanterApp wrote | VERIFIED | Direct read of `KeyboardViewController.swift` — `UIInputViewController` subclass, `AppGroupStore.read(ConversationMessage.self, forKey: "sample_message")` in `viewDidLoad`, displayed in a code-built `UILabel`. |
| 01-03 | Neither target redefines a model or suiteName literal | VERIFIED | Direct read of both files — imports `BanterShared` only, no local struct/enum/suiteName redeclaration. |
| 01-04 | CI workflow runs on push/PR on macos-26, installs XcodeGen, generates project, asserts entitlement survival | VERIFIED | Direct read of `ci.yml`. Independently confirmed executed and green via `gh run view 28639232382`. |
| 01-04 | Workflow builds both targets on iOS Simulator, no code signing | VERIFIED | `ci.yml` steps + CI log confirm both "Build BanterApp (simulator)" and "Build BanterKeyboard (simulator)" succeeded with `CODE_SIGNING_ALLOWED=NO`. |
| 01-04 | Full BanterShared test suite runs green in CI | VERIFIED | CI log: `Executed 5 tests, with 0 failures (0 unexpected)`. |
| 01-04 | Green CI run is the phase gate | VERIFIED | `gh run view 28639232382 --json conclusion,status` → `{"conclusion":"success","status":"completed"}`, independently queried in this verification (not taken from SUMMARY.md). |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `banter/.gitignore` | Xcode/SPM ignores | VERIFIED | Contains all required patterns plus research-cache exclusion. |
| `BanterShared/Package.swift` | Library + test target | VERIFIED | swift-tools-version 6.0, `BanterShared` library, `BanterSharedTests` test target, no external deps. |
| `BanterShared/Sources/BanterShared/Models/{ConversationMessage,ReplySuggestion,SentimentEvent}.swift` | Codable/Equatable models | VERIFIED | All three present, correct shape. |
| `BanterShared/Sources/BanterShared/AppGroupStore.swift` | Single suiteName + generic helpers | VERIFIED | Present, matches spec. |
| `BanterShared/Sources/BanterShared/NetworkDTOs.swift` | Structured-text-only request DTO | VERIFIED | Present, matches spec, no forbidden tokens. |
| `BanterShared/Tests/BanterSharedTests/{AppGroupRoundTripTests,NetworkBoundaryGuardTests}.swift` | Round-trip + guard tests | VERIFIED | Both present; both pass on CI. |
| `project.yml` | XcodeGen spec, 2 targets + BanterShared package + entitlements | VERIFIED | Present, matches spec exactly. |
| `BanterApp/{BanterAppApp.swift,ContentView.swift,Info.plist,BanterApp.entitlements}` | One-screen writer | VERIFIED | All present and correct. |
| `BanterKeyboard/{KeyboardViewController.swift,Info.plist,BanterKeyboard.entitlements}` | Placeholder reader | VERIFIED | All present and correct. |
| `.github/workflows/ci.yml` | GH Actions CI | VERIFIED | Present, matches spec; confirmed green via independent `gh` query. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `AppGroupStore.suiteName` | `BanterApp.entitlements` / `BanterKeyboard.entitlements` | identical string literal `group.com.banter.shared` | WIRED | Confirmed byte-identical across all three files by direct read. |
| `project.yml packages.BanterShared` | `BanterShared/Package.swift` | `path: BanterShared` | WIRED | Local package path resolves; both targets declare `dependencies: [{package: BanterShared}]`. |
| `BanterApp/ContentView.swift` write | App Group container | `AppGroupStore.write(_:forKey:)` | WIRED | Confirmed by direct read; CI build of BanterApp succeeded (compiles against real AppGroupStore API). |
| `BanterKeyboard/KeyboardViewController.swift` read | App Group container | `AppGroupStore.read(_:forKey:)` | WIRED | Confirmed by direct read; CI build of BanterKeyboard succeeded. |
| `NetworkBoundaryGuardTests.swift` | `NetworkDTOs.swift` | `#filePath`-relative navigation (3x `deletingLastPathComponent()`) | WIRED | Path navigation verified correct by direct read (matches actual directory depth: Tests/BanterSharedTests/ → Tests/ → BanterShared/); confirmed passing on CI (this exact bug was caught and fixed during plan 04 per SUMMARY, and the fix is present on disk and green on the cited CI run). |
| `.github/workflows/ci.yml` build/test steps | `Banter.xcodeproj` (generated) / `BanterShared` package | `xcodebuild -project Banter.xcodeproj -scheme ...` / `swift test --package-path BanterShared` | WIRED | Confirmed executed and passing via independent `gh run view` query — not taken from SUMMARY narration. |

### Behavioral Spot-Checks / Probe Execution

No Swift toolchain exists on this Windows verification machine (consistent with environment facts). Local `swift build`/`swift test`/`xcodebuild` cannot be run here. Per the environment facts, the phase's designed proof surface is CI on a macOS runner — this was independently re-queried (not trusted from SUMMARY.md) via:

```
gh run view 28639232382 --json conclusion,status,headSha,workflowName
→ {"conclusion":"success","headSha":"d1fcf44...","status":"completed","workflowName":"CI"}

gh run view 28639232382 --json jobs -q '.jobs[].steps[] | "\(.name): \(.conclusion)"'
→ all 13 steps: success

gh run view 28639232382 --log | grep -E "Test Case|Executed"
→ 5/5 individual test cases passed; "Executed 5 tests, with 0 failures (0 unexpected)"
```

This constitutes a genuine independent behavioral proof of the round-trip and CAPT-04 guard tests, not a restatement of the SUMMARY's claim.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| CAPT-04 | 01-02-PLAN.md | Raw screenshots never leave the device — only structured text is sent to the backend | SATISFIED | `NetworkDTOs.swift` structurally excludes binary payload types; `NetworkBoundaryGuardTests` enforces this at build time and passes on CI. REQUIREMENTS.md marks CAPT-04 `[x]` / "Complete" for Phase 1. No orphaned requirements — CAPT-04 is the only ID mapped to Phase 1 in REQUIREMENTS.md, and it is the only ID declared across all 4 plans' frontmatter. |

### Anti-Patterns Found

None. Scanned all source files under `BanterShared/`, `BanterApp/`, `BanterKeyboard/`, `project.yml`, `.github/` for `TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER` — zero matches. No empty-return stubs, no hardcoded-empty-data patterns, no console-log-only implementations. All files are small, complete, and match their plan specs exactly on direct read.

### Human Verification Required

None required to pass this phase. The following is a **documented, accepted deferral** (not a gap, and not routed to human verification since it is already resolved in RESEARCH.md/VALIDATION.md as an explicit Phase 1 scope boundary):

- **On-device, cross-process App Group round-trip**: Phase 1's round-trip test is same-process XCTest against `UserDefaults(suiteName:)` in a plain SwiftPM test target (no App Group entitlement attached to the test binary). Simulator entitlement enforcement is looser than real-device provisioning-profile enforcement. Real-device confirmation of the app-writes/keyboard-reads round trip under actual App Group sandboxing is deferred to Phase 5+ per RESEARCH.md and VALIDATION.md — this was a pre-agreed scope boundary for the walking skeleton, not an oversight.

### Gaps Summary

No gaps. All 4 roadmap Success Criteria are verified against actual file contents (not SUMMARY narration) and against an independently-reconfirmed green CI run (`28639232382`, re-queried directly via `gh`, not trusted from SUMMARY.md's citation of it). CAPT-04 is satisfied and traced with no orphaned requirements. The one known limitation (simulator vs. on-device App Group enforcement) is a pre-documented, deliberate deferral consistent with the phase's stated scope, not a failure to achieve the phase goal.

---

_Verified: 2026-07-03_
_Verifier: Claude (gsd-verifier)_
