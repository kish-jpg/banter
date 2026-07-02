# Phase 1: Foundation & Privacy Boundary - Research

**Researched:** 2026-07-03
**Domain:** No-Mac iOS CI pipeline (GUI-less project generation, GitHub Actions macOS runners), shared Swift package architecture, structural privacy-boundary enforcement
**Confidence:** MEDIUM (CI/runner facts cross-checked across official + practitioner sources; Apple platform mechanics HIGH per project-level ARCHITECTURE.md; some signing/simulator interaction details LOW — flagged, verify empirically in Wave 0)

## Summary

Phase 1 is a walking skeleton, not a feature. The one hard constraint that shapes every decision is **the developer has no Mac** — the project must be definable as text (not an Xcode GUI project you click together), and every build/test cycle happens on a GitHub Actions macOS runner. That constraint decides the two biggest calls in this phase: use **XcodeGen** (not Tuist) to generate the `.xcodeproj` from a YAML spec, and put `banter/` in its **own dedicated private GitHub repo** (not the personal monorepo it currently lives in), mirroring the sibling FocusForge project's structure.

The good news: everything Phase 1 needs — building both targets, running unit tests, exercising the App Group round-trip, and enforcing the CAPT-04 no-raw-image boundary — works entirely on **simulator builds with zero code signing and zero Apple Developer Program membership**. The $99/yr account only becomes mandatory later (on-device App Group testing, TestFlight, App Store submission) — not in Phase 1. This is confirmed but has one LOW-confidence wrinkle: simulator entitlement checks are looser than real-device checks, so a green CI run proves less than it looks like it proves. The plan must account for that gap explicitly (see Common Pitfalls).

CAPT-04 ("raw screenshots never leave the device") is best enforced structurally, not by convention: give the network layer request types that are `Codable` structs containing only `String`/primitive fields — no `Data`, `UIImage`, or `URL`-to-binary members are even declarable on those types — and back it with one grep-based unit test that fails the build if a forbidden type name appears in the networking target's request definitions. This is cheaper and more legible than pulling in a tool like Periphery, which solves a broader (and here, unneeded) dead-code problem.

**Primary recommendation:** XcodeGen + GitHub Actions macOS runner (default Xcode, simulator-only, no signing) + a new dedicated private GitHub repo for `banter/` + a single `BanterShared` SPM package with `Codable` model types and an `AppGroupStore` helper, verified by a round-trip XCTest and a grep-based "no binary payloads in network DTOs" guard test.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Project/target definition (app, keyboard ext, shared package) | Build tooling (XcodeGen spec, checked into repo) | — | Must be text-generated since there is no local Xcode GUI to hand-configure targets |
| CI build + test execution | GitHub Actions (macOS runner) | — | The only available "device" — local machine is Windows, cannot run Xcode at all |
| Shared data models (transcript, suggestion, sentiment event) | BanterShared package (compiled once, imported by both) | — | Single source of truth prevents the classic keyboard-extension bug: app and extension silently disagreeing on a key name or model shape |
| App Group container read/write | BanterShared package (`AppGroupStore`) | App target (writer), Keyboard target (reader) | Both targets must use the identical suite name and key constants from one place, not duplicated string literals |
| Network/send boundary (structural CAPT-04 enforcement) | App target's networking layer | BanterShared (DTO type definitions, if shared) | The boundary is a compile-time type constraint plus a build-time test — must live where requests are actually constructed |
| Round-trip / boundary verification tests | XCTest (unit + app-hosted), run in CI | — | No physical device or manual test loop exists; CI is the only verification surface for this entire project |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| XcodeGen | 2.44.x (actively maintained, last release 2026-04-14) [ASSUMED — verify latest tag before use] | Generate `.xcodeproj` from `project.yml` | Simplest tool that satisfies "no Xcode GUI available" — YAML spec, no build-caching layer to configure, matches a 2-target skeleton's actual needs |
| GitHub Actions `macos-26` runner image | Default Xcode 26.4.1 (five more versions selectable via `xcode-select`) [CITED: github.blog changelog 2026-02-26] | CI build/test host | GA since Feb 2026; ships iOS/iPadOS/watchOS/tvOS/visionOS simulator runtimes preinstalled, satisfies the iOS 26 SDK requirement (App Store builds since April 28, 2026, per project STACK.md) with zero extra setup |
| `maxim-lobanov/setup-xcode` action | v1 (latest tag) [ASSUMED] | Pin exact Xcode version on the runner | Runner images carry multiple Xcode versions; pin explicitly so CI doesn't silently drift when GitHub rotates the image's default |
| `actions/cache` | v4 [ASSUMED] | Cache SPM resolution + DerivedData | Stdlib GitHub Actions caching action; no need for a third-party cache action at this project's size |
| XCTest | OS-bundled (Xcode 26.x) | Unit tests for BanterShared round-trip + CAPT-04 guard test | Apple's own test framework, zero setup, runs natively via `xcodebuild test` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `irgaly/xcode-cache` | latest [ASSUMED] | Alternative to `actions/cache` that preserves file mtimes for true incremental DerivedData reuse | Only if `actions/cache` alone proves insufficient for build-time (Phase 1's build is tiny — two near-empty targets — so start with stdlib `actions/cache`, add this only if CI minutes become a real cost problem) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| XcodeGen | Tuist | Tuist adds Swift-DSL config, remote build caching, and module-cache features aimed at large modular codebases (Back Market, Hyperconnect case studies cited in 2026 adoption). Overkill for a 2-target skeleton; revisit only if the project grows into many internal modules and CI build time becomes the bottleneck |
| Grep-based CAPT-04 guard test | Periphery (unused-code/import scanner) | Periphery solves a broader dead-code problem and requires building an index store; a single named-type guard test is a smaller, more legible mechanism for this one specific structural rule |
| Dedicated private GitHub repo for `banter/` | Push the whole personal monorepo to GitHub | The monorepo contains unrelated personal/other-project content (Inventory, LMS, other founder ventures) that shouldn't be exposed to CI or a public/private GitHub Actions billing surface for this one app; FocusForge already established the "nested dedicated repo" pattern for exactly this reason |

**Installation:**
```bash
# XcodeGen — install via Homebrew is the documented path, but this dev has no Mac.
# Do NOT try to install/run XcodeGen locally on Windows. Instead:
# XcodeGen runs as a CI step on the GitHub Actions macOS runner:
#   brew install xcodegen && xcodegen generate
# (add this as a workflow step; project.yml is authored locally as plain text/YAML on Windows)
```

