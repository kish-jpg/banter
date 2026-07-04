# Phase 4: Companion App UI & Paywall - Research

**Researched:** 2026-07-04
**Domain:** SwiftUI companion-app UX (onboarding, tone-picker, expandable psychology explainer, per-conversation timeline), StoreKit 2 + RevenueCat freemium reverse-trial monetization
**Confidence:** MEDIUM-HIGH

## Summary

Phase 4 has no external research providers enabled in this project's config (`brave_search`/`exa_search`/`firecrawl`/`tavily_search`/`ref_search`/`perplexity`/`jina` are all `false`), so this research was performed with the built-in `WebSearch`/`WebFetch` tools directly, per the tool-strategy fallback rule. Findings below are tagged per the standard provenance scheme; several pricing and StoreKit-eligibility claims are `[CITED]` from blog/tutorial sources rather than Apple's own documentation, since Apple Developer docs were not directly fetched this session — flagged for the planner to spot-check against `developer.apple.com` if precision matters before locking numbers.

The phase is a UI-and-monetization phase on top of an already-working backend: Phase 3 shipped a live, gated `/coaching` edge function returning exactly 3 tagged replies + a `sentiment {score, factors, signal}` object, reachable via `CoachingResponseDTO` in `BanterShared`. Phase 4's job is almost entirely SwiftUI screen-building plus one new third-party dependency (RevenueCat) — there is very little novel backend work. The two genuinely new technical surfaces are: (1) local persistence of a per-conversation sentiment timeline (Phase 3 is explicitly stateless — "event-timeline persistence... deferred to Phase 4," per 03-03-SUMMARY.md and `Backend/README.md`), which this phase should implement **client-side, on-device**, not as a new backend table; and (2) the RevenueCat/StoreKit 2 entitlement check gating analysis-cap and calculator depth.

The ~$7/wk pricing anchor from PROJECT.md is `[VERIFIED: WebSearch, App Store listings]` — cross-checked against three live "Rizz"-branded competitor apps on the App Store: $3.99/wk, $6.99/wk (3-day trial), and $7/wk (after a free week), with ~$20/mo alternatives. This corroborates PROJECT.md's anchor; no conflicting evidence was found this session for the *price point* itself. The "conflicting sources" blocker noted in STATE.md may refer to conflicting *trial-length* or *tier-structure* claims rather than the price — flag this back to the user/discuss-phase rather than silently resolving it, since this session's search did not surface the original conflicting source.

