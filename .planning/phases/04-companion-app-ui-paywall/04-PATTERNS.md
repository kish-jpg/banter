# Phase 4: Companion App UI & Paywall - Pattern Map

**Mapped:** 2026-07-04
**Files analyzed:** 17 (new/modified, per 04-RESEARCH.md's Recommended Project Structure + Wave 0 test gaps + 04-UI-SPEC.md screens)
**Analogs found:** 17 / 17 (all have at least a role-match; no "no analog" files this phase — Phase 2/3 already established every pattern shape Phase 4 needs)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|-----------------|---------------|
| `BanterApp/Onboarding/WelcomeView.swift` | component (screen) | request-response (static, no I/O) | `BanterApp/Import/ImportEntryView.swift` | exact |
| `BanterApp/Onboarding/OnboardingFlowModel.swift` | store (state machine) | event-driven | `BanterApp/Import/ImportFlowModel.swift` | exact |
| `BanterApp/Onboarding/PermissionPrimingView.swift` | component (screen) | request-response | `BanterApp/Import/ParsingProgressView.swift` (failure-state layout) | role-match |
| `BanterApp/Onboarding/ValueDemoCoordinatorView.swift` | component (coordinator) | event-driven | `BanterApp/ContentView.swift` | exact |
| `BanterApp/Coaching/SuggestionCardView.swift` | component | request-response | `BanterApp/Import/ConfirmTranscriptView.swift` (`messageRow`/`messageBubble`) | role-match |
| `BanterApp/Coaching/TonePickerView.swift` | component | request-response | `BanterApp/Import/ConfirmTranscriptView.swift` (`attributionChip`) | role-match |
| `BanterApp/Coaching/TagExplainerSheet.swift` | component | transform (local lookup) | `BanterApp/Import/ConfirmTranscriptView.swift` (inline-expand editing pattern) | role-match |
| `BanterApp/Coaching/CoachingClient.swift` | service | request-response (network) | none in BanterApp — closest is `BanterShared/Sources/BanterShared/Import/OCRPipeline.swift` (async throws pipeline pattern) | partial (new surface — first network client in this app) |
| `BanterApp/Calculator/SentimentTimelineStore.swift` | store (persistence) | CRUD (append/read) | `BanterShared/Sources/BanterShared/AppGroupStore.swift` | exact |
| `BanterApp/Calculator/ConversationHealthView.swift` | component (screen) | request-response | `BanterApp/Import/ConfirmTranscriptView.swift` (header/empty-state/list layout) | role-match |
| `BanterApp/Paywall/EntitlementManager.swift` | service (state) | event-driven (async refresh) | `BanterApp/Import/ImportFlowModel.swift` (`@Observable` state class) | role-match |
| `BanterApp/Paywall/PaywallView.swift` | component (screen) | request-response | `BanterApp/Import/ConfirmTranscriptView.swift` (sticky bottom-bar CTA) | role-match |
| `BanterApp/Paywall/DailyCapTracker.swift` | utility (counter) | CRUD (local) | `BanterShared/Sources/BanterShared/AppGroupStore.swift` (via read/write) | role-match |
| `BanterShared/Sources/BanterShared/Models/TaxonomyEntry.swift` | model | transform | `BanterShared/Sources/BanterShared/Models/ReplySuggestion.swift` | exact |
| `BanterShared/Tests/BanterSharedTests/TonePickerTests.swift` | test | unit | `BanterShared/Tests/BanterSharedTests/AppGroupRoundTripTests.swift` | role-match |
| `BanterShared/Tests/BanterSharedTests/SentimentTimelineStoreTests.swift` | test | unit (incl. negative test) | `BanterShared/Tests/BanterSharedTests/NetworkBoundaryGuardTests.swift` (structural/negative-guard style) + `AppGroupRoundTripTests.swift` (round-trip style) | exact (combination) |
| `BanterUITests/OnboardingFlowTests.swift` / `PermissionPrimingTests.swift` | test | integration (XCUITest) | `BanterUITests/ScreenshotArtifactTests.swift` | exact |

## Pattern Assignments

### `BanterApp/Onboarding/WelcomeView.swift` (component, request-response)

**Analog:** `BanterApp/Import/ImportEntryView.swift`

**Imports pattern** (lines 1-3):
```swift
import PhotosUI
import SwiftUI
import UIKit
```
Welcome screen needs only `import SwiftUI` (no picker on this screen per UI-SPEC 4.1) — drop the `PhotosUI`/`UIKit` imports, keep everything else.

**Core layout pattern** (lines 21-53, `ImportEntryView.body`):
```swift
var body: some View {
    ScrollView {
        VStack(spacing: Banter.Spacing.md) {
            Text("Import a conversation")
                .font(Banter.TextStyle.display)
                .padding(.top, Banter.Spacing.xl)
            // ... icon, body copy, primary CTA using .buttonStyle(.borderedProminent) + .tint(Banter.Colors.accent)
        }
    }
    .background(Banter.Colors.background.ignoresSafeArea())
}
```
Copy this exact `ScrollView { VStack(spacing: Banter.Spacing.md) { ... } }` + `.background(Banter.Colors.background.ignoresSafeArea())` shell verbatim for Screen 4.1. Swap heading/body copy per Copywriting Contract ("Never freeze on a reply again" / "Import a screenshot, get 3 great replies instantly..."), swap the SF Symbol to `bubble.left.and.bubble.right.fill` at 56pt per UI-SPEC (note: 04-UI-SPEC uses 56pt vs Phase 2's 64pt icon — follow UI-SPEC's value for this screen), and swap the CTA label to "Try It Now".

**Primary CTA button pattern** (lines 41-52):
```swift
PhotosPicker(selection: $selectedItem, matching: .images) {
    Text("Choose Screenshot")
        .font(Banter.TextStyle.body)
        .frame(maxWidth: .infinity)
        .frame(minHeight: 52)
}
.buttonStyle(.borderedProminent)
.tint(Banter.Colors.accent)
.foregroundStyle(.white)
.clipShape(RoundedRectangle(cornerRadius: Banter.Radius.md))
.padding(.horizontal, Banter.Spacing.md)
.padding(.top, Banter.Spacing.md)
```
For Welcome's plain `Button` (not a picker), copy the exact modifier chain (`.buttonStyle(.borderedProminent)`, `.tint(Banter.Colors.accent)`, 52pt height, `Banter.Radius.md` clip) — this is the project's one established "primary CTA" recipe, reused verbatim across every phase.

---

### `BanterApp/Onboarding/OnboardingFlowModel.swift` (store, event-driven)

**Analog:** `BanterApp/Import/ImportFlowModel.swift`

**State machine + `@Observable` pattern** (lines 1-40):
```swift
import CoreGraphics
import Foundation
import Observation
import BanterShared

@Observable
final class ImportFlowModel {
    enum ParsingSource { case screenshot; case pasteText }
    enum State: Equatable {
        case entry(startInPasteMode: Bool = false)
        case parsing(source: ParsingSource)
        case confirm
        case failure(source: ParsingSource)
    }
    private(set) var state: State = .entry()
    private(set) var transcript: [ConversationMessage] = []
    ...
}
```
Model `OnboardingFlowModel`'s state enum the same way: `.welcome`, `.permissionPriming(type: .photos)`, `.importFlow` (delegates into existing `ImportFlowModel`), `.suggestionsShown`. Keep `state` as `private(set)`, mutate only via named methods (`advanceToPermissionPriming()`, `skipPriming()`), mirroring `flipSpeaker`/`editText`/`startOver`'s naming style.

**Debug/CI seeding pattern** (lines 27-40):
```swift
static let seedSampleTranscriptArgument = "--seed-sample-transcript"

init(arguments: [String] = CommandLine.arguments) {
    #if DEBUG
    if arguments.contains(Self.seedSampleTranscriptArgument) {
        transcript = Self.sampleTranscript
        state = .confirm
    }
    #endif
}
```
Reuse this exact `#if DEBUG` + `CommandLine.arguments`-injectable-for-testing pattern for any new launch-argument CI seed needed by `OnboardingFlowTests`/`PermissionPrimingTests` (e.g. a `--seed-onboarding-welcome` or `--reset-onboarding-state` arg to force a fresh-install state deterministically in XCUITest, since `@AppStorage` "seen priming" flags otherwise persist across CI runs on the same simulator).

**Hard requirement carried from RESEARCH Pitfall 4:** the coordinator's path from Welcome through the demo loop to suggestions must call `ImportFlowModel`/a new `CoachingClient` directly — never routed through `DailyCapTracker`/`EntitlementManager`. Confirm this by grep-testing (mirrors `GeminiKeyBoundaryGuardTests`' structural-guard style) that the onboarding demo path file contains no `DailyCapTracker`/`EntitlementManager` token, or simply by code review since this is a wiring decision, not a string-literal one.