**Version verification:** XcodeGen's exact current release tag and Tuist's current version were surfaced via WebSearch only (no registry/Context7 lookup — XcodeGen is a Homebrew/Mint-distributed Swift CLI tool, not published to npm/PyPI under a name safe to `npm view`). Confirm the current XcodeGen release tag directly from `https://github.com/yonaskolb/XcodeGen/releases` in the CI workflow (pin a specific brew/mint version) rather than trusting this document's version number at execution time.

## Package Legitimacy Audit

This phase does not install third-party application dependencies into `BanterShared`, the app target, or the keyboard target — the only "packages" involved are CI/build tooling (XcodeGen as a CLI tool via Homebrew, GitHub Actions marketplace actions). None of these are consumed as Swift Package Manager dependencies inside the shipped app code, so the npm/PyPI/crates legitimacy-check protocol (`gsd-tools query package-legitimacy check`) does not apply to an ecosystem present in this phase — there is no `npm view` / `pip index versions` / `cargo search` equivalent for Homebrew formulae or GitHub Actions marketplace entries invoked here.

**Manual verification performed instead:**

| Tool | Distribution | Source Repo | Verdict | Disposition |
|------|--------------|--------------|---------|-------------|
| XcodeGen | Homebrew / Mint | github.com/yonaskolb/XcodeGen (14k+ stars, long-running) | OK | Approved — verify exact release tag at CI-workflow-authoring time |
| `maxim-lobanov/setup-xcode` | GitHub Actions Marketplace | github.com/maxim-lobanov/setup-xcode | OK | Approved — widely used, standard action for Xcode version pinning |
| `actions/cache` | GitHub Actions Marketplace (first-party) | github.com/actions/cache | OK | Approved — GitHub first-party action |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

*XcodeGen's exact version number above is `[ASSUMED]` (WebSearch-sourced, not confirmed against an authoritative registry in this session) — the planner should gate the CI workflow's XcodeGen install step behind reading the actual current release tag from the GitHub releases page, not hard-code the version guessed here.*

## Architecture Patterns

### System Architecture Diagram

```
[Local machine: Windows — no Xcode possible]
        │  (author text files only: Swift source, project.yml, .github/workflows/*.yml)
        ▼
[git push] ──────────────────────────────────────────────────────────────►
        │
        ▼
[GitHub — dedicated private repo: banter (new, not the personal monorepo)]
        │  triggers on push/PR
        ▼
[GitHub Actions macOS runner: macos-26 image, Xcode pinned]
        │
        ├─► Step 1: Restore SPM + DerivedData cache (actions/cache, keyed on Package.resolved)
        │
        ├─► Step 2: xcodegen generate  → produces Banter.xcodeproj from project.yml
        │        (defines: BanterApp target, BanterKeyboard extension target,
        │         BanterShared local SPM package dependency, shared App Group
        │         entitlement "group.com.banter.shared" on both targets)
        │
        ├─► Step 3: xcodebuild build -scheme BanterApp -destination "generic/platform=iOS Simulator"
        │        (no code signing — simulator build path requires none)
        │
        ├─► Step 4: xcodebuild test -scheme BanterApp -destination "platform=iOS Simulator,name=iPhone 17"
        │        runs:
        │          - BanterSharedTests: round-trip test
        │              write via AppGroupStore → read back via AppGroupStore → assert equality
        │          - NetworkBoundaryTests: CAPT-04 guard
        │              grep/reflect over request DTO source for forbidden types (Data, UIImage)
        │              assert app target compiles with zero such usages present
        │
        ├─► Step 5: xcodebuild build -scheme BanterKeyboard  (placeholder target — proves it builds)
        │
        └─► Step 6: Save cache, report pass/fail
                │
                ▼
        [CI green == Phase 1 success criteria 1–4 satisfied]
```

A reader can trace the primary use case end to end: author code on Windows with no Mac in the loop → push to GitHub → runner generates the Xcode project from YAML → builds both targets against the simulator SDK with no signing → runs the round-trip test that proves the App Group bridge works → runs the guard test that proves no raw-image code path exists → reports green. Every arrow after "git push" happens entirely inside the CI runner; there is no manual step requiring a physical Mac or device anywhere in this loop.

### Recommended Project Structure

This follows the structure already established in project-level `.planning/research/ARCHITECTURE.md` — Phase 1 builds only the skeleton subset of it:

```
banter/                              # becomes its own dedicated GitHub repo root (see Git Topology below)
├── project.yml                      # XcodeGen spec: targets, App Group entitlement, Info.plists
├── .github/workflows/ci.yml         # build+test on push/PR
├── BanterApp/                       # companion app target (SwiftUI) — Phase 1: renders ONE screen
│   └── BanterAppApp.swift
├── BanterKeyboard/                  # keyboard extension target — Phase 1: placeholder only, must build
│   └── KeyboardViewController.swift
├── BanterShared/                    # local Swift package, imported by both targets
│   ├── Package.swift
│   └── Sources/BanterShared/
│       ├── Models/                  # ConversationMessage, ReplySuggestion, SentimentEvent (Codable)
│       ├── AppGroupStore.swift      # suiteName constant + read/write helpers
│       └── NetworkDTOs.swift        # request/response types — structured text only, no Data/UIImage
└── BanterSharedTests/               # XCTest target for BanterShared
    ├── AppGroupRoundTripTests.swift
    └── NetworkBoundaryGuardTests.swift
```

### Pattern 1: GUI-less project generation (XcodeGen)

