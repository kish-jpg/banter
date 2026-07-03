# Phase 2: Screenshot Import & OCR Pipeline - Research

**Researched:** 2026-07-03
**Domain:** iOS on-device OCR (Vision framework), SwiftUI photo picking, chat-bubble attribution heuristics, headless CI screenshot/test artifacts
**Confidence:** MEDIUM-HIGH (Apple platform APIs = HIGH, sourced from developer.apple.com and WWDC; bubble-attribution accuracy figures and CI Vision-in-simulator behavior = MEDIUM, practitioner-sourced, no first-party benchmark found)

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CAPT-01 | User can upload a chat screenshot and have it parsed on-device (Vision OCR) into a structured transcript | Vision API choice (§Standard Stack), bubble-attribution heuristic (§Pattern 2), PhotosPicker import (§Pattern 1) |
| CAPT-02 | Parsed transcript attributes each message to user or match, and user can confirm/correct it before analysis | Attribution heuristic + confidence signal (§Pattern 2), confirm/edit UI data shape reusing `ConversationMessage`/`Speaker` (§Architecture) |
| CAPT-03 | User can paste conversation text as a fallback context path | Paste-text parser (§Pattern 3) feeding the same `[ConversationMessage]` → confirm screen |
</phase_requirements>

## Summary

This phase turns a screenshot (or pasted text) into an editable `[ConversationMessage]` transcript — the exact shared model Phase 1 already defined in `BanterShared/Sources/BanterShared/Models/ConversationMessage.swift`. No new external dependency is required: OCR is the OS-bundled Vision framework, photo import is OS-bundled PhotosUI, and paste parsing is pure Swift string processing. The only real engineering risk is the bubble-attribution heuristic (mapping OCR bounding boxes to "user" vs "match") — it is inherently approximate across Tinder/Hinge/Bumble/WhatsApp/iMessage layouts, which is exactly why CAPT-02's confirm/correct step is a hard requirement, not a nice-to-have.

A genuine version conflict surfaced during research: Apple's new Swift-native Vision API, `RecognizeTextRequest`, requires iOS 18+, but `BanterShared/Package.swift` and `project.yml` currently target iOS 17.0 (set in Phase 1). The planner must make an explicit decision here — either bump the deployment target to iOS 18 to use the modern API, or use the older `VNRecognizeTextRequest` (available iOS 13+, fully supported through iOS 26) to preserve iOS 17 compatibility. Given this project has no real users yet and the CI/simulator toolchain is already iOS 26, bumping to iOS 18 costs little in practice — but this is a locked-decision-shaped question, not something to silently decide.

Vision text recognition works in the iOS Simulator against static images (confirmed via multiple practitioner sources) — the "camera-only" limitation that sometimes gets cited for Vision applies to live capture requests (live camera OCR, body pose from a camera feed), not to running `VNRecognizeTextRequest`/`RecognizeTextRequest` against a bundled test-fixture image. This unblocks the phase's CI-only constraint: OCR pipeline tests can run for real against fixture screenshots on the macos-26 runner's simulator, no physical device needed.