**Primary recommendation:** Build Phase 4 as four SwiftUI feature slices reusing the exact `Banter.*` token set from 02-UI-SPEC.md (no new design system): (1) onboarding + permission-priming flow that runs the real screenshot-to-coaching loop before any signup wall, (2) a tone picker + expandable psychology-tag sheet on the existing suggestion-card surface, (3) an on-device `SentimentEvent` timeline store (new local persistence, not a new backend endpoint) feeding a per-conversation health-score view, and (4) RevenueCat-mediated paywall + entitlement gating with a 14-day reverse trial. Do not hand-roll receipt validation, entitlement caching, or trial-eligibility logic — RevenueCat owns all of that.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Onboarding flow + permission priming screens | Client (SwiftUI, BanterApp) | — | Pure UI/UX sequencing; no server state needed |
| First-run "value before paywall" demo loop | Client (BanterApp) calling existing Backend | Backend (Phase 3, unchanged) | Reuses the exact Phase 2/3 pipeline (screenshot → OCR → confirm → `/coaching`); Phase 4 adds no new backend call shape |
| Tone picker (COAC-02) | Client (BanterApp) | Backend (Phase 3, unchanged) | `tone` is already a first-class field on `AnalyzeConversationRequest`/`CoachingRequest` — Phase 4 only needs a UI control that sets it |
| Expandable "why this works" tag explainer (COAC-04) | Client (BanterApp) | Backend taxonomy artifact (Phase 3, read-only) | The citation text must come from `taxonomy.json`'s existing entries (framework + description), not a new LLM call — avoids latency and a second network round-trip per tap |
| Per-conversation sentiment timeline + health score (CALC-02/03) | Client (BanterApp, on-device persistence) | Backend (Phase 3, unchanged aggregate `sentiment` per response) | Backend is explicitly stateless for this (03-03-SUMMARY.md); the timeline is a client-side accumulation of successive `SentimentDTO` responses keyed by `conversationId`, stored in the App Group container via the existing `AppGroupStore`/`SentimentEvent` model — no new server table, no cross-conversation dossier (CALC-03 boundary) |
| Free tier daily cap + premium entitlement (MONE-01/02) | Client (BanterApp via RevenueCat SDK) | App Store / RevenueCat backend | Entitlement state is fetched from RevenueCat (which syncs with App Store Server), cached locally; app gates local UI/network-call frequency based on entitlement, does not invent its own subscription ledger |
| 14-day reverse trial + graceful downgrade (MONE-03) | App Store Connect config + Client (RevenueCat SDK) | — | Trial length and downgrade behavior are configured as a StoreKit subscription's introductory offer / RevenueCat offering, not app logic — the app only reacts to the entitlement state RevenueCat reports |
| Photos / keyboard permission priming (ONBD-02) | Client (BanterApp, PhotosPicker + custom pre-permission screens) | — | Pure client UX; PhotosPicker itself needs no priming (system picker doesn't need Photos permission for the limited picker UI), but full-library/keyboard-enable flows benefit from a contextual explainer per HIG |

## User Constraints

No CONTEXT.md exists for Phase 4 at research time (`.planning/phases/04-companion-app-ui-paywall/` contains no `*-CONTEXT.md`). This section is empty because `/gsd:discuss-phase` has not yet been run for this phase — if it runs before planning, its output supersedes the defaults below. In its absence, the planner should treat the Roadmap's Phase 4 description (goal, success criteria, requirement IDs) as the binding scope, and this RESEARCH.md's recommendations as defaults, not locked decisions.

## Project Constraints (from CLAUDE.md)

No project-level `./CLAUDE.md` or `./.claude/CLAUDE.md` exists inside the `banter/` working directory itself (config.json references `"claude_md_path": "./.claude/CLAUDE.md"` but that path does not exist on disk in this worktree). The repo-root `CLAUDE.md` found at the Nex_Doc workspace level governs Johnny.Decimal file placement and applies to where documents/notes live in the broader Nex_Doc vault, not to Banter's own Swift/Deno source conventions — no actionable directive from it changes how Phase 4 code should be structured. No project constraints beyond the existing `.planning/` decisions (PROJECT.md, STATE.md) apply here.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ONBD-01 | Onboarding demonstrates core value before any signup or paywall (Wispr Flow pattern) | Wispr Flow "value before signup" pattern confirmed `[CITED: kristenberman.substack.com, growthdives.com]`; Phase 2's Import/OCR/Confirm screens already exist and are reused as the pre-paywall demo loop, wired to the live Phase 3 `/coaching` endpoint |
| ONBD-02 | Permissions (photos, keyboard) primed contextually with explainer screens at moment of need | HIG contextual-permission-priming pattern `[CITED: Apple HIG, dogtownmedia.com]`; pattern already partially established in 02-UI-SPEC.md (Screen 1 defers Photos priming explicitly to Phase 4) |
| COAC-02 | User can select a tone (playful/sincere/witty/direct) to steer suggestions | `tone: ReplyStyle?` already exists on `AnalyzeConversationRequest` (BanterShared) and `CoachingRequest` (Backend) — Phase 4 only adds the UI control, no schema change |
| COAC-04 | Tap a tag to expand plain-English "why this works" with citation | `taxonomy.json`/`taxonomy.ts` (Phase 3) already stores framework name + description per allowlisted tag — Phase 4 reads this locally, no new LLM call |
| CALC-02 | Per-conversation health score with emotional-factor timeline | `SentimentEvent` model already exists in BanterShared (conversationId, messageIndex, speaker, scoreDelta, signal, timestamp) but is currently unused/unwired — Phase 4's job is to actually populate and persist it per coaching response, then render a timeline chart |
| CALC-03 | Insights scoped per-conversation only, no persistent match dossier | Enforced by keying all timeline storage strictly by `conversationId` (client-minted, per-conversation), never by match name/identity — matches the Phase 3 "no SentimentEvent persistence server-side" boundary and the project's explicit Out-of-Scope ban on match dossiers |
| MONE-01 | Free tier daily analysis cap, tags always visible | Entitlement-gated client-side counter (reset daily), independent of which tier — psychology tags are never behind the paywall per the product thesis, only volume/depth is |
| MONE-02 | Premium subscription (RevenueCat/StoreKit 2) unlocks unlimited analyses + calculator depth | `RevenueCat/purchases-ios` SDK `[VERIFIED: GitHub official org repo, 3000+ stars, v5.80.2 as of 2026-07-02]` — wraps StoreKit 2, handles entitlement caching/receipt validation |
| MONE-03 | 14-day reverse trial, graceful downgrade to free | StoreKit 2 introductory-offer / RevenueCat "Offering" configuration `[CITED: tanaschita.com, revenuecat.com blog]` — trial length configured in App Store Connect, not hardcoded in Swift |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|---------------|
| StoreKit 2 (`import StoreKit`) | iOS 18 SDK (already the project floor) | Native subscription purchase/restore/entitlement APIs | First-party, zero dependency cost, required underlying transport regardless of RevenueCat use `[ASSUMED: standard Apple framework knowledge]` |
| RevenueCat `purchases-ios` | 5.80.2 (latest tagged release as of 2026-07-02) `[VERIFIED: GitHub RevenueCat/purchases-ios releases page]` | Subscription/entitlement management layer over StoreKit 2: server-side receipt validation, entitlement caching, cross-platform analytics, offering/paywall config without app releases | Explicitly named in the phase's own Success Criteria #4 ("via RevenueCat/StoreKit 2") — not a discretionary choice; industry-standard wrapper avoiding hand-rolled receipt validation and entitlement-eligibility logic `[VERIFIED: GitHub — 3000+ stars, 416 releases, official RevenueCat org]` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| SwiftUI `Charts` framework (`import Charts`) | iOS 16+ (well under the iOS 18 floor) | Rendering the CALC-02 emotional-factor timeline as a line/area chart | First-party, no dependency; use for the per-conversation sentiment-over-time visualization `[ASSUMED: standard Apple framework, not verified this session against Apple docs]` |
| `PhotosPicker` (SwiftUI, already used in Phase 2) | iOS 16+ | Screenshot import in the pre-paywall demo loop | Already adopted in `ImportEntryView.swift` — reuse, do not reintroduce `UIImagePickerController` or a new picker library |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| RevenueCat | Raw StoreKit 2 only (no wrapper) | Saves the dependency but requires hand-rolling server-side receipt validation, introductory-offer eligibility checks, and cross-device entitlement sync — the phase's own success criteria explicitly names RevenueCat, and "Don't Hand-Roll" applies directly to receipt validation (see below) |
| SwiftUI `Charts` | Custom `Canvas`/`Path`-drawn timeline | Only justified if `Charts`' built-in marks (line, point, area) can't express the exact "emotional-factor timeline" visual the UI-spec phase (02-UI-SPEC pattern extended in Phase 4) calls for; default to `Charts` first (ladder rung 4 — native platform feature) |

**Installation:**
```bash
# Xcode: File -> Add Package Dependencies -> https://github.com/RevenueCat/purchases-ios.git
# Dependency Rule: Up to Next Major Version, 5.0.0 < 6.0.0
# project.yml (XcodeGen) equivalent:
packages:
  RevenueCat:
    url: https://github.com/RevenueCat/purchases-ios.git
    from: "5.80.2"
```

**Version verification:** `purchases-ios` v5.80.2 confirmed via direct GitHub fetch of the repository's releases page (2026-07-02 release date) `[VERIFIED: GitHub RevenueCat/purchases-ios]`. No `npm view`/`pip index`/`cargo search` equivalent applies — this is a Swift Package Manager dependency; SPM has no separate registry query command, GitHub tags are the source of truth.

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|--------------|---------|-------------|
| RevenueCat/purchases-ios | GitHub (SPM) | Multi-year (5,246 commits, 416 releases) | N/A (SPM has no download counter; 3,000 GitHub stars, 428 forks) | github.com/RevenueCat/purchases-ios | OK | Approved |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

*RevenueCat's package name and repository were confirmed via a direct `WebFetch` of the GitHub repo page in this session (official org, active maintenance, current release), which satisfies verification beyond a bare registry-existence check — no automated `package-legitimacy check` seam was available in this environment (gsd-tools.cjs was not found on this machine's PATH or expected install locations), so this verification was done manually via WebFetch against the authoritative GitHub source. The planner should still gate the actual `npm`/SPM add behind a `checkpoint:human-verify` task per standard practice, since this substitutes for, but does not exactly replicate, the automated seam.*

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         BanterApp (Client)                      │
│                                                                   │
│  [Onboarding]                                                    │
│    Welcome → "resonates with you?" screens → Photos priming     │
│    explainer → PhotosPicker (Phase 2, reused) → OCR → Confirm   │
│    → live /coaching call → 3 tagged replies shown              │
│    (VALUE DELIVERED HERE, before any signup/paywall screen)      │
│         │                                                        │
│         ▼                                                        │
│  [Suggestion Cards]  ── tone picker (sets CoachingRequest.tone) │
│    Each card: text + one-line psychologyTag                    │
│    Tap tag → expand sheet → taxonomy.json lookup (local,        │
│    no network) → framework name + citation text                │
│         │                                                        │
│         ▼                                                        │
│  [Sentiment Ingest]                                              │
│    Every /coaching response's `sentiment` object is appended    │
│    as a new SentimentEvent, keyed by conversationId, written    │
│    to AppGroupStore (on-device only — no server persistence)    │
│         │                                                        │
│         ▼                                                        │
│  [Love Calculator Timeline] (CALC-02/03)                        │
│    Reads SentimentEvent[] for ONE conversationId only           │
│    Renders health score + Charts timeline                       │
│    No cross-conversation aggregation, no match-keyed storage    │
│                                                                   │
│  [Paywall / Entitlement Gate] (MONE-01/02/03)                   │
│    RevenueCat SDK.shared.customerInfo → entitlement check       │
│    Free: daily analysis counter (local) caps /coaching calls,   │
│           tags always shown regardless of tier                  │
│    Trial: 14-day full access (RevenueCat Offering config)       │
│    Premium: unlimited + calculator depth unlocked                │
│    Downgrade: entitlement expiry → free-tier UI reverts,        │
│           no data loss (timeline data stays on-device)           │
└─────────────────────────────────────────────────────────────────┘
         │ (existing Phase 3 contract, unchanged)
         ▼