**What:** The `.xcodeproj` file is never hand-created or committed as a binary/plist blob edited via Xcode's GUI. Instead, a single `project.yml` text file declares targets, their type (`application`, `app-extension`), bundle IDs, entitlements (`com.apple.security.application-groups`), and the local package dependency on `BanterShared`. `xcodegen generate` (run as a CI step) turns this into the actual Xcode project just before build.
**When to use:** Always, for this project — it is the only way to define an Xcode project without ever opening Xcode.
**Example:**
```yaml
# project.yml
name: Banter
options:
  bundleIdPrefix: com.banter
targets:
  BanterApp:
    type: application
    platform: iOS
    deploymentTarget: "17.0"
    sources: [BanterApp]
    dependencies:
      - package: BanterShared
    entitlements:
      path: BanterApp/BanterApp.entitlements
      properties:
        com.apple.security.application-groups:
          - group.com.banter.shared
  BanterKeyboard:
    type: app-extension
    platform: iOS
    deploymentTarget: "17.0"
    sources: [BanterKeyboard]
    dependencies:
      - package: BanterShared
    entitlements:
      path: BanterKeyboard/BanterKeyboard.entitlements
      properties:
        com.apple.security.application-groups:
          - group.com.banter.shared
packages:
  BanterShared:
    path: BanterShared
```
Source: XcodeGen's documented `project.yml` schema (yonaskolb/XcodeGen README) — this exact YAML is illustrative and must be validated against the current schema version at execution time [ASSUMED — cross-check against XcodeGen docs when authoring].

### Pattern 2: Simulator-only CI, zero code signing

**What:** Every build and test command targets the iOS Simulator destination, never a device or archive destination. Simulator builds produce an unsigned `.app` bundle — Apple's own simulator format requires no signing identity, no provisioning profile, no Team ID.
**When to use:** For all of Phase 1 (and realistically every phase until a real device or TestFlight is needed).
**Example:**
```bash
xcodebuild build \
  -project Banter.xcodeproj \
  -scheme BanterApp \
  -sdk iphonesimulator \
  -destination "platform=iOS Simulator,name=iPhone 17" \
  CODE_SIGNING_ALLOWED=NO
```
`CODE_SIGNING_ALLOWED=NO` is a common defensive flag added on top of the simulator destination to hard-fail fast if anything in the project accidentally requires signing, rather than silently trying to sign and failing later. [ASSUMED — this flag is a widely-used community pattern for CI simulator builds; verify it does not conflict with App Group entitlement resolution before relying on it as a permanent CI setting, since entitlements still need to be present in the built bundle for the app-hosted App Group test to have anything to read.]

### Pattern 3: BanterShared as the single data-shape contract

**What:** `ConversationMessage`, `ReplySuggestion`, `SentimentEvent`, the App Group suite name constant, and the App Group read/write helper all live in exactly one place — the `BanterShared` package — imported by both `BanterApp` and `BanterKeyboard`. Neither target ever redefines these types or duplicates the suite-name string literal.
**When to use:** From the very first commit of Phase 1 — this is the thing Phase 1 exists to prove.
**Example:**
```swift
// BanterShared/Sources/BanterShared/AppGroupStore.swift
public enum AppGroupStore {
    public static let suiteName = "group.com.banter.shared"

    public static func write<T: Codable>(_ value: T, forKey key: String) {
        guard let defaults = UserDefaults(suiteName: suiteName) else { return }
        guard let data = try? JSONEncoder().encode(value) else { return }
        defaults.set(data, forKey: key)
    }

    public static func read<T: Codable>(_ type: T.Type, forKey key: String) -> T? {
        guard let defaults = UserDefaults(suiteName: suiteName),
              let data = defaults.data(forKey: key) else { return nil }
        return try? JSONDecoder().decode(type, from: data)
    }
}
```
This generalizes the project-level ARCHITECTURE.md's `AppGroupStore` example (which hardcoded `[ReplySuggestion]`) into a reusable generic helper — Phase 1 needs it to round-trip at least three distinct model types (transcript, suggestion, sentiment event) per the phase's success criteria.

### Anti-Patterns to Avoid

- **Committing a hand-edited `.xcodeproj` instead of generating it:** With no local Xcode, any manual `.xcodeproj` edit is either impossible (no GUI) or a brittle raw-plist edit prone to corruption. XcodeGen's `project.yml` is the only maintainable source of truth.
- **Treating a green CI simulator run as proof the App Group works on a real device:** Simulator entitlement checks are looser than device checks [LOW confidence — see Common Pitfalls]. Do not let Phase 1's "done" bar silently expand to "proven on device" — that requires a paid account and a real device, out of scope for Phase 1.
- **Using Periphery (or any general dead-code tool) as the CAPT-04 guard:** it solves a broader, different problem (unused code) and requires building an index store. A named-type/grep guard test is smaller, faster in CI, and more legible as "this is the rule we're protecting."

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Xcode project file generation | A script that hand-writes `.xcodeproj` plist/pbxproj structure | XcodeGen | `.xcodeproj` internals are an undocumented, brittle binary-adjacent format; XcodeGen already solves "declare targets in text, generate the real thing" |
| CI Xcode-version pinning | Manually parsing `xcodebuild -version` and conditionally branching | `maxim-lobanov/setup-xcode` action | Solved, maintained action; avoids fragile shell version-parsing logic |
| SPM/DerivedData cache key construction | Custom cache-busting logic keyed on file mtimes | `actions/cache` keyed on `Package.resolved` hash | Standard, documented pattern; reinventing this risks subtle cache-poisoning bugs (stale resolved packages) |
| Detecting "does this networking code ever touch a raw image" | A custom AST parser / SwiftSyntax-based static analyzer | A one-file grep-based XCTest over the DTO source, or Swift's own type system (simply never declaring `Data`/`UIImage` fields on the DTO types) | The type system already prevents this at compile time for well-designed DTOs; the guard test is a cheap tripwire for regressions, not a research project in static analysis |

**Key insight:** Every "don't hand-roll" here follows the same shape — Apple/GitHub/the Swift compiler already provide the primitive; the temptation to add tooling should be resisted until the primitive demonstrably isn't enough (e.g., add Periphery only if dead code becomes a recurring real problem across many phases, not preemptively in Phase 1).

## Common Pitfalls

### Pitfall 1: Simulator App Group behavior is not identical to device behavior

**What goes wrong:** A round-trip test passes reliably in the CI simulator, creating false confidence that App Groups are fully working, when in fact device-only entitlement/provisioning-profile enforcement differs.
**Why it happens:** iOS Simulator app-group/entitlement checks are looser and more forgiving than a real device's provisioning-profile-based enforcement [LOW confidence, WebSearch-only — a practitioner report, not an Apple doc]. On a real device, if the App Group isn't correctly registered in the provisioning profile for *all* targets, the shared container silently fails to read — with no error logged anywhere.
**How to avoid:** Treat Phase 1's "round-trip test proves data written by the app is readable by the keyboard" success criterion as proven *for CI/simulator purposes only*. Document explicitly in the phase's verification notes that on-device confirmation is deferred until a paid Developer account + physical device (or TestFlight) enters the project — do not let this ambiguity get silently absorbed into "done."
**Warning signs:** If a later phase adds real on-device testing and the App Group read suddenly returns `nil` with zero errors, the first suspects are: App Group ID mismatch between targets' entitlements, or the provisioning profile not actually carrying the App Group capability (common when free-tier/personal-team profiles are used without re-verifying entitlements after every regeneration).

