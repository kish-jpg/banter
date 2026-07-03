---
phase: 02-screenshot-import-ocr-pipeline
plan: 04
subsystem: ui
tags: [swiftui, design-tokens, photospicker, dynamic-type, accessibility]

# Dependency graph
requires:
  - phase: 02-screenshot-import-ocr-pipeline (plan 01)
    provides: RecognizedLine, OCRPipeline.recognize(in:)
  - phase: 02-screenshot-import-ocr-pipeline (plan 02)
    provides: BubbleAttributor.attribute(_:), userSideXThreshold
  - phase: 02-screenshot-import-ocr-pipeline (plan 03)
    provides: PasteTextParser.parse(_:)
provides:
  - Banter design token namespace (Colors/Spacing/TextStyle/Radius) - FIRST design system, reused unchanged by Phase 4
  - Six color assets (background/surface/accent/destructive/textPrimary/textSecondary) with dark-canonical + light variants
  - ImportFlowModel - state machine (entry/parsing/confirm/failure) wiring OCRPipeline+BubbleAttributor and PasteTextParser to [ConversationMessage]
  - ImportEntryView, ParsingProgressView, ConfirmTranscriptView - the 3-screen MVP vertical slice
  - --seed-sample-transcript launch argument for plan 05's XCUITest screenshots
