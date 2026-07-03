---
phase: 02-screenshot-import-ocr-pipeline
plan: 03
subsystem: shared-package
tags: [swift, regex, redos, string-processing]

# Dependency graph
requires:
  - phase: 02-screenshot-import-ocr-pipeline (plan 01)
    provides: ConversationMessage/Speaker models, macOS 15 + iOS 18 platform floors
provides:
  - PasteTextParser.parse(_:) - raw String -> [ConversationMessage], the CAPT-03 paste fallback
affects: [02-screenshot-import-ocr-pipeline (plan 04 - confirm UI consumes this [ConversationMessage] output identically to BubbleAttributor's)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "PasteTextParser is a pure enum (no UI/platform dependency) - testable in-memory with plain strings, no fixture needed, matching BubbleAttributor's testability pattern from plan 02."
    - "Anchored, length-bounded regex (no nested quantifiers) is the ReDoS mitigation pattern carried forward from BubbleAttributor's noise filter - same convention, second instance."

key-files:
  created:
    - BanterShared/Sources/BanterShared/Import/PasteTextParser.swift
    - BanterShared/Tests/BanterSharedTests/PasteTextParserTests.swift
  modified: []

key-decisions:
  - "First distinct speaker name in prefix-pattern paste text defaults to .match (not .user) - matches RESEARCH.md Pattern 3 and Assumptions Log A2; the confirm screen (plan 04) is the correctness net for a wrong guess, not this parser."
  - "matchNamePrefix rejects a match if either split part is empty (e.g. a colons-only line) rather than emitting an empty-text message - falls through to the alternating fallback instead, keeping every output message non-empty and editable."

requirements-completed: [CAPT-03]

coverage:
  - id: D1
    description: "Name-prefixed paste text (\"Name: message\") is parsed into [ConversationMessage] with first distinct name -> .match, subsequent distinct name -> .user, split on the first colon, sequential order"
    requirement: "CAPT-03"
    verification:
      - kind: unit
        ref: "PasteTextParserTests.swift#testNamePrefixAttributesFirstNameToMatchAndSecondToUser"
        status: pass
    human_judgment: false
  - id: D2
    description: "Unpatterned paste text (no Name: prefix) falls back to naive per-line speaker alternation, never crashes, one message per non-empty line"
    requirement: "CAPT-03"
    verification:
      - kind: unit
        ref: "PasteTextParserTests.swift#testUnpatternedLinesAlternateAndNeverCrash"
        status: pass
    human_judgment: false
  - id: D3
    description: "Empty string input returns an empty array; whitespace-only lines are skipped entirely"
    requirement: "CAPT-03"
    verification:
      - kind: unit
        ref: "PasteTextParserTests.swift#testEmptyStringReturnsEmptyArray"
        status: pass
      - kind: unit
        ref: "PasteTextParserTests.swift#testWhitespaceOnlyLinesAreSkipped"
        status: pass
    human_judgment: false
  - id: D4
    description: "Adversarial input (a single line >10000 chars with no newlines, a line of only colons) never crashes and always yields non-empty editable output - the V5/ReDoS mitigation proof"
    requirement: "CAPT-03"
    verification:
      - kind: unit
        ref: "PasteTextParserTests.swift#testAdversarialLongSingleLineNoNewlinesDoesNotCrash"
        status: pass
      - kind: unit
        ref: "PasteTextParserTests.swift#testAdversarialColonsOnlyLineDoesNotCrash"
        status: pass
      - kind: other
        ref: "CI run 28651882682 (main, commit a695420): 'Test BanterShared' step green, all 16 tests passed including all 6 PasteTextParserTests"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-07-03
status: complete
---

# Phase 2 Plan 3: PasteTextParser Summary

**Paste-text fallback parser turning raw chat text into the same [ConversationMessage] transcript BubbleAttributor produces, with an anchored/length-bounded ReDoS-safe prefix regex and a crash-proof alternating fallback — CI green on the first push, all 6 new tests passing**

## Performance

- **Duration:** 8 min
- **Tasks:** 1 (auto, tdd="true")
- **Files created:** 2 (PasteTextParser.swift, PasteTextParserTests.swift)
- **Files modified:** 0

## Accomplishments

- `PasteTextParser.parse(_:)` — splits pasted text on newlines (trimming, dropping empties), tries an anchored `^([\w\s]{1,20}):\s*(.+)$` prefix match per line, tracks distinct speaker names in first-seen order (first → `.match`, others → `.user`), and falls back to naive per-line alternation (`.match`/`.user` by index) when no prefix matches — every non-empty line always becomes exactly one `ConversationMessage`, never a crash
- Regex is the same ReDoS-safe shape established by `BubbleAttributor` in plan 02: anchored, name-group bounded to 20 chars, no nested quantifiers — satisfies threat `T-02-05`
- No force-unwraps anywhere in the parsing path (`matchNamePrefix` returns `nil` on any ambiguous split, e.g. a colons-only line with empty name/text parts) — satisfies threat `T-02-06`
- `PasteTextParserTests` — 6 unit tests: name-prefix attribution (first→match, second→user, split-on-first-colon, sequential order), unpatterned alternation, empty-string→empty-array, whitespace-only-lines-skipped, and two adversarial-input crash-safety cases (20,000-char single line with no newlines; 5,000-char colons-only line)
- **CI CONFIRMED GREEN on the first push** (run [28651882682](https://github.com/kish-jpg/banter/actions/runs/28651882682), commit `a695420`): all 16 tests in `BanterSharedTests` passed, including all 6 new `PasteTextParserTests` — zero fix-forward iterations needed

## Task Commits

Each task was committed atomically:

1. **Task 1: PasteTextParser — prefix-pattern parsing with alternating fallback** — `a695420` (feat) — `PasteTextParser.swift`, `PasteTextParserTests.swift`

_Note: Source and test were authored together per task (no local Swift toolchain on this Windows machine), with the real RED-then-GREEN proof happening via CI compilation and test execution — consistent with plans 01 and 02's established pattern. CI went green on the very first push with zero fix-forward commits required._

## Files Created/Modified

- `BanterShared/Sources/BanterShared/Import/PasteTextParser.swift` — `parse(_:)`, private `matchNamePrefix` helper
- `BanterShared/Tests/BanterSharedTests/PasteTextParserTests.swift` — 6 tests: prefix attribution, alternating fallback, empty input, whitespace skipping, and two adversarial-input cases

## Decisions Made

- **First distinct name → `.match`, not `.user`:** Matches RESEARCH.md Pattern 3's example and Assumptions Log entry A2 exactly. The confirm screen (plan 04) is the intended correctness net for a wrong first-speaker guess, not this parser's job to get right.
- **Ambiguous splits (e.g. colons-only lines) are treated as non-matches, not empty-text messages:** `matchNamePrefix` explicitly rejects a split where either the name or text part is empty, falling through to the alternating fallback so every output message always has non-empty, editable text.
- **No project.yml changes needed:** SPM auto-discovers new test files under `BanterShared/Tests/BanterSharedTests/`, matching plan 02's pattern — no target registration required for pure-Swift-package additions.

## Deviations from Plan

None — plan executed exactly as written. No Rule 1/2/3 auto-fixes were needed; CI passed on the first push.

## Issues Encountered

None. Consistent with plan 02 (BubbleAttributor), this plan's CI run went green immediately — the carry-forward iOS 18 + macOS 15 platform floors from plans 01/02 already covered this plan's pure-stdlib code, and no new OS-versioned API surface was introduced.

## User Setup Required

None — no external accounts, API keys, or manual configuration needed.

## Next Phase Readiness

- `PasteTextParser.parse(_:)` is ready for plan 04's confirm/correct UI to consume directly, producing the identical `[ConversationMessage]` type `BubbleAttributor.attribute(_:)` produces (plan 02) — both import paths converge on the same confirm screen with no type mismatch.
- CAPT-03 is now fully covered: the paste-text fallback exists and is proven crash-proof against the adversarial inputs named in the phase's threat model (T-02-05 ReDoS, T-02-06 force-unwrap-on-malformed-input).
- No new blockers introduced. Plan 04 (confirm/correct UI, depends on both plan 02 and plan 03) can now proceed — both of its upstream dependencies are complete.

---
*Phase: 02-screenshot-import-ocr-pipeline*
*Completed: 2026-07-03*

## Self-Check: PASSED

- FOUND: BanterShared/Sources/BanterShared/Import/PasteTextParser.swift
- FOUND: BanterShared/Tests/BanterSharedTests/PasteTextParserTests.swift
- FOUND: commit a695420
