---
phase: 02-screenshot-import-ocr-pipeline
reviewed: 2026-07-03T11:45:30Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - BanterShared/Sources/BanterShared/Import/RecognizedLine.swift
  - BanterShared/Sources/BanterShared/Import/OCRPipeline.swift
  - BanterShared/Sources/BanterShared/Import/BubbleAttributor.swift
  - BanterShared/Sources/BanterShared/Import/PasteTextParser.swift
  - BanterShared/Tests/BanterSharedTests/OCRPipelineTests.swift
  - BanterShared/Tests/BanterSharedTests/BubbleAttributorTests.swift
  - BanterShared/Tests/BanterSharedTests/PasteTextParserTests.swift
  - BanterApp/Import/ImportFlowModel.swift
  - BanterApp/Import/ImportEntryView.swift
  - BanterApp/Import/ParsingProgressView.swift
  - BanterApp/Import/ConfirmTranscriptView.swift
  - BanterApp/DesignSystem/BanterTokens.swift
  - BanterUITests/ScreenshotArtifactTests.swift
findings:
  critical: 1
  warning: 4
  info: 2
  total: 7
status: clean
resolved: 2026-07-03T11:58:00Z
resolutions:
  - id: CR-01
    status: fixed
    commit: a26633e
    note: "Wrapped --seed-sample-transcript launch-argument handling in #if DEBUG. CI's xcodebuild test (no -configuration flag) builds Debug by default, confirmed green post-fix — ScreenshotArtifactTests still reaches .confirm via the seeded transcript."
  - id: WR-01
    status: fixed
    commit: b714a96
    note: "Added State.entry(startInPasteMode:) and ImportFlowModel.pasteInsteadFromFailure(); ContentView/ImportEntryView now route the failure screen's Paste Text Instead CTA into paste mode instead of aliasing retryFromFailure()."
  - id: WR-02
    status: fixed
    commit: ad3453e
    note: "messageBubble's onTapGesture now commits any already-open row's edit via commitEdit(index:) before switching editingIndex to the newly-tapped row."
  - id: WR-03
    status: fixed
    commits: [c116927, d34804a]
    note: "Trim widened to .whitespacesAndNewlines (c116927), but CI caught a deeper issue the review guidance didn't surface: split(separator: \"\\n\") never matches CRLF input because Swift fuses \"\\r\\n\" into a single Character (extended grapheme cluster). Follow-up fix (d34804a) splits on CharacterSet.newlines membership instead, verified green by the new testWindowsLineEndingsDoNotLeakCarriageReturn regression test."
  - id: WR-04
    status: fixed
    commit: 9eef081
    note: "Case-folded deliveryStatusWords match (lowercased set + trimmed.lowercased() comparison) closes the differently-cased status-label leak. The one-word real-message false-negative risk (gap 2) is accepted and documented in a ponytail: comment with a named upgrade path (bubble-adjacency/position heuristic), per the review's own smallest-change guidance."
  - id: IN-01
    status: fixed
    commit: 263ae39
    note: "attribute(_:) now filters lines to finite x/y bounding-box origins before the descending-y sort, preventing an invalid strict-weak-ordering if Vision ever returned a non-finite value."
  - id: IN-02
    status: fixed
    commit: d3bccc4
    note: "Added BanterSharedTests coverage: testWindowsLineEndingsDoNotLeakCarriageReturn (WR-03), testNoiseWordMatchIsCaseInsensitive (WR-04), testNonFiniteBoundingBoxIsFilteredOut (IN-01). WR-01/WR-02 view-layer coverage skipped: ImportFlowModel/ConfirmTranscriptView have no XCTest-hosted target in this project (only BanterUITests), and the finding explicitly does not require new UI-test additions."
---

# Phase 2: Code Review Report