### Pitfall 2: XcodeGen's `project.yml` schema drifting from the installed XcodeGen CLI version

**What goes wrong:** `project.yml` uses a YAML key/structure supported by a newer or older XcodeGen version than the one the CI workflow actually installs, causing `xcodegen generate` to fail or silently ignore a key (e.g., entitlements block).
**Why it happens:** No local Xcode/XcodeGen means there's no way to interactively verify the YAML against the tool locally before pushing — every iteration cycle is a full CI round-trip.
**How to avoid:** Pin an exact XcodeGen version in the CI workflow (not "latest") and reference that exact version's documented schema when authoring `project.yml`. Treat schema mismatches as an expected first-CI-run failure mode, not a surprise.
**Warning signs:** `xcodegen generate` succeeds but the generated project silently lacks the App Group entitlement or the local package dependency — always follow project generation with an explicit assertion step (e.g., `grep` the generated `.entitlements` file for the App Group string) rather than assuming success from exit code alone.

### Pitfall 3: Static library duplication when BanterShared is linked into multiple targets

**What goes wrong:** Xcode/SPM linker error "this will result in duplication of library code" when the same local package is linked as a static library dependency by both the app and the extension target.
**Why it happens:** SPM packages default to static linking; two targets in one app bundle statically linking the same package can duplicate symbols.
**How to avoid:** Keep `BanterShared` deliberately thin (Codable models + constants + the App Group helper — no heavyweight logic), and if the duplication warning/error appears, either mark the package's library type `dynamic` in `Package.swift` or configure the target's "Embed & Sign" vs "Do Not Embed" settings appropriately for the extension target. Address only if/when the error actually appears — don't preemptively configure exotic linking settings for a Phase 1 skeleton with only three tiny model types.
**Warning signs:** Build failure specifically naming "duplicate library" or symbol-collision errors during the `xcodebuild build` CI step for either target.

### Pitfall 4: Treating GitHub Actions macOS minutes as free

**What goes wrong:** Assuming the same 2,000 free minutes/month as Linux CI, then being surprised the macOS runner burns them 10x faster.
**Why it happens:** macOS runners carry a 10x billing multiplier against the same included-minutes quota [CITED: docs.github.com/en/billing]. A private repo's free quota (2,000 min/month on GitHub Free) is consumed at 10 minutes of quota per 1 real minute of macOS runner time.
**How to avoid:** Budget realistically — a Phase 1 build+test job of ~5-8 real minutes costs ~50-80 minutes of quota per run. At GitHub Free tier (2,000 min/month quota), that's roughly 25-40 CI runs/month before hitting the free ceiling. Cache aggressively (SPM + DerivedData) to keep real runtime down, and consider whether the dedicated repo should be public (GitHub Actions is free/unlimited for public repos) if there's no reason to keep it private — though given this is a commercial product with proprietary backend logic eventually, private is the safer default even at the minutes cost.
**Warning signs:** Actions usage dashback approaching quota mid-month; consider this now, before Phase 2+ adds heavier build/test cycles.

## Code Examples

### Round-trip App Group test (proves success criterion 2)

```swift
// BanterSharedTests/AppGroupRoundTripTests.swift
import XCTest
@testable import BanterShared

final class AppGroupRoundTripTests: XCTestCase {
    func testConversationMessageRoundTrips() {
        let message = ConversationMessage(speaker: .user, text: "hey!", order: 0)
        AppGroupStore.write(message, forKey: "test_message")
        let read = AppGroupStore.read(ConversationMessage.self, forKey: "test_message")
        XCTAssertEqual(read, message)
    }

    func testReplySuggestionRoundTrips() {
        let suggestion = ReplySuggestion(text: "...", psychologyTag: "reciprocity", style: .playful)
        AppGroupStore.write(suggestion, forKey: "test_suggestion")
        let read = AppGroupStore.read(ReplySuggestion.self, forKey: "test_suggestion")
        XCTAssertEqual(read, suggestion)
    }

    func testSentimentEventRoundTrips() {
        let event = SentimentEvent(conversationId: UUID(), messageIndex: 0, speaker: .user, scoreDelta: 0.5, signal: "warmth", timestamp: Date())
        AppGroupStore.write(event, forKey: "test_event")
        let read = AppGroupStore.read(SentimentEvent.self, forKey: "test_event")
        XCTAssertEqual(read?.conversationId, event.conversationId)
    }
}
```
Note: this test running inside a plain XCTest target (not app-hosted) exercises `UserDefaults(suiteName:)` directly — this validates the BanterShared package logic in isolation. Whether it *also* proves cross-process (app-writes, extension-reads) behavior depends on whether the test target itself carries the App Group entitlement; if not, an app-hosted UI test or a small XCTest target with the entitlement attached is needed to genuinely simulate the two-target handoff. Flag this as a Wave 0 setup detail for the planner (see Validation Architecture below).

### CAPT-04 structural guard test

```swift
// BanterSharedTests/NetworkBoundaryGuardTests.swift
import XCTest

final class NetworkBoundaryGuardTests: XCTestCase {
    /// Fails if any forbidden binary-payload type name appears in the network DTO source file.
    /// This is a cheap tripwire, not a substitute for type-level enforcement — the DTOs
    /// themselves should simply never declare `Data`/`UIImage` members in the first place.
    func testNetworkDTOsContainNoBinaryImagePayloadTypes() throws {
        let forbidden = ["UIImage", ": Data", "[UInt8]", "CGImage"]
        let dtoFileURL = try XCTUnwrap(
            Bundle(for: Self.self).url(forResource: "NetworkDTOs", withExtension: "swift")
            // In practice, resolve this path via a known relative path from the test bundle,
            // or scan the whole BanterShared/Sources/BanterShared/NetworkDTOs.swift file directly
            // by reading it from a project-relative path computed via #filePath.
        )
        let source = try String(contentsOf: dtoFileURL, encoding: .utf8)
        for token in forbidden {
            XCTAssertFalse(source.contains(token), "Forbidden binary-payload token '\(token)' found in network DTO source — CAPT-04 boundary violated")
        }
    }
}
```
Source: pattern is standard "grep as a test" — not sourced from any library, deliberately minimal per the Don't Hand-Roll guidance above. The planner should resolve the exact file-path mechanics (using `#filePath` relative navigation from the test file is the simplest, most portable option in a CI sandbox where the repo path is known) rather than relying on bundle resource lookup, which requires the `.swift` file to be added as a bundle resource (unusual).