**Primary recommendation:** Do OCR + bubble-attribution + paste-parsing entirely in `BanterShared` (testable via `swift test`, no simulator boot required for the parsing logic itself), keep `PhotosPicker` + the confirm/edit UI in `BanterApp`, and add a `Fixtures/` folder of synthetic rendered chat-screenshot PNGs to `BanterShared/Tests/BanterSharedTests/` so OCR accuracy is asserted in every CI run instead of only manually. For the user-requested CI screenshot artifact, use an XCUITest target with `XCTAttachment(screenshot:)` + `.keepAlways` lifetime uploaded via `actions/upload-artifact@v4` — this is the standard, low-effort pattern and avoids hand-rolling simctl scripting.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Screenshot selection (photo picker) | Companion App (SwiftUI) | — | `PhotosPicker` is a SwiftUI view; must live in the app target, not the extension (extension has no photo-library access at all, per Phase 1 ARCHITECTURE.md) |
| OCR (text + bounding boxes) | BanterShared (framework) | Companion App (invocation only) | Pure Swift/Vision logic with no UI dependency — belongs in the shared, unit-testable package per the existing project structure (`BanterShared/Sources/BanterShared/`) so it's testable via `swift test` without a simulator boot |
| Bubble-attribution heuristic | BanterShared (framework) | — | Deterministic geometry logic (bounding-box x-position/alignment → speaker), no UI or platform dependency beyond `CGRect` — same testability argument as OCR |
| Paste-text parser | BanterShared (framework) | — | Pure string-processing logic, same testability argument |
| Confirm/correct transcript UI (flip attribution, edit text) | Companion App (SwiftUI) | — | User-facing interactive UI; consumes/produces `[ConversationMessage]` values that BanterShared defines |
| CI screenshot artifacts | CI / Build tooling | Companion App (XCUITest target) | Not a runtime capability — a developer-tooling deliverable requested for this phase; lives in a new UI test target + workflow step, not app logic |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vision framework (`RecognizeTextRequest` or `VNRecognizeTextRequest`) | OS-bundled (iOS 18+ / iOS 13+ respectively) | On-device OCR: recognize text + per-line bounding boxes from a chat screenshot | Apple's only on-device OCR API; zero network, zero cost, matches Phase 1's CAPT-04 "raw screenshots never leave device" boundary — OCR must run before anything crosses the network boundary `[CITED: developer.apple.com/documentation/vision/recognizetextrequest]` |
| PhotosUI `PhotosPicker` (SwiftUI) | OS-bundled (iOS 16+) | Screenshot import UI | Runs out-of-process from the app; app never gets broad photo-library access, only the specific image(s) the user picks — no `NSPhotoLibraryUsageDescription` prompt needed at all for the picker itself `[CITED: developer.apple.com/documentation/photokit/bringing-photos-picker-to-your-swiftui-app]` |
| `Transferable` / `PhotosPickerItem.loadTransferable(type: Data.self)` | OS-bundled | Load the picked image's raw bytes, then construct `UIImage`/`CGImage` for Vision | Standard PhotosUI pattern; loading as `Data` first (not `Image` directly) is the safer path when you also need a `CGImage` for Vision `[CITED: hackingwithswift.com/quick-start/swiftui/how-to-let-users-select-pictures-using-photospicker]` |
| Swift `String` APIs (`split`, regex via `Regex`/`NSRegularExpression`) | stdlib | Paste-text fallback parsing | No parsing library needed — line-splitting + a small prefix-pattern check (`"Name:"` style) is a few dozen lines of stdlib string work, not a dependency-worthy problem |
| XCTest / XCUITest | OS-bundled (Xcode) | OCR fixture tests (BanterShared) + CI screenshot artifacts (app-level UI test) | Already the project's test runner (`swift test` for BanterShared per Phase 1); XCUITest is the only supported way to drive and screenshot a running app in CI |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `XCTAttachment` | OS-bundled | Persist a captured `XCUIScreen.main.screenshot()` into the `.xcresult` bundle with `.keepAlways` lifetime | Only needed for the CI-screenshot-artifact deliverable, not for OCR itself |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| On-device Vision OCR | Cloud OCR (Google Cloud Vision, AWS Textract) | Already rejected in project-level STACK.md — violates CAPT-04 (raw screenshots must never leave device) as the default path; only worth revisiting as a low-confidence fallback later, not this phase |
| `RecognizeTextRequest` (new Swift API, iOS 18+) | `VNRecognizeTextRequest` (iOS 13+) | New API has cleaner async/await ergonomics and Swift Concurrency integration, but forces a deployment-target bump from iOS 17 → iOS 18. Old API works identically for this use case (chat-screenshot OCR is not performance-critical) and preserves the current iOS 17 target. **This is a decision the planner must surface, not silently resolve** — see Pitfall 1 |
| Hand-rolled bubble-attribution model | ML-based layout classifier (e.g., a trained CoreML model per dating-app skin) | Overkill for MVP — no training data exists yet, and the product's own confirm/correct UX (CAPT-02) is the intentional safety net for heuristic imperfection. Revisit only if user-reported attribution errors are frequent post-launch |
| XCUITest screenshot attachments | Raw `xcrun simctl io booted screenshot` shell scripting in CI | XCUITest + `XCTAttachment` is the Apple-blessed pattern, integrates with the existing `xcodebuild test`/`.xcresult` flow, and gives named, organized screenshots per test step. Raw `simctl io screenshot` requires manually scripting app launch, waiting for UI settle, and file naming — more code for a worse result. Only reach for raw `simctl` if a screenshot is needed *outside* any test context (e.g., screenshotting a crash state) |

**Installation:**
```bash
# No new external packages. Everything in this phase is:
# - OS-bundled frameworks (Vision, PhotosUI, XCTest)
# - Swift stdlib (String, Regex)
# - Additions to the existing BanterShared local SPM package (Package.swift already exists, no new dependencies section needed)
```

**Version verification:** No package registry lookups apply — this phase adds zero third-party packages. The only version fact requiring verification is Vision API availability, confirmed via Apple's own documentation and community WWDC24/25 coverage: `RecognizeTextRequest` requires iOS 18+; `VNRecognizeTextRequest` has been stable since iOS 13 and remains fully supported on iOS 26 `[CITED: developer.apple.com/documentation/vision/recognizetextrequest]`.

## Package Legitimacy Audit

**Not applicable this phase** — no external (npm/CocoaPods/SPM third-party) packages are introduced. All APIs used are Apple OS-bundled frameworks (Vision, PhotosUI, XCTest) or Swift stdlib. The Package Legitimacy Gate is skipped per its own trigger condition ("every phase that installs external packages").

## Architecture Patterns

### System Architecture Diagram

```
User taps "Import Screenshot" or "Paste Text"  (BanterApp UI)
        │
        ├─ Screenshot path ────────────────────────────────────┐
        │   PhotosPicker (SwiftUI, out-of-process,             │
        │   no permission prompt)                               │
        │        │                                              │
        │        ▼                                              │
        │   PhotosPickerItem.loadTransferable(Data.self)         │
        │        │                                              │
        │        ▼                                              │
        │   UIImage/CGImage constructed in BanterApp             │
        │        │                                              │
        │        ▼                                              │
        │   BanterShared.OCRPipeline.recognize(image:)           │
        │     - Vision request (RecognizeTextRequest or          │
        │       VNRecognizeTextRequest) → [text line + bbox]     │
        │        │                                              │
        │        ▼                                              │
        │   BanterShared.BubbleAttributor.attribute(lines:)      │
        │     - group lines into bubbles (vertical-gap +         │
        │       x-alignment clustering)                          │
        │     - classify each bubble left/right → match/user     │
        │     - drop noise (timestamps, "Delivered", headers)     │
        │        │                                              │
        │        ▼                                              │
        │   [ConversationMessage] (speaker, text, order)          │
        │                                                        │
        ├─ Paste-text path ─────────────────────────────────────┤
        │   User pastes raw chat text into a TextEditor           │
        │        │                                              │
        │        ▼                                              │
        │   BanterShared.PasteTextParser.parse(raw:)              │
        │     - split on newlines                                 │
        │     - detect "Name:" prefix pattern → speaker guess      │
        │     - fallback: alternate speaker per line if no          │
        │       prefix pattern found                                │
        │        │                                              │
        │        ▼                                              │
        │   [ConversationMessage] (speaker, text, order)          │
        │                                                        │
        ▼ (both paths converge here) ◄──────────────────────────┘
   BanterApp: Confirm/Correct screen
     - renders each ConversationMessage as an editable row
     - tap to flip speaker (user ⇄ match)
     - tap to edit text inline
     - "Looks good" → hands [ConversationMessage] to Phase 3's
       analysis pipeline (NOT built this phase — stop here)
```

