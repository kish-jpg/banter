# Phase 5: Keyboard Extension - Research

**Researched:** 2026-07-06
**Domain:** iOS custom keyboard extensions (UIInputViewController + SwiftUI), App Group cross-process data sharing, App Review keyboard-specific rules
**Confidence:** HIGH

## Summary

Phase 5 is a thin, read-only wedge: `BanterKeyboard` already exists as a working code-only placeholder (built in Phase 1) that proves the App Group round-trip end-to-end — the app writes, the keyboard reads, with `RequestsOpenAccess=false`. This phase's job is narrower than it might sound: (1) give the app a real write path for `[ReplySuggestion]` into the App Group (today `CoachingResultModel.replies` is pure `@Observable` view-state, never persisted — confirmed by direct source read), (2) rebuild `KeyboardViewController` to host a real SwiftUI suggestion list via `UIHostingController` with a working "next keyboard" globe key and one-tap `textDocumentProxy.insertText`, (3) add a guided enable-flow reusing the already-generic `PermissionPrimingView` component plus the Apple-sanctioned `prefs:root=General&path=Keyboard` deep link, and (4) keep RevenueCat entirely out of the keyboard's dependency graph — it was never linked there and must stay that way.

The single highest-risk architectural claim — **"App Group container is readable by a keyboard extension without Full Access"** — is TRUE, confirmed by three converging sources (Apple Developer Forums thread quoting the sandbox's own default policy, an independent third-party guide, and Apple's official Guideline 4.4.1 itself which requires keyboards to "remain functional... without requiring full access," implying read access must exist for any zero-full-access keyboard to be viable) plus a fourth, decisive source: **this exact codebase already proved it structurally in Phase 1** (`KeyboardViewController.swift` reads `AppGroupStore` with `RequestsOpenAccess=false` set, verified and awaiting CI compile-proof). Writing FROM the keyboard requires Full Access; this phase's architecture never needs the keyboard to write anything except (optionally, and only if cross-process cap-tracking is attempted) a daily-cap counter — which a `ponytail:` comment already left in `DailyCapTracker.swift` explicitly flags as a Phase 5 problem with no atomic-increment solution across processes. Recommendation: keep the keyboard's daily-cap awareness read-only (display "come back tomorrow" if the app-side cap is hit) and do NOT have the keyboard itself write/decrement the cap — sidesteps the race entirely and matches the phase's actual success criteria (display + insert + no-network-without-Full-Access + guided enable), none of which require the keyboard to write.