### Minimal GitHub Actions workflow skeleton

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  build-and-test:
    runs-on: macos-26
    steps:
      - uses: actions/checkout@v4
      - name: Select Xcode
        run: sudo xcode-select -s /Applications/Xcode_26.4.1.app  # pin explicit version; verify exact path against runner-images readme at execution time
      - name: Cache SPM
        uses: actions/cache@v4
        with:
          path: |
            ~/Library/Caches/org.swift.swiftpm
            ~/Library/org.swift.swiftpm
            .build
          key: ${{ runner.os }}-spm-${{ hashFiles('**/Package.resolved') }}
      - name: Install XcodeGen
        run: brew install xcodegen
      - name: Generate project
        run: xcodegen generate
      - name: Build BanterApp (simulator)
        run: xcodebuild build -project Banter.xcodeproj -scheme BanterApp -destination "platform=iOS Simulator,name=iPhone 17" CODE_SIGNING_ALLOWED=NO
      - name: Test BanterShared
        run: xcodebuild test -project Banter.xcodeproj -scheme BanterApp -destination "platform=iOS Simulator,name=iPhone 17" CODE_SIGNING_ALLOWED=NO
      - name: Build BanterKeyboard placeholder (simulator)
        run: xcodebuild build -project Banter.xcodeproj -scheme BanterKeyboard -destination "platform=iOS Simulator,name=iPhone 17" CODE_SIGNING_ALLOWED=NO
```
This is illustrative scaffolding for the planner to refine — exact simulator device name/OS version, Xcode path, and scheme names must be confirmed against the actual `runner-images` readme and the generated project at execution time [ASSUMED].

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Hand-maintained `.xcodeproj` committed to git | Generated from `project.yml` (XcodeGen) or Swift DSL (Tuist) | Industry-wide shift over several years, well-established by 2026 | Merge conflicts on `.pbxproj` eliminated; project definition becomes reviewable text — essential (not optional) for a no-Mac workflow |
| GitHub Actions macOS runners on older Xcode/macOS images requiring manual SDK installs | `macos-26` runner GA with iOS 26 SDK + simulators preinstalled | GA 2026-02-26 [CITED: github.blog changelog] | No manual SDK-install CI step needed; directly satisfies the April 2026 iOS 26 SDK App Store submission requirement noted in project STACK.md |
| Free-text LLM parsing | N/A for this phase (see project ARCHITECTURE.md Pattern 2, out of scope for Phase 1) | — | — |

**Deprecated/outdated:**
- Manually editing `.pbxproj` XML/plist structure: superseded entirely by generator tools for any project maintained without constant Xcode GUI access.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | XcodeGen's exact current version (2.44.x) | Standard Stack | Low — planner should re-verify the release tag before pinning in CI; wrong guess just means adjusting a version string, not a design change |
| A2 | `CODE_SIGNING_ALLOWED=NO` is safe/standard alongside App Group entitlements in simulator builds | Pattern 2, Code Examples | Medium — if this flag interacts badly with entitlement resolution, the round-trip test could fail for a signing reason unrelated to the actual App Group logic being tested; if CI fails unexpectedly on this flag, try removing it before debugging the App Group code itself |
| A3 | Simulator App Group entitlement checks are looser than device checks (no hard error on mismatch) | Common Pitfalls, Pitfall 1 | Medium — if this is wrong and simulator enforcement is actually just as strict as device, then a passing CI round-trip test is stronger evidence than this document credits it for (upside risk, not a blocker) |
| A4 | Free personal-team (no paid account) can locally build App-Group-entitled apps to a real device, just not distribute | Common Pitfalls context, cross-referenced with WebSearch results | Low for Phase 1 (no device testing planned this phase) — matters only if a later phase adds device testing before the $99/yr account is purchased |
| A5 | Local SPM package linked into two targets can trigger "duplicate library code" — mitigation via dynamic linking or thin package design | Pitfall 3 | Low — this is a well-known, well-documented Swift Forums issue; if it doesn't occur for this project's simple 3-model package, no action needed |
| A6 | The exact `xcodebuild` destination/scheme names in the CI workflow skeleton | Code Examples | Low — cosmetic; planner will need to align these with whatever `project.yml` actually names the schemes and whatever simulator device the runner image actually has installed |

**If this table is empty:** N/A — see rows above; all are LOW-MEDIUM risk and none blocks starting Phase 1 planning, but A2 and A3 should be watched closely during the first CI run since they affect how much confidence to place in a green build.

## Open Questions

1. **Does the app-hosted (not standalone-XCTest) App Group round-trip need a UI test, or is a plain XCTest with the entitlement attached sufficient?**
   - What we know: A plain XCTest target using `UserDefaults(suiteName:)` directly will exercise the BanterShared logic correctly regardless of entitlements (simulator is lenient per Pitfall 1).
   - What's unclear: Whether Phase 1's success criterion 2 ("round-trip test proves data written by the app is readable by the keyboard target") requires literally running code *inside* the app process and *inside* the keyboard extension process (a UI test driving both), versus a same-process XCTest being accepted as sufficient proof for Phase 1's skeleton bar.
   - Recommendation: Start with the simpler same-process XCTest (Code Examples above) as the Phase 1 bar — it's the lazy, sufficient choice for a skeleton phase. If the plan-checker or user wants stronger proof, escalate to a UI test that launches the real keyboard extension in the simulator and confirms it displays data the test first wrote via the app. Note this explicitly as a scope decision the planner should make, not silently assume.

2. **Exact XcodeGen/Tuist current release versions and Xcode simulator device names on the `macos-26` runner**
   - What we know: XcodeGen is actively maintained (last release cited as 2026-04-14); the `macos-26` runner defaults to Xcode 26.4.1 with iPhone 16e/17/17 Pro/17 Pro Max/17e simulators listed.
   - What's unclear: Exact current values change monthly; this document's specifics were WebSearch-sourced, not registry-verified.
   - Recommendation: The first CI run itself is the cheapest verification step — planner should treat "first green CI run" as also the version-verification step, not something to nail down in advance.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| macOS / Xcode (local) | Building/testing the iOS project at all | ✗ (developer has no Mac) | — | GitHub Actions `macos-26` hosted runner — this is not a fallback, it is the primary and only build environment for this entire project |
| GitHub Actions macOS runner | All CI build/test | ✓ (public GitHub feature, available once repo exists on GitHub) | `macos-26` image, Xcode 26.4.1 default | — |
| Paid Apple Developer Program ($99/yr) | On-device App Group testing, TestFlight, App Store submission | ✗ (not yet purchased, not needed this phase) | — | Simulator-only testing covers 100% of Phase 1's stated success criteria; defer purchase until a phase that needs a physical device or distribution |
| Dedicated GitHub repo for `banter/` | Any CI at all — Actions requires a GitHub-hosted repo | ✗ (currently nested inside a monorepo pushed to `nexdo-timekeeper-web`, not its own repo) | — | Must be created as part of Phase 1 execution — see Git Topology section below; no viable fallback, this blocks all CI |
| XcodeGen | Generating `.xcodeproj` from `project.yml` in CI | ✓ (installable via Homebrew on the runner, one workflow step) | Latest via `brew install xcodegen` | — |

**Missing dependencies with no fallback:**
- Dedicated GitHub repo for `banter/` — must be created before any CI can run. This is a Phase 1 execution task, not just a research note.

**Missing dependencies with fallback:**
- Paid Apple Developer Program account — deferred; simulator-only CI is a complete fallback for every Phase 1 success criterion.

## Git Topology Recommendation

**Current state (confirmed by direct inspection):** `banter/` lives as a subdirectory inside the personal monorepo at `Nex_Doc/20-29 Projects/...`, which is itself a single git repo whose remote (`origin`) points to `https://github.com/kish-jpg/nexdo-timekeeper-web.git` — an unrelated sibling project's repo. There is no `.git` directory inside `banter/` itself; it is fully absorbed into the parent repo's history.