**Reviewed:** 2026-07-03T11:45:30Z
**Depth:** standard
**Files Reviewed:** 13
**Status:** clean (all findings resolved 2026-07-03T11:58:00Z, CI green: https://github.com/kish-jpg/banter/actions/runs/28659005985)

## Summary

CAPT-04 hold verified clean: no file in this phase's Import pipeline touches URLSession, networking, or any binary-payload boundary — `ImportFlowModel.confirm()` correctly stops at a local state transition with an explicit comment that Phase 3 owns the network call. Color tokens, spacing tokens, and radius tokens in `BanterTokens.swift` and the color assets were checked hex-by-hex against `02-UI-SPEC.md` and match exactly. ReDoS mitigation on both regexes (`BubbleAttributor.timeOfDayPattern`, `PasteTextParser.namePrefixPattern`) is real: both are anchored, bounded, and non-nested, and the guard-then-split logic in `PasteTextParser.matchNamePrefix` was traced against several adversarial inputs (long name, colons-only, empty-after-colon) without finding a case where the regex guard and the actual `split(separator:)` disagree.

The real defects found are three functional UI/UX-fidelity bugs that diverge from the phase's own UI-SPEC and PLAN documents, plus a data-hygiene bug in the paste parser and an unguarded debug backdoor in a shipping code path. None of these compromise CAPT-04, but they are real, reproducible bugs a user would hit, and none have test coverage that would have caught them.

## Critical Issues

### CR-01: Debug launch-argument bypass is not gated to non-Release builds

**File:** `BanterApp/Import/ImportFlowModel.swift:31-38`
**Issue:** `seedSampleTranscriptArgument` ("--seed-sample-transcript") is checked unconditionally in `init(arguments:)`, with no `#if DEBUG` guard. Any process that can launch the shipped app binary with this argument (TestFlight launch-argument tooling, Shortcuts-based automation, a jailbroken/sideloaded device, or any future CI/automation surface that reuses `CommandLine.arguments`) can force the app straight into `.confirm` state with a fixture transcript, skipping the entire OCR/paste/confirm flow. It's not a data leak on its own (the fixture is static, not user data), but shipping an unconditionally-active state-machine backdoor in a Release build is a real attack surface for anyone who wants to probe or manipulate app behavior via undocumented launch arguments, and it's the kind of thing that should never reach a production binary.
**Fix:**
```swift
init(arguments: [String] = CommandLine.arguments) {
    #if DEBUG
    if arguments.contains(Self.seedSampleTranscriptArgument) {
        transcript = Self.sampleTranscript
        state = .confirm
    }
    #endif
}
```
Note: `BanterUITests/ScreenshotArtifactTests.swift` relies on this argument in CI, which runs Debug builds by default (`xcodebuild test` without `-configuration Release`) — confirm that assumption holds, or gate on a build-time flag instead of `#if DEBUG` if CI ever runs a Release test configuration.

## Warnings

### WR-01: "Paste Text Instead" on the OCR-failure screen does not activate paste mode

**File:** `BanterApp/ContentView.swift:20-21`, `BanterApp/Import/ImportFlowModel.swift:106-108`, `BanterApp/Import/ImportEntryView.swift:11`
**Issue:** Per `02-UI-SPEC.md` ("Screen 2 — OCR Parsing Progress" failure state), the two failure-screen CTAs are "Try Again" (retry OCR) and "Paste Text Instead" (route directly to the paste-entry UI). In `ContentView`, both `onTryAgain` and `onPasteInstead` are wired to the exact same handler, `model.retryFromFailure()`, which only does `state = .entry`. `isPasteModeActive` is private `@State` local to `ImportEntryView`, defaulting to `false` on every fresh instantiation — there is no mechanism for "Paste Text Instead" to land the user in the paste-entry state described by the UI-SPEC. The user taps "Paste Text Instead," lands on the default screenshot-picker screen, and must tap "Paste Text Instead" a second time. The button does not do what its label promises.
**Fix:** Give `ImportFlowModel` a way to express "return to entry, but in paste mode" (e.g. add a `.entry(pasteMode: Bool)` associated value, or a separate `retryFromFailure()` / `pasteInsteadFromFailure()` pair), and have `ImportEntryView` read that instead of owning `isPasteModeActive` as pure local `@State` disconnected from the flow model:
```swift
// ImportFlowModel
enum State: Equatable {
    case entry(startInPasteMode: Bool = false)
    ...
}
func pasteInsteadFromFailure() {
    state = .entry(startInPasteMode: true)
}
```
```swift
// ContentView
case .entry(let startInPasteMode):
    ImportEntryView(model: model, startInPasteMode: startInPasteMode)
...
onPasteInstead: { model.pasteInsteadFromFailure() }
```

### WR-02: Uncommitted inline edit is silently discarded when switching rows

**File:** `BanterApp/Import/ConfirmTranscriptView.swift:126-129`
**Issue:** `messageBubble`'s `onTapGesture` unconditionally sets `editingText = message.text; editingIndex = index` for whichever row's bubble is tapped, with no check for whether another row is already mid-edit (`editingIndex != nil`). If the user starts editing message A, types a correction, then — without tapping the checkmark or dismissing the keyboard — taps message B's bubble instead, A's in-progress (uncommitted) text is silently overwritten by the switch to B's editing state, with no commit and no warning. Since `editingText` is plain local `@State` not synced back to the model until `commitEdit`, this is a real, reproducible loss of user-entered corrections within the same session.
**Fix:** Auto-commit the previously-open edit before opening a new one:
```swift
.onTapGesture {
    if let openIndex = editingIndex, openIndex != index {
        commitEdit(index: openIndex)
    }
    editingText = message.text
    editingIndex = index
}
```

### WR-03: `PasteTextParser` inconsistently trims whitespace, leaking `\r` into transcript text

**File:** `BanterShared/Sources/BanterShared/Import/PasteTextParser.swift:15,40`
**Issue:** Both the top-level line split (`.map { $0.trimmingCharacters(in: .whitespaces) }`) and the name/text split in `matchNamePrefix` (`.map { $0.trimmingCharacters(in: .whitespaces) }`) use `CharacterSet.whitespaces`, which does **not** include `\r`/`\n` (those live in `.whitespacesAndNewlines`/`.newlines`). `BubbleAttributor.isNoise` correctly uses `.whitespacesAndNewlines` for the equivalent trim, but `PasteTextParser` does not. Any pasted text with Windows-style `\r\n` line endings (common when copying from Notes, Mail, or Android/Windows-originated sources into iOS) retains a trailing `\r` on every parsed line, on every extracted name, and on every extracted message body — corrupting displayed message text with an invisible character and breaking `seenNames.contains(name)` dedup (e.g. `"Alex"` vs `"Alex\r"` compare as different names on lines with mixed line-ending origin).
**Fix:**
```swift
let lines = raw
    .split(separator: "\n", omittingEmptySubsequences: true)
    .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
    .filter { !$0.isEmpty }
...
let parts = line.split(separator: ":", maxSplits: 1).map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
```

### WR-04: Noise-word filter is exact-case and can silently drop real one-word messages

**File:** `BanterShared/Sources/BanterShared/Import/BubbleAttributor.swift:39,44`
**Issue:** `deliveryStatusWords = ["Delivered", "Read", "Today", "Yesterday"]` is matched via exact-case `Set.contains` against the trimmed line. Two distinct risks: (1) if Vision recognizes a differently-cased rendering of these words (theme/font variance, e.g. lowercase or all-caps status labels some apps use), the noise line is *not* filtered and leaks into the transcript as a fake message; (2) more importantly, a real message whose entire text is exactly one of these common words (e.g. a user's actual reply is just "Read" or "Today") is silently and permanently dropped by `isNoise` *before* it ever reaches the Confirm screen — unlike a wrong speaker-attribution (which the user can fix in the UI), a dropped noise line has no recovery path; the user never sees it to correct it.
**Fix:** At minimum, case-fold the comparison (`deliveryStatusWords.contains(trimmed.lowercased())` against a lowercased set) to close gap (1). For gap (2), consider requiring these words to appear in isolation *and* be excluded from the reading-order sort only when adjacent to a timestamp-shaped line, or accept and document the tradeoff explicitly (currently undocumented) since a bounded heuristic is reasonable for v1 but the false-negative risk on one-word real messages should at least be a known, written-down tradeoff rather than silent.

## Info

### IN-01: `BubbleAttributor.attribute` has no defensive handling for non-finite bounding-box values

**File:** `BanterShared/Sources/BanterShared/Import/BubbleAttributor.swift:25`
**Issue:** `lines.sorted { $0.boundingBox.origin.y > $1.boundingBox.origin.y }` assumes all `origin.y` values are finite, well-formed floats in `0...1` (as Vision's contract and the test suite assert). If a malformed/adversarial `CGImage` or a Vision framework regression ever produced a `NaN` bounding box, the comparator becomes an invalid strict-weak-ordering, which is documented as undefined behavior for Swift's `sorted(by:)` (unspecified order, not a guaranteed crash). Low likelihood given Vision's documented contract, but worth a cheap guard given this is exactly the kind of pipeline where "trust the framework's contract" pitfalls have already bitten this phase once (see OCRPipeline's `NormalizedRect` vs `CGRect` fix noted in 02-01-SUMMARY.md).
**Fix:** Filter or clamp non-finite values defensively before sorting, e.g. `lines.filter { $0.boundingBox.origin.y.isFinite && $0.boundingBox.origin.x.isFinite }` at the top of `attribute(_:)`.

### IN-02: No test exercises the three functional bugs found above

**File:** `BanterShared/Tests/BanterSharedTests/PasteTextParserTests.swift`, `BanterUITests/ScreenshotArtifactTests.swift`
**Issue:** None of the existing test files exercise `\r\n` line-ending input (WR-03), the "Paste Text Instead" routing from the failure screen (WR-01), or switching between two rows mid-edit on the Confirm screen (WR-02). All three bugs would ship silently; CI stayed green through all of them.
**Fix:** Add `PasteTextParserTests.testWindowsLineEndingsDoNotLeakCarriageReturn()` asserting no message text or name contains `"\r"` for `\r\n`-joined input; add a Confirm-screen unit test (via `ImportFlowModel` directly, not XCUITest) that verifies `flipSpeaker`/`editText` don't require a UI harness. WR-01 is best caught via a lightweight XCUITest or, more cheaply, by adding a distinguishable `ImportFlowModel.State` case (per the WR-01 fix) that a unit test can assert on directly instead of only being observable through the view layer.

---

_Reviewed: 2026-07-03T11:45:30Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