affects: [02-screenshot-import-ocr-pipeline (plan 05 - XCUITest screenshot artifacts depend on ConfirmTranscriptView + the seed launch arg), 04-* (Phase 4 extends Banter.* tokens, does not replace them)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Banter.* design token namespace (Colors/Spacing/TextStyle/Radius) as the single source of truth for all UI - no raw hex/point values in any view"
    - "Swift cannot have a type member literally named 'Type' (X.Type is a reserved metatype expression at the grammar level, unfixable via backticks) - the UI-SPEC's 'Banter.Type' token had to be renamed to 'Banter.TextStyle' in the actual code"
    - "ImportFlowModel is a single @Observable state machine consumed by all 3 screens via enum State (entry/parsing/confirm/failure) - both screenshot and paste entry paths converge on the same [ConversationMessage] before Confirm renders it"
    - "Confirm & Continue and Start Over are pure local-state mutations - no network call anywhere in this plan, preserving the CAPT-04 boundary"

key-files:
  created:
    - BanterApp/DesignSystem/BanterTokens.swift
    - BanterApp/DesignSystem/Assets.xcassets/Contents.json
    - BanterApp/DesignSystem/Assets.xcassets/BackgroundColor.colorset/Contents.json
    - BanterApp/DesignSystem/Assets.xcassets/SurfaceColor.colorset/Contents.json
    - BanterApp/DesignSystem/Assets.xcassets/AccentColor.colorset/Contents.json
    - BanterApp/DesignSystem/Assets.xcassets/DestructiveColor.colorset/Contents.json
    - BanterApp/DesignSystem/Assets.xcassets/TextPrimaryColor.colorset/Contents.json
    - BanterApp/DesignSystem/Assets.xcassets/TextSecondaryColor.colorset/Contents.json
    - BanterApp/DesignSystem/Assets.xcassets/AppIcon.appiconset/Contents.json
    - BanterApp/DesignSystem/Assets.xcassets/AppIcon.appiconset/icon-1024.png
    - BanterApp/Import/ImportFlowModel.swift
    - BanterApp/Import/ImportEntryView.swift
    - BanterApp/Import/ParsingProgressView.swift
    - BanterApp/Import/ConfirmTranscriptView.swift
  modified:
    - BanterApp/ContentView.swift

key-decisions:
  - "Banter.Type (UI-SPEC's literal token name) renamed to Banter.TextStyle in code - X.Type is a reserved Swift metatype expression at the parser level; even a backtick-escaped enum named `Type` compiles at its declaration site but every use site (Banter.`Type`.heading) still resolves to the metatype and fails with 'has no member'. Same values/roles, unavoidable rename."
  - "Added a placeholder 1024x1024 AppIcon.appiconset (not in original plan scope) - xcodebuild's actool invocation defaults to --app-icon AppIcon and hard-fails asset catalog compilation with zero AppIcon set anywhere in the project. Real branding icon is a later-phase concern; this only unblocks CI."
  - "ConfirmTranscriptView's Confirm & Continue and Start Over are pure local-state mutations - no network call, honoring CAPT-04's device boundary; Phase 3 owns the actual analysis call"

requirements-completed: [CAPT-01, CAPT-02, CAPT-03]

coverage:
  - id: D1
    description: "Banter design tokens (Colors/Spacing/TextStyle/Radius) exist with UI-SPEC-exact values, Dynamic Type text styles (never fixed point sizes), and six color assets with dark+light variants"
    requirement: "CAPT-01"
    verification:
      - kind: other
        ref: "grep -q 'enum Banter' BanterApp/DesignSystem/BanterTokens.swift; grep -q 'FF5C7A' BanterApp/DesignSystem/Assets.xcassets/*/*.json; grep -Eq 'largeTitle|title2|footnote' BanterApp/DesignSystem/BanterTokens.swift"
        status: pass
      - kind: other
        ref: "CI run 28653268129 (main, commit bc99a1c): 'Build BanterApp (simulator)' step green - BanterTokens.swift compiles against the full BanterApp target"
        status: pass
    human_judgment: false
  - id: D2
    description: "ImportEntryView offers PhotosPicker screenshot import and an inline paste-text fallback with exact UI-SPEC copy; loadTransferable nil/throw routes to paste fallback, never force-unwrapped"
    requirement: "CAPT-01"
    verification:
      - kind: other
        ref: "grep -q 'PhotosPicker' && grep -q 'Choose Screenshot' && grep -q 'loadTransferable' BanterApp/Import/ImportEntryView.swift"
        status: pass
      - kind: other
        ref: "CI run 28653268129: BanterApp build green"
        status: pass
    human_judgment: false
  - id: D3
    description: "ParsingProgressView shows an indeterminate spinner, path-aware heading, 'This stays on your device.' caption, and an OCR-failure state with Try Again / Paste Text Instead"
    requirement: "CAPT-01"
    verification:
      - kind: other
        ref: "grep -q 'This stays on your device' BanterApp/Import/ParsingProgressView.swift"
        status: pass
      - kind: other
        ref: "CI run 28653268129: BanterApp build green"
        status: pass
    human_judgment: false
  - id: D4
    description: "ConfirmTranscriptView: each message row has a tappable attribution chip (flips speaker, VoiceOver 'Speaker: You/Match' + 'Double tap to switch speaker') and a tappable bubble (inline text edit); Confirm & Continue disabled when transcript empty and makes no network call; Reduce Motion respected"
    requirement: "CAPT-02"
    verification:
      - kind: other
        ref: "grep -q 'Confirm & Continue' && grep -q 'Double tap to switch speaker' && grep -q 'isReduceMotionEnabled' BanterApp/Import/ConfirmTranscriptView.swift; grep -qE 'flipSpeaker|editText' BanterApp/Import/ImportFlowModel.swift"
        status: pass
      - kind: other
        ref: "CI run 28653268129: BanterApp build green"
        status: pass
    human_judgment: false
  - id: D5
    description: "Both the screenshot path (OCRPipeline+BubbleAttributor) and the paste-text path (PasteTextParser) converge on ImportFlowModel producing the same [ConversationMessage], rendered by ConfirmTranscriptView; --seed-sample-transcript pre-seeds a static transcript for plan 05's XCUITest"
    requirement: "CAPT-03"
    verification:
      - kind: other
        ref: "ImportFlowModel.swift: importScreenshot(_:) and parsePastedText(_:) both set state = .confirm with the same transcript type; seedSampleTranscriptArgument handling in init(arguments:)"
        status: pass
      - kind: other
        ref: "CI run 28653268129 (main, commit bc99a1c): full pipeline green - 'Build BanterApp (simulator)' + 'Test BanterShared' + 'Build BanterKeyboard (simulator)' all passed"
        status: pass
    human_judgment: true
    rationale: "Visual/interaction fidelity (chip flip animation, inline edit UX, layout against the UI-SPEC's exact spacing/color) cannot be confirmed without a real device or the plan-05 CI screenshot artifacts - CI here only proves compilation and the grep-level copy/token/accessibility contract, not pixel-level UI-SPEC compliance."

duration: 25min
completed: 2026-07-03
status: complete
---

# Phase 2 Plan 4: Banter Design Tokens + Import/Confirm UI Summary

**The three-screen MVP vertical slice (Import Entry, Parsing Progress, Confirm Transcript) wired through ImportFlowModel to OCRPipeline/BubbleAttributor/PasteTextParser, plus Banter's first design-token system — CI green after 3 fix-forward Swift/Xcode-toolchain iterations, none touching UI-SPEC fidelity**

## Performance

- **Duration:** 25 min
- **Started:** 2026-07-03T09:45:00Z
- **Completed:** 2026-07-03T10:03:44Z
- **Tasks:** 3 (all auto)
- **Files modified:** 15 (14 created, 1 modified across the 3 task commits + 3 fix-forward commits)

## Accomplishments

- `BanterTokens.swift` — the `Banter` namespace with `Colors` (Color asset references), `Spacing` (CGFloat constants, 4-64pt), `TextStyle` (Dynamic Type text styles: `.largeTitle`/`.title2`/`.body`/`.footnote`, never fixed point sizes), and `Radius` (8/12/16pt) — spec-exact values, the first design system in this project, reused unchanged by Phase 4
- Six color assets (`BackgroundColor`, `SurfaceColor`, `AccentColor`, `DestructiveColor`, `TextPrimaryColor`, `TextSecondaryColor`) each with dark-canonical + light variants matching the UI-SPEC's hex table exactly (accent `#FF5C7A` dark / `#E8405F` light, etc.)
- `ImportFlowModel` — `@Observable` state machine (`.entry`/`.parsing`/`.confirm`/`.failure`) wiring both entry paths to the same `[ConversationMessage]` output: `importScreenshot(_:)` runs `OCRPipeline.recognize` → `BubbleAttributor.attribute`, `parsePastedText(_:)` runs `PasteTextParser.parse`, both routing to `.failure` on empty/throw; `flipSpeaker(at:)`, `editText(at:to:)`, `startOver()`, `confirm()` are pure local-state mutations (no network call — CAPT-04 gate preserved); `--seed-sample-transcript` launch arg pre-seeds a static 3-message transcript straight into `.confirm` for plan 05's XCUITest
- `ImportEntryView` — Screen 1: title, SF Symbol illustration, "Choose Screenshot" via `PhotosPicker` + `loadTransferable(type: Data.self)` with explicit nil/throw handling routing to the paste fallback (Pitfall 4, never force-unwrapped), "Paste Text Instead" revealing an inline `TextEditor` + "Parse Text" CTA (disabled/50%-opacity until non-empty)
- `ParsingProgressView` — Screen 2: indeterminate circular `ProgressView` (accent tint), path-aware heading ("Reading your screenshot…" / "Splitting your conversation…"), "This stays on your device." caption, and the OCR-failure state (Try Again / Paste Text Instead)
- `ConfirmTranscriptView` — Screen 3 (CAPT-02 core): scrollable message list, each row an attribution chip (flip speaker, accent-15%-fill when selected, VoiceOver `"Speaker: You/Match"` + `"Double tap to switch speaker"`) and a message bubble (tap to edit inline, empty-after-edit removes the row, VoiceOver `"\(speaker): \(text)"`); sticky bottom bar with "Start Over" (destructive text + "Cleared. Undo" toast) and "Confirm & Continue" (disabled/50%-opacity when empty, no network call); empty-transcript state; Reduce Motion respected (crossfade instead of spring)
- `ContentView` rewritten as a `NavigationStack` driving `ImportFlowModel` through all three screens, replacing the Phase-1 sample writer entirely
- **CI CONFIRMED GREEN** (run [28653268129](https://github.com/kish-jpg/banter/actions/runs/28653268129), commit `bc99a1c`): `Build BanterApp (simulator)`, `Test BanterShared`, and `Build BanterKeyboard (simulator)` all passed — after 3 fix-forward iterations for Swift-language and Xcode-toolchain issues invisible without a real compiler (no local Mac/Swift toolchain on this machine)

## Task Commits

Each task was committed atomically:

1. **Task 1: Banter design tokens + color assets** — `c083823` (feat) — `BanterTokens.swift`, 6 color assets
2. **Task 2: ImportFlowModel + ImportEntryView + ParsingProgressView** — `d410946` (feat) — `ImportFlowModel.swift`, `ImportEntryView.swift`, `ParsingProgressView.swift`, `ContentView.swift`
3. **Task 3: ConfirmTranscriptView — flip/edit/confirm (CAPT-02 core)** — `2e2158d` (feat) — `ConfirmTranscriptView.swift`

Post-task CI fix-forward commits (all Rule 1/3 — found only once CI actually compiled the code, no local Swift toolchain exists to catch these pre-push):

4. `0867ba7` (fix) — escape `Banter.Type` with backticks (compiler's own suggested fix for the reserved metatype name) — turned out insufficient at use sites, superseded by commit 5
5. `72a33e7` (fix) — rename `Banter.Type` → `Banter.TextStyle` everywhere; backticks only fix the declaration, every `Banter.\`Type\`.x` use site still parses as the metatype expression and fails to compile
6. `bc99a1c` (fix) — add a placeholder 1024×1024 `AppIcon.appiconset`; `xcodebuild`'s default `actool` invocation requires an `AppIcon` set to exist somewhere in the project's asset catalogs, and none existed before this plan added the first `Assets.xcassets`

## Files Created/Modified

- `BanterApp/DesignSystem/BanterTokens.swift` — `Banter.Colors/Spacing/TextStyle/Radius`
- `BanterApp/DesignSystem/Assets.xcassets/*` — 6 color sets (dark+light) + `AppIcon.appiconset` (placeholder)
- `BanterApp/Import/ImportFlowModel.swift` — state machine, screenshot/paste entry, flip/edit/confirm mutations, seed launch arg
- `BanterApp/Import/ImportEntryView.swift` — Screen 1
- `BanterApp/Import/ParsingProgressView.swift` — Screen 2 (progress + failure states)
- `BanterApp/Import/ConfirmTranscriptView.swift` — Screen 3 (CAPT-02 core)
- `BanterApp/ContentView.swift` — NavigationStack driving the flow, replaces Phase-1 sample writer

## Decisions Made

- **`Banter.Type` renamed to `Banter.TextStyle` in code:** The UI-SPEC's literal token name (`Banter.Type`) is unrepresentable in Swift — `X.Type` is a reserved metatype expression at the grammar level, not a name-lookup ambiguity. Backticks fix the *declaration* (`enum \`Type\` {}` compiles) but every *use site* (`Banter.\`Type\`.heading`) still parses as `(Banter.Type).heading`, i.e. member access on the metatype, and fails with "has no member". Same values and roles as specified, only the enum's Swift identifier differs.
- **Placeholder `AppIcon.appiconset` added (not in original plan scope):** `xcodebuild build`'s `actool` invocation defaults to `--app-icon AppIcon`, and hard-fails asset-catalog compilation for the whole target if no `AppIcon` icon set exists anywhere in the project's asset catalogs — this is the first `Assets.xcassets` in the project, so nothing satisfied that requirement before this plan. A generated 1024×1024 solid-color placeholder (Python/PIL, same generation pattern as plans 01-02's fixture images) unblocks CI; real branding is a later-phase concern.
- **`confirm()` and `startOver()` as pure local-state mutations:** Per the plan's explicit instruction, Confirm & Continue only marks the transcript ready — no network call — preserving the CAPT-04 device boundary Phase 1 already guards structurally.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `Banter.Type` collides with Swift's reserved metatype expression**
- **Found during:** First CI run (28652573320) after all 3 tasks pushed
- **Issue:** `error: type member must not be named 'Type', since it would conflict with the 'foo.Type' expression` — Swift disallows a type member literally named `Type`.
- **Fix (attempt 1):** Escaped the declaration and all use sites with backticks per the compiler's own suggested fix.
- **Fix (attempt 2, superseded attempt 1):** Backticks fixed the declaration but not use sites — every `Banter.\`Type\`.x` still resolved to the metatype expression and failed with "has no member 'x'". Renamed the nested enum to `TextStyle` throughout (4 files).
- **Files modified:** `BanterTokens.swift`, `ConfirmTranscriptView.swift`, `ParsingProgressView.swift`, `ImportEntryView.swift`
- **Commits:** `0867ba7` (attempt 1), `72a33e7` (attempt 2, the actual fix)

**2. [Rule 3 - Blocking] Missing `AppIcon` icon set fails the entire asset-catalog compile**
- **Found during:** Third CI run (28653052698)
- **Issue:** `error: None of the input catalogs contained a matching ... icon set ... named "AppIcon"` — `xcodebuild`'s default build settings pass `--app-icon AppIcon` to `actool` regardless of whether any icon set exists; this plan added the project's first `Assets.xcassets`, so the requirement was previously moot.
- **Fix:** Added `AppIcon.appiconset` with a single 1024×1024 universal placeholder PNG (Python/PIL, accent/background color motif) — same generation approach as plans 01-02's fixture screenshots (this machine has no local Swift/Xcode toolchain to render one directly).
- **Files modified:** `BanterApp/DesignSystem/Assets.xcassets/AppIcon.appiconset/Contents.json`, `icon-1024.png`
- **Commit:** `bc99a1c`

---

**Total deviations:** 2 distinct auto-fixed issues (3 commits, since the first `Type` fix attempt was incomplete) — all Rule 1/3, all discovered only once CI actually invoked the real Swift compiler and `actool` (no local Mac/Xcode toolchain exists to catch these pre-push). Zero deviations required a plan-scope or UI-SPEC-fidelity change — both were narrow Swift-language/Xcode-toolchain corrections; all UI-SPEC token names, values, copy, and accessibility requirements were preserved exactly (aside from the one unavoidable Swift-identifier rename, documented above).
**Impact on plan:** No scope creep. `TextStyle` carries identical values/roles to the spec's `Type`; the AppIcon placeholder is purely a CI-unblocking artifact, not a product decision.

## Issues Encountered

Three CI iterations were needed to reach fully green (4 total pushes), all resolved via the deviations above. No issue indicated any problem with the OCR/attribution/paste pipeline from plans 01-03 — all three findings were incidental to authoring new SwiftUI/asset-catalog code without a local compiler to catch mechanical errors pre-push, consistent with the fix-forward pattern established in plan 01.

## User Setup Required

None — no external accounts, API keys, or manual configuration needed. PhotosUI and Vision are OS-bundled frameworks; no new external dependencies introduced.

## Next Phase Readiness

- **CAPT-01, CAPT-02, CAPT-03 are all UI-complete:** a user can go from a screenshot (or pasted text) through an on-device parsing screen to a confirmable, correctable transcript, entirely within `BanterApp` — CI confirms the whole target compiles and links against `BanterShared`'s OCR/attribution/paste pipeline from plans 01-03.
- **Banter.* design tokens are locked and ready for Phase 4** to extend (not replace) — `Colors`/`Spacing`/`TextStyle`/`Radius` are the only styling primitives used anywhere in this plan's views; no raw hex or fixed point size appears in any file.
- **`--seed-sample-transcript` is ready for plan 05's XCUITest** — `ImportFlowModel.init(arguments:)` reads it from `CommandLine.arguments` and seeds `.confirm` with a static 3-message sample, avoiding any need to drive the system `PhotosPicker` in CI.
- **Visual/pixel-level UI-SPEC fidelity is NOT verified by this plan's CI** — CI only proves compilation and grep-level copy/token/accessibility-string presence (no local device/Mac to screenshot against). Plan 05's CI screenshot artifacts are the mechanism for actual visual sign-off against 02-UI-SPEC.md's layout/spacing/color specs; treat this plan's "done" as functionally complete, visually unverified until then.
- No new blockers carried forward. STATE.md's existing `userSideXThreshold` real-screenshot-tuning blocker (from plan 02) remains open and unaffected by this plan.

---
*Phase: 02-screenshot-import-ocr-pipeline*
*Completed: 2026-07-03*