┌─────────────────────────────────────────────────────────────────┐
│         Backend/functions/coaching/index.ts (Phase 3)           │
│   Stateless: returns replies[] + sentiment{} per call only      │
└─────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
BanterApp/
├── Onboarding/
│   ├── OnboardingFlowModel.swift       # sequencing state, permission-priming steps
│   ├── WelcomeView.swift
│   ├── PermissionPrimingView.swift     # generic reusable explainer screen (Photos, then later Keyboard)
│   └── ValueDemoCoordinatorView.swift  # wraps existing Import→Progress→Confirm→Coaching call
├── Coaching/
│   ├── SuggestionCardView.swift        # reply text + tag chip
│   ├── TonePickerView.swift            # COAC-02
│   ├── TagExplainerSheet.swift         # COAC-04, reads taxonomy locally
│   └── CoachingClient.swift            # thin URLSession wrapper calling Backend /coaching
├── Calculator/
│   ├── SentimentTimelineStore.swift    # CALC-02/03: on-device persistence, per-conversationId
│   └── ConversationHealthView.swift    # score + Charts timeline
├── Paywall/
│   ├── EntitlementManager.swift        # wraps RevenueCat Purchases.shared, exposes isPremium/trialDaysRemaining
│   ├── PaywallView.swift               # MONE-02/03
│   └── DailyCapTracker.swift           # MONE-01: local counter, resets at midnight
└── DesignSystem/
    └── BanterTokens.swift              # REUSED UNCHANGED from Phase 2 — do not add new tokens without checking 02-UI-SPEC.md first