**Sibling precedent (confirmed by direct inspection):** `10-19 Apps/18 FocusForge/` has its own independent `.git` directory with `origin` pointing to `https://github.com/kish-jpg/focusforge.git` — a dedicated repo, separate from the personal monorepo, despite `FocusForge` also living as a subdirectory of the same Nex_Doc workspace on disk.

**Recommendation: dedicated private GitHub repo for `banter`, following the FocusForge pattern exactly.**

Justification:
1. **CI requires a GitHub-hosted repo — the personal monorepo's remote is already claimed by an unrelated project** (`nexdo-timekeeper-web`). Pushing `banter/`'s CI workflow into that repo would run Actions against a repo whose name, README, and purpose are about a completely different app — confusing at best, and it would mean Actions billing/minutes for this project mix with an unrelated project's usage.
2. **The personal monorepo contains unrelated private content** (other founder ventures, day-job inventory/LMS systems, personal notes in `40-49 Brain/`) that has no reason to be exposed to a CI pipeline or to accumulate in a repo whose only reason for existing is to support Banter's build/test loop.
3. **FocusForge already validates this exact pattern works for this developer's workflow** — a project physically nested inside the Nex_Doc folder tree on disk, but version-controlled as its own independent repo with its own GitHub remote. Directory nesting on the local filesystem and git-repo boundaries are orthogonal; Banter should follow the same split.
4. **A dedicated repo makes the "$99/yr line" and Actions-minutes accounting cleanly scoped to this one project** — useful for later cost tracking once the project has its own subscription/backend spend to reason about alongside CI spend.

**Concrete steps for Phase 1 execution (not research — but the planner needs this named as a prerequisite task):**
1. Create a new empty private GitHub repo, e.g. `kish-jpg/banter`.
2. Inside the `banter/` directory (on Windows), run `git init` to create its own independent `.git` (it currently has none — confirmed).
3. Add the new GitHub repo as `origin`.
4. Add a `.gitignore` appropriate for Xcode/SPM (`.build/`, `DerivedData/`, `*.xcodeproj/` if XcodeGen-generated projects are treated as build artifacts rather than committed — this is itself a small decision the planner should make explicitly: XcodeGen projects are commonly *not* committed since they're regenerated by CI, but for a solo no-Mac developer, deciding whether to commit the generated `.xcodeproj` anyway as a convenience/debugging aid is worth a one-line decision in the plan).
5. The existing `.planning/` GSD scaffolding (`REQUIREMENTS.md`, `STATE.md`, `PROJECT.md`, `research/`) currently lives under the monorepo's tracked history — the planner must decide whether `.planning/` moves into the new dedicated repo wholesale (recommended, keeps planning docs alongside the code they describe) or stays split across two repos (not recommended — creates exactly the kind of drift risk GSD's own philosophy warns against).

## Code Signing Reality (Summary Table)

| Activity | Requires paid Apple Developer Program ($99/yr)? | Confidence |
|----------|--------------------------------------------------|------------|
| `xcodebuild build` for iOS Simulator destination | No | MEDIUM [CITED via Codemagic docs + Apple forums pattern; simulator apps are inherently unsigned] |
| `xcodebuild test` on iOS Simulator | No | MEDIUM |
| App Group entitlement present in a simulator build/test | No (simulator enforcement is lenient) | LOW — flagged assumption, see Pitfall 1 |
| App Group entitlement working correctly on a real physical device | Effectively yes in practice — needs a provisioning profile; a free personal-team account can create one for local device testing (no App Store/TestFlight distribution rights), but this is fragile/limited | MEDIUM |
| TestFlight distribution | Yes | HIGH [CITED: Apple Developer Program membership pages] |
| App Store submission | Yes | HIGH [CITED: Apple Developer Program membership pages] |

**Earliest phase that needs the paid account:** Not Phase 1. Based on the project roadmap (Phase 5 = Keyboard, requiring real device behavior for Full Access/App Group testing to mean anything beyond simulator-lenient checks; Phase 8 = Metrics & Launch, requiring TestFlight/App Store). The planner should flag the $99/yr purchase as a prerequisite no later than whichever phase first requires physical-device verification of App Group/Full Access behavior — likely Phase 5, and certainly required by Phase 8.