### Recommended Project Structure

```
BanterShared/
├── Sources/BanterShared/
│   ├── Models/
│   │   └── ConversationMessage.swift      # EXISTING (Phase 1) — reused, not modified
│   ├── Import/                             # NEW this phase
│   │   ├── OCRPipeline.swift               # Vision request wrapper → [RecognizedLine]
│   │   ├── BubbleAttributor.swift          # [RecognizedLine] → [ConversationMessage]
│   │   └── PasteTextParser.swift           # raw String → [ConversationMessage]
│   └── AppGroupStore.swift                 # EXISTING — unchanged
└── Tests/BanterSharedTests/
    ├── Fixtures/                            # NEW — synthetic rendered chat screenshots
    │   ├── imessage_sample.png
    │   ├── whatsapp_sample.png
    │   └── generic_two_column_sample.png
    ├── OCRPipelineTests.swift               # NEW — asserts Vision recognizes fixture text
    ├── BubbleAttributorTests.swift          # NEW — asserts bbox→speaker classification
    └── PasteTextParserTests.swift           # NEW — asserts "Name:" pattern parsing

BanterApp/
├── Import/                                  # NEW this phase
│   ├── ScreenshotImportView.swift           # PhotosPicker + image load
│   ├── PasteTextView.swift                  # TextEditor + parse trigger
│   └── ConfirmTranscriptView.swift          # editable transcript, flip/edit, confirm button
└── ContentView.swift                        # EXISTING (Phase 1 sample writer) — wire in a real entry point

BanterUITests/                               # NEW — CI screenshot artifact target (user-requested deliverable)
└── ScreenshotArtifactTests.swift            # navigates key screens, XCTAttachment(.keepAlways) each
```

### Pattern 1: PhotosPicker → Data → CGImage, no permission prompt

**What:** Use SwiftUI's `PhotosPicker` bound to a `PhotosPickerItem?`, then `loadTransferable(type: Data.self)` to get raw bytes, then construct a `UIImage`/`CGImage` for Vision. No `NSPhotoLibraryUsageDescription` key needed in Info.plist for this flow because the picker runs out-of-process — the app only ever receives the one image the user explicitly chose.
**When to use:** All screenshot import in this phase. Do not use the older `UIImagePickerController` or `PHPickerViewController` (UIKit) — `PhotosPicker` is the modern SwiftUI-native equivalent and is what STACK.md's project-level research already implies by specifying SwiftUI as the default UI layer.
**Example:**
```swift
// Source: pattern per developer.apple.com/documentation/photokit/bringing-photos-picker-to-your-swiftui-app
// and hackingwithswift.com/quick-start/swiftui/how-to-let-users-select-pictures-using-photospicker
import PhotosUI
import SwiftUI

struct ScreenshotImportView: View {
    @State private var selectedItem: PhotosPickerItem?
    @State private var uiImage: UIImage?

    var body: some View {
        PhotosPicker(selection: $selectedItem, matching: .images) {
            Text("Import Screenshot")
        }
        .onChange(of: selectedItem) { _, newItem in
            Task {
                guard let data = try? await newItem?.loadTransferable(type: Data.self) else { return }
                uiImage = UIImage(data: data)
            }
        }
    }
}
```

### Pattern 2: Bubble-attribution via bounding-box x-alignment clustering