```

### Pattern 1: Taxonomy-backed local explainer (no new network call for COAC-04)

**What:** The "why this works" expansion reads directly from the same `taxonomy.json` structure Phase 3 already ships (framework name + description per tag), bundled into the client at build time or fetched once and cached — not re-queried from the LLM per tap.
**When to use:** Any time a `psychologyTag` string needs its citation/explanation text.
**Example:**
```swift
// Source: mirrors Backend/functions/coaching/taxonomy.json structure (03-01-SUMMARY.md)
// Bundle a client-side copy (or fetch once, cache) of the same taxonomy entries:
struct TaxonomyEntry: Codable {
    let tagName: String
    let framework: String       // e.g. "Gottman Method"
    let explanation: String     // plain-English "why this works"
}

func explainer(for tag: String, in taxonomy: [TaxonomyEntry]) -> TaxonomyEntry? {
    taxonomy.first { $0.tagName == tag }
}
```
**Decision needed at plan time:** whether the client bundles a static copy of taxonomy.json (simplest, but drifts if Backend's taxonomy changes without a client release) or fetches it once per session from a new lightweight `/taxonomy` read endpoint (stays in sync, one more network call). Given Phase 3 already treats `taxonomy.json` as a versioned tracked artifact, bundling a synced copy (same `sync-fixture.sh`-style drift guard used for the coaching-response fixture) is the lower-risk default — reuse the existing sync-and-diff pattern rather than inventing a new one.

### Pattern 2: On-device sentiment timeline via existing AppGroupStore

**What:** `SentimentEvent` (already defined in BanterShared, currently unused) becomes the timeline unit. Each `/coaching` response's `sentiment` field is converted into one `SentimentEvent` and appended to a per-conversationId array, persisted via the existing `AppGroupStore.write`/`.read` generic Codable helpers.
**When to use:** After every successful coaching call, before displaying suggestions.
**Example:**
```swift
// Source: BanterShared/Sources/BanterShared/AppGroupStore.swift (Phase 1) + SentimentEvent.swift (existing model)
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
**Note:** `UserDefaults`-backed `AppGroupStore` is fine for dozens of small events per conversation but is not designed for large-scale timeline growth — see Pitfall 1 below.

### Pattern 3: RevenueCat entitlement gate as the single source of truth for tier state