## Walking Skeleton Scope Recommendation

Given Phase 1 is explicitly "the thinnest end-to-end slice proving the architecture" in MVP mode, the skeleton should include exactly these things and nothing more:

1. **BanterApp target:** one SwiftUI screen (a literal placeholder view — no onboarding, no real UI) that on appear or button-tap writes a hardcoded sample `ConversationMessage`/`ReplySuggestion`/`SentimentEvent` into the App Group container via `BanterShared.AppGroupStore`.
2. **BanterKeyboard target:** a placeholder `UIInputViewController` subclass that builds successfully and, ideally, reads back and displays (even as raw text, no styling) whatever `BanterApp` last wrote — proving the read path, not just the build path.
3. **BanterShared package:** the three Codable model types, the `AppGroupStore` helper, and a `NetworkDTOs.swift` file containing at least one structured-text-only request type (e.g., `struct AnalyzeConversationRequest: Codable { let messages: [ConversationMessage] }`) — this DTO existing and being provably free of binary members is what CAPT-04's structural guarantee actually is at this phase (there is no real backend yet — the guarantee is "the type that *would* be sent cannot carry an image", not "a live network call was tested").
4. **CI pipeline:** generates the project, builds both targets, runs both test files, all green.

**Explicitly NOT in scope for Phase 1** (per project roadmap, these are later phases' jobs): real OCR (Phase 2), real LLM backend calls (Phase 3), real onboarding UI (Phase 4), real keyboard suggestion UI (Phase 5), any actual HTTP call to any actual backend (no backend exists yet — the "network boundary" enforced in Phase 1 is a type-system/test guarantee about what request types *can* contain, verified without a live network target).

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | XCTest (Xcode 26.4.1, OS-bundled — no install needed) |
| Config file | none — schemes generated by XcodeGen from `project.yml`; test target defined there |
| Quick run command | `xcodebuild test -project Banter.xcodeproj -scheme BanterApp -destination "platform=iOS Simulator,name=iPhone 17" -only-testing:BanterSharedTests` |
| Full suite command | `xcodebuild test -project Banter.xcodeproj -scheme BanterApp -destination "platform=iOS Simulator,name=iPhone 17"` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|---------------------|-------------|
| CAPT-04 | Network/request DTOs contain no `Data`/`UIImage`/binary-payload members — no code path can transmit a raw image off-device | unit | `xcodebuild test -only-testing:BanterSharedTests/NetworkBoundaryGuardTests` | ❌ Wave 0 — must be created |
| Success Criterion 1 (both targets build, share BanterShared via common App Group ID) | Build succeeds for both schemes | smoke (build-only, no assertions beyond exit code) | `xcodebuild build -scheme BanterApp ...` and `xcodebuild build -scheme BanterKeyboard ...` | ❌ Wave 0 — targets themselves don't exist yet |
| Success Criterion 2 (round-trip: app writes, keyboard reads, via shared container) | App Group write/read round-trip for all 3 model types | unit (same-process XCTest; app-hosted/UI-test escalation is an open question, see Open Questions #1) | `xcodebuild test -only-testing:BanterSharedTests/AppGroupRoundTripTests` | ❌ Wave 0 — must be created |
| Success Criterion 3 (network boundary only accepts structured text) | Same guard test as CAPT-04 (this success criterion and CAPT-04 are the same underlying check) | unit | (same as CAPT-04 row) | ❌ Wave 0 |
| Success Criterion 4 (shared model types defined once, imported by both targets) | Compile-time proof: both targets import `BanterShared` and reference its types (not local redefinitions) | smoke (verified by the build step succeeding + a source-grep confirming no duplicate type declarations outside BanterShared) | `xcodebuild build` (build step) + one grep assertion in the guard test file or a dedicated small test | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** quick run command (`-only-testing:BanterSharedTests`) — fast, since Phase 1's entire test surface is two small test files.
- **Per wave merge:** full suite command (both targets build + all tests).
- **Phase gate:** Full suite green in CI (there is no local machine to run a "final check" on — CI green *is* the phase gate, not a local pre-check before CI).

### Wave 0 Gaps

- [ ] `banter/` needs its own dedicated GitHub repo before any CI can run (see Git Topology section) — this is a repo-creation task, not a code task, but blocks everything else.
- [ ] `project.yml` (XcodeGen spec) — does not exist yet, must be created to define both targets + entitlements + package dependency.
- [ ] `.github/workflows/ci.yml` — does not exist yet.
- [ ] `BanterShared/Package.swift` + `Sources/BanterShared/{Models,AppGroupStore.swift,NetworkDTOs.swift}` — package does not exist yet.
- [ ] `BanterSharedTests/AppGroupRoundTripTests.swift` — covers Success Criterion 2.
- [ ] `BanterSharedTests/NetworkBoundaryGuardTests.swift` — covers CAPT-04 / Success Criterion 3.
- [ ] `BanterApp/` minimal SwiftUI placeholder target — does not exist yet.
- [ ] `BanterKeyboard/` minimal `UIInputViewController` placeholder target — does not exist yet.
- [ ] Framework install: none needed beyond what `brew install xcodegen` + OS-bundled XCTest provide on the CI runner.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|----------------|---------|-------------------|
| V2 Authentication | No | No auth surface exists in Phase 1 — no backend, no login, skeleton only |
| V3 Session Management | No | Same — no session/backend exists yet |
| V4 Access Control | No | No multi-user or role concept in this phase |
| V5 Input Validation | Marginal — yes for the DTO boundary | The `NetworkDTOs.swift` request types are the input-validation surface Phase 1 actually cares about: structural typing (only primitive/String fields, `Codable`) is itself the validation control — there's no free-text parsing or injection surface yet since no backend call is actually made this phase |
| V6 Cryptography | No | App Group `UserDefaults` storage for a skeleton phase's sample data carries no sensitive real-user content yet (real conversation text arrives in Phase 2+); no crypto control needed for Phase 1's placeholder payloads specifically, but note for later phases: real conversation text stored in the App Group container should eventually be considered for at-rest protection given its sensitivity (flag for Phase 2/7, not a Phase 1 blocker) |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|------------------------|
| Raw image/screenshot data accidentally included in a network request type (the exact CAPT-04 risk) | Information Disclosure | Structural type-system enforcement (DTOs cannot declare `Data`/`UIImage` members) + automated guard test in CI that fails the build if violated |
| App Group container read by an unintended third target/app (misconfigured App Group ID reused elsewhere) | Information Disclosure | App Group ID (`group.com.banter.shared`) uniquely namespaced under this project's bundle ID prefix; verify entitlement files for both targets reference the identical, correctly-namespaced ID — checked via CI grep assertion on the generated `.entitlements` files (ties into Pitfall 2's mitigation) |
| CI secrets/signing material exposure (not applicable yet — no signing this phase, but flag for later) | Information Disclosure | N/A for Phase 1 (no signing certs or App Store Connect API keys exist yet); when Phase 5/8 introduces a paid account and CI signing, use GitHub Actions encrypted secrets — never commit provisioning profiles/certs to the repo |

## Project Constraints (from CLAUDE.md)

No `banter/`-scoped `.claude/CLAUDE.md` exists yet (checked directly — absent). The workspace-root `CLAUDE.md` (Nex_Doc Johnny.Decimal system) applies at the file-placement level only, not at the code/architecture level:

- **File placement:** `banter/` currently lives as a root-level app folder outside the `10-19 Apps/` JD structure — this is an explicitly acknowledged pre-Phase-2-migration state per `PROJECT.md`'s Context section ("Workspace: lives in Nex_Doc as root-level app folder `banter/` (pre-Phase 2 convention); assign JD address in 10-19 Apps during Phase 2 migration"). Phase 1 should NOT attempt this JD-address migration — it's explicitly deferred, and moving the folder while also splitting it into its own git repo in the same phase would compound two structural changes at once. Recommendation: do the git-repo split now (blocks CI, needed immediately); defer the JD-folder move to whatever "Phase 2 migration" the project owner intends (this is a Nex_Doc workspace-level migration, not one of Banter's own 8 roadmap phases — don't conflate the two "Phase 2" labels).
- **Obsidian/graphify tooling:** not relevant to Banter's iOS build pipeline; no action needed for Phase 1.

No forbidden patterns, required tools, or testing rules are specified in the root CLAUDE.md that constrain iOS/Swift code — it governs the personal workspace's document organization, not this project's software architecture.

## Sources

### Primary (HIGH confidence)
- Project-level `.planning/research/STACK.md` and `.planning/research/ARCHITECTURE.md` (already-verified, cited per-claim within those documents against developer.apple.com official docs) — built upon, not re-researched, per task instructions.
- Direct filesystem/git inspection of this workspace (`git status`, `git remote -v` in both `banter/` and `10-19 Apps/18 FocusForge/`) — confirmed `banter/` has no independent `.git`, is absorbed into the `nexdo-timekeeper-web` monorepo; confirmed FocusForge has its own independent repo — VERIFIED via direct tool execution, not WebSearch.
- [GitHub Docs: Actions runner pricing](https://docs.github.com/en/billing/reference/actions-runner-pricing) — macOS 10x multiplier, official.

### Secondary (MEDIUM confidence, cross-checked across multiple sources)
- [GitHub Changelog: macos-26 is now generally available for GitHub-hosted runners](https://github.blog/changelog/2026-02-26-macos-26-is-now-generally-available-for-github-hosted-runners/) — runner image GA date, default Xcode version.
- [actions/runner-images: macos-26-arm64-Readme.md](https://github.com/actions/runner-images/blob/main/images/macos/macos-26-arm64-Readme.md) — preinstalled Xcode versions/simulators (verify exact current list at execution time, images update frequently).
- [Apple Developer: App Groups Entitlement docs](https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.security.application-groups) — official entitlement reference.
- [Apple Developer: Choosing a Membership / Compare Memberships](https://developer.apple.com/support/compare-memberships/) — paid vs free account capabilities.
- [Codemagic Docs: iOS simulator builds](https://docs.codemagic.io/yaml-code-signing/ios-simulator-builds/) — simulator builds require no code signing.
- [GitHub: peripheryapp/periphery](https://github.com/peripheryapp/periphery) — considered and explicitly not recommended for Phase 1's narrower need.
- [XcodeGen GitHub](https://github.com/yonaskolb/XcodeGen) and [Tuist](https://tuist.dev/) — tool comparison basis.

### Tertiary (LOW confidence, WebSearch-only, flagged in Assumptions Log)
- Practitioner blog/forum claims about simulator App Group entitlement leniency vs device strictness (Pitfall 1, Assumption A3) — no official Apple documentation found confirming this explicitly; treat as directionally likely but unverified.
- Swift Forums thread on static-library-duplication linking errors for local packages in multiple targets (Pitfall 3) — a known, documented community issue, but exact current behavior in Xcode 26.x/Swift 6.2 not independently reproduced this session.
- XcodeGen exact current version number (Assumption A1) — WebSearch snippet only, not registry-verified.

## Metadata

**Confidence breakdown:**
- CI/runner mechanics (GitHub Actions macOS runner, Xcode version, caching): MEDIUM — cross-checked official GitHub sources with practitioner blogs, but exact version numbers will drift and must be re-verified at execution time.
- Code signing / App Group simulator-vs-device behavior: MEDIUM for the "no signing needed for simulator" claim (well-documented), LOW for the specific "simulator entitlement checks are looser" claim (practitioner-sourced only) — flagged explicitly in Pitfall 1 and Assumption A3.
- Git topology recommendation: HIGH — based on direct filesystem/git inspection of this exact workspace, not external research.
- XcodeGen vs Tuist recommendation: MEDIUM — both tools' capabilities are well-documented; the "which is lazier for a 2-target skeleton" judgment is a reasoned recommendation based on verified feature differences, not itself an external fact to verify.
- CAPT-04 structural enforcement pattern: HIGH — this is a straightforward Swift type-system argument (a struct with only String/primitive fields cannot carry binary image data), not dependent on any external source.

**Research date:** 2026-07-03
**Valid until:** 2026-08-02 (30 days) — CI runner images, Xcode versions, and tool release versions in this domain move fast; re-verify exact version numbers (XcodeGen release, Xcode default on `macos-26`, GitHub Actions minute pricing) before relying on this document if execution starts more than a few weeks after this research date.