**Primary recommendation:** Extend `HomeModel.startCoaching()`'s existing `onResponse` closure (already wired in 04-07 for the sentiment write) with one more line writing `response.replies` (and the transcript's last exchange for context) into `AppGroupStore`; rebuild `KeyboardViewController` as a thin `UIInputViewController` hosting a `UIHostingController<KeyboardSuggestionsView>` that reads that same key, renders up to 3 tappable suggestion rows, calls `textDocumentProxy.insertText(_:)` on tap, and always shows the globe/next-keyboard key when `needsInputModeSwitchKey` is true. Never link RevenueCat, WebKit/network code, or any heavy SwiftUI dependency graph into the `BanterKeyboard` target.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Suggestion generation (LLM call) | API / Backend | Frontend Server (SSR) — N/A, native app | Already built in Phase 3; keyboard never calls it directly (KEYS-03 boundary) |
| Suggestion persistence for keyboard read | Browser / Client (BanterApp process) | Database / Storage (App Group UserDefaults acts as the shared "storage" tier here) | The App Group container is the only cross-process channel; the writing app process owns freshness |
| Suggestion display + tap-to-insert | Browser / Client (BanterKeyboard process, a *separate* client-tier process from BanterApp) | — | UIInputViewController/textDocumentProxy is a client-only API surface; no server round-trip possible or needed |
| Daily-cap read (display only) | Browser / Client (BanterKeyboard, read-only) | Database / Storage (App Group as source of truth, written only by BanterApp) | Per the `ponytail:` comment already in `DailyCapTracker.swift`, cross-process writes race; keyboard must not write this key |
| Keyboard-enable detection + guided flow | Browser / Client (BanterApp, host app) | OS / Settings (iOS Settings app, via `prefs:` deep link) | `AppleKeyboards` UserDefaults key is host-app-readable; the `prefs:` deep link is Apple-sanctioned only from keyboard extension code, not host app code (see Pitfall 5) |
| Entitlement/RevenueCat state | Browser / Client (BanterApp only) | — | RevenueCat SDK must never link into BanterKeyboard target (memory + community-documented instability; see Don't Hand-Roll) |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `UIInputViewController` (UIKit, system) | iOS 18 SDK (project floor) | Base class for the keyboard extension's principal view controller | The only Apple-sanctioned entry point for `com.apple.keyboard-service` extensions — no alternative exists [VERIFIED: developer.apple.com/documentation/uikit/uiinputviewcontroller] |
| `UIHostingController` (SwiftUI, system) | iOS 18 SDK | Hosts a SwiftUI view tree inside the UIKit-mandated `UIInputViewController` | Standard, Apple-documented bridge pattern for SwiftUI-in-extension; the rest of this codebase (BanterApp) is 100% SwiftUI, so this keeps one UI paradigm for the suggestion list itself [CITED: developer.apple.com/documentation/swiftui/uihostingcontroller] |
| `AppGroupStore` (BanterShared, already built) | n/a (in-repo) | Cross-process read/write via App Group `UserDefaults(suiteName:)` | Already the project's sole App Group mechanism since Phase 1; do not introduce a second one (e.g. raw `FileManager` shared container) — reuse verbatim |
| `UITextDocumentProxy.insertText(_:)` (UIKit, system) | iOS 18 SDK | One-tap insertion of a suggestion into the host app's text field | The only API a keyboard extension has for text insertion; no alternative [VERIFIED: developer.apple.com/documentation/uikit/uiinputviewcontroller] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `advanceToNextInputMode()` (UIKit, system) | iOS 18 SDK | Switches to the next user-enabled keyboard | Called from the globe/next-keyboard key's action — mandatory per HIG and Guideline 4.4.1 |
| `needsInputModeSwitchKey` (UIKit, system property) | iOS 18 SDK | Tells the keyboard whether it must show the globe key | Check every time the keyboard's input view loads/updates (Apple explicitly warns this can change at runtime, e.g. on iPad with hardware keyboard attached) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `UIHostingController` wrapping SwiftUI | Pure UIKit (`UICollectionView`/manual `UIStackView`) | Lower memory footprint per view, but breaks from the rest of the codebase's SwiftUI-only convention; not worth the split given only 3 rows are ever rendered |
| Reading `AppleKeyboards` UserDefaults key (host app, to detect enabled state) | No detection at all (always show the enable-flow CTA) | The private-adjacent key is widely used in production apps (Gboard-style apps ship this) with no known rejection precedent found in this research; but it is officially undocumented — treat as [ASSUMED]/best-effort, never hard-block the UI on its result |

**Installation:**
No new package dependencies. `BanterKeyboard` target already exists in `project.yml` with `BanterShared` as its sole dependency — this phase adds zero new SPM packages.

**Version verification:** N/A — all APIs used are first-party UIKit/SwiftUI system frameworks bundled with the iOS 18 SDK already pinned in `project.yml` (`deploymentTarget: "18.0"` on both `BanterApp` and `BanterKeyboard`). No `npm view`/`pip index`/`cargo search` equivalent applies; verified instead via Apple's official documentation pages fetched directly in this session (see Sources).

## Package Legitimacy Audit

**Not applicable this phase.** No new external packages are introduced. `BanterKeyboard`'s only dependency (per `project.yml`) is the local `BanterShared` SPM package, already audited in Phase 1. `RevenueCat/purchases-ios` (audited and approved in 04-RESEARCH.md/04-UI-SPEC.md) explicitly must NOT be added to `BanterKeyboard`'s dependency list — this is a negative constraint, not a new package to vet.

**Packages removed due to [SLOP] verdict:** none — none proposed.
**Packages flagged as suspicious [SUS]:** none — none proposed.

## Architecture Patterns

### System Architecture Diagram

```
 BanterApp process                         BanterKeyboard process
 ┌─────────────────────────────┐           ┌──────────────────────────────┐
 │ HomeModel.startCoaching()   │           │ KeyboardViewController        │
 │   -> CoachingResultModel    │           │   (UIInputViewController)     │
 │        .selectTone()        │           │                                │
 │        -> CoachingClient    │           │  viewDidLoad / viewWillAppear  │
 │           (network, Phase 3)│           │   -> reads AppGroupStore for   │
 │        <- CoachingResponseDTO│          │      cached [ReplySuggestion]  │
 │                              │           │   -> hosts UIHostingController │
 │   onResponse closure (04-07,│           │      wrapping SwiftUI list     │
 │    extended this phase):    │           │                                │
 │    1. sentimentStore.append │           │  KeyboardSuggestionsView       │
 │       (already wired)       │           │   - up to 3 tappable rows      │
 │    2. AppGroupStore.write(  │           │   - tag row not required       │
 │       response.replies,     │           │     (KEYS scope is insertion,  │
 │       forKey: "cached_      │  ═══════▶ │     not the psychology-tag UI) │
 │       suggestions")         │  App      │   - tap row -> textDocumentProxy│
 │       [NEW this phase]      │  Group    │      .insertText(text)         │
 │                              │  (App-    │   - globe key when             │
 │  Guided enable flow:        │  GroupStore│     needsInputModeSwitchKey    │
 │   PermissionPrimingView     │  suite,   │     -> advanceToNextInputMode()│
 │   .keyboard(...) [NEW]      │  read-only │                                │
 │   -> detects enabled state  │  from      │  RequestsOpenAccess = false    │
 │      via AppleKeyboards key │  keyboard  │  (Info.plist, already set)     │
 │      [best-effort, ASSUMED] │  side)     │  -> no network code path in    │
 │   -> "Continue" deep-links  │           │     this target at all (KEYS-03)│
 │      to Settings via        │           │  -> RevenueCat NOT linked      │
 │      UIApplication.         │           │     (memory + stability)       │
 │      openSettingsURLString  │           │                                │
 │      (host-app-safe variant)│           └──────────────────────────────┘
 └─────────────────────────────┘
```

A reader tracing the primary use case: app generates suggestions (existing Phase 3/4 flow) → app writes cached suggestions into the App Group (this phase's one new write call) → user switches to the Banter keyboard inside any chat app → keyboard reads the same App Group key → user taps a suggestion → `textDocumentProxy.insertText` drops it into the chat app's text field. No network call ever originates from the keyboard process.

### Recommended Project Structure

```
BanterKeyboard/
├── BanterKeyboard.entitlements   # unchanged — App Group already wired
├── Info.plist                    # unchanged — RequestsOpenAccess already false
├── KeyboardViewController.swift  # REWRITE: hosts SwiftUI, adds globe key + insert
└── KeyboardSuggestionsView.swift # NEW: SwiftUI view, 3 rows + globe key row/button

BanterShared/Sources/BanterShared/
└── (no new files required — AppGroupStore.write/read already generic;
     add a small typed key constant, e.g. CachedSuggestionsStorageKey,
     mirroring the existing DowngradeBannerStorageKey pattern)

BanterApp/Home/
└── HomeModel.swift               # MODIFY: extend existing onResponse closure

BanterApp/Onboarding/
└── PermissionPrimingView.swift   # MODIFY (additive): add .keyboard(...) static
                                   # factory next to the existing .photos(...) one
```

### Pattern 1: SwiftUI-in-Extension via a Thin UIHostingController Child

**What:** `UIInputViewController` cannot itself be a SwiftUI `View` — it is a UIKit class mandated by the extension point. The standard bridge is to construct a `UIHostingController` wrapping your SwiftUI root view and add it as a **child view controller**, not just embed its `.view`.
**When to use:** Any time a keyboard extension (or any app extension without its own `UIWindow`/root view controller) needs SwiftUI content.
**Example:**
```swift
// Source: pattern confirmed across multiple keyboard-extension guides
// (levelup.gitconnected.com/swiftui-create-systemwide-custom-keyboard,
// blog.thomasdurand.fr/story/2023-03-31-swiftui-for-all-extensions/)
// and Apple's own UIHostingController docs on child-VC embedding.
class KeyboardViewController: UIInputViewController {
    private var hostingController: UIHostingController<KeyboardSuggestionsView>?

    override func viewDidLoad() {
        super.viewDidLoad()

        let suggestionsView = KeyboardSuggestionsView(
            suggestions: AppGroupStore.read([ReplySuggestion].self, forKey: CachedSuggestionsStorageKey.suggestions) ?? [],
            onInsert: { [weak self] text in
                self?.textDocumentProxy.insertText(text)
            },
            needsInputModeSwitchKey: needsInputModeSwitchKey,
            onSwitchKeyboard: { [weak self] in
                self?.advanceToNextInputMode()
            }
        )

        let hosting = UIHostingController(rootView: suggestionsView)
        self.hostingController = hosting

        addChild(hosting)
        view.addSubview(hosting.view)
        hosting.view.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            hosting.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            hosting.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            hosting.view.topAnchor.constraint(equalTo: view.topAnchor),
            hosting.view.bottomAnchor.constraint(equalTo: view.bottomAnchor),
        ])
        hosting.didMove(toParent: self)
    }
}
```

### Pattern 2: The Globe Key Is Conditional, Not Optional-by-Design

**What:** `needsInputModeSwitchKey` is not a constant — Apple explicitly documents it can flip at runtime (e.g., a hardware keyboard being attached on iPad removes the need for a software switch key). The keyboard must re-check it, not hardcode `true`.
**When to use:** Every time the keyboard's SwiftUI content is (re)built — read the property fresh in `viewWillAppear`/on `KeyboardViewController` init of the hosted view, not once at compile time.
**Example:**
```swift
// Source: developer.apple.com/documentation/uikit/uiinputviewcontroller/needsinputmodeswitchkey
// "If your custom keyboard doesn't have the switch key and this property's
// value changes to true, add the switch key to your custom keyboard's UI
// immediately (for example, when the device is connected to an external
// hardware keyboard)."
override func viewWillAppear(_ animated: Bool) {
    super.viewWillAppear(animated)
    hostingController?.rootView.needsInputModeSwitchKey = needsInputModeSwitchKey
}
```

### Pattern 3: Guided Enable Flow — Detection Is Best-Effort, the Deep Link Is the Reliable Part

**What:** There is no supported API to ask "is my keyboard enabled?" The `AppleKeyboards` UserDefaults array (containing enabled keyboard bundle IDs) is a long-standing, widely-used but **undocumented** convention. Treat its result as a hint for copy/CTA state, never as a hard gate blocking functionality.
**When to use:** In the host app (`BanterApp`), to decide whether to show "Enable Banter Keyboard" vs. a lighter "Manage Keyboard" affordance.
**Example:**
```swift
// Source: Apple Developer Forums thread on custom-keyboard detection +
// multiple independent third-party guides converge on this exact key name.
// [ASSUMED — undocumented API, best-effort only]
func isKeyboardLikelyEnabled(bundleID: String) -> Bool {
    guard let enabledKeyboards = UserDefaults.standard.array(forKey: "AppleKeyboards") as? [String] else {
        return false
    }
    return enabledKeyboards.contains(bundleID)
}
```
The reliable, Apple-sanctioned part is opening Settings. There are two distinct mechanisms and they are NOT interchangeable:
```swift
// From the HOST APP (BanterApp) — generic Settings entry point, always safe:
// Source: developer.apple.com/documentation/uikit/uiapplication/opensettingsurlstring
if let url = URL(string: UIApplication.openSettingsURLString) {
    UIApplication.shared.open(url)  // opens Banter's own Settings page, NOT the Keyboard list directly
}

// From INSIDE THE KEYBOARD EXTENSION ITSELF — the ONLY context where the
// prefs: deep-link straight to the Keyboard settings screen is Apple-sanctioned:
// Source: developer.apple.com/library/archive/qa/qa1924/_index.html (QA1924)
// "You may only use the specific URL scheme [prefs:root=General&path=Keyboard]
// to open the Keyboard settings, and only from a custom keyboard extension."
if let url = URL(string: "prefs:root=General&path=Keyboard") {
    extensionContext?.open(url, completionHandler: nil)
}
```
**Do not** call `prefs:root=General&path=Keyboard` from `BanterApp` (the host app) — QA1924 restricts this exact scheme to keyboard-extension code. The host app's guided-enable-flow CTA can only open the app's generic Settings page (`openSettingsURLString`), from which the user still must navigate Settings → General → Keyboard → Keyboards → Add New Keyboard manually. If a more direct in-context deep link is wanted, it would need to be triggered from within `BanterKeyboard`'s own UI (impractical here, since the keyboard isn't enabled yet at that point — chicken-and-egg). **Recommendation: the guided flow's job is instructional (a `PermissionPrimingView.keyboard(...)` screen with numbered steps: Settings → General → Keyboard → Keyboards → Add New Keyboard → Banter → enable "Allow Full Access"... except full access is explicitly NOT wanted here, so the copy must say "you do NOT need to enable Full Access"), not a magic one-tap deep link into the exact keyboard list.**

### Anti-Patterns to Avoid

- **Constructing `UIHostingController` repeatedly on every keyboard appearance:** update `rootView` in place (SwiftUI's `@State`/`@Observable` diffing handles the refresh); tearing down and rebuilding the hosting controller on every `viewWillAppear` wastes the extension's tight memory/CPU budget.
- **Reading the App Group on a background thread with a stale snapshot cached at `viewDidLoad` only:** re-read `AppGroupStore` in `viewWillAppear` (or via `NotificationCenter.default` + `UserDefaults.didChangeNotification`, though App-Group cross-process change notifications are unreliable — polling on `viewWillAppear` is simpler and sufficient given the keyboard's own short lifecycle) so a keyboard switched-to minutes after the app generated fresh suggestions shows the latest cache, not what was present at cold-launch.
- **Any `import RevenueCat` or Purchases SDK call anywhere in `BanterKeyboard`'s target sources:** RevenueCat's own community forum explicitly states they have no supported extension pattern and that repeated `Purchases.configure()` calls from a non-main-app context have been reported as "a common crash source" in production [CITED: community.revenuecat.com — RevenueCat SDK in App Extensions thread].
- **Having `BanterKeyboard` write the daily-cap counter:** `DailyCapTracker`'s own source comment already flags this as an unsolved cross-process atomicity problem (no atomic increment across `UserDefaults` writers in different processes). This phase's scope does not require the keyboard to write the cap — keep it read-only from the keyboard side.
- **Assuming `AppleKeyboards` detection is 100% reliable and gating the enable-flow UI's very existence on it:** it's an undocumented key; if Apple ever changes its name/format, the whole guided flow silently breaks. Always fail open (show the instructional flow) rather than fail closed (hide it) if the read returns nil/unexpected.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SwiftUI hosting inside a UIKit-mandated extension VC | A custom manual view-diffing/rendering bridge | `UIHostingController` (system) | Apple ships and maintains this exact bridge; it is the standard, documented pattern used across every keyboard-extension guide found in this research |
| Cross-process data sharing | A custom file-locking/IPC mechanism between the app and keyboard processes | `AppGroupStore` (already built, App Group `UserDefaults`) | Already proven end-to-end in Phase 1; a second cross-process mechanism would be pure duplication (ladder rung 2: reuse what's already in the codebase) |
| Keyboard-enabled detection | Reverse-engineering some new private API or building a network-based "ping" scheme | The well-known `AppleKeyboards` UserDefaults array read (best-effort) + the Apple-sanctioned `openSettingsURLString`/`prefs:` deep links | The existing convention is documented across many independent sources with no known rejection precedent; anything more exotic increases App Review risk for zero benefit |
| Entitlement/subscription-gating logic reachable from the keyboard | A parallel lightweight entitlement cache read directly by the keyboard | Nothing — the keyboard's success criteria (KEYS-01..04) never require it to know premium/free status at all; if a future phase wants this, follow RevenueCat's own recommendation (shared UserDefaults written by the main app only, never SDK-in-extension) rather than linking RevenueCat into the extension |

**Key insight:** Every piece of this phase's puzzle already has a first-party, documented Apple mechanism or an already-built in-repo primitive (`AppGroupStore`, `PermissionPrimingView`). The temptation to hand-roll appears mainly around "detecting if the keyboard is enabled" (no official API exists) — the correct move there is to use the best-effort community convention with graceful degradation, not to invent something riskier.

## Common Pitfalls

### Pitfall 1: Assuming the App Group "shared container" documentation applies uniformly to UserDefaults
**What goes wrong:** Apple's older App Extension Programming Guide language ("No shared container with containing app" when Open Access is off) is frequently misread as "the keyboard cannot read App Group UserDefaults at all without Full Access."
**Why it happens:** That guide predates today's App-Group-UserDefaults-suite convention becoming the dominant pattern and uses "shared container" to mean the general file-system App Group container, not specifically the `UserDefaults(suiteName:)` mechanism this project uses.
**How to avoid:** Trust the converged, more specific evidence: Apple Developer Forums thread (developer.apple.com/forums/thread/728434) quoting the sandbox's actual behavior directly ("prevents writing to the containing app's shared group containers (reading is permitted)"), an independent guide confirming the same read/write asymmetry, AND this exact codebase's own Phase 1 proof (`KeyboardViewController.swift` already reads `AppGroupStore` successfully with `RequestsOpenAccess=false`, verified structurally, CI compile-proof pending). The read-without-Full-Access architecture is the entire premise of this phase and is correctly assumed by Phase 1-4's prior work.
**Warning signs:** If CI ever shows the keyboard target failing to read a value the app wrote (not nil, but a hard crash/assertionFailure from `AppGroupStore`), check the App Group entitlement string match first (`group.com.banter.shared` in both `.entitlements` files) before suspecting the read-without-Full-Access architecture itself — entitlement drift is a far more common real-world failure than the documented sandbox behavior being wrong.

### Pitfall 2: Keyboard extension memory ceiling is lower than commonly cited
**What goes wrong:** Teams assume a ~60-70MB budget (a commonly-repeated but imprecise figure) and build a suggestion list that's fine in the simulator but jetsam-killed on older/lower-RAM devices.
**Why it happens:** Multiple device-generation-specific numbers circulate; the most concretely-cited figure found in this research is **48MB** (from a documented React Native keyboard-extension crash report and corroborating community discussion), though the exact ceiling is device-RAM-dependent and NOT officially published by Apple as a fixed constant.
**How to avoid:** Design for the more conservative 48MB figure, not 60-70MB. Keep the SwiftUI tree trivial — a plain `VStack`/`List` of at most 3 rows plus a globe-key row, no images beyond SF Symbols, no `AsyncImage`, no third-party SDK linkage of any kind. This is well within budget for such a small view tree; the risk is entirely in what NOT to add (see Anti-Patterns), not in the suggestion-list UI itself.
**Warning signs:** Any crash log showing `JetsamEvent` in the keyboard extension's process during CI simulator runs or (later) device testing.

### Pitfall 3: Testing the keyboard's actual keyboard-switching UX with XCUITest
**What goes wrong:** Teams try to write an XCUITest that types into a third-party chat-app-like text field via the Banter keyboard, asserts on globe-key taps, or verifies `advanceToNextInputMode()` cycling — and it's fragile or outright impossible.
**Why it happens:** There is no supported API to enumerate or select a specific "next" keyboard programmatically (confirmed directly in Apple's own docs: "There is no API to obtain a list of enabled keyboards or to pick a specific keyboard... the system automatically selects the next keyboard"), and XCUITest automating a genuinely different app's text field while a *different app's* custom keyboard extension is active is outside XCUITest's normal same-app-under-test model.
**How to avoid:** Split verification cleanly: (a) CI-verifiable — `xcodebuild build -scheme BanterKeyboard` compiles; unit/structural tests on `AppGroupStore.read`/`write` round-trip for the new `cached_suggestions` key (already the established BanterShared testing pattern, e.g. `AppGroupRoundTripTests.swift`); a SwiftUI preview/snapshot of `KeyboardSuggestionsView` with static sample data (matches the `ScreenshotArtifactTests` precedent from Phases 2 and 4); (b) Manual-only — actually enabling the keyboard on a simulator (Settings > General > Keyboard > Keyboards > Add New Keyboard, confirmed reachable in-simulator per multiple sources) and tapping to insert into a real text field, plus the globe-key cycling behavior, plus the `prefs:` deep link's actual navigation. Document this split explicitly in the plan's Validation Architecture (see below) — do not attempt to force full automation of what Apple's own APIs don't support.
**Warning signs:** A plan that specifies an XCUITest asserting on cross-app keyboard-switching behavior is over-scoped; redirect it to a Manual-Only checkpoint.

### Pitfall 4: Linking RevenueCat (or any heavy SDK) into the keyboard target "just in case"
**What goes wrong:** A future contributor adds `RevenueCat` as a dependency on `BanterKeyboard` in `project.yml` (perhaps to gate suggestions on premium status directly from the keyboard), inflating the extension's binary size and introducing a documented crash source.
**Why it happens:** It looks convenient — "why not just check premium status right here" — without realizing StoreKit/RevenueCat transactions are architecturally tied to the main app process, and the SDK vendor itself has no supported extension-init pattern.
**How to avoid:** `EntitlementManager`/`RevenueCatEntitlementSource` already live in `BanterApp`-only territory (confirmed: `project.yml` lists `RevenueCat` package only under `BanterApp.dependencies`, not `BanterKeyboard.dependencies`). Keep it that way. If gating ever becomes necessary, the correct pattern (per RevenueCat's own community guidance) is: main app writes a plain Bool/enum entitlement snapshot to `AppGroupStore`, keyboard reads that Bool — never the SDK itself in the extension.
**Warning signs:** Any `import RevenueCat` grep hit inside `BanterKeyboard/`, or a `project.yml` diff adding `RevenueCat` to `BanterKeyboard.dependencies`.

### Pitfall 5: Confusing the two different "open Settings" deep-link contexts
**What goes wrong:** A guided-enable-flow screen in `BanterApp` calls `prefs:root=General&path=Keyboard` directly, assuming it behaves the same as when called from the keyboard extension.
**Why it happens:** The pattern is copy-pasted from a keyboard-extension-focused tutorial without noticing the QA1924 restriction is scoped to "from an appropriate UI in your extension or containing app" — actually QA1924's own text does permit BOTH the extension AND the containing app to call it (re-confirmed via direct WebFetch of QA1924 in this session: "This URL can be called from an appropriate UI in your extension or containing app"). **Correction to an earlier concern raised during this research session:** initial web-search summaries suggested this scheme is keyboard-extension-only, but the primary source (QA1924 itself, fetched directly) explicitly permits the containing app too. This is the one piece of positive news simplifying the guided-enable-flow: `BanterApp` CAN call `prefs:root=General&path=Keyboard` directly to deep-link straight to the Keyboard settings screen, not just the generic Settings root.
**How to avoid:** Add a URL Type with scheme `"prefs"` to `BanterApp`'s Info.plist (required per QA1924's setup steps) and use `prefs:root=General&path=Keyboard` from the guided-enable-flow's "Continue" action — this is more precise than falling back to the generic `openSettingsURLString`. Still only ever use this exact string for this exact purpose (Keyboard settings); using `prefs:` for anything else is an App Review violation.
**Warning signs:** None functionally — this is a positive-surprise finding, not a risk. Flagged here so a future planner doesn't second-guess it without re-reading QA1924's exact wording.

## Code Examples

### The one new write call (extending the existing 04-07 onResponse pattern)

```swift
// Source: pattern already established in BanterApp/Home/HomeModel.swift's
// existing onResponse closure (04-07-SUMMARY.md); this phase adds one more
// line to that same closure.
func startCoaching() async {
    let model = CoachingResultModel(
        messages: importModel.transcript,
        capGate: { [entitlement] in HomeModel.makeCapTracker().canAnalyze(isPremium: entitlement.isPremium) },
        onAnalysisRecorded: { HomeModel.makeCapTracker().recordAnalysis() },
        onResponse: { [sentimentStore, conversationId, importModel] response in
            sentimentStore.append(from: response, conversationId: conversationId, messageIndex: max(0, importModel.transcript.count - 1), speaker: .match)
            // NEW this phase (KEYS-01): cache suggestions for the keyboard to read.
            AppGroupStore.write(response.replies, forKey: CachedSuggestionsStorageKey.suggestions)
        }
    )
    coaching = model
    await model.selectTone(model.selectedTone)
}
```

### Typed storage key (mirrors the existing DowngradeBannerStorageKey pattern)

```swift
// Source: mirrors BanterShared's existing DowngradeBannerStorageKey enum
// pattern (used in HomeModel.swift), keeping one canonical key string per
// enum case rather than a raw literal repeated across files.
public enum CachedSuggestionsStorageKey {
    public static let suggestions = "cached_suggestions"
}
```

### Keyboard read + tap-to-insert (the KEYS-01/KEYS-02 core loop)

```swift
// Source: composed from AppGroupStore's existing API (BanterShared,
// Phase 1) + UIInputViewController.textDocumentProxy (Apple, system).
struct KeyboardSuggestionsView: View {
    let suggestions: [ReplySuggestion]
    let onInsert: (String) -> Void
    var needsInputModeSwitchKey: Bool
    let onSwitchKeyboard: () -> Void

    var body: some View {
        VStack(spacing: 4) {
            if suggestions.isEmpty {
                Text("Open Banter and analyze a chat to see suggestions here")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .padding()
            } else {
                ForEach(suggestions.prefix(3), id: \.text) { suggestion in
                    Button {
                        onInsert(suggestion.text)
                    } label: {
                        Text(suggestion.text)
                            .lineLimit(2)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(8)
                    }
                }
            }

            if needsInputModeSwitchKey {
                Button(action: onSwitchKeyboard) {
                    Image(systemName: "globe")
                        .frame(width: 44, height: 44) // HIG minimum tap target
                }
            }
        }
    }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| UIKit-only keyboard extensions (manual `UIStackView`/`UICollectionView`) | SwiftUI hosted via `UIHostingController` inside `UIInputViewController` | SwiftUI's App-Extension viability matured well before iOS 18 (multiple 2023-2025-dated guides confirm the pattern is now standard, not experimental) | Lets this phase reuse the codebase's existing SwiftUI-only convention rather than introducing a second UI paradigm just for the keyboard target |
| Assuming Full Access is required for any App-Group interaction | Read-without-Full-Access via App Group `UserDefaults` suite is the documented, standard pattern for "thin reader" keyboards | Long-standing (not a recent change) but still widely mis-cited due to older, more general "shared container" documentation language | Confirms this phase's entire premise (KEYS-03: functions without Full Access) is architecturally sound, not a novel risk |

**Deprecated/outdated:** Nothing specific to deprecate here — no legacy API surface exists in this phase's domain to migrate away from; `BanterKeyboard`'s placeholder from Phase 1 is being extended, not replaced-from-something-deprecated.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The `AppleKeyboards` UserDefaults key is the correct/current mechanism to best-effort-detect whether Banter's keyboard is enabled | Architecture Patterns / Pattern 3, Don't Hand-Roll | Low — this is explicitly designed as a best-effort hint only; if the key name is wrong or the read fails, the guided flow simply always shows the instructional CTA (fail-open), no functional break to KEYS-01/02/03 |
| A2 | 48MB is a reasonably conservative memory target (vs. the ~60-70MB figure cited in the phase brief) | Common Pitfalls / Pitfall 2 | Low-Medium — if the true device-specific ceiling on the target simulator/device generation is actually higher, designing conservatively for 48MB costs nothing (the UI is trivially small either way); if it's lower than 48MB on some device, the risk is a jetsam kill on an edge-case device, mitigated by keeping the view tree minimal regardless |
| A3 | No official Apple documentation states an exact, version-pinned memory number for iOS 18 specifically — the 48MB figure is drawn from a cross-referenced community/GitHub-issue source, not an Apple engineering blog or WWDC session | Common Pitfalls / Pitfall 2 | Low — the design mitigation (minimal view tree, no heavy SDKs) is memory-number-agnostic; this assumption only affects how much headroom is claimed in planning commentary, not the actual implementation approach |

**If this table is empty:** N/A — see entries above; all three are LOW risk given the mitigations already baked into the recommended architecture.

## Open Questions

1. **Should the daily-cap state be surfaced in the keyboard UI at all (e.g., "come back tomorrow" messaging), or is that entirely out of KEYS-01..04's scope?**
   - What we know: `DailyCapTracker`'s storage is App-Group-backed and technically readable (not writable) from the keyboard process; KEYS-01..04 as written only require displaying cached suggestions and inserting them, with no explicit requirement to surface cap state in-keyboard.
   - What's unclear: Whether product wants the keyboard to show a "you're out of free suggestions today" state when the cache is empty/stale because the cap was hit, versus a generic "open Banter to get suggestions" empty state regardless of cause.
   - Recommendation: Default to the generic empty-state copy (simpler, avoids the keyboard needing to interpret cap-vs-never-analyzed-yet ambiguity) unless CONTEXT.md/discuss-phase surfaces a specific product requirement for cap-aware keyboard messaging.

2. **How many suggestions should the keyboard cache — the full 3, or is there value in caching more than one conversation's worth (e.g., last N conversations)?**
   - What we know: `CoachingResponseDTO.replies` is always exactly 3 (Phase 3's schema-enforced contract); KEYS-01 says "cached suggestions from the App Group shared container" (singular cache, not plural/historical).
   - What's unclear: Whether the keyboard should always show only the MOST RECENT conversation's 3 suggestions (simplest, matches "cached" singular framing) or something richer.
   - Recommendation: Cache only the most recent `[ReplySuggestion]` (overwrite on every new coaching response) — matches the existing `AppGroupStore` single-key overwrite pattern used everywhere else in this codebase (e.g., `dailyCap.\(dateString)`, `entitlement.lastKnownPremium`), and matches the phase's stated goal of "the wedge" (instant access to the LATEST relief), not a suggestion history browser.

3. **No `05-UI-SPEC.md` or `05-CONTEXT.md` exists yet for this phase**, even though `config.json`'s `ui_phase: true` and the phase brief says "UI hint: yes."
   - What we know: 04-UI-SPEC.md explicitly anticipates this ("the Keyboard-enable equivalent is Phase 5's KEYS-04 scope, reusing this same PermissionPrimingView component... extract a generic PermissionPrimingView, do not duplicate this screen's layout in Phase 5" — already done, the component is generic).
   - What's unclear: Whether the planner should trigger `/gsd:ui-phase 5` before planning (per HANDOFF.md's own stated process convention: "UI phases (5, 6): run /gsd:ui-phase <N>... to produce <NN>-UI-SPEC.md before planning"), or whether this research's Code Examples/Architecture sections are sufficient given the UI surface here (a 3-row suggestion list + globe key + one instructional screen) is small enough that 04-UI-SPEC.md's tokens/patterns already cover it by extension.
   - Recommendation: Per HANDOFF.md's explicit process note, run `/gsd:ui-phase 5` before `/gsd:plan-phase 5` proceeds to task-writing — this research does not substitute for that gate, it only informs it.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Xcode / `xcodebuild` | Building/testing `BanterKeyboard` target | ✗ (this Windows host) | — | CI-deferred, per established Phase 1-4 precedent (GitHub Actions macOS runner, `macos-26` / `Xcode_26.5.app` per `.github/workflows/ci.yml`) |
| iOS Simulator | Manually enabling/testing the keyboard | ✗ (this Windows host) | — | Manual-Only checkpoint on a real device/simulator post-CI-green, per Phase 1-4's established human-verification pattern |
| `AppGroupStore`/`ReplySuggestion` (in-repo) | The keyboard's read path | ✓ | already built, Phase 1/3 | — |
| `PermissionPrimingView` (in-repo) | KEYS-04 guided flow | ✓ | already built, Phase 4 (`04-03-PLAN.md`), explicitly generic per 04-UI-SPEC.md | — |

**Missing dependencies with no fallback:** none — every gap has an established, already-precedented fallback (CI-deferred compile proof, Manual-Only device verification) matching exactly how Phases 1-4 operated on this same Windows host.

**Missing dependencies with fallback:** Xcode/Simulator (CI-deferred + Manual-Only, as above).

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `XCTest` via `swift test --package-path BanterShared` (existing BanterShared unit tests) + `xcodebuild test -scheme BanterApp -only-testing:BanterUITests` (existing XCUITest screenshot-artifact target) |
| Config file | none dedicated — reuses `BanterShared/Package.swift` and `Banter.xcodeproj`'s existing `BanterUITests` scheme wiring (`project.yml`) |
| Quick run command | `swift test --package-path BanterShared --filter <NewTestName>` |
| Full suite command | `swift test --package-path BanterShared` (Deno backend suite is out of scope for this phase — no backend changes) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| KEYS-01 | App writes `[ReplySuggestion]` into App Group; keyboard's read path decodes the same key | unit (BanterShared) | `swift test --package-path BanterShared --filter CachedSuggestionsRoundTripTests` | ❌ Wave 0 (new test file, mirrors existing `AppGroupRoundTripTests.swift` pattern) |
| KEYS-02 | Tapping a suggestion calls `textDocumentProxy.insertText(_:)` with the exact suggestion text | structural/grep (no local Swift toolchain) + Manual-Only device confirmation | `grep -q 'textDocumentProxy.insertText' BanterKeyboard/KeyboardViewController.swift` (or the SwiftUI view file) | ❌ Wave 0 (KeyboardViewController rewrite is this phase's core deliverable) |
| KEYS-03 | Zero network-capable code path exists anywhere under `BanterKeyboard/` | negative-grep structural test | `grep -riE 'URLSession|import RevenueCat|import Network' BanterKeyboard/` — must find nothing | ❌ Wave 0 (extend the existing `NetworkBoundaryGuardTests.swift` pattern, or add a sibling test, to also scan `BanterKeyboard/` sources — this codebase currently only guards `BanterApp`/`BanterShared` boundary crossings for CAPT-04; KEYS-03 needs its own guard) |
| KEYS-04 | `PermissionPrimingView.keyboard(...)` static factory exists and is reachable from a production call site (not just the existing `.photos(...)`) | structural/grep + SwiftUI preview screenshot (XCUITest, matches Phase 2/4 precedent) | `grep -q 'PermissionPrimingView.keyboard' BanterApp/` (call site outside the view's own file) | ❌ Wave 0 (new static factory + call site) |

### Sampling Rate

- **Per task commit:** `swift test --package-path BanterShared` (fast, existing suite, seconds)
- **Per wave merge:** full `swift test --package-path BanterShared` + a fresh grep pass for the new KEYS-03 network-boundary guard
- **Phase gate:** CI green on both `BanterApp` and `BanterKeyboard` schemes (per `.github/workflows/ci.yml`'s existing two build steps) before `/gsd:verify-work`; Manual-Only device/simulator confirmation of the actual insert-into-a-real-text-field flow and the globe-key cycling, documented as explicitly out of automated-CI scope (per Pitfall 3 above)

### Wave 0 Gaps

- [ ] `BanterShared/Tests/BanterSharedTests/CachedSuggestionsRoundTripTests.swift` — covers KEYS-01 (mirrors `AppGroupRoundTripTests.swift`'s existing structure exactly: write `[ReplySuggestion]`, read it back, assert equality)
- [ ] A KEYS-03 network-boundary guard test scoped to `BanterKeyboard/` — either extend `NetworkBoundaryGuardTests.swift`'s existing pattern to also scan `BanterKeyboard/` sources, or add a new sibling test; this is a genuinely new gap since the current guard only covers `BanterApp`/`BanterShared`
- [ ] Framework install: none — `XCTest`/`swift test` already fully set up from Phase 1

*(No gaps for KEYS-02/KEYS-04 test infrastructure itself — both use the already-established grep-based structural verification + XCUITest screenshot precedent from Phases 2 and 4; only new test *content*, not new *framework*, is needed.)*

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | This phase introduces no auth surface — the keyboard is a stateless reader of already-authenticated-app-generated data |
| V3 Session Management | No | No session concept in the keyboard extension itself |
| V4 Access Control | Partial — App Group entitlement scoping | Enforced entirely by the OS-level App Group sandbox + `com.apple.security.application-groups` entitlement matching (`group.com.banter.shared`, already identical in both `.entitlements` files) — no application-layer access control code to write |
| V5 Input Validation | Yes, narrowly | `AppGroupStore.read`'s existing `JSONDecoder`-based decode-or-nil pattern (already built, Phase 1) is the input-validation boundary for whatever the keyboard reads back; no new validation logic needed since the same `Codable` `ReplySuggestion`/`[ReplySuggestion]` type is reused verbatim |
| V6 Cryptography | No | No new cryptographic operation in this phase; App Group `UserDefaults` storage is not encrypted at rest by this project's own code (relies on iOS's standard data-protection class for the container, unchanged from Phase 1's existing posture) |

### Known Threat Patterns for iOS Keyboard Extensions

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Full-Access-required scope creep (a future contributor "just adds" a feature that needs network/clipboard, quietly flips `RequestsOpenAccess` to `true`) | Elevation of Privilege | Keep `RequestsOpenAccess=false` in `Info.plist` (already set); any PR that flips it to `true` should be treated as a KEYS-03 regression and require explicit human sign-off, not a routine auto-fix |
| Cross-process race on a shared write key (e.g., a hypothetical future keyboard-side cap-decrement) | Tampering (data race, not malicious but structurally unsafe) | Already identified in-repo via the `DailyCapTracker.swift` `ponytail:` comment; this phase's mitigation is architectural (keyboard never writes that key), not a locking mechanism |
| Keyboard extension unexpectedly granted Full Access by a user who doesn't realize the implication, then a future feature silently starts relying on Full-Access-only APIs (clipboard, network) without an explicit `RequestsOpenAccess` audit | Information Disclosure | KEYS-03's structural network-boundary guard test (Validation Architecture above) is the durable enforcement — any future PR introducing `URLSession`/similar inside `BanterKeyboard/` fails CI immediately rather than relying on manual review |
| Undocumented `AppleKeyboards` key format changing silently in a future iOS version, causing the guided-enable-flow to always report "not enabled" even when it is | Denial of Service (soft — a UX degradation, not a security breach) | Fail-open design (Pattern 3 above): the instructional flow always renders regardless of detection result; detection only changes copy/CTA emphasis, never gates functionality |

## Sources

### Primary (HIGH confidence)

- developer.apple.com/documentation/uikit/uiinputviewcontroller — base class contract, `textDocumentProxy`, `needsInputModeSwitchKey`, `advanceToNextInputMode()`
- developer.apple.com/documentation/uikit/uiinputviewcontroller/needsinputmodeswitchkey — runtime-changeable globe-key requirement, quoted verbatim in Pattern 2
- developer.apple.com/library/archive/qa/qa1924/_index.html (QA1924) — fetched directly this session; exact `prefs:root=General&path=Keyboard` mechanism, confirmed callable from BOTH the extension and the containing app (Pitfall 5 correction)
- developer.apple.com/library/archive/documentation/General/Conceptual/ExtensibilityPG/CustomKeyboard.html — fetched directly this session; full restriction list without Open Access (network, location, address book, shared container/UserDefaults nuance, secure-text-field/phone-pad exclusions, no microphone, no inline autocorrect UI, app-level `shouldAllowExtensionPointIdentifier` opt-out)
- developer.apple.com/app-store/review/guidelines/ — fetched directly this session; Guideline 4.4.1 verbatim text (the correct, current cite for keyboard-extension-specific App Review rules — distinct from Phase 8's separate 5.1.2(i) AI-transparency cite, no conflict between the two)
- developer.apple.com/forums/thread/728434 — fetched directly this session; sandbox's own documented default behavior ("prevents writing to the containing app's shared group containers (reading is permitted)"), the single most decisive resolution of the read-without-Full-Access question
- This codebase's own `.planning/phases/01-foundation-privacy-boundary/01-03-SUMMARY.md` + `BanterKeyboard/KeyboardViewController.swift` + `BanterKeyboard/Info.plist` — first-party, already-built, structurally-verified proof that `RequestsOpenAccess=false` + `AppGroupStore.read` already works in this exact project

### Secondary (MEDIUM confidence)

- shyngys.com/ios-custom-keyboard-guide — fetched directly this session; independent corroboration of the read-without-Full-Access asymmetry
- community.revenuecat.com/sdks-51/how-to-initialize-the-revenuecat-sdk-in-an-ios-widget-3185 — fetched directly this session; RevenueCat's own admission of no supported extension pattern and a reported production crash source, directly informing the "never link RevenueCat into BanterKeyboard" recommendation
- levelup.gitconnected.com/swiftui-create-systemwide-custom-keyboard, blog.thomasdurand.fr/story/2023-03-31-swiftui-for-all-extensions/ — WebSearch-surfaced, corroborating the `UIHostingController`-as-child-view-controller pattern across multiple independent authors
- github.com/facebook/react-native/issues/31910 — WebSearch-surfaced; the concrete 48MB memory-crash data point (community-reported, not an Apple-published constant — hence MEDIUM not HIGH)

### Tertiary (LOW confidence)

- Various WebSearch-only summaries about the `AppleKeyboards` UserDefaults detection key (Apple Developer Forums discussion referenced only via search snippet, not directly fetched) — treated as [ASSUMED] throughout and designed around with fail-open behavior specifically because of this lower confidence

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every API is a first-party Apple system framework already in use elsewhere in this exact codebase; no new package dependencies
- Architecture: HIGH — the read-without-Full-Access claim (the single riskiest architectural bet) is confirmed by four converging sources including this project's own already-built Phase 1 proof
- Pitfalls: HIGH for the App-Group/memory/RevenueCat findings (multiple independent + first-party sources); MEDIUM for the exact memory number (community-sourced, not Apple-published); LOW-and-explicitly-flagged for the `AppleKeyboards` detection key (undocumented, designed around via fail-open UX)

**Research date:** 2026-07-06
**Valid until:** 2026-08-05 (30 days — this is stable, long-standing iOS platform API surface, not a fast-moving library; the one exception is the `AppleKeyboards` undocumented-key convention, which could theoretically break on any iOS point release, hence the fail-open design regardless of research staleness)