**What:** All paywall/cap logic reads from one `EntitlementManager` wrapping `Purchases.shared.customerInfo`, never a locally-invented "isPremium" bool set by app logic alone.
**When to use:** Every point that checks free-vs-premium (daily cap, calculator depth, unlimited analyses).
**Example:**
```swift
// Source: RevenueCat purchases-ios SDK pattern (github.com/RevenueCat/purchases-ios) [CITED: RevenueCat SDK, not fetched verbatim from official quick-start this session]
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

### Anti-Patterns to Avoid
- **Hand-rolled receipt validation:** Never parse `SKPaymentTransaction`/StoreKit JWS receipts manually to determine entitlement — RevenueCat's `customerInfo()` is the single source of truth. Re-implementing this duplicates a well-known complex, security-sensitive surface (see Don't Hand-Roll below).
- **A second "is premium" flag stored outside RevenueCat's entitlement object:** Introduces drift between what the App Store actually granted and what the app believes — always re-derive UI state from `customerInfo()`/its cached delegate callback, never a separately-persisted boolean that could go stale after a refund or trial expiry.
- **Gating psychology tags behind the paywall:** Explicitly forbidden by MONE-01 and the product thesis ("Monetize the crutch" — tags are the free-tier hook, never paywalled). Any plan task that would hide `psychologyTag` for free users is a spec violation.
- **A persistent cross-conversation "match dossier":** CALC-03 and the project's Out-of-Scope list both explicitly ban this. The timeline store must be keyed and queried strictly per `conversationId` — no aggregate view across conversations, no match-name-keyed storage.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| Subscription receipt validation, entitlement caching, trial eligibility | Custom StoreKit 2 `Transaction.currentEntitlements` polling + a hand-rolled server-side receipt verifier | RevenueCat `purchases-ios` SDK | Receipt validation against Apple's servers, grace periods, billing retry states, and refund handling are a well-known deep edge-case surface; RevenueCat is explicitly named in the phase's own success criteria and is the industry-standard wrapper |
| 14-day reverse-trial timing logic | A custom "trialStartDate" stored in UserDefaults with manual day-counting | StoreKit introductory-offer / RevenueCat "Offering" trial configuration, read via `customerInfo().entitlements[...].expirationDate` | App Store Connect and RevenueCat already track trial start/end authoritatively per-user across devices; a local counter can't survive reinstalls or be authoritative for App Review |
| Psychology framework citation text | A second LLM call per tag-tap to "explain this" | Static lookup against the same `taxonomy.json` Phase 3 already versions | Zero added latency, zero added cost per tap, and guarantees the explanation matches the same allowlist the backend enforces — a live LLM call could produce text that isn't allowlist-consistent |
| Sentiment-over-time chart rendering | A custom `Canvas`-drawn line chart | SwiftUI `Charts` framework | First-party, accessible (VoiceOver descriptions of chart data come for free), handles Dynamic Type scaling of axis labels automatically |

**Key insight:** Every "don't hand-roll" item in this phase maps to either (a) a security/compliance-sensitive surface (subscriptions) where a mistake causes real financial/App-Review risk, or (b) a capability the project has already built once (taxonomy, sentiment shape) and would be duplicating badly by rebuilding client-side from scratch.

## Common Pitfalls

### Pitfall 1: UserDefaults-backed AppGroupStore growing unbounded with timeline events
**What goes wrong:** `AppGroupStore.write` replaces the entire value for a key on every write — appending to a `[SentimentEvent]` array means re-encoding and re-writing the whole growing array every single coaching call. For a single conversation this is fine (dozens of messages), but if a user never starts a "new conversation" and the app doesn't cap timeline length, this degrades.
**Why it happens:** `UserDefaults`/App Group shared containers are designed for small, infrequently-changing config-like data, not append-heavy event logs.
**How to avoid:** Cap stored events per conversation (e.g., last N=200) or scope timeline storage to a lightweight on-disk JSON file per conversationId inside the App Group container's file URL (still using `FileManager.containerURL(forSecurityApplicationGroupIdentifier:)`) rather than growing a single `UserDefaults` key indefinitely — a plan-time decision, not a blocker, since conversation lengths are naturally small (tens of messages, not thousands).
**Warning signs:** Slow app-group reads/writes, dropped frames when opening the calculator view after a long conversation.

### Pitfall 2: RevenueCat entitlement check race on app launch (paywall flashes free state)
**What goes wrong:** `customerInfo()` is async; if the paywall/cap-check UI renders before the first fetch resolves, a premium user can briefly see free-tier UI (or vice versa) on cold launch.
**Why it happens:** RevenueCat caches customerInfo locally and returns cached data fast, but the very first launch (or after a cache-clearing reinstall) has no cache yet.
**How to avoid:** Show a lightweight loading/skeleton state (or default to the more permissive "assume trial/premium until proven otherwise" only if product risk-tolerant; safer default is a brief loading spinner) until the first `customerInfo()` resolves, rather than asserting a specific tier state instantly. `[ASSUMED: general async-state-management practice, not fetched from RevenueCat docs this session]`
**Warning signs:** Flash-of-wrong-tier bug reports, inconsistent daily-cap enforcement on first launch after install.

### Pitfall 3: Treating StoreKit 2 sandbox/production trial eligibility as always-true in dev
**What goes wrong:** A user (or the same Apple ID) can only get one free trial per subscription group ever — testing the "14-day reverse trial" flow repeatedly with the same sandbox tester account will show "not eligible" after the first trial, which can look like a bug during development.
**Why it happens:** Trial-eligibility is tracked per Apple ID across the subscription group, not per app install.
**How to avoid:** Use multiple sandbox tester accounts (App Store Connect supports creating many) when iterating on trial-flow QA; document this in the plan's verification section so a developer doesn't chase a false "trial always shows expired" bug. `[CITED: adapty.io — "only one introductory offer or free trial per subscription group per user"]`
**Warning signs:** Trial screen never appears on the second+ test run with the same test account.

### Pitfall 4: Onboarding demo loop silently requiring a paywall dependency
**What goes wrong:** If the "value before paywall" demo (ONBD-01) accidentally routes through any paywall/entitlement check before the user sees suggestions — e.g., gating the very first `/coaching` call behind the same daily-cap counter used later — it violates the phase's own Success Criterion #1 ("before any signup or paywall").
**Why it happens:** Reusing the `DailyCapTracker`/`EntitlementManager` gate uniformly across all coaching calls is the simplest implementation, but the very first call during onboarding must be exempt or pre-seeded as "free" regardless of counter state.
**How to avoid:** Explicitly design the first-run demo call as ungated (or pre-increment nothing until after onboarding completes), and write a verification step that asserts a fresh install can complete the full screenshot→suggestions loop with zero RevenueCat/StoreKit interaction.
**Warning signs:** A plan task that wires the daily cap check into the same `CoachingClient.send()` path used everywhere, without an onboarding-context bypass.

## Code Examples

### Reading the existing coaching contract (verbatim from Phase 3, do not modify)
```swift
// Source: BanterShared/Sources/BanterShared/NetworkDTOs.swift (Phase 3, unchanged in Phase 4)
public struct CoachingResponseDTO: Codable, Equatable {
    public let replies: [ReplySuggestion]
    public let sentiment: SentimentDTO
    public let conversationId: UUID?
}
```

### Tone picker wiring (COAC-02) — the request-side field already exists
```swift
// Source: BanterShared/Sources/BanterShared/NetworkDTOs.swift AnalyzeConversationRequest (Phase 1)
public struct AnalyzeConversationRequest: Codable {
    public let messages: [ConversationMessage]
    public let tone: ReplyStyle?   // Phase 4 UI sets this from the tone picker; no schema change needed
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---------------|-------------------|---------------|--------|
| Manual `SKProduct`/`SKPaymentTransaction` (StoreKit 1) | `StoreKit 2` (`Product`, `Transaction`, async/await) | StoreKit 2 introduced WWDC 2021, now the default for any iOS 18-floor app | Project's iOS 18 floor makes StoreKit 2 the only sane baseline; RevenueCat's SDK itself now wraps StoreKit 2 internally |
| iOS 26's `SubscriptionOfferView` for in-SwiftUI upgrade/downgrade/crossgrade merchandising | Native SwiftUI subscription-offer views `[CITED: WWDC-era dev.to summary]` | iOS 26 | Not required for Phase 4's iOS 18 floor — RevenueCat's own `PaywallView`/custom UI is the pragmatic choice at this deployment target; note for a future phase if the floor is raised |

**Deprecated/outdated:**
- StoreKit 1 (`SKPaymentQueue`, `SKProduct`) — do not use; StoreKit 2 async APIs are the standard for any greenfield 2026 iOS app, and RevenueCat's SDK abstracts this choice away regardless.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | SwiftUI `Charts` framework is available and sufficient for the emotional-factor timeline visualization, without a third-party charting library | Standard Stack / Supporting | Low — `Charts` is a well-known first-party iOS 16+ framework; if it can't express a needed visual (e.g. multi-series stacked factors), the plan may need a brief spike, not a new dependency |
| A2 | RevenueCat quick-start code pattern (`Purchases.shared.customerInfo()`, `entitlements["premium"]`) matches the current 5.80.2 API surface exactly | Architecture Patterns / Pattern 3 | Medium — this session did not fetch RevenueCat's own quick-start docs verbatim (no Context7/docs MCP available); the entitlement identifier string (`"premium"`) and exact method names should be confirmed against `revenuecat.com/docs` at plan/implementation time |
| A3 | The original "$7/wk pricing anchor has conflicting sources" blocker (STATE.md) refers to something other than the price point itself, since this session's search corroborated ~$7/wk against live comparables | Summary | Low-Medium — if the actual conflict was about trial length or tier structure rather than price, this research doesn't resolve it; flag to user before locking MONE-03's exact trial/price numbers |
| A4 | PhotosPicker's limited-library mode does not require a custom pre-permission explainer (system handles it), but full-library access and the keyboard-enable flow (Phase 5, referenced by ONBD-02 here for Photos only) benefit from one | Architectural Responsibility Map | Low — affects only whether a priming screen is shown before `PhotosPicker` vs. before a hypothetical full-library request; Phase 2 already uses `PhotosPicker` without issue |

**If this table is empty:** N/A — see entries above.

## Open Questions

1. **Exact trial length / price to lock for MONE-03**
   - What we know: Comparable "Rizz"-branded apps range $3.99–$7/wk; PROJECT.md anchors at ~$7/wk; a 14-day reverse trial is specified in the phase goal.
   - What's unclear: The specific STATE.md-flagged "conflicting sources" for the pricing anchor were not identified in this session (search corroborated rather than contradicted the $7/wk figure) — the original conflict may be about trial length (3-day vs. 14-day is common in competitors) or monthly-vs-weekly billing structure.
   - Recommendation: Surface this explicitly in `/gsd:discuss-phase` before planning locks a specific App Store Connect subscription configuration; do not let the planner silently pick a number without user confirmation, since real money/compliance is involved.

2. **Where the taxonomy explainer data lives on the client (bundled vs. fetched)**
   - What we know: `taxonomy.json` is a versioned, tracked Backend artifact (03-01).
   - What's unclear: Whether Phase 4 should bundle a synced copy into the iOS app bundle (offline-capable, needs a sync/diff guard like `sync-fixture.sh`) or fetch it once from a new lightweight endpoint.
   - Recommendation: Default to bundling a synced copy (lower operational complexity, no new endpoint); the planner should make this an explicit task-level decision, not leave it implicit.

3. **RevenueCat's exact current API surface (entitlement identifiers, offering config shape)**
   - What we know: The SDK is `RevenueCat/purchases-ios` v5.80.2, verified as a legitimate, actively maintained official package.
   - What's unclear: This session did not fetch RevenueCat's quick-start/API docs directly (no docs MCP tool available in this environment) — the code example in this document (`Purchases.shared.customerInfo()`, `.entitlements["premium"]`) is `[ASSUMED]` based on the SDK's well-known general shape, not verified against current docs.
   - Recommendation: The planner or executing agent should fetch `https://www.revenuecat.com/docs/getting-started/installation/ios` (or equivalent current quick-start) at implementation time to confirm exact method signatures before writing the entitlement-gating code.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Xcode / XcodeGen / iOS 18 SDK | All UI work | Assumed present (established in Phase 1-3) | — | — |
| RevenueCat SPM package | MONE-02/03 | Not yet added to `project.yml`/Package resolution — must be added this phase | 5.80.2 (latest as of 2026-07-02) | None — this is a hard phase requirement, not optional |
| App Store Connect subscription products configured | MONE-02/03, live entitlement testing | Not verified this session — requires the developer's Apple Developer account access, outside this research's reach | — | Development can proceed using RevenueCat's sandbox/StoreKit Configuration file testing without live App Store Connect products fully approved, but real trial/entitlement testing needs at least draft subscription products created |
| Sandbox tester Apple ID(s) for trial-flow QA | MONE-03 verification | Not verified this session | — | None — needed for realistic trial-eligibility testing (see Pitfall 3) |

**Missing dependencies with no fallback:**
- App Store Connect subscription product configuration (weekly premium tier with 14-day intro offer) must exist before MONE-02/03 can be verified end-to-end, even in sandbox. This is developer-account setup work, likely a `checkpoint:human-verify` task in the plan.

**Missing dependencies with fallback:**
- RevenueCat SPM package integration — straightforward `Add Package Dependencies` step, no blocker, just not yet done.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | XCTest (BanterSharedTests, established Phase 1-3) + XCUITest (BanterUITests, established Phase 2) |
| Config file | `project.yml` (XcodeGen) — `BanterUITests` target already wired to `BanterApp` scheme's `test` action |
| Quick run command | `swift test --package-path BanterShared` (unit-level, models/logic only — the established local-dev pattern per Phase 1-3, since no local Swift toolchain proved available for full `xcodebuild test` on this Windows dev machine) |
| Full suite command | `xcodebuild test -scheme BanterApp` (CI-only, macOS runner — per Phase 1/2 precedent; local Windows dev proves logic via `swift test --package-path BanterShared`, UI/build proof deferred to CI) |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|--------------------|--------------|
| ONBD-01 | Fresh install completes screenshot->suggestions loop before any paywall/signup screen appears | integration (XCUITest) | `xcodebuild test -scheme BanterApp -only-testing:BanterUITests/OnboardingFlowTests` | ❌ Wave 0 |
| ONBD-02 | Photos permission explainer shown before system prompt; explainer text matches contract | unit (state) + snapshot (XCUITest) | `xcodebuild test -scheme BanterApp -only-testing:BanterUITests/PermissionPrimingTests` | ❌ Wave 0 |
| COAC-02 | Selecting a tone sets `AnalyzeConversationRequest.tone`/`CoachingRequest.tone` correctly | unit | `swift test --package-path BanterShared --filter TonePickerTests` | ❌ Wave 0 |
| COAC-04 | Tapping a tag expands the correct framework/explanation text from taxonomy | unit | `swift test --package-path BanterShared --filter TagExplainerTests` | ❌ Wave 0 |
| CALC-02 | N successive coaching responses for one conversationId produce N ordered `SentimentEvent`s, timeline view renders a non-empty chart | unit + integration | `swift test --package-path BanterShared --filter SentimentTimelineStoreTests` | ❌ Wave 0 |
| CALC-03 | Timeline query for conversation A never returns events from conversation B; no API/store method accepts a match-identity key | unit (negative test) | `swift test --package-path BanterShared --filter SentimentTimelineStoreTests` | ❌ Wave 0 |
| MONE-01 | Free-tier user hits daily cap after N calls; psychology tags still visible even at cap | unit | `swift test --package-path BanterShared --filter DailyCapTrackerTests` | ❌ Wave 0 |
| MONE-02 | Premium entitlement (mocked RevenueCat customerInfo) unlocks unlimited calls + calculator depth | unit (mocked `EntitlementManager`) | `swift test --package-path BanterShared --filter EntitlementManagerTests` | ❌ Wave 0 |
| MONE-03 | Trial-active entitlement grants full access; trial-expired entitlement reverts to free-tier UI without data loss | unit (mocked entitlement states) | `swift test --package-path BanterShared --filter EntitlementManagerTests` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `swift test --package-path BanterShared` (fast local logic tests, matches Phase 1-3 established pattern)
- **Per wave merge:** `xcodebuild test -scheme BanterApp` (CI, macOS runner — full build + XCUITest)
- **Phase gate:** Full suite green (both `backend-tests` unaffected and `build-and-test` macOS job) before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `BanterShared/Tests/BanterSharedTests/TonePickerTests.swift` — covers COAC-02
- [ ] `BanterShared/Tests/BanterSharedTests/TagExplainerTests.swift` — covers COAC-04
- [ ] `BanterShared/Tests/BanterSharedTests/SentimentTimelineStoreTests.swift` — covers CALC-02, CALC-03
- [ ] `BanterShared/Tests/BanterSharedTests/DailyCapTrackerTests.swift` — covers MONE-01
- [ ] `BanterShared/Tests/BanterSharedTests/EntitlementManagerTests.swift` — covers MONE-02, MONE-03 (mocked RevenueCat `CustomerInfo`, no live network/sandbox calls in unit tests)
- [ ] `BanterUITests/OnboardingFlowTests.swift` — covers ONBD-01
- [ ] `BanterUITests/PermissionPrimingTests.swift` — covers ONBD-02
- [ ] Framework install: RevenueCat SPM package must be added to `project.yml`/Package resolution before `EntitlementManagerTests` can compile against real SDK types (or the test can define a small protocol seam so it compiles against a mock without the real SDK — planner's choice, see Pattern 3)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | No | Phase 4 introduces no new login/auth surface — no user accounts exist yet in this project (out of current scope; entitlement is device/Apple-ID-scoped via RevenueCat, not a Banter account system) |
| V3 Session Management | No | No server-side session introduced this phase |
| V4 Access Control | Yes (client-side) | Entitlement-gating (free vs. premium) is enforced via `EntitlementManager` reading RevenueCat's `customerInfo()` — must never trust a locally-settable flag as the sole gate (see Anti-Patterns) |
| V5 Input Validation | Yes (unchanged) | Existing Backend `index.ts` validation (`MAX_MESSAGES`, `MAX_TOTAL_CHARS`, tone enum) already covers the request surface Phase 4 calls into — no new validation surface introduced by this phase since no new backend endpoint is added |
| V6 Cryptography | Yes (delegated) | Subscription receipt/JWS validation is handled entirely by StoreKit 2 + RevenueCat's server-side verification — never hand-roll receipt signature checking client-side |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Client-side entitlement spoofing (jailbroken device sets a local "isPremium" flag to bypass paywall) | Tampering | Never derive premium state from app-local storage alone; always re-derive from `Purchases.shared.customerInfo()`, which RevenueCat validates server-side against Apple's receipt-verification service |
| Sentiment timeline data leaking cross-conversation (accidental match-identity keying) | Information Disclosure | Enforced by construction: `SentimentTimelineStoreTests` includes a negative test asserting no API path accepts a match-name/identity key, only `conversationId` (a client-minted UUID with no PII) |
| Daily-cap bypass via clock manipulation (user sets device date back to reset the "daily" counter) | Tampering | Low-severity for this product (no direct financial loss, just extra free usage) — acceptable risk for v1; a server-side counter would be the robust fix but is out of scope for Phase 4's stateless-backend architecture. Document as an accepted risk, not a blocker. |
| RevenueCat API key exposure in client source | Information Disclosure | RevenueCat's public API key is designed to be embedded client-side (it is not a secret credential — unlike `GEMINI_API_KEY`, which the existing `GeminiKeyBoundaryGuardTests` correctly guards against). No tripwire test needed for the RevenueCat key; it is safe-by-design to ship in the app bundle `[ASSUMED: general RevenueCat SDK design knowledge, not verified against RevenueCat docs this session]` |

## Sources

### Primary (HIGH confidence)
- Direct codebase read: `BanterShared/Sources/BanterShared/*` (NetworkDTOs.swift, ReplySuggestion.swift, SentimentEvent.swift, AppGroupStore.swift), `Backend/functions/coaching/index.ts`, Phase 2/3 SUMMARY.md files, 02-UI-SPEC.md — all directly read this session, ground truth for the project's existing contracts
- github.com/RevenueCat/purchases-ios — fetched directly via WebFetch, confirmed official org, v5.80.2, 3000+ stars, active

### Secondary (MEDIUM confidence)
- WebSearch: Rizz/W Rizz/Rizz AI Talk App Store pricing (apps.apple.com listings, $3.99-$7/wk range) `[CITED: App Store listing summaries via WebSearch]`
- WebSearch: Apple HIG contextual permission priming pattern `[CITED: developer.apple.com HIG summary, dogtownmedia.com]`
- WebSearch: Wispr Flow "value before signup" onboarding pattern `[CITED: kristenberman.substack.com, growthdives.com]`
- WebSearch: StoreKit 2 introductory offer / trial eligibility mechanics `[CITED: tanaschita.com, adapty.io, revenuecat.com blog]`
- WebSearch: Apple App Store AI-transparency guideline (actually 5.1.2(i), not 4.5.4 as ROADMAP.md's Phase 8 currently states) `[CITED: techcrunch.com, dev.to summary of Nov 2025 guideline update]` — flagged as a discrepancy for Phase 8, noted here since it surfaced during this session's research

### Tertiary (LOW confidence)
- RevenueCat SDK code example (`Purchases.shared.customerInfo()`, entitlement identifier naming) — `[ASSUMED]`, not fetched from RevenueCat's own current docs this session (see Assumption A2, Open Question 3)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — RevenueCat package verified directly via GitHub; StoreKit 2/Charts are well-established first-party frameworks matching the existing iOS 18 floor
- Architecture: HIGH — nearly all patterns reuse existing, already-verified project contracts (CoachingResponseDTO, SentimentEvent, AppGroupStore, taxonomy.json); only the RevenueCat entitlement wiring is genuinely new
- Pitfalls: MEDIUM — StoreKit/RevenueCat-specific pitfalls (Pitfalls 2, 3) are cited from tutorial/blog sources, not Apple's own docs, since no docs-fetching MCP was available this session
- Pricing: MEDIUM-HIGH — corroborated via live App Store listing searches, but the specific "conflicting sources" referenced in STATE.md were not identified/resolved this session (see Open Question 1)

**Research date:** 2026-07-04
**Valid until:** 30 days for architecture/stack decisions (stable); 7 days for pricing/competitor-pricing claims (fast-moving — App Store pricing and competitor offers change frequently)
