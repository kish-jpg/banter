# Phase 5: Keyboard Extension - Pattern Map

**Mapped:** 2026-07-06
**Files analyzed:** 9 (new/modified, per 05-RESEARCH.md's Recommended Project Structure + 05-UI-SPEC.md screens + Wave 0 test gaps)
**Analogs found:** 9 / 9 (all have at least a role-match; every pattern shape this phase needs already exists in Phases 1-4)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|-----------------|---------------|
| `BanterKeyboard/KeyboardViewController.swift` | controller (UIInputViewController, REWRITE) | request-response (local read + tap-to-insert) | Itself (Phase 1 placeholder, same file) | exact — extend in place, do not restructure |
| `BanterKeyboard/KeyboardSuggestionsView.swift` | component (SwiftUI view, NEW) | request-response (static/local data) | `BanterApp/Paywall/DowngradeBanner.swift` (card/row + storage-key-enum co-location shape) | role-match |
| `BanterShared/Sources/BanterShared/CachedSuggestionsStorageKey.swift` (or co-located enum) | model (typed storage key) | CRUD (App Group key constant) | `BanterApp/Paywall/DowngradeBanner.swift`'s `DowngradeBannerStorageKey` enum | exact |
| `BanterApp/Home/HomeModel.swift` (MODIFY: extend `onResponse`) | store (`@Observable` state class) | event-driven (extend existing closure) | Itself — `startCoaching()`'s existing `onResponse` closure (already wired 04-07 for sentiment write) | exact — additive one-line change |
| `BanterApp/Onboarding/PermissionPrimingView.swift` (MODIFY: additive `.keyboard(...)` factory + `steps` param) | component (screen, additive) | request-response | Itself — existing `.photos(...)` static factory | exact — additive, backward-compatible |
| `BanterApp/Home/HomeView.swift` (MODIFY: add Screen 5.3 banner) | component (screen, additive) | request-response | `BanterApp/Paywall/DowngradeBanner.swift` + its `HomeView` integration (`model.showDowngradeBanner` conditional render) | exact |
| `BanterShared/Tests/BanterSharedTests/CachedSuggestionsRoundTripTests.swift` (NEW) | test (unit, round-trip) | CRUD | `BanterShared/Tests/BanterSharedTests/AppGroupRoundTripTests.swift` | exact |
| `BanterShared/Tests/BanterSharedTests/KeyboardNetworkBoundaryGuardTests.swift` (NEW, KEYS-03) | test (structural/negative-guard) | event-driven (compile-time source scan) | `BanterShared/Tests/BanterSharedTests/NetworkBoundaryGuardTests.swift` | exact |
| `project.yml` (verify only, no change expected) | config | n/a | Itself — `BanterKeyboard` target block already correctly scoped | exact — negative-constraint verification only |

## Pattern Assignments

### `BanterKeyboard/KeyboardViewController.swift` (controller, request-response — REWRITE)

**Analog:** the file itself (Phase 1 placeholder), full contents already read:

```swift
// Current Phase 1 placeholder — BanterKeyboard/KeyboardViewController.swift, whole file (27 lines)
import UIKit
import BanterShared

class KeyboardViewController: UIInputViewController {
    override func viewDidLoad() {
        super.viewDidLoad()

        let message = AppGroupStore.read(ConversationMessage.self, forKey: "sample_message")

        let label = UILabel()
        label.numberOfLines = 0
        label.text = message.map { "Read from App Group: \($0.text)" }
            ?? "No sample written yet"

        label.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(label)
        NSLayoutConstraint.activate([
            label.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 8),
            label.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -8),
            label.topAnchor.constraint(equalTo: view.topAnchor, constant: 8),
        ])
    }
}
```

**What to keep verbatim:** `import UIKit` / `import BanterShared` (no new imports needed — no `import RevenueCat`, no `import Network`/`URLSession` ever, per KEYS-03), the `class KeyboardViewController: UIInputViewController` declaration line, and the proof that `AppGroupStore.read(_:forKey:)` already works cross-process with `RequestsOpenAccess=false`.

**What to replace:** the raw `UILabel` + manual `NSLayoutConstraint` block is replaced by a `UIHostingController<KeyboardSuggestionsView>` added as a child VC (05-RESEARCH.md Pattern 1, lines 135-166 — copy that exact `addChild`/`view.addSubview`/`translatesAutoresizingMaskIntoConstraints = false`/`NSLayoutConstraint.activate([...four edge anchors...])`/`didMove(toParent:)` shape, it is the direct structural descendant of this same file's existing constraint-activation idiom, just targeting `hosting.view` instead of `label`).

**Re-read on appearance (05-RESEARCH.md Anti-Patterns + Pattern 2):** add `override func viewWillAppear(_ animated: Bool)` that re-reads `AppGroupStore` and re-checks `needsInputModeSwitchKey` fresh — do not cache from `viewDidLoad` only. Update `hostingController?.rootView` in place; do not reconstruct the `UIHostingController`.

**Tap-to-insert core (KEYS-01/02):**
```swift
onInsert: { [weak self] text in
    self?.textDocumentProxy.insertText(text)
},
onSwitchKeyboard: { [weak self] in
    self?.advanceToNextInputMode()
}
```

**Storage key read call:**
```swift
AppGroupStore.read([ReplySuggestion].self, forKey: CachedSuggestionsStorageKey.suggestions) ?? []
```

---

### `BanterKeyboard/KeyboardSuggestionsView.swift` (component, request-response — NEW)

**Analog:** `BanterApp/Paywall/DowngradeBanner.swift` (whole file, 47 lines) — closest existing shape for "a small SwiftUI card/row view driven by static/local data, paired with a co-located storage-key enum in the same file."

**Row/card composition pattern** (`DowngradeBanner.swift` lines 6-39):
```swift
struct DowngradeBanner: View {
    let onGoPremium: () -> Void

    var body: some View {
        HStack(alignment: .top, spacing: Banter.Spacing.sm) {
            Image(systemName: "arrow.uturn.backward.circle")
                .foregroundStyle(Banter.Colors.textSecondary)
                .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: Banter.Spacing.xs) {
                Text("You're back on the free plan")
                    .font(Banter.TextStyle.heading)
                    .foregroundStyle(Banter.Colors.textPrimary)
                Text("...")
                    .font(Banter.TextStyle.body)
                    .foregroundStyle(Banter.Colors.textSecondary)
                Button { onGoPremium() } label: {
                    Text("Go Premium")
                        .font(Banter.TextStyle.body)
                        .foregroundStyle(Banter.Colors.accent)
                        .frame(minHeight: 44)
                }
            }
        }
        .padding(Banter.Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Banter.Colors.surface)
        .clipShape(RoundedRectangle(cornerRadius: Banter.Radius.lg))
    }
}
```
Adapt this exact `Button { onAction() } label: { Text(...).frame(minHeight: 44) }` per-row tappable shape for each suggestion row, but per 05-UI-SPEC.md Screen 5.1: use `Banter.TextStyle.label` (not `.heading`/`.body`) for row text, `Banter.Spacing.xs` between rows (not `.md` padding — keyboard real estate is tight), `Banter.Radius.sm` (not `.lg`) corners, and do NOT apply a `Banter.Colors.surface` full-background fill to the outer container — only individual row pills get `surface` fill (05-UI-SPEC.md Color section: the keyboard tray itself defers to system background).

**Use 05-RESEARCH.md's own Code Examples section verbatim as the primary structural template** (already-written, ready to copy near-verbatim):
```swift
struct KeyboardSuggestionsView: View {
    let suggestions: [ReplySuggestion]
    let onInsert: (String) -> Void
    var needsInputModeSwitchKey: Bool
    let onSwitchKeyboard: () -> Void

    var body: some View {
        VStack(spacing: Banter.Spacing.xs) {
            if suggestions.isEmpty {
                Text("Open Banter to analyze a conversation")
                    .font(Banter.TextStyle.label)
                    .foregroundStyle(Banter.Colors.textSecondary)
                    .padding()
            } else {
                ForEach(suggestions.prefix(3), id: \.text) { suggestion in
                    Button {
                        onInsert(suggestion.text)
                    } label: {
                        Text(suggestion.text)
                            .font(Banter.TextStyle.label)
                            .lineLimit(2)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(Banter.Spacing.sm)
                    }
                    .background(Banter.Colors.surface)
                    .clipShape(RoundedRectangle(cornerRadius: Banter.Radius.sm))
                }
            }

            if needsInputModeSwitchKey {
                Button(action: onSwitchKeyboard) {
                    Image(systemName: "globe")
                        .foregroundStyle(Banter.Colors.textSecondary) // never accent — 05-UI-SPEC.md Color
                        .frame(width: 44, height: 44)
                }
            }
        }
    }
}
```
Note the exact 44×44pt tap-target discipline is identical to every other button in this codebase (`DowngradeBanner`'s "Go Premium", `PermissionPrimingView`'s "Not Now", `attributionChip` in `ConfirmTranscriptView.swift`) — `.frame(minHeight: 44)` / `.frame(width: 44, height: 44)` is the established floor, reuse verbatim.

**Appearance strategy (05-UI-SPEC.md, NEW this phase — no prior analog, first host-appearance-tracking surface):** pass an `isDark: Bool` derived from `textDocumentProxy.keyboardAppearance` (consulted in `KeyboardViewController`, not read via `@Environment(\.colorScheme)` alone inside this view) down as a parameter. No existing view in this codebase needs this pattern — Phases 2/4 are dark-mode-first only. Treat this as the one genuinely novel piece; 05-RESEARCH.md's Color/Appearance Strategy section is the primary source, not a codebase analog.

---

### Typed storage key — `CachedSuggestionsStorageKey` (model, CRUD — NEW)

**Analog:** `BanterApp/Paywall/DowngradeBanner.swift` lines 41-46 (`DowngradeBannerStorageKey`, co-located in the same file as its consuming view):
```swift
enum DowngradeBannerStorageKey {
    static let lastSeenDowngrade = "downgradeBanner.lastSeenDowngrade"
}
```
Mirror this exact one-key enum shape. 05-RESEARCH.md's Code Examples section already specifies the target shape and placement (`BanterShared`, `public` — unlike `DowngradeBannerStorageKey` which is internal to `BanterApp` since only `BanterApp` writes it, `CachedSuggestionsStorageKey` must be `public` because BOTH `BanterApp` (writer) and `BanterKeyboard` (reader) need to reference it across the SPM package boundary):
```swift
public enum CachedSuggestionsStorageKey {
    public static let suggestions = "cached_suggestions"
}
```
Also mirror `DailyCapTracker.swift`'s date-scoped key-string convention (`"dailyCap.\(dateString)"`) and `SentimentTimelineStore.swift`'s (`"timeline.\(conversationId)"`) for the *naming style* precedent (dot-scoped, lowercase-prefix strings) even though this key has no per-instance suffix — it is a single overwrite-on-every-response key, matching `lastKnownPremiumKey`'s ungated single-key pattern in `HomeModel.swift` line 29 more closely than the per-id keys.

---

### `BanterApp/Home/HomeModel.swift` (MODIFY — extend `onResponse`, event-driven)

**Analog:** the file itself — `startCoaching()`'s existing `onResponse` closure (lines 60-71, already read):
```swift
func startCoaching() async {
    let model = CoachingResultModel(
        messages: importModel.transcript,
        capGate: { [entitlement] in HomeModel.makeCapTracker().canAnalyze(isPremium: entitlement.isPremium) },
        onAnalysisRecorded: { HomeModel.makeCapTracker().recordAnalysis() },
        onResponse: { [sentimentStore, conversationId, importModel] response in
            sentimentStore.append(from: response, conversationId: conversationId, messageIndex: max(0, importModel.transcript.count - 1), speaker: .match)
        }
    )
    coaching = model
    await model.selectTone(model.selectedTone)
}
```
**Additive one-line change** (per 05-RESEARCH.md Code Examples — this is the exact diff, not a rewrite):
```swift
onResponse: { [sentimentStore, conversationId, importModel] response in
    sentimentStore.append(from: response, conversationId: conversationId, messageIndex: max(0, importModel.transcript.count - 1), speaker: .match)
    // NEW this phase (KEYS-01): cache suggestions for the keyboard to read.
    AppGroupStore.write(response.replies, forKey: CachedSuggestionsStorageKey.suggestions)
}
```
This is the exact same closure-capture-list style already used for `sentimentStore`/`conversationId`/`importModel` — no new capture needed since `AppGroupStore`/`CachedSuggestionsStorageKey` are static/enum, not instance state.

**Precedent for single-key overwrite-write via `AppGroupStore.write`:** `HomeModel.swift` lines 34, 42, 52, 54 (`lastKnownPremiumKey`, `DowngradeBannerStorageKey.lastSeenDowngrade`) — same "just call `AppGroupStore.write(value, forKey: someKey)`" idiom, no read-modify-write needed since this is a full overwrite of the latest value (matches 05-RESEARCH.md Open Question 2's recommendation: cache only the most recent `[ReplySuggestion]`).

---

### `BanterApp/Onboarding/PermissionPrimingView.swift` (MODIFY — additive `.keyboard(...)` factory + `steps` param)

**Analog:** the file itself — existing `.photos(...)` static factory (lines 73-86, already read):
```swift
extension PermissionPrimingView {
    static func photos(onContinue: @escaping () -> Void, onSkip: @escaping () -> Void) -> PermissionPrimingView {
        PermissionPrimingView(
            icon: "photo.on.rectangle.angled",
            heading: "Let Banter read your screenshot",
            body: "We only look at the one screenshot you choose. It never leaves your device — Banter reads it, then forgets it.",
            onContinue: onContinue,
            onSkip: onSkip
        )
    }
}
```
**Two changes needed, both additive/backward-compatible (per 04-PATTERNS.md's own doc-comment intent: "written generic from the start... Phase 5's keyboard-enable priming reuses this exact component"):**

1. Add a `steps: [String]?` param to the base `PermissionPrimingView` struct (defaults to `nil`), rendered as an additional `Text` block (per 05-UI-SPEC.md Screen 5.2 point 4 — "a simple `Text` block, ladder-rung-6 simplicity", not separate numbered-list UI chrome) inserted between the body copy and the primary CTA in `body`. The existing `.photos(...)` call site in `ValueDemoCoordinatorView.swift` line 56 requires zero changes — `nil` is the default.

2. Add the new static factory, same shape as `.photos(...)`:
```swift
static func keyboard(onContinue: @escaping () -> Void, onSkip: @escaping () -> Void) -> PermissionPrimingView {
    PermissionPrimingView(
        icon: "keyboard",
        heading: "Type without switching apps",
        body: "Turn on the Banter keyboard to insert your suggestions directly into any chat — no copy-paste, no app-switching.",
        steps: [
            "1. Open Settings → General → Keyboard → Keyboards",
            "2. Tap Add New Keyboard, then choose Banter",
            "3. Tap Banter in the list and make sure Allow Full Access stays off — Banter never needs it"
        ],
        onContinue: onContinue,
        onSkip: onSkip
    )
}
```
Also add the reassurance line ("Banter's keyboard never needs Full Access and never connects to the internet on its own.") per 05-UI-SPEC.md's copy contract — this can be a fixed `Text` appended only in the `.keyboard(...)` path (e.g. an optional `reassurance: String?` param, same nil-default-additive pattern as `steps`) or hardcoded conditionally; either satisfies the contract, prefer matching `steps`' additive-param shape for consistency.

**Call site (new, KEYS-04):** `BanterApp/Home/HomeView.swift` or a new coordinator step — grep-verifiable per 05-RESEARCH.md's Validation Architecture (`grep -q 'PermissionPrimingView.keyboard' BanterApp/`), mirroring how `.photos(...)`'s call site lives in `ValueDemoCoordinatorView.swift` line 56 (a `switch`/state-driven dispatch, not a modal push — follow `ContentView.swift`/`ValueDemoCoordinatorView.swift`'s established "state-driven view swapping, never NavigationStack push" convention per 04-PATTERNS.md).

**`prefs:` deep link primary CTA (KEYS-04, new — no analog, first use of this URL scheme in the codebase):**
```swift
if let url = URL(string: "prefs:root=General&path=Keyboard") {
    UIApplication.shared.open(url)
}
```
Requires adding a `prefs` URL type to `BanterApp/Info.plist` (project-config task, not a Swift pattern — see project.yml/Info.plist section below).

---

### `BanterApp/Home/HomeView.swift` (MODIFY — add Screen 5.3 banner)

**Analog:** the file itself — `model.showDowngradeBanner` conditional render (lines 14-19, already read):
```swift
var body: some View {
    VStack(spacing: 0) {
        if model.showDowngradeBanner {
            DowngradeBanner(onGoPremium: { showPaywall = true })
                .padding(.horizontal, Banter.Spacing.md)
                .padding(.top, Banter.Spacing.sm)
        }
        Group { ... }
    }
}
```
Add a `KeyboardEnableBanner`-equivalent (05-UI-SPEC.md Screen 5.3, "same visual family as `DowngradeBanner`") using the identical `if condition { BannerView(...).padding(...) }` slot at the top of the `VStack`, gated on a new `@AppStorage`-backed dismissal/detection flag (05-UI-SPEC.md Screen 5.3 States — "same `@AppStorage`-tracked 'last seen' flag pattern as `DowngradeBanner`'s dismissal", though note `DowngradeBanner`'s own dismissal state actually lives in `AppGroupStore` via `DowngradeBannerStorageKey`, not literal `@AppStorage` — follow whichever HomeModel already uses for consistency, i.e. `AppGroupStore.read/write(Bool.self, forKey:)`, not a new `@AppStorage` property wrapper).

**Banner content shape:** reuse `DowngradeBanner.swift`'s exact `HStack(alignment: .top, spacing: Banter.Spacing.sm) { Image(...); VStack(alignment: .leading) { Text(heading); Text(body); } }` + `.padding(Banter.Spacing.md).background(Banter.Colors.surface).clipShape(RoundedRectangle(cornerRadius: Banter.Radius.lg))` container recipe verbatim, per 05-UI-SPEC.md Screen 5.3's own explicit callout ("same visual family as Phase 4's `DowngradeBanner`").

---

### `BanterShared/Tests/BanterSharedTests/CachedSuggestionsRoundTripTests.swift` (test, unit/round-trip — NEW)

**Analog:** `BanterShared/Tests/BanterSharedTests/AppGroupRoundTripTests.swift` (whole file, 42 lines, already read) — copy its exact structure:
```swift
import XCTest
@testable import BanterShared

final class CachedSuggestionsRoundTripTests: XCTestCase {
    func testCachedSuggestionsRoundTrip() {
        let suggestions = [ReplySuggestion(text: "hey!", psychologyTag: "reciprocity", style: .playful)]
        AppGroupStore.write(suggestions, forKey: CachedSuggestionsStorageKey.suggestions)
        let read = AppGroupStore.read([ReplySuggestion].self, forKey: CachedSuggestionsStorageKey.suggestions)
        XCTAssertEqual(read, suggestions)
    }
}
```
Follows `testReplySuggestionRoundTrips()` (lines 17-22) exactly, just swapping the single `ReplySuggestion` for `[ReplySuggestion]` and using the real `CachedSuggestionsStorageKey.suggestions` constant instead of a literal test key string (since this test IS the contract proof for that specific key, not a generic round-trip check).

---

### `BanterShared/Tests/BanterSharedTests/KeyboardNetworkBoundaryGuardTests.swift` (test, structural/negative-guard — NEW, KEYS-03)

**Analog:** `BanterShared/Tests/BanterSharedTests/NetworkBoundaryGuardTests.swift` (whole file, 30 lines, already read) — copy its exact `#filePath`-navigation + forbidden-token-list shape, but scan `BanterKeyboard/` sources (a new scan root) instead of `NetworkDTOs.swift`:
```swift
final class KeyboardNetworkBoundaryGuardTests: XCTestCase {
    func testBanterKeyboardSourcesContainNoNetworkOrRevenueCatTokens() throws {
        let thisFile = URL(fileURLWithPath: #filePath)
        let keyboardDirURL = thisFile
            .deletingLastPathComponent() // BanterSharedTests/
            .deletingLastPathComponent() // Tests/
            .deletingLastPathComponent() // BanterShared/ (package root)
            .deletingLastPathComponent() // repo root
            .appendingPathComponent("BanterKeyboard")

        let enumerator = FileManager.default.enumerator(at: keyboardDirURL, includingPropertiesForKeys: nil)
        let forbidden = ["URLSession", "import RevenueCat", "import Network"]

        while let fileURL = enumerator?.nextObject() as? URL {
            guard fileURL.pathExtension == "swift" else { continue }
            let source = try String(contentsOf: fileURL, encoding: .utf8)
            for token in forbidden {
                XCTAssertFalse(
                    source.contains(token),
                    "Forbidden token '\(token)' found in \(fileURL.lastPathComponent) — KEYS-03 boundary violated"
                )
            }
        }
    }
}
```
Note: `NetworkBoundaryGuardTests.swift`'s original navigates to a single known file (`NetworkDTOs.swift`); this new guard must instead enumerate an entire directory (`BanterKeyboard/`) since it is scanning a whole target's sources, not one file — the `FileManager.default.enumerator(at:includingPropertiesForKeys:)` walk is the minimal addition needed on top of the copied navigation/forbidden-token-loop shape. This matches 05-RESEARCH.md's Validation Architecture's exact grep-equivalent command (`grep -riE 'URLSession|import RevenueCat|import Network' BanterKeyboard/`) translated into the existing Swift/XCTest structural-guard idiom this codebase already uses (rather than shelling out to `grep` from a test, which is not this project's established style — `NetworkBoundaryGuardTests`/`GeminiKeyBoundaryGuardTests` both read source via `String(contentsOf:)` and use `.contains(token)`, not a subprocess).

---

### `project.yml` (config — verify only)

**Analog:** the file itself, `BanterKeyboard` target block (lines 28-42, already read) — already correctly scoped:
```yaml
BanterKeyboard:
  type: app-extension
  platform: iOS
  deploymentTarget: "18.0"
  sources:
    - path: BanterKeyboard
  dependencies:
    - package: BanterShared
  entitlements:
    path: BanterKeyboard/BanterKeyboard.entitlements
    properties:
      com.apple.security.application-groups:
        - group.com.banter.shared
  info:
    path: BanterKeyboard/Info.plist
```
**No change expected this phase** — this is a negative-constraint verification, not a new pattern to write. The planner/executor should assert (structurally, e.g. as part of the KEYS-03 guard test's scope, or a simple grep in CI) that `BanterKeyboard.dependencies` never gains a `RevenueCat` entry, matching the `BanterApp` target's dependency list (lines 17-19) which DOES include RevenueCat — the asymmetry between the two targets' `dependencies` blocks IS the enforced pattern.

**`BanterApp/Info.plist` (MODIFY — add `prefs` URL type, project-config task for KEYS-04's CTA):** current file (11 lines, already read) has only `CFBundleDisplayName`/`UILaunchScreen`. Per 05-RESEARCH.md Pitfall 5/QA1924, add a `CFBundleURLTypes` array with scheme `prefs` — this is a plain Info.plist XML addition, no Swift analog needed, follow Apple's QA1924 setup steps directly.

**`BanterKeyboard/Info.plist` / `BanterKeyboard.entitlements` — unchanged, already correct:** `RequestsOpenAccess=false` (already set, lines 17-18 of `Info.plist`) and the App Group entitlement string (`group.com.banter.shared`, identical in both `.entitlements` files) are both already correctly wired from Phase 1 — no changes needed, only verification that they remain unchanged.

---

## Shared Patterns

### AppGroupStore generic read/write (unchanged since Phase 1)
**Source:** `BanterShared/Sources/BanterShared/AppGroupStore.swift` (whole file, 36 lines)
**Apply to:** every new cross-process read/write this phase (`CachedSuggestionsStorageKey.suggestions` write in `HomeModel`, read in `KeyboardViewController`) — this is the sole cross-process mechanism in the codebase; never introduce a second one (e.g. raw `FileManager` shared container).
```swift
public static func write<T: Codable>(_ value: T, forKey key: String) { ... }
public static func read<T: Codable>(_ type: T.Type, forKey key: String) -> T? { ... }
```

### Typed storage-key enum, co-located with its consuming type
**Source:** `BanterApp/Paywall/DowngradeBanner.swift` lines 41-46 (`DowngradeBannerStorageKey`); precedent also in `HomeModel.swift` line 29 (`lastKnownPremiumKey`) and `DailyCapTracker.swift`/`SentimentTimelineStore.swift`'s date/id-scoped key-string convention.
**Apply to:** `CachedSuggestionsStorageKey.suggestions` — one canonical string constant, never a repeated raw literal across `HomeModel.swift` (writer) and `KeyboardViewController.swift` (reader).

### 44×44pt minimum tap target (hard floor, every phase so far)
**Source:** `BanterApp/Onboarding/PermissionPrimingView.swift` line 63 (`"Not Now"` button, `.frame(minHeight: 44)`), `BanterApp/Paywall/DowngradeBanner.swift` line 30, `ConfirmTranscriptView.swift`'s `attributionChip`.
**Apply to:** every tappable element in Phase 5 — keyboard suggestion rows, the globe key (44×44pt exactly per 05-UI-SPEC.md), Screen 5.2's Continue/Not Now/Done buttons, Screen 5.3's banner tap-through.

### Structural boundary-guard test pattern (negative-grep-equivalent XCTest)
**Source:** `BanterShared/Tests/BanterSharedTests/NetworkBoundaryGuardTests.swift` (whole file) and `GeminiKeyBoundaryGuardTests.swift` (same shape)
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
**Apply to:** the new KEYS-03 guard (`KeyboardNetworkBoundaryGuardTests`), extended to walk a directory (`BanterKeyboard/`) rather than one file, per the Pattern Assignment above.

### CI screenshot/preview artifact pattern (SwiftUI `#Preview`, not XCUITest, for the keyboard surface)
**Source:** `BanterUITests/ScreenshotArtifactTests.swift` (whole file, 35 lines) for the XCUITest half (Screens 5.2/5.3, ordinary `BanterApp`-process screens); `BanterApp/ContentView.swift`'s `--seed-sample-transcript` static-fixture-seeding convention for the SwiftUI-preview half (Screen 5.1, per 05-RESEARCH.md Pitfall 3 — `KeyboardSuggestionsView` is verified via a `#Preview` with static sample `[ReplySuggestion]` data, NOT a live XCUITest, since cross-app keyboard-switching is not automatable).
**Apply to:** `KeyboardSuggestionsView`'s `#Preview` (default-with-3-suggestions + empty-state, both static-data previews); Screens 5.2/5.3 continue using `waitForLaunchAnimationToSettle`/`capture` verbatim from `ScreenshotArtifactTests.swift` for any new XCUITest screenshot coverage.

### Primary CTA button recipe (unchanged since Phase 2)
**Source:** `PermissionPrimingView.swift` lines 42-56 (`.buttonStyle(.borderedProminent)`, `.tint(Banter.Colors.accent)`, 52pt height, `Banter.Radius.md` clip)
**Apply to:** Screen 5.2's "Open Keyboard Settings" primary CTA — copy this exact modifier chain verbatim, swapping only the action (`prefs:` deep link `UIApplication.shared.open(url)` instead of `onContinue()`).

## No Analog Found

None — every file in this phase's scope has at least a role-match analog in the existing Phase 1-4 codebase. The one genuinely novel piece is the keyboard-surface **host-appearance-tracking** (`textDocumentProxy.keyboardAppearance` consulted ahead of `@Environment(\.colorScheme)`) — no prior view in this dark-mode-first codebase needs this, so 05-RESEARCH.md's own Color/Appearance Strategy section (not a codebase file) is the pattern source for that one specific mechanism. Everything else (SwiftUI-in-UIKit-extension hosting, AppGroupStore read/write, typed storage keys, banner/card composition, structural boundary guards, round-trip tests, additive component-factory extension) has a direct, already-built in-repo analog.

## Metadata

**Analog search scope:** `BanterKeyboard/` (target sources + Info.plist/entitlements), `BanterApp/Home/`, `BanterApp/Onboarding/`, `BanterApp/Paywall/`, `BanterApp/DesignSystem/`, `BanterShared/Sources/BanterShared/` (AppGroupStore, Models, Paywall, Calculator), `BanterShared/Tests/BanterSharedTests/` (all test files), `BanterUITests/`, `project.yml`
**Files scanned:** 19 (9 new/modified files' closest analogs + supporting cross-reference reads: `ReplySuggestion.swift`, `HomeView.swift`, `ContentView.swift`, `BanterTokens.swift`, `ValueDemoCoordinatorView.swift`, `PermissionPrimingTests.swift`, `04-PATTERNS.md`, `ScreenshotArtifactTests.swift`, `Info.plist`/`.entitlements` x2)
**Pattern extraction date:** 2026-07-06