---

### `BanterApp/Onboarding/PermissionPrimingView.swift` (component, request-response)

**Analog:** `BanterApp/Import/ParsingProgressView.swift` (its `failureContent` sub-view is the closest shape: icon + heading + body + two-button choice)

**Layout pattern** (lines 46-82, `failureContent`):
```swift
private var failureContent: some View {
    VStack(spacing: Banter.Spacing.md) {
        Image(systemName: "exclamationmark.triangle")
            .font(.system(size: 48))
            .foregroundStyle(Banter.Colors.destructive)
            .accessibilityHidden(true)
        Text("Couldn't read that screenshot").font(Banter.TextStyle.heading)
        Text("...").font(Banter.TextStyle.body).foregroundStyle(Banter.Colors.textSecondary).multilineTextAlignment(.center)
        Button { onTryAgain() } label: {
            Text("Try Again").font(Banter.TextStyle.body).frame(maxWidth: .infinity).frame(minHeight: 44)
        }
        .buttonStyle(.borderedProminent)
        .tint(Banter.Colors.accent)
        Button { onPasteInstead() } label: {
            Text("Paste Text Instead").font(Banter.TextStyle.body).foregroundStyle(Banter.Colors.accent)
        }
    }
}
```
Build `PermissionPrimingView(icon:heading:body:onContinue:onSkip:)` as a generic, parameterized version of exactly this shape: icon (64pt per UI-SPEC 4.2, `textSecondary` tint — not `destructive`, since this isn't an error state), heading, body, primary CTA (`.borderedProminent`/`accent`), secondary text-button CTA. This is directly reusable by Phase 5's Keyboard-enable priming per 04-RESEARCH.md's structure — write it generic from the start.

---

### `BanterApp/Onboarding/ValueDemoCoordinatorView.swift` (component, event-driven)

**Analog:** `BanterApp/ContentView.swift`

**State-driven switch-routing pattern** (lines 7-37, entire file):
```swift
struct ContentView: View {
    @State private var model = ImportFlowModel()
    var body: some View {
        NavigationStack {
            Group {
                switch model.state {
                case .entry(let startInPasteMode): ImportEntryView(model: model, startInPasteMode: startInPasteMode)
                case .parsing(let source): ParsingProgressView(source: source, isFailure: false, onTryAgain: ..., onPasteInstead: ...)
                case .failure(let source): ParsingProgressView(source: source, isFailure: true, onTryAgain: ..., onPasteInstead: ...)
                case .confirm: ConfirmTranscriptView(model: model)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}
```
`ValueDemoCoordinatorView` wraps the existing `ImportFlowModel` state machine unchanged (per RESEARCH.md: "wraps existing Import→Progress→Confirm→Coaching call") and simply adds one more terminal case after `.confirm` — a call into the new `CoachingClient` and a transition to showing `SuggestionCardView`s. Copy this exact `Group { switch state { ... } }` dispatcher shape; do not introduce a `NavigationStack` push-based flow, this project's established pattern is state-driven view swapping.

---

### `BanterApp/Coaching/SuggestionCardView.swift` (component, request-response)

**Analog:** `BanterApp/Import/ConfirmTranscriptView.swift` (`messageRow`/`messageBubble`/`attributionChip`)

**Card + chip composition pattern** (lines 60-94):
```swift
private func messageRow(index: Int, message: ConversationMessage) -> some View {
    let isUser = message.speaker == .user
    return HStack(alignment: .top, spacing: Banter.Spacing.sm) {
        if isUser { Spacer(minLength: Banter.Spacing.xl) }
        VStack(alignment: isUser ? .trailing : .leading, spacing: Banter.Spacing.xs) {
            attributionChip(index: index, message: message)
            messageBubble(index: index, message: message)
        }
        .frame(maxWidth: .infinity, alignment: isUser ? .trailing : .leading)
        if !isUser { Spacer(minLength: Banter.Spacing.xl) }
    }
    .frame(minHeight: 44)
}

private func attributionChip(index: Int, message: ConversationMessage) -> some View {
    let label = message.speaker == .user ? "You" : "Match"
    return Button { withAnimation(reduceMotionAwareAnimation) { model.flipSpeaker(at: index) } } label: {
        Text(label)
            .font(Banter.TextStyle.label)
            .padding(.horizontal, Banter.Spacing.xs)
            .padding(.vertical, Banter.Spacing.xs / 2)
            .background(Banter.Colors.accent.opacity(0.15))
            .foregroundStyle(Banter.Colors.accent)
            .clipShape(RoundedRectangle(cornerRadius: Banter.Radius.sm))
    }
    .frame(minHeight: 44)
    .accessibilityLabel("Speaker: \(label)")
    .accessibilityHint("Double tap to switch speaker")
}
```
This `attributionChip` is the exact template for the tag-chip: rounded pill, `label` role text, tap target ≥44pt, `.accessibilityLabel`/`.accessibilityHint`. Per UI-SPEC 4.3, the collapsed tag chip is `textSecondary` on `surface` (not `accent`-tinted at rest — only on expand), so adapt the color logic (`isExpanded ? Banter.Colors.accent : Banter.Colors.textSecondary`) rather than copying the `accent.opacity(0.15)` background verbatim.

**Card container styling** (surface fill + radius + padding — same values used throughout, e.g. `messageBubble` lines 117-125):
```swift
.padding(Banter.Spacing.sm)
.background(Banter.Colors.surface)
.clipShape(RoundedRectangle(cornerRadius: Banter.Radius.lg))
```
Use this exact `surface` fill + `Radius.lg` + padding recipe for the suggestion card container (UI-SPEC 4.3: "surface fill, Banter.Radius.lg corners, Banter.Spacing.md internal padding").

**Copy action pattern:** no existing "copy to clipboard + toast" exists in Phase 2, but the toast itself has a direct analog — see `clearedToast` below (Shared Patterns).

---

### `BanterApp/Coaching/TonePickerView.swift` (component, request-response)

**Analog:** `BanterApp/Import/ConfirmTranscriptView.swift` (`attributionChip`, active/inactive segment styling concept) + `ImportFlowModel`'s enum-driven state

**Pattern:** No existing segmented-picker view exists in the codebase (Phase 2 has no multi-option selector), so this is a **new shape built from the existing chip-styling primitive**, not a literal analog copy. Use `ReplyStyle` (already `Codable`, 4 cases: `.playful/.sincere/.witty/.direct`) from `BanterShared/Sources/BanterShared/Models/ReplySuggestion.swift` lines 4-8 as the picker's data source — do not invent a parallel enum:
```swift
public enum ReplyStyle: String, Codable {
    case playful
    case sincere
    case witty
    case direct
}
```
Style each segment using the same `Banter.TextStyle.label` + `Banter.Spacing` tokens as `attributionChip`, per UI-SPEC 4.3's exact spec: active segment gets `surface`-toned pill + `accent`-toned bottom-border 2pt indicator (not full accent fill); inactive gets `textSecondary` text, no background.

---

### `BanterApp/Coaching/TagExplainerSheet.swift` (component, transform/local lookup)

**Analog:** `BanterApp/Import/ConfirmTranscriptView.swift`'s inline-edit toggle pattern (`editingIndex`/`messageBubble` conditional rendering) — UI-SPEC 4.3 explicitly calls for an **inline expand, not a `.sheet()`**, despite the file's "Sheet" name inherited from RESEARCH.md.

**Conditional inline-expand pattern** (lines 96-134, `messageBubble`):
```swift
@ViewBuilder
private func messageBubble(index: Int, message: ConversationMessage) -> some View {
    if editingIndex == index {
        // expanded/editing content
    } else {
        // collapsed content, .onTapGesture { ... editingIndex = index }
    }
}
```
Adapt this exact `@ViewBuilder` + `editingIndex == index ? expanded : collapsed` toggle shape to `expandedTagIndices: Set<Int>` (UI-SPEC 4.3 explicitly allows multiple simultaneously-expanded cards, unlike the single-`editingIndex` accordion-exclusive pattern here — do not copy the "only one open at a time" constraint).

**Animation pattern** (used throughout, e.g. `ConfirmTranscriptView` line 217):
```swift
private var reduceMotionAwareAnimation: Animation? {
    UIAccessibility.isReduceMotionEnabled ? nil : .spring(response: 0.3, dampingFraction: 0.8)
}
```
UI-SPEC 4.3 explicitly calls for `.spring(response: 0.3, dampingFraction: 0.85)` respecting Reduce Motion — copy this helper verbatim (per the UI-SPEC's own instruction: "reuse that exact helper, do not reimplement"). Note `ImportEntryView.swift` has a slightly different variant (`.easeOut` fallback instead of `nil`) — prefer `ConfirmTranscriptView`'s `nil`-on-reduce-motion version as it more directly matches "falling back to a direct crossfade" language in the UI-SPEC's Accessibility Checklist.

**Local taxonomy lookup pattern (no network call):**
```swift
// New model, BanterShared/Sources/BanterShared/Models/TaxonomyEntry.swift — mirrors
// Backend/functions/coaching/taxonomy.ts's TaxonomyEntry interface (fields below)
// and the JSON shape in Backend/functions/coaching/taxonomy.json:
public struct TaxonomyEntry: Codable, Equatable {
    public let framework: String
    public let technique: String
    public let tagName: String
    public let explanation: String
    public let citation: String
}
```
Source shape confirmed directly from `Backend/functions/coaching/taxonomy.ts` (lines 3-9) and one live entry in `Backend/functions/coaching/taxonomy.json` (lines 4-10). Field names/order must match exactly for a bundled-copy sync strategy (per RESEARCH.md Pattern 1 / Open Question 2) to work with the existing `Backend/scripts/sync-fixture.sh` drift-guard precedent.

---

### `BanterApp/Coaching/CoachingClient.swift` (service, request-response/network)

**Analog:** none inside `BanterApp` (first network call originating from the app itself — Phase 3's `/coaching` endpoint exists but nothing in `BanterApp` calls it yet). Closest shape precedent: `BanterShared/Sources/BanterShared/Import/OCRPipeline.swift`'s async-throws pipeline style, and the DTOs it must speak are locked in `NetworkDTOs.swift`.

**Contract to call against (read-only, do not modify)** — `BanterShared/Sources/BanterShared/NetworkDTOs.swift` lines 13-21, 61-71:
```swift
public struct AnalyzeConversationRequest: Codable {
    public let messages: [ConversationMessage]
    public let tone: ReplyStyle?
    public init(messages: [ConversationMessage], tone: ReplyStyle? = nil) { ... }
}

public struct CoachingResponseDTO: Codable, Equatable {
    public let replies: [ReplySuggestion]
    public let sentiment: SentimentDTO
    public let conversationId: UUID?
    public init(replies: [ReplySuggestion], sentiment: SentimentDTO, conversationId: UUID? = nil) { ... }
}
```
`CoachingClient` is a thin `URLSession`-based wrapper whose sole job is: encode `AnalyzeConversationRequest`, POST to the coaching endpoint, decode `CoachingResponseDTO`. **No existing Swift URLSession call exists to copy verbatim** — this is genuinely new client-side networking code. Follow `OCRPipeline`'s `async throws` function-based (not class-based) style where practical, and reuse `GeminiKeyBoundaryGuardTests`' scan-root convention (below) to add a tripwire ensuring no secret leaks into this new file.

**Don't hand-roll:** per RESEARCH.md, do not add a second "coaching request" model — `AnalyzeConversationRequest`/`CoachingResponseDTO` already exist and are locked; `CoachingClient` only transports them.

---

### `BanterApp/Calculator/SentimentTimelineStore.swift` (store, CRUD)

**Analog:** `BanterShared/Sources/BanterShared/AppGroupStore.swift` (exact — RESEARCH.md Pattern 2 names this file directly)

**Read/write generic Codable pattern** (entire file, lines 9-36):
```swift
public enum AppGroupStore {
    public static let suiteName = "group.com.banter.shared"

    public static func write<T: Codable>(_ value: T, forKey key: String) {
        guard let defaults = UserDefaults(suiteName: suiteName) else {
            assertionFailure("AppGroupStore: UserDefaults(suiteName: \(suiteName)) returned nil — check App Group entitlement")
            return
        }
        guard let data = try? JSONEncoder().encode(value) else {
            assertionFailure("AppGroupStore: failed to encode \(T.self)")
            return
        }
        defaults.set(data, forKey: key)
    }

    public static func read<T: Codable>(_ type: T.Type, forKey key: String) -> T? {
        guard let defaults = UserDefaults(suiteName: suiteName) else { ... }
        guard let data = defaults.data(forKey: key) else { return nil }
        guard let value = try? JSONDecoder().decode(type, from: data) else { ... }
        return value
    }
}
```
`SentimentTimelineStore` wraps exactly this read/write pair, keyed strictly by `"timeline.\(conversationId)"` (RESEARCH.md's own example, Pattern 2, lines 200-212):
```swift
func appendSentimentEvent(from response: CoachingResponseDTO, conversationId: UUID, messageIndex: Int, speaker: Speaker) {
    let event = SentimentEvent(
        conversationId: conversationId,
        messageIndex: messageIndex,
        speaker: speaker,
        scoreDelta: response.sentiment.score,
        signal: response.sentiment.signal,
        timestamp: Date()
    )
    var events = AppGroupStore.read([SentimentEvent].self, forKey: "timeline.\(conversationId)") ?? []
    events.append(event)
    AppGroupStore.write(events, forKey: "timeline.\(conversationId)")
}
```
`SentimentEvent` itself already exists verbatim — `BanterShared/Sources/BanterShared/Models/SentimentEvent.swift` (whole file, 6 fields) — do not add a new model, just start populating it.

**CALC-03 boundary — enforce by construction:** every `SentimentTimelineStore` method signature must accept only `conversationId: UUID`, never a name/identity string. Mirror `NetworkBoundaryGuardTests`' structural-guard style (see Shared Patterns) for the negative test.

**Pitfall 1 note (from RESEARCH.md):** `AppGroupStore.write` replaces the entire value per call — the planner/executor should decide whether to cap `events` at N=200 inline in `appendSentimentEvent`-equivalent, or move to a per-conversationId JSON file via `FileManager.containerURL(forSecurityApplicationGroupIdentifier:)` if growth becomes a real concern. Not a blocker for Wave 0.

---

### `BanterApp/Calculator/ConversationHealthView.swift` (component, request-response)

**Analog:** `BanterApp/Import/ConfirmTranscriptView.swift` (header + empty-state + list-of-cards layout shape)

**Header pattern** (lines 36-46):
```swift
private var header: some View {
    VStack(alignment: .leading, spacing: Banter.Spacing.xs) {
        Text("Confirm your conversation").font(Banter.TextStyle.heading)
        Text("Tap a name to fix who said what...").font(Banter.TextStyle.label).foregroundStyle(Banter.Colors.textSecondary)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(Banter.Spacing.md)
}
```
Reuse this pinned-header shape (`heading` role title + `label`/`textSecondary` caption) for "Conversation Health" title, per UI-SPEC 4.4's explicit callout: "mirrors the Screen 3 pinned-title pattern from Phase 2."

**Empty state pattern** (lines 142-165):
```swift
private var emptyState: some View {
    VStack(spacing: Banter.Spacing.md) {
        Spacer()
        Text("Couldn't find any messages").font(Banter.TextStyle.heading)
        Text("Try a clearer screenshot...").font(Banter.TextStyle.body).foregroundStyle(Banter.Colors.textSecondary).multilineTextAlignment(.center).padding(.horizontal, Banter.Spacing.md)
        Button { model.startOver() } label: { Text("Try Another Screenshot")... }
            .buttonStyle(.borderedProminent).tint(Banter.Colors.accent)
        Spacer()
    }
}
```
Copy this `Spacer() / heading / body / [optional CTA] / Spacer()` centered-empty-state shape verbatim for the "Nothing to score yet" state (UI-SPEC 4.4) — no CTA button needed here (no action to take besides waiting), so drop the button, keep the rest.

**Charts framework:** first-party `import Charts` (iOS 16+) — no analog exists in this codebase (first chart of the project). Follow RESEARCH.md's Don't-Hand-Roll guidance: use `LineMark`/`PointMark`/`AreaMark` directly, no custom `Canvas` drawing. Single-data-point case must render `PointMark`, not attempt a 1-point line (UI-SPEC 4.4 States).

---

### `BanterApp/Paywall/EntitlementManager.swift` (service, event-driven)

**Analog:** `BanterApp/Import/ImportFlowModel.swift` (`@Observable final class` with `private(set)` state, async mutation methods)

**`@Observable` state-class shape** (lines 10-24 pattern, generalized):
```swift
@Observable
final class ImportFlowModel {
    private(set) var state: State = .entry()
    private(set) var transcript: [ConversationMessage] = []
    ...
    @MainActor
    func importScreenshot(_ cgImage: CGImage) async { ... }
}
```
`EntitlementManager` follows the same shape (per RESEARCH.md Pattern 3, lines 225-233):
```swift
import RevenueCat

@Observable
final class EntitlementManager {
    private(set) var isPremium: Bool = false

    func refresh() async {
        guard let info = try? await Purchases.shared.customerInfo() else { return }
        isPremium = info.entitlements["premium"]?.isActive == true
    }
}
```
`[ASSUMED — RESEARCH.md Assumption A2 / A5]`: confirm `Purchases.shared.customerInfo()` and `entitlements["premium"]` exact method/property names against RevenueCat's current docs before implementation — this example is not verbatim-verified against v5.80.2's API this session.

**Pitfall 2 (loading race):** add a third state, e.g. `private(set) var isLoaded: Bool = false`, set `true` only after the first `refresh()` resolves — mirrors `ImportFlowModel`'s pattern of exposing state via `private(set)` and mutating only through methods, never directly from views.

---

### `BanterApp/Paywall/PaywallView.swift` (component, request-response)

**Analog:** `BanterApp/Import/ConfirmTranscriptView.swift` (sticky bottom-bar CTA via `.safeAreaInset`)

**Sticky bottom CTA bar pattern** (lines 15-34, 167-204):
```swift
var body: some View {
    VStack(spacing: 0) {
        header
        if model.transcript.isEmpty { emptyState } else { messageList }
    }
    .background(Banter.Colors.background.ignoresSafeArea())
    .safeAreaInset(edge: .bottom, spacing: 0) {
        bottomBar
    }
}

private var bottomBar: some View {
    VStack(spacing: 0) {
        Divider()
        HStack {
            Button { model.startOver() } label: { Text("Start Over").foregroundStyle(Banter.Colors.destructive)... }
            Spacer()
            Button { model.confirm() } label: {
                Text("Confirm & Continue").foregroundStyle(.white).frame(maxWidth: .infinity).frame(minHeight: 44)
            }
            .buttonStyle(.borderedProminent)
            .tint(Banter.Colors.accent)
            .disabled(model.transcript.isEmpty)
            .opacity(model.transcript.isEmpty ? 0.5 : 1.0)
        }
        .padding(Banter.Spacing.md)
    }
    .background(Banter.Colors.background)
}
```
Copy this exact `.safeAreaInset(edge: .bottom, spacing: 0) { ... }` + `Divider()` + disabled/opacity-dimmed CTA pattern for the paywall's sticky "Start Free Trial" bar. UI-SPEC 4.5 explicitly calls this "matches Screen 3's sticky-bar pattern" — this is a direct, named reuse, not just a stylistic echo. Swap `.disabled(model.transcript.isEmpty)` for `.disabled(isPurchaseInFlight)`, and replace the button label with a `ProgressView` when `isPurchaseInFlight` per UI-SPEC's "Purchase in progress" state.

**Dismiss button pattern:** no exact analog (`ConfirmTranscriptView` has no dismiss-X), but `attributionChip`'s 44×44pt tappable-icon-button shape (lines 76-94) is the right template for the top-trailing `xmark` dismiss affordance.

---

### `BanterApp/Paywall/DailyCapTracker.swift` (utility, CRUD)

**Analog:** `BanterShared/Sources/BanterShared/AppGroupStore.swift` (same read/write primitive as `SentimentTimelineStore`)

Use `AppGroupStore.read(Int.self, forKey: "dailyCap.\(todayDateString)")` / `.write(...)` for the counter, resetting naturally since the key is date-scoped (no explicit "reset at midnight" logic needed — a new day produces a new key with no prior value, defaulting to 0). This sidesteps Pitfall 1's growth concern entirely since there's exactly one small `Int` per day, not an accumulating array — no cap-length decision needed here, unlike the timeline store.

---

## Shared Patterns

### Design tokens (100% reuse, zero new tokens except two proposed chart colors)
**Source:** `BanterApp/DesignSystem/BanterTokens.swift` (whole file)
**Apply to:** Every new file in this phase.
```swift
enum Banter {
    enum Spacing { static let xs: CGFloat = 4; static let sm: CGFloat = 8; static let md: CGFloat = 16
        static let lg: CGFloat = 24; static let xl: CGFloat = 32; static let xxl: CGFloat = 48; static let xxxl: CGFloat = 64 }
    enum Radius { static let sm: CGFloat = 8; static let md: CGFloat = 12; static let lg: CGFloat = 16 }
    enum TextStyle {
        static let display: Font = .largeTitle.weight(.bold)
        static let heading: Font = .title2.weight(.semibold)
        static let body: Font = .body
        static let label: Font = .footnote.weight(.medium)
    }
    enum Colors {
        static let background = Color("BackgroundColor", bundle: .main)
        static let surface = Color("SurfaceColor", bundle: .main)
        static let accent = Color("AccentColor", bundle: .main)
        static let destructive = Color("DestructiveColor", bundle: .main)
        static let textPrimary = Color("TextPrimaryColor", bundle: .main)
        static let textSecondary = Color("TextSecondaryColor", bundle: .main)
    }
}
```
If UI-SPEC's `chartPositive`/`chartNegative` addition is approved by the checker, add exactly two new `static let` entries to `Banter.Colors` (plus matching `Assets.xcassets` color sets named `ChartPositiveColor`/`ChartNegativeColor`, following the existing `"BackgroundColor"`/`"SurfaceColor"` naming convention) — do not restructure the enum.

### Reduce-Motion-aware animation helper
**Source:** `BanterApp/Import/ConfirmTranscriptView.swift` line 216-218 (also present, slightly different, in `ImportEntryView.swift` lines 112-114)
**Apply to:** `TagExplainerSheet` expand/collapse, `TonePickerView` selection change, tone-switch skeleton crossfade.
```swift
private var reduceMotionAwareAnimation: Animation? {
    UIAccessibility.isReduceMotionEnabled ? nil : .spring(response: 0.3, dampingFraction: 0.8)
}
```

### Toast / transient confirmation pattern
**Source:** `BanterApp/Import/ConfirmTranscriptView.swift` lines 29-33, 206-214
```swift
.overlay(alignment: .bottom) {
    if showClearedToast { clearedToast }
}
...
private var clearedToast: some View {
    Text("Cleared. Undo")
        .font(Banter.TextStyle.label)
        .padding(.horizontal, Banter.Spacing.md)
        .padding(.vertical, Banter.Spacing.sm)
        .background(Banter.Colors.surface)
        .clipShape(RoundedRectangle(cornerRadius: Banter.Radius.md))
        .padding(.bottom, Banter.Spacing.sm)
}
```
**Apply to:** `SuggestionCardView`'s "Copied" toast after tapping the Copy action (UI-SPEC 4.3), and `PaywallView`'s "Welcome to Premium" success toast (UI-SPEC 4.5) — same `.overlay(alignment: .bottom)` + `showX: Bool` + auto-dismiss-after-delay shape as the `Task { try? await Task.sleep(...); showClearedToast = false }` at `ConfirmTranscriptView.swift` lines 173-177.

### Primary CTA button recipe
**Source:** used identically in `ImportEntryView.swift` (lines 41-52), `ParsingProgressView.swift` (lines 61-71), `ConfirmTranscriptView.swift` (lines 187-199)
```swift
Button { /* action */ } label: {
    Text("Label")
        .font(Banter.TextStyle.body)
        .foregroundStyle(.white)      // or omitted when .borderedProminent auto-contrasts
        .frame(maxWidth: .infinity)
        .frame(minHeight: 52)          // or 44 for secondary/inline CTAs
}
.buttonStyle(.borderedProminent)
.tint(Banter.Colors.accent)
.disabled(condition)
.opacity(condition ? 0.5 : 1.0)
```
**Apply to:** Every primary CTA across all 6 new screens (Welcome "Try It Now", priming "Continue", paywall "Start Free Trial", etc.) — this is the single established recipe, do not invent a variant per screen.

### AppGroupStore generic read/write
**Source:** `BanterShared/Sources/BanterShared/AppGroupStore.swift` (whole file, 36 lines)
**Apply to:** `SentimentTimelineStore`, `DailyCapTracker` — both are thin, key-scoped wrappers over this exact primitive, never a second persistence mechanism.

### Structural boundary-guard test pattern
**Source:** `BanterShared/Tests/BanterSharedTests/NetworkBoundaryGuardTests.swift` (whole file) and `GeminiKeyBoundaryGuardTests.swift` (whole file)
```swift
final class SomeBoundaryGuardTests: XCTestCase {
    func testForbiddenTokenAbsent() throws {
        let thisFile = URL(fileURLWithPath: #filePath)
        let targetFileURL = thisFile /* .deletingLastPathComponent() chain to target */
        let source = try String(contentsOf: targetFileURL, encoding: .utf8)
        let forbidden = ["token1", "token2"]
        for token in forbidden {
            XCTAssertFalse(source.contains(token), "Forbidden token '\(token)' found — <boundary> violated")
        }
    }
}
```
**Apply to:** `SentimentTimelineStoreTests`' CALC-03 negative test (assert no store method signature contains a match-name/identity parameter — can be done as a source-scan of `SentimentTimelineStore.swift` for forbidden parameter-name tokens like `matchName`/`matchId`, following this exact `#filePath`-navigation + forbidden-token-list shape) and optionally a new guard ensuring RevenueCat's public API key (safe-by-design, unlike `GEMINI_API_KEY`) is the *only* credential type present, i.e. no `GEMINI_API_KEY`-style secret is accidentally introduced in `EntitlementManager.swift`.

### CI screenshot artifact pattern (XCUITest)
**Source:** `BanterUITests/ScreenshotArtifactTests.swift` (whole file, 59 lines)
```swift
final class ScreenshotArtifactTests: XCTestCase {
    func testCaptureKeyScreens() throws {
        let entryApp = XCUIApplication()
        entryApp.launch()
        waitForLaunchAnimationToSettle(entryApp, matching: "Choose Screenshot")
        capture(entryApp, name: "00_import_entry")
        entryApp.terminate()
    }
    private func waitForLaunchAnimationToSettle(_ app: XCUIApplication, matching label: String) {
        let element = app.buttons[label]
        _ = element.waitForExistence(timeout: 10)
    }
    private func capture(_ app: XCUIApplication, name: String) {
        let screenshot = app.windows.firstMatch.screenshot()
        let attachment = XCTAttachment(screenshot: screenshot)
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
```
**Apply to:** `OnboardingFlowTests.swift`, `PermissionPrimingTests.swift` — reuse `waitForLaunchAnimationToSettle`/`capture` verbatim (extract to a shared XCUITest helper file if not already shared, since Phase 4 adds a second consumer of this exact logic). Continue the pattern of launch-argument-seeded deterministic states (`ImportFlowModel.seedSampleTranscriptArgument` precedent) for any Phase 4 screen needing a fixture-driven CI screenshot (e.g. seeding `ConversationHealthView` with a static `[SentimentEvent]` array, or `PaywallView` with a mocked `StoreProduct` fixture per UI-SPEC's CI Screenshot Verifiability section).

### RevenueCat entitlement gate (new pattern, no prior analog — first third-party SDK)
**Source:** RESEARCH.md Pattern 3 (not yet in codebase — flagged here since it's the one genuinely new architectural surface this phase introduces)
```swift
import RevenueCat

@Observable
final class EntitlementManager {
    private(set) var isPremium: Bool = false
    func refresh() async {
        guard let info = try? await Purchases.shared.customerInfo() else { return }
        isPremium = info.entitlements["premium"]?.isActive == true
    }
}
```
**Apply to:** `PaywallView`, `DailyCapTracker` (cap-check must consult `EntitlementManager.isPremium` before incrementing/blocking), `ConversationHealthView` (calculator-depth gating). **Confirm exact API surface against RevenueCat v5.80.2 docs before implementation** — flagged `[ASSUMED]` per RESEARCH.md Assumption A2/A5 and Open Question 3.

## No Analog Found

None — every file in this phase's scope has at least a role-match analog in the existing Phase 1-3 codebase. The two genuinely novel surfaces (`CoachingClient`'s first-ever network call from `BanterApp`, and `EntitlementManager`'s RevenueCat wrapper) have no prior Swift analog to copy verbatim, but both have documented target shapes in 04-RESEARCH.md's own Code Examples/Pattern sections, which this document treats as the de facto pattern source for those two files specifically (called out inline above rather than listed as a gap).

## Metadata

**Analog search scope:** `BanterApp/` (all screens + DesignSystem), `BanterShared/Sources/BanterShared/` (all models, AppGroupStore), `BanterShared/Tests/BanterSharedTests/` (all test files), `BanterUITests/` (XCUITest file), `Backend/functions/coaching/` (taxonomy.ts/.json, for the client-side mirror model's field shape only — read-only reference, not modified)
**Files scanned:** 24 (17 Swift source files across BanterApp/BanterShared/BanterUITests, 7 Backend/test files for contract cross-reference)
**Pattern extraction date:** 2026-07-04