**What:** Vision returns per-line text + a normalized bounding box (`boundingBox: CGRect`, origin bottom-left, values 0-1 relative to image size — this is true for both `VNRecognizedTextObservation` and the new `RecognizedTextObservation`). Group adjacent lines into "bubbles" using vertical-gap thresholds (a large vertical gap between two lines' `y` ranges signals a new bubble), then classify each bubble's horizontal side by comparing its bounding box's leading-edge x-position against the image midpoint (or, more robustly, against a running median of both clusters seen so far, since screenshots are rarely a perfect 50/50 split). Left-aligned bubbles are conventionally the *other person* (match); right-aligned are the *user* — this is the near-universal convention across iMessage, WhatsApp, Tinder, Hinge, and Bumble.
**When to use:** Always as the primary attribution signal. Treat background-color sampling (e.g., blue vs gray bubble fill) as a secondary/future signal, not required for MVP — x-alignment alone is the dominant signal every reviewed messaging UI relies on.
**Known variance across apps (why the confirm step is the safety net):**
- **iMessage/WhatsApp:** Clean two-column bubble layout, x-alignment heuristic is highly reliable.
- **Tinder/Hinge/Bumble:** Similar two-column convention, but timestamps, "seen"/"delivered" status text, match-name headers, and system messages ("You matched with...") appear as extra lines that are *not* conversation content and must be filtered as noise — typically by filtering out lines that are very short, centered (neither clearly left nor right), or match known boilerplate patterns (regex for "Delivered", time-of-day strings like "2:14 PM", "Today", "Yesterday").
- **Typing indicators / reaction stickers:** Rendered as small graphical elements Vision either won't OCR at all (no text) or will OCR as garbage from adjacent UI chrome — treat any recognized line with very low confidence or non-text-like content as noise to drop, not to force into the transcript.
- **Realistic accuracy expectation:** `[ASSUMED]` — no first-party benchmark exists for cross-app bubble attribution; treat 80-90% correct-attribution-on-first-parse as a reasonable MVP target for clean native screenshots, dropping lower for cropped/rotated/multi-screenshot-stitched imports. This is exactly why CAPT-02 (user confirm/correct) is a *hard requirement*, not a UX nicety — the product must never present an unconfirmed transcript to the reply-generation pipeline in Phase 3.
**Example:**
```swift
// Source: pattern derived from VNRecognizedTextObservation.boundingBox semantics
// (developer.apple.com/documentation/vision/vnrecognizedtextobservation)
struct RecognizedLine {
    let text: String
    let boundingBox: CGRect  // normalized, origin bottom-left, 0...1
}

enum BubbleAttributor {
    static func attribute(_ lines: [RecognizedLine]) -> [ConversationMessage] {
        // 1. Sort lines top-to-bottom (Vision's boundingBox.origin.y is bottom-left,
        //    so sort descending by y to get reading order).
        let sorted = lines.sorted { $0.boundingBox.origin.y > $1.boundingBox.origin.y }

        // 2. Filter obvious noise lines (timestamps, delivery receipts, empty/short centered text).
        let content = sorted.filter { !isNoise($0) }

        // 3. Cluster into bubbles by vertical gap, then classify each cluster's side
        //    by comparing its minimum leading-edge x against 0.5 (image midpoint).
        //    A leading edge < 0.35 → match (left); > 0.5 → user (right, or your
        //    convention — this MUST match whatever the confirm UI's "flip" button
        //    labels as default, and should be a documented constant, not a magic number).
        var result: [ConversationMessage] = []
        var order = 0
        for line in content {
            let speaker: Speaker = line.boundingBox.origin.x < 0.35 ? .match : .user
            result.append(ConversationMessage(speaker: speaker, text: line.text, order: order))
            order += 1
        }
        return result
    }

    private static func isNoise(_ line: RecognizedLine) -> Bool {
        let trimmed = line.text.trimmingCharacters(in: .whitespaces)
        if trimmed.isEmpty { return true }
        if trimmed.range(of: #"^\d{1,2}:\d{2}\s?(AM|PM)?$"#, options: .regularExpression) != nil { return true }
        if ["Delivered", "Read", "Today", "Yesterday"].contains(trimmed) { return true }
        return false
    }
}
```

### Pattern 3: Paste-text fallback parsing

**What:** Split pasted text on newlines; if lines consistently match a `"Name: message"` prefix pattern, use the prefix to assign speaker (first distinct name seen → treat as "match", subsequent distinct name → "user", or better: let the user pick which name is "you" on the confirm screen rather than guessing). If no consistent prefix pattern is found, fall back to naive alternating-speaker assignment per line and rely entirely on the confirm screen for correction — this fallback must never silently fail, it must always produce *something* editable.
**When to use:** CAPT-03's paste-text fallback path. This is deliberately simpler than the OCR/bubble path since there's no bounding-box signal available — text-only input has strictly less positional information than a screenshot.
**Example:**
```swift
// Source: original pattern, no external API — pure Swift string processing
enum PasteTextParser {
    static func parse(_ raw: String) -> [ConversationMessage] {
        let lines = raw
            .split(separator: "\n", omittingEmptySubsequences: true)
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }

        let prefixPattern = #"^([\w\s]{1,20}):\s*(.+)$"#
        var result: [ConversationMessage] = []
        var order = 0
        var seenNames: [String] = []

        for line in lines {
            if let match = line.range(of: prefixPattern, options: .regularExpression) {
                let matched = String(line[match])
                let parts = matched.split(separator: ":", maxSplits: 1).map { $0.trimmingCharacters(in: .whitespaces) }
                guard parts.count == 2 else { continue }
                let name = parts[0]
                if !seenNames.contains(name) { seenNames.append(name) }
                let speaker: Speaker = seenNames.first == name ? .match : .user
                result.append(ConversationMessage(speaker: speaker, text: parts[1], order: order))
            } else {
                // No prefix pattern — naive alternation, confirm screen fixes mistakes.
                let speaker: Speaker = order % 2 == 0 ? .match : .user
                result.append(ConversationMessage(speaker: speaker, text: line, order: order))
            }
            order += 1
        }
        return result
    }
}
```

### Anti-Patterns to Avoid

- **Sending the raw image to the backend "just in case" the on-device parse looks wrong:** Violates CAPT-04 (already complete, structurally guarded by `NetworkBoundaryGuardTests` in `BanterShared`). Any low-confidence-parse fallback must stay on-device (e.g., re-run Vision at `.accurate` recognition level) or surface a "couldn't parse — try pasting the text instead" message, never silently upload the image.
- **Trusting the heuristic's output as final without the confirm screen:** CAPT-02 makes user confirmation mandatory specifically because cross-app bubble layouts vary and OCR + geometry heuristics are probabilistic, not exact. Do not add a "skip confirmation for confident parses" shortcut in this phase — that reintroduces exactly the risk CAPT-02 exists to prevent.
- **Doing OCR inside the keyboard extension:** Already an established anti-pattern from Phase 1 ARCHITECTURE.md (memory cap, no photo-library access) — this phase's OCR pipeline must only ever be invoked from `BanterApp`, never `BanterKeyboard`.
- **Building a per-app-skin ML classifier this phase:** Speculative complexity with no training data yet (see Alternatives Considered). The x-alignment heuristic + confirm screen covers MVP; revisit only with real user-reported accuracy data post-launch (already flagged in STATE.md Blockers: "Per-app OCR bubble-parsing heuristics need real screenshot collection; post-launch tuning expected").

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Text recognition from an image | Custom OCR (e.g., Tesseract wrapper, CoreML text-detection model) | Vision framework (`RecognizeTextRequest`/`VNRecognizeTextRequest`) | OS-bundled, Neural-Engine-accelerated, zero integration cost, already the project-level STACK.md recommendation |
| Photo picker UI + permission handling | Custom `UIImagePickerController` wrapper or manual `PHPhotoLibrary` authorization flow | SwiftUI `PhotosPicker` | Out-of-process design eliminates the permission-prompt problem entirely — building a custom picker would *reintroduce* a permission requirement Apple's own component avoids |
| CI screenshot capture | Hand-rolled `simctl` scripting + manual file staging | XCUITest + `XCTAttachment(.keepAlways)` + `actions/upload-artifact@v4` | Standard, well-documented pattern; integrates with existing `xcodebuild test` flow already proven in Phase 1's CI |

**Key insight:** Every "hard problem" in this phase (OCR, photo access, screenshot capture) already has a first-party Apple or GitHub Actions solution. The only genuinely custom logic this phase should write is the bubble-attribution heuristic and paste parser — both are small, deterministic, and testable without any external dependency.

## Common Pitfalls

### Pitfall 1: Deployment target mismatch — `RecognizeTextRequest` needs iOS 18, project targets iOS 17

**What goes wrong:** Code using the new Swift-native `RecognizeTextRequest` API fails to compile (or requires `@available` guards + a fallback path) if `BanterShared/Package.swift` (`.iOS(.v17)`) and `project.yml` (both targets) remain at iOS 17, since `RecognizeTextRequest` requires iOS 18+ `[CITED: developer.apple.com/documentation/vision/recognizetextrequest]`.
**Why it happens:** Phase 1 set iOS 17 as the deployment target before this phase's specific Vision API choice was known; the two decisions were made independently.
**How to avoid:** The planner must make an explicit choice and record it as a decision, not let a task silently pick one:
  - **Option A (recommended):** Bump deployment target to iOS 18 in both `BanterShared/Package.swift` and `project.yml`, use `RecognizeTextRequest`. Low real-world cost since there are no existing users/App Store listing yet, and CI already runs Xcode 26.5/iOS 26 simulators.
  - **Option B:** Keep iOS 17 target, use `VNRecognizeTextRequest` (stable since iOS 13, still fully functional on iOS 26). Slightly more verbose completion-handler-based API instead of async/await, but zero deployment-target risk.
**Warning signs:** A build error referencing `RecognizeTextRequest` unavailability, or an `@available(iOS 18, *)` compiler warning/error during CI's `xcodebuild build` step for `BanterApp`.

### Pitfall 2: Vision's `boundingBox` origin is bottom-left, not top-left

**What goes wrong:** Sorting recognized lines by `boundingBox.origin.y` ascending (assuming top-left origin, as in UIKit's `CGRect` screen coordinates) produces bottom-to-top reading order instead of top-to-bottom, silently reversing the entire transcript's message order.
**Why it happens:** Vision's coordinate system for `boundingBox` (both `VNRecognizedTextObservation` and `RecognizedTextObservation`) uses a normalized coordinate space with the origin at the bottom-left, inherited from Core Image's coordinate conventions — the opposite of UIKit's top-left-origin `CGRect` that iOS developers default to assuming.
**How to avoid:** Sort by `boundingBox.origin.y` **descending** to get top-to-bottom reading order (or explicitly convert to UIKit coordinates first: `1 - y - height`). Cover this with a fixture test asserting message order matches the fixture's known top-to-bottom conversation order, not just that all lines were recognized.
**Warning signs:** A confirm-screen transcript that reads in reverse chronological order, or unit test assertions on line order failing when Vision recognition itself succeeded.

### Pitfall 3: Treating a low OCR confidence as "must retry" instead of "must confirm"

**What goes wrong:** Adding retry-until-confident logic (e.g., looping `.accurate` recognition or re-cropping) as a blocking step before showing anything to the user creates a spinner/stall UX at exactly the moment a user wants to see their parsed transcript.
**Why it happens:** Conflating "OCR confidence" with "attribution correctness" — Vision's per-observation `confidence` score reflects text-recognition certainty, not whether the bubble-attribution heuristic guessed the right speaker. Even 100%-confidence OCR can still misattribute a bubble's side.
**How to avoid:** Always render the parsed transcript to the confirm screen immediately, regardless of confidence — CAPT-02's confirm/correct UI is the correctness mechanism, not a pre-emptive retry loop. Low-confidence OCR lines can be visually flagged (e.g., a subtle indicator) as "double-check this line" but must never block reaching the confirm screen.
**Warning signs:** User-facing latency before the confirm screen appears; any code path that loops Vision requests based on a confidence threshold before displaying results.

### Pitfall 4: `PhotosPickerItem.loadTransferable` returning nil silently

**What goes wrong:** `loadTransferable(type: Data.self)` is `async throws` and returns an `Optional` — a common bug is force-unwrapping or ignoring the failure case, leaving the user stuck on the picker with no explanation if the load fails (e.g., iCloud photo not yet downloaded, unsupported format).
**Why it happens:** Sample code online frequently omits error handling for brevity.
**How to avoid:** Explicitly handle both the `throws` and the `nil` case, surfacing a "couldn't load that image — try again or paste the text instead" message that routes the user to the CAPT-03 paste fallback rather than a dead end.
**Warning signs:** User reports of "nothing happens" after picking a screenshot.

## Code Examples

### Vision OCR with the new Swift API (iOS 18+, if Pitfall 1's Option A is chosen)
```swift
// Source: pattern per developer.apple.com/documentation/vision/recognizetextrequest
// and community WWDC24 coverage (createwithswift.com/recognizing-text-with-the-vision-framework)
import Vision

func recognizeText(in cgImage: CGImage) async throws -> [RecognizedLine] {
    var request = RecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = true
    request.automaticallyDetectsLanguage = true

    let observations = try await request.perform(on: cgImage)
    return observations.compactMap { observation in
        guard let candidate = observation.topCandidates(1).first else { return nil }
        return RecognizedLine(text: candidate.string, boundingBox: observation.boundingBox)
    }
}
```

### Vision OCR with the stable API (iOS 13+, if Pitfall 1's Option B is chosen)
```swift
// Source: pattern per developer.apple.com/documentation/vision/vnrecognizetextrequest
import Vision

func recognizeText(in cgImage: CGImage, completion: @escaping ([RecognizedLine]) -> Void) {
    let request = VNRecognizeTextRequest { request, error in
        guard let observations = request.results as? [VNRecognizedTextObservation] else {
            completion([])
            return
        }
        let lines = observations.compactMap { obs -> RecognizedLine? in
            guard let candidate = obs.topCandidates(1).first else { return nil }
            return RecognizedLine(text: candidate.string, boundingBox: obs.boundingBox)
        }
        completion(lines)
    }
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = true

    let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
    try? handler.perform([request])
}
```

### CI screenshot artifact — XCUITest pattern (user-requested deliverable)
```swift
// Source: pattern per common XCUITest practice
// (blog.winsmith.de/english/ios/2020/04/14/xcuitest-screenshots.html)
import XCTest

final class ScreenshotArtifactTests: XCTestCase {
    func testCaptureKeyScreens() throws {
        let app = XCUIApplication()
        app.launch()
        capture("00_launch")

        app.buttons["Import Screenshot"].tap()
        capture("01_import")

        // Navigate to confirm screen using a bundled fixture image via a
        // debug-only launch argument that pre-seeds a sample transcript,
        // avoiding a real PhotosPicker interaction (which XCUITest cannot
        // drive reliably in CI — the system photo picker is a separate
        // process outside the app's accessibility tree).
        capture("02_confirm_transcript")
    }

    private func capture(_ name: String) {
        let screenshot = XCUIScreen.main.screenshot()
        let attachment = XCTAttachment(screenshot: screenshot)
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
```

```yaml
# .github/workflows/ci.yml addition — Source: actions/upload-artifact@v4 marketplace docs
      - name: Run UI screenshot tests
        run: |
          xcodebuild test \
            -project Banter.xcodeproj \
            -scheme BanterApp \
            -destination "$SIMULATOR_DESTINATION" \
            -resultBundlePath TestResults.xcresult \
            CODE_SIGNING_ALLOWED=NO

      - name: Upload screenshot artifacts
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: ui-screenshots
          path: TestResults.xcresult
          retention-days: 14
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `VNRecognizeTextRequest` + completion handler | `RecognizeTextRequest` (Swift-native, async/await) | iOS 18 (WWDC24) | Cleaner Concurrency-integrated code; not a capability change, an ergonomics change — both produce the same `boundingBox`-per-line data this phase needs |
| `UIImagePickerController` / `PHPickerViewController` (UIKit) for photo selection | `PhotosPicker` (SwiftUI, PhotosUI) | iOS 16 | Out-of-process picker eliminates the permission-prompt requirement entirely for simple "let the user pick one photo" flows |

**Deprecated/outdated:**
- `UIImagePickerController` for photo-library selection: still works but is UIKit-era API; no reason to introduce it into a SwiftUI-first project when `PhotosPicker` covers this phase's needs with less code and better privacy default.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Realistic bubble-attribution accuracy is ~80-90% on clean native screenshots, lower on cropped/rotated/stitched images | Pattern 2 | If actual accuracy is much lower, the confirm-screen UX (per-message flip/edit) still holds correctness — no functional risk, only a UX-friction risk if users have to correct many messages per import. Recommend collecting a small real-screenshot sample from Tinder/Hinge/Bumble during Phase 2 execution to sanity-check before relying on this number for UX copy ("we usually get this right") |
| A2 | First distinct speaker in paste-text prefix parsing should default to "match," not "user" | Pattern 3 | Low risk — CAPT-02's confirm screen (reused for paste as required by the phase description: "paste fallback reaches same confirm screen") corrects any wrong default; consider instead prompting the user "which name is you?" on first paste to remove the guess entirely, a UX call for the planner/discuss-phase, not a research fact |
| A3 | XCUITest cannot reliably drive the system `PhotosPicker` UI in CI (it's a separate out-of-process picker outside the app's accessibility tree) | Code Examples (CI screenshot artifact) | If wrong, the screenshot-artifact test could exercise the real picker instead of a debug-seeded fixture — low risk either way, since a debug-launch-argument seed path is the recommended pattern regardless and is simpler to maintain than driving a system picker |

**If this table is empty:** N/A — see entries above; all are UX/product-judgment risks with the confirm-screen correctness net in place, not correctness or security risks.

## Open Questions (RESOLVED)

1. **Should the deployment target bump to iOS 18 now (Pitfall 1)?**
   - What we know: `RecognizeTextRequest` requires iOS 18+; current target is iOS 17; CI toolchain is already iOS 26/Xcode 26.5, so CI is not a blocker either way.
   - What's unclear: Whether there's a product reason (e.g., a stated device-compatibility floor) to stay on iOS 17 that hasn't been documented yet.
   - Recommendation: Planner should make this an explicit locked decision in the phase's task list (a one-line config change either way), defaulting to Option A (bump to iOS 18, use `RecognizeTextRequest`) absent a stated reason to preserve iOS 17.

2. **Which x-position threshold and default speaker-side convention should `BubbleAttributor` use?**
   - What we know: Left-aligned = other person (match), right-aligned = user, is the near-universal messaging-app convention; a simple midpoint (0.5) or slightly-left-of-midpoint (0.35-0.4) threshold is the standard approach.
   - What's unclear: The exact threshold value should be tuned against a handful of real screenshots (Tinder/Hinge/Bumble/iMessage/WhatsApp) rather than guessed — this needs real screenshot fixtures collected during phase execution, which STATE.md already flags as a known gap ("Per-app OCR bubble-parsing heuristics need real screenshot collection").
   - Recommendation: Ship with a documented constant (e.g., `0.4`) and treat exact tuning as expected iteration once execution produces real fixture images, not a blocking research question.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Vision framework | OCR pipeline | Yes (OS-bundled) | iOS 13+ (`VNRecognizeTextRequest`) / iOS 18+ (`RecognizeTextRequest`) | N/A — required, no fallback; already confirmed present on the macos-26 CI runner's iOS Simulator |
| PhotosUI (`PhotosPicker`) | Screenshot import | Yes (OS-bundled) | iOS 16+ | N/A — required, no fallback |
| Xcode / iOS Simulator (CI) | OCR fixture tests + UI screenshot tests | Yes — confirmed via Phase 1's green CI run (macos-26 runner, Xcode 26.5, iPhone 17 simulator) | Xcode 26.5 | N/A |
| Physical iOS device | On-device Vision accuracy validation beyond simulator | No — developer has no Mac/device | — | Simulator-only validation for this phase (per project constraint); Vision text recognition against static images is confirmed to work identically on simulator per research — this is not expected to be a meaningful accuracy gap for this phase's fixture-based tests |

**Missing dependencies with no fallback:** None — all required frameworks are OS-bundled and already proven present in CI from Phase 1.

**Missing dependencies with fallback:** Physical-device Vision validation — simulator-only fixture tests are the accepted fallback for this entire project per its no-Mac/no-device constraint (consistent with Phase 1's documented simulator-vs-device caveat).

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | XCTest — `swift test` for `BanterShared` (pure logic), `xcodebuild test` for `BanterApp` UI/XCUITest |
| Config file | `BanterShared/Package.swift` (existing); no separate XCTest config needed for BanterApp — driven via `xcodebuild test -scheme BanterApp` |
| Quick run command | `swift test --package-path BanterShared` (OCR/attribution/parser unit tests — no simulator boot, seconds) |
| Full suite command | `xcodebuild test -project Banter.xcodeproj -scheme BanterApp -destination "platform=iOS Simulator,name=iPhone 17" -resultBundlePath TestResults.xcresult CODE_SIGNING_ALLOWED=NO` (adds the UI screenshot test, requires simulator boot) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CAPT-01 | Screenshot fixture → Vision OCR → recognized lines with bounding boxes | unit | `swift test --package-path BanterShared --filter OCRPipelineTests` | ❌ Wave 0 |
| CAPT-01 | Recognized lines → correctly-ordered `[ConversationMessage]` (bubble attribution + noise filtering) | unit | `swift test --package-path BanterShared --filter BubbleAttributorTests` | ❌ Wave 0 |
| CAPT-02 | Attribution can be flipped and text edited before confirm (UI-level) | manual / XCUITest (best-effort) | Manual verification via CI-produced screenshot artifacts (no local Mac); XCUITest can assert the confirm screen renders editable rows if a debug fixture-seed launch argument is added | ❌ Wave 0 |
| CAPT-03 | Pasted "Name: message" text → correctly-attributed `[ConversationMessage]`; unpatterned text → non-crashing alternating fallback | unit | `swift test --package-path BanterShared --filter PasteTextParserTests` | ❌ Wave 0 |
| CAPT-04 (already complete) | No raw image bytes present in any network-bound DTO | unit (existing) | `swift test --package-path BanterShared --filter NetworkBoundaryGuardTests` | ✅ exists (Phase 1) |

### Sampling Rate

- **Per task commit:** `swift test --package-path BanterShared` (fast, no simulator — run after every `BanterShared/Import/*.swift` change)
- **Per wave merge:** Full `xcodebuild test` run including the new XCUITest screenshot target
- **Phase gate:** Full suite green (both `swift test` and `xcodebuild test`) before `/gsd:verify-work`, plus a manual look at the uploaded CI screenshot artifacts to eyeball the confirm-screen UI (no local device to check this any other way)

### Wave 0 Gaps

- [ ] `BanterShared/Tests/BanterSharedTests/Fixtures/*.png` — synthetic rendered chat-screenshot images (at minimum: one clean two-column iMessage-style layout, one with a timestamp/header noise line, one with a "Name:"-prefixed paste-text equivalent is not an image but a plain fixture string in the test file itself)
- [ ] `BanterShared/Tests/BanterSharedTests/OCRPipelineTests.swift` — covers CAPT-01 (OCR half)
- [ ] `BanterShared/Tests/BanterSharedTests/BubbleAttributorTests.swift` — covers CAPT-01 (attribution half) and CAPT-02 (attribution correctness that the UI later lets the user correct)
- [ ] `BanterShared/Tests/BanterSharedTests/PasteTextParserTests.swift` — covers CAPT-03
- [ ] `BanterUITests/ScreenshotArtifactTests.swift` — new XCUITest target, covers the user-requested CI screenshot-artifact deliverable and gives best-effort visual coverage of CAPT-02's confirm UI
- [ ] `project.yml` — needs a new `BanterUITests` target declaration (XCUITest bundle attached to `BanterApp`'s scheme test action — this one **is** the standard XcodeGen-supported case, unlike Phase 1's SPM-package-test-into-scheme problem, since XCUITest targets are native Xcode constructs, not SPM test targets)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | No | Not touched this phase (no auth flow changes) |
| V3 Session Management | No | Not touched this phase |
| V4 Access Control | No | Not touched this phase |
| V5 Input Validation | Yes | Pasted text (CAPT-03) is untrusted user input — `PasteTextParser` must not crash on malformed/adversarial input (extremely long lines, no newlines at all, regex-hostile strings). Use bounded `String` operations and a regex with no catastrophic-backtracking risk (the `"Name:"` prefix pattern above is anchored and bounded to 20 chars, avoiding ReDoS) |
| V6 Cryptography | No | Not touched this phase |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Regex denial-of-service (ReDoS) via adversarial pasted text | Denial of Service | Keep the paste-parser's regex simple and bounded (anchored, fixed max-length name-prefix group, no nested quantifiers) — the pattern in Pattern 3 already satisfies this; do not "improve" it into a more permissive/nested regex without re-checking backtracking behavior |
| Screenshot containing sensitive text captured in a CI test artifact | Information Disclosure | The CI screenshot-artifact tests (user-requested deliverable) must only ever use synthetic/fixture data seeded via a debug launch argument — never real user conversation data — since these artifacts are uploaded to GitHub Actions and potentially visible to anyone with repo access (repo is private per Phase 1 decision, but this is still good hygiene) |
| Raw image bytes accidentally included in a network-bound DTO after this phase's changes | Information Disclosure (violates CAPT-04) | The existing `NetworkBoundaryGuardTests` structural guard (Phase 1) already asserts no binary-payload tokens in `NetworkDTOs.swift` — re-run this test after adding any new DTO in this phase; do not weaken or bypass it |

## Sources

### Primary (HIGH confidence)
- [RecognizeTextRequest — Apple Developer Documentation](https://developer.apple.com/documentation/vision/recognizetextrequest) — official docs, new Swift Vision API surface and iOS 18 availability
- [VNRecognizeTextRequest — Apple Developer Documentation](https://developer.apple.com/documentation/vision/vnrecognizetextrequest) — official docs, stable OCR API since iOS 13
- [Bringing Photos picker to your SwiftUI app — Apple Developer Documentation](https://developer.apple.com/documentation/photokit/bringing-photos-picker-to-your-swiftui-app) — official docs, out-of-process/no-permission-prompt confirmation
- [Locating and displaying recognized text — Apple Developer Documentation](https://developer.apple.com/documentation/Vision/locating-and-displaying-recognized-text) — official docs, `boundingBox` coordinate semantics
- Existing project research: `.planning/research/ARCHITECTURE.md`, `.planning/research/STACK.md` (project-level, already vetted) and `01-03-SUMMARY.md`/`01-04-SUMMARY.md` (existing `BanterShared` models and CI setup)

### Secondary (MEDIUM confidence)
- [Discover Swift enhancements in the Vision framework — WWDC24 (developer.apple.com/videos)](https://developer.apple.com/videos/play/wwdc2024/10163/) — official session, cross-checked against community write-ups for `RecognizeTextRequest` code shape
- [Recognizing text with the Vision framework — createwithswift.com](https://www.createwithswift.com/recognizing-text-with-the-vision-framework/) — practitioner write-up, consistent with official docs on `minimumTextHeightFraction`/`recognitionLanguages`
- [How to let users select pictures using PhotosPicker — hackingwithswift.com](https://www.hackingwithswift.com/quick-start/swiftui/how-to-let-users-select-pictures-using-photospicker) — practitioner tutorial, `loadTransferable` pattern
- [Creating automated Screenshots using XCUITest — blog.winsmith.de](https://blog.winsmith.de/english/ios/2020/04/14/xcuitest-screenshots.html) — practitioner pattern for `XCTAttachment(.keepAlways)`
- [Using xcresult files with GitHub Actions — alwold.com](https://alwold.com/posts/xcresults-on-github-actions/) — practitioner pattern for `-resultBundlePath` + `upload-artifact`

### Tertiary (LOW confidence)
- Vision-in-simulator-CPU behavior for static images: cross-referenced across multiple practitioner sources (Medium, davydovconsulting.com) with consistent claims ("Vision requests work on the simulator with static images"; camera-only limitation applies to live capture, not static-image analysis) but no single first-party Apple statement was found explicitly confirming CPU-only Vision execution in the Simulator. Treat as directionally reliable, not a hard guarantee — the phase's own fixture-based tests are the real verification, not this claim.
- Bubble-attribution realistic accuracy figures (A1 in Assumptions Log) — no benchmark source found; flagged `[ASSUMED]`.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all Apple-official, OS-bundled APIs with direct documentation citations
- Architecture: HIGH — directly extends Phase 1's proven `BanterShared`/App-target split, no new architectural pattern introduced
- Pitfalls: MEDIUM — Pitfall 1 (deployment target) and Pitfall 2 (coordinate origin) are HIGH confidence (documented facts); bubble-attribution accuracy claims are LOW confidence (assumed, flagged)

**Research date:** 2026-07-03
**Valid until:** 30 days (stable Apple platform APIs; re-verify if Xcode/iOS version bumps occur before planning, per the project's own pattern of re-verifying exact tool versions at CI-authoring time)

---
*Phase 2 research for: Screenshot Import & OCR Pipeline*
*Researched: 2026-07-03*
