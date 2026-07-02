# Architecture Research

**Domain:** iOS keyboard-extension + companion-app + LLM-backend system (AI dating-conversation coach)
**Researched:** 2026-07-03
**Confidence:** MEDIUM (Apple platform mechanics = HIGH, sourced from developer.apple.com; LLM orchestration and event-sourcing patterns = MEDIUM, general best-practice consensus; competitor internals = LOW, no public architecture disclosures found)

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│  DEVICE                                                                │
│  ┌───────────────────┐        ┌──────────────────────────────────┐   │
│  │  Keyboard Extension │       │  Companion App (host)             │   │
│  │  (separate process, │       │  (separate process, full sandbox) │   │
│  │  sandboxed, ~60-70MB│       │                                    │   │
│  │  cap)                │       │  - Onboarding                     │   │
│  │                      │       │  - Screenshot import + OCR        │   │
│  │  - Reply strip UI    │◄─────►│  - Conversation history           │   │
│  │  - Insert text       │ App   │  - Love calculator / timeline UI  │   │
│  │  - Read cached       │ Group │  - Profile / XP / gamification    │   │
│  │    suggestions       │ (shared│  - StoreKit subscription          │   │
│  │  - RequestsOpenAccess│ UserDefaults +│  - Network calls to backend│   │
│  │    = YES (Full Access)│ file container)│                          │   │
│  └──────────┬───────────┘       └────────────────┬───────────────────┘   │
│             │ (only if Full Access granted)       │                      │
└─────────────┼──────────────────────────────────────┼──────────────────┘
              │                                       │
              ▼                                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│  BACKEND (thin, stateless-leaning)                                     │
│  ┌────────────┐   ┌───────────────┐   ┌────────────────────────────┐ │
│  │ Auth /      │   │ OCR-to-       │   │ LLM Orchestration           │ │
│  │ Entitlement │   │ structured    │   │ - reply gen (schema'd)      │ │
│  │ (StoreKit   │   │ conversation  │   │ - psychology tag per reply  │ │
│  │ receipt      │   │ (fallback to  │   │ - sentiment scoring         │ │
│  │ validation) │   │ server Vision │   │ - own-attempt grading        │ │
│  └────────────┘   │  if needed)   │   └────────────────────────────┘ │
│                     └───────────────┘                                   │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │ Ephemeral conversation store (short TTL) + Sentiment event log   │   │
│  │ + User profile store (durable, no third-party/match data)        │   │
│  └────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|-------------------------|
| Keyboard extension | Render 3 reply chips + tags, insert chosen text via `textDocumentProxy`, nothing else | Swift, `UIInputViewController`, no Storyboards (code-only UI), reads from App Group cache |
| Companion app | Screenshot import, on-device OCR trigger, conversation view, love-calculator/XP UI, subscription, settings, writes suggestions into App Group for keyboard to read | SwiftUI app target |
| App Group shared container | Handoff channel for latest suggestion set + lightweight session state | Shared `UserDefaults(suiteName:)` for small state, shared file container for larger payloads (parsed conversation JSON, cached suggestions) |
| On-device OCR/parsing | Turn screenshot into `[ {speaker, text, order} ]` structured messages | `VNRecognizeTextRequest` (Vision) + bounding-box-based bubble-side heuristic, run in companion app (not the extension) |
| Backend LLM orchestration | Take structured conversation + user profile → schema-enforced reply set with psychology tags + sentiment deltas | Server-side call to LLM provider with strict JSON schema / tool-use forced output |
| User profile store | Durable per-user state: texting style, goals, skill XP, calibration from graded own-attempts | Backend DB (Postgres/similar), keyed by user id, never keyed by match/third-party identity |
| Sentiment timeline ("love calculator") | Append-only event log of per-message/per-exchange sentiment scores, replayed into a rolling conversation score | Event-sourced log per conversation, materialized view = current score |
| Privacy/retention layer | Minimize what touches the server; strip/discard raw screenshots and raw transcript after processing | Process-and-discard pattern; only derived signals persisted long-term |

## Recommended Project Structure

```
Banter/
├── BanterApp/                      # companion app target (SwiftUI)
│   ├── Onboarding/
│   ├── Import/                     # screenshot picker, Vision OCR pipeline, bubble-parser
│   ├── Conversations/               # conversation list, detail, love-calculator timeline UI
│   ├── Profile/                     # user profile, XP, skill-style summary
│   ├── Subscription/                 # StoreKit 2 integration
│   └── Shared/                       # App Group read/write helpers, models shared w/ extension
├── BanterKeyboard/                  # keyboard extension target
│   ├── KeyboardViewController.swift  # UIInputViewController, code-built UI only
│   ├── SuggestionStrip/               # reply chip rendering + tag display
│   └── AppGroupBridge.swift           # thin read-only(ish) client of shared container
├── BanterShared/                    # Swift package/framework, imported by both targets
│   ├── Models/                       # ConversationMessage, ReplySuggestion, SentimentEvent
│   ├── AppGroupStore.swift           # single source of truth for suiteName + keys
│   └── APIClient.swift               # backend calls (used mainly by app; keyboard calls only if Full Access + needed)
└── Backend/                          # separate repo/service
    ├── api/                          # auth, conversation ingest, suggestion endpoint
    ├── llm/                          # prompt templates, schema defs, provider client
    ├── sentiment/                    # scoring logic, event-sourced timeline
    └── storage/                      # user profile DB, short-TTL conversation cache
```

### Structure Rationale

- **BanterShared as a framework, not copy-pasted files:** the extension and app must agree byte-for-byte on App Group keys and model shapes. A shared Swift package prevents drift between the two targets (a classic keyboard-extension bug source — one target updates a key name, the other doesn't, and reads silently return nil).
- **OCR lives in the app, not the extension:** the extension's ~60-70MB cap and no-camera-roll-without-Full-Access constraint make it the wrong place to run Vision + parsing. The app does the heavy lifting; the extension only ever reads a small, pre-computed suggestion payload from the App Group.
- **Backend split into ingest/LLM/sentiment/storage:** keeps the schema-enforced reply generation isolated from the append-only sentiment log, so the "love calculator" can be iterated (scoring model changes) without touching reply generation.

## Architectural Patterns

### Pattern 1: Extension-as-thin-client, App-as-brain

**What:** The keyboard extension does no parsing, no OCR, and ideally no direct LLM calls. It only displays whatever the companion app already computed and cached in the App Group, and inserts text on tap.
**When to use:** Always, for this project — it's forced by the ~60-70MB memory cap and the fact keyboards can't see the host app's screen or camera roll without Full Access.
**Trade-offs:** Pro — extension stays fast, small, crash-resistant, easy to pass App Store keyboard review. Con — there's a hop: user must have opened the companion app (or a background refresh) recently for suggestions to be fresh; a stale-suggestion UX state must be designed (e.g., "open Banter to refresh" affordance in the keyboard strip).

**Example:**
```swift
// BanterShared/AppGroupStore.swift
enum AppGroupStore {
    static let suiteName = "group.com.banter.shared"
    private static let defaults = UserDefaults(suiteName: suiteName)!

    static func writeSuggestions(_ suggestions: [ReplySuggestion]) {
        let data = try! JSONEncoder().encode(suggestions)
        defaults.set(data, forKey: "latest_suggestions")
    }

    static func readSuggestions() -> [ReplySuggestion] {
        guard let data = defaults.data(forKey: "latest_suggestions"),
              let decoded = try? JSONDecoder().decode([ReplySuggestion].self, from: data)
        else { return [] }
        return decoded
    }
}
```

### Pattern 2: Structured-output LLM call, single round-trip

**What:** One backend call to the LLM returns a schema-enforced object: `{ replies: [{text, psychology_tag, style}], sentiment: {score, delta, rationale} }` in one shot, instead of free-text generation followed by regex/second-pass parsing.
**When to use:** Every reply-generation and sentiment-scoring call. This is the single highest-leverage reliability decision for the LLM layer.
**Trade-offs:** Pro — 99.8%+ schema compliance (vs 8-15% failure rate for unconstrained JSON-in-prose), eliminates a fragile parsing layer, makes the psychology-tag + sentiment fields first-class instead of scraped. Con — adds ~30-300 tokens of schema overhead per call; requires picking a provider/model that supports forced structured output (OpenAI Structured Outputs, Anthropic tool-use with forced tool choice, etc.) — a stack decision, not an architecture one, but it constrains provider choice.

**Example:**
```json
{
  "type": "object",
  "properties": {
    "replies": {
      "type": "array",
      "minItems": 3,
      "maxItems": 3,
      "items": {
        "type": "object",
        "properties": {
          "text": { "type": "string" },
          "psychology_tag": { "type": "string" },
          "rationale_citation": { "type": "string" }
        },
        "required": ["text", "psychology_tag", "rationale_citation"]
      }
    },
    "sentiment": {
      "type": "object",
      "properties": {
        "score_delta": { "type": "number" },
        "signal": { "type": "string" }
      },
      "required": ["score_delta", "signal"]
    }
  },
  "required": ["replies", "sentiment"]
}
```

### Pattern 3: Event-sourced sentiment timeline

**What:** Every processed exchange appends an immutable `SentimentEvent {conversationId, messageIndex, speaker, scoreDelta, signal, timestamp}` to a log. The "love calculator" score shown to the user is a materialized view — a fold/reduce over the event log for that conversation — not a single mutable field.
**When to use:** For the love-calculator feature specifically. Any place where "how did we get to this number" needs to be explainable or replayable (e.g., user asks "why did my score drop?").
**Trade-offs:** Pro — naturally supports the timeline/graph UI (replay events to render a line chart), supports re-scoring if the scoring model improves later (replay old events through a new scorer without re-uploading screenshots), gives a clean audit trail. Con — more moving parts than "just store a running total"; only worth it because the timeline visualization *is* a stated product feature, not speculative.

**Example:**
```swift
struct SentimentEvent: Codable {
    let conversationId: UUID
    let messageIndex: Int
    let speaker: Speaker        // .user or .match
    let scoreDelta: Double
    let signal: String          // short label, e.g. "reciprocal self-disclosure"
    let timestamp: Date
}

// materialized score = events.reduce(0) { $0 + $1.scoreDelta }, clamped/smoothed
```

## Data Flow

### Screenshot → Suggestions Flow

```
User takes screenshot of dating app chat
    ↓
Companion app: user imports screenshot (share sheet or in-app picker)
    ↓
On-device Vision (VNRecognizeTextRequest) → raw text lines + bounding boxes
    ↓
Bubble-side heuristic (x-position, alignment) → ordered [ {speaker, text} ]
    ↓
POST structured conversation + user profile summary → Backend
    ↓
Backend: LLM orchestration call (schema-enforced) → { replies[], sentiment }
    ↓
Backend: append SentimentEvent(s) to event log; update materialized score
    ↓
Response → Companion app: renders replies + updates love-calculator UI
    ↓
Companion app writes replies to App Group shared container
    ↓
User switches to Banter keyboard inside the dating app → reads cached suggestions → taps to insert
```

### Own-Attempt Grading Flow (teaching layer)

```
User types own reply attempt in companion app (not keyboard, to keep this off the extension)
    ↓
Backend: LLM grades attempt against same psychology framework used for suggestions
    ↓
Grading result (XP delta + feedback) → updates User Profile store
    ↓
Profile store informs next suggestion generation (personalization loop closes)
```

### Key Data Flows

1. **App → Keyboard (App Group):** one-directional, app writes, keyboard reads. Keyboard never writes conversation data back into the shared container unless Full Access is granted and there's a real reason (e.g., logging which suggestion was picked, for XP tracking) — and even then, prefer writing a lightweight "suggestion N was used" event, not raw text.
2. **Device → Backend:** structured conversation JSON (already OCR'd on-device) goes up, not raw images, whenever avoidable — reduces server exposure to raw screenshot pixel data and keeps payloads small.
3. **Backend → Device:** schema-enforced suggestion + sentiment object, plus a profile-delta if own-attempt grading occurred.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|---------------------------|
| 0-1k users | Single backend service (e.g., one API service + one Postgres instance) is fine. LLM calls direct to provider API, no caching layer needed yet. |
| 1k-100k users | Add response caching for identical/near-identical conversation patterns is low-value here (conversations are unique) — instead focus spend on LLM cost control (model tiering: cheaper model for sentiment scoring, stronger model for reply generation) and a queue for OCR/LLM calls if synchronous latency becomes a UX problem. |
| 100k+ users | Split sentiment-event storage (high write volume, append-only, good fit for a time-series/event store) from user-profile storage (low write volume, relational). Consider regional backend deployment if international expansion happens, given App Store review and data-residency sensitivity around intimate conversation content. |

### Scaling Priorities

1. **First bottleneck:** LLM latency/cost at the "instant relief" moment — the product thesis explicitly requires 3 replies to appear immediately at the panic moment. Architecture must treat suggestion-generation latency as a hard product constraint from day one, not a later optimization (stream the response, or keep the schema small enough for fast time-to-first-token).
2. **Second bottleneck:** OCR/parsing accuracy on diverse dating-app UI skins (Hinge, Bumble, Tinder all render chat bubbles differently). Bubble-side heuristics will need per-app tuning or a more robust visual-layout model over time — flag this as a phase needing deeper research once real screenshots are collected.

## Anti-Patterns

### Anti-Pattern 1: Doing OCR or LLM calls inside the keyboard extension

**What people do:** Try to make the keyboard "smart" by having it directly call Vision or the backend when the user taps a button inside the keyboard.
**Why it's wrong:** The ~60-70MB memory cap makes Vision + image handling risky (extension gets killed), and keyboards can't access the photo library or camera roll without Full Access — even with Full Access, doing heavy async work inside `UIInputViewController` produces janky, laggy typing UX and is a common cause of App Store keyboard-extension rejections for poor responsiveness.
**Do this instead:** Extension only reads pre-computed data from the App Group and inserts text. All OCR/LLM work happens in the companion app or backend.

### Anti-Pattern 2: Building a persistent "dossier" on matches

**What people do:** Store cross-conversation profiles keyed by the *other person* (the match) to "get smarter" about them over time.
**Why it's wrong:** Explicitly out of scope per PROJECT.md — this is both an App Store review risk (surveillance framing) and an ethics violation of the stated "per-conversation insights only" principle. Architecturally, it's also a trap: once match-keyed storage exists, it's very hard to prove to reviewers/users it isn't being used that way.
**Do this instead:** All sentiment/conversation data is keyed by `conversationId` scoped to the user's own account. Only the *user's own* profile (their style, their growth) persists across conversations — never anything about the match as an identifiable individual.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|----------------------|-------|
| LLM provider (OpenAI/Anthropic/etc.) | Server-side call from backend only, never directly from device | Keeps API keys off-device; also the only place structured-output/schema enforcement is guaranteed available and consistent |
| StoreKit (subscriptions) | Client-side purchase flow in companion app, receipt/transaction validated server-side | Standard freemium-gate pattern; entitlement check gates suggestion volume + love-calculator depth per PROJECT.md pricing model |
| Push notifications (likely, for re-engagement/streaks) | APNs from backend, companion app registers token | Not in current requirements list explicitly but implied by "gamified progression / streaks" — flag for roadmap |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|----------------|-------|
| Keyboard extension ↔ Companion app | App Group shared `UserDefaults` (small state) + shared file container (larger JSON payloads) | One-directional write (app→group), read (keyboard←group) is the safe default; synchronize explicitly after writes since propagation isn't always instant |
| Companion app ↔ Backend | HTTPS/JSON, structured request/response, auth via user session token | Only channel that should hold the LLM API key; app never calls the LLM provider directly |
| Backend LLM orchestration ↔ Sentiment store | Internal service call, appends event, returns materialized score | Keep these decoupled enough that sentiment-scoring model changes don't require redeploying the reply-generation path |
| Backend ↔ User profile store | Read on every suggestion request (for personalization), write on grading/XP events | This is the state that "the model knows about the user across sessions" — texting style inferred over time, goals set in onboarding, skill level, calibration from graded attempts |

## Notes on Specific Sub-Questions

**(1) App Group data sharing constraints:** Confirmed via Apple's own docs — write access to the shared container from the keyboard extension requires `RequestsOpenAccess = YES`; without it, the extension can *read* but not *write* the shared container, and has zero network access. Both targets must register the identical App Group ID (e.g., `group.com.banter.shared`) in the developer portal and use it as the `UserDefaults` `suiteName`. Practical implication: the extension should be architected assuming it may only ever have read access if the user declines Full Access — but Full Access is unavoidable for this product (the keyboard needs network access to eventually call the backend directly, or at minimum needs the shared container, which itself requires Full Access) — this should be surfaced clearly in onboarding as a required step, not optional.

**(2) Memory cap + Full Access networking:** ~60-70MB is a soft, device-dependent ceiling; exceeding it gets the extension killed by the OS mid-session (worst possible UX — user loses their keyboard while typing). This is the strongest architectural argument for Pattern 1 (thin extension). No Storyboards/xibs — build UI in code.

**(3) Screenshot → OCR → structured parsing:** Vision's `VNRecognizeTextRequest` handles the OCR (text + bounding boxes) fully on-device, but has no built-in concept of "chat bubble" or "sender" — that's app-level logic layered on top using bounding-box x-position/alignment (and potentially background-color sampling) as a heuristic. This should run in the companion app (has camera roll + Vision + no memory cap pressure), not the extension. A server-side Vision fallback (cloud OCR) is worth keeping as a documented option for cases the on-device heuristic can't confidently parse (e.g., unusual chat app skins), but on-device-first is the right default both for privacy and cost.

**(4) LLM orchestration for replies + tags + sentiment:** Single schema-enforced call combining reply generation, psychology tags, and sentiment delta is the modern best practice — avoids the reliability trap of free-text-then-parse. This is a backend-only concern; the schema itself becomes a contract the roadmap should nail down early since both companion-app UI and keyboard-suggestion-strip UI are built against its shape.

**(5) User-profile/personalization state:** Lives entirely in the backend, keyed by the user's account — texting style signature, stated goals, skill XP/level, and calibration data from graded own-attempts. This is what's read on every suggestion request to personalize tone/complexity, and it's the piece that makes suggestions "hyper-tailored" per PROJECT.md. It must never be keyed by or contain identifiable data about the match (see Anti-Pattern 2).

**(6) Love calculator / sentiment timeline:** Best modeled as an event-sourced log (Pattern 3) scoped per-conversation — append-only `SentimentEvent`s, materialized into the score/timeline the user sees. This is a natural fit given the product explicitly wants a *timeline* visualization, not just a number.

**(7) Privacy architecture:** The strongest lever is architectural, not policy: do OCR on-device so raw screenshot images ideally never leave the phone; send only the derived structured conversation (text + speaker labels) to the backend; treat that structured conversation as short-TTL/ephemeral server-side (process, generate suggestions, discard — don't retain full transcripts long-term); persist only derived signals (sentiment events, profile deltas) which are far less sensitive than raw conversation text. No match-identifiable data ever persists (see Anti-Pattern 2). This should be a first-class architectural constraint communicated to the roadmap, not a retrofit — retention policy and on-device-first OCR need to be decided before the backend ingest API is designed, not after.

## Suggested Build Order (dependency-driven)

1. **BanterShared models + App Group plumbing** — nothing else can be built/tested without agreed data shapes and a working read/write bridge between targets.
2. **Companion app: screenshot import + on-device OCR/parsing** — produces the structured conversation object everything downstream consumes; can be built and tested against sample screenshots before any backend exists.
3. **Backend: LLM orchestration with structured-output schema (replies + tags + sentiment)** — the core value prop; depends on #2's output shape being stable.
4. **Companion app: display suggestions + basic love-calculator timeline** — depends on #3 being callable.
5. **Keyboard extension: thin read-and-insert client of App Group** — depends on #1-#4 producing something real to display; building this first would mean building against mocked data twice.
6. **Backend: user profile store + personalization loop + own-attempt grading** — depends on #3's schema and #4's UI existing to feed real usage.
7. **Gamification (XP, streaks) + StoreKit subscription gating** — depends on profile/grading (#6) existing to have something to gate and gamify.
8. **Privacy hardening pass (retention TTLs, on-device-first enforcement, data audit)** — should be *designed* alongside #3 (item 7 above notes this), but a dedicated verification pass belongs right before ship, once the full data flow is real and auditable end-to-end.

## Sources

- [App Extension Programming Guide: Custom Keyboard — Apple Developer Documentation](https://developer.apple.com/library/archive/documentation/General/Conceptual/ExtensibilityPG/CustomKeyboard.html) — HIGH confidence (official Apple docs)
- [Configuring open access for a custom keyboard — Apple Developer Documentation](https://developer.apple.com/documentation/uikit/configuring-open-access-for-a-custom-keyboard) — HIGH confidence (official Apple docs)
- [RequestsOpenAccess — Apple Developer Documentation](https://developer.apple.com/documentation/bundleresources/information-property-list/nsextension/nsextensionattributes/requestsopenaccess) — HIGH confidence (official Apple docs)
- [VNRecognizeTextRequest — Apple Developer Documentation](https://developer.apple.com/documentation/vision/vnrecognizetextrequest) — HIGH confidence (official Apple docs)
- [App Extension Programming Guide: Handling Common Scenarios — Apple Developer](https://developer.apple.com/library/archive/documentation/General/Conceptual/ExtensibilityPG/ExtensionScenarios.html) — HIGH confidence (official Apple docs)
- [iOS App Extensions: Data Sharing — dmtopolog](https://dmtopolog.com/ios-app-extensions-data-sharing/) — MEDIUM confidence (practitioner blog, consistent with official docs)
- [An App Group roller coaster ride — danielsaidi.com](https://danielsaidi.com/blog/2023/05/17/an-app-group-roller-coaster-ride) — MEDIUM confidence (practitioner blog)
- [Limitations of custom iOS keyboards — Medium/inFullMobile](https://medium.com/@inFullMobile/limitations-of-custom-ios-keyboards-3be88dfb694) — MEDIUM confidence (practitioner blog, consistent with official docs)
- [Structured Output Comparison across popular LLM providers — Medium/Rost Glukhov](https://medium.com/@rosgluk/structured-output-comparison-across-popular-llm-providers-openai-gemini-anthropic-mistral-and-1a5d42fa612a) — LOW/MEDIUM confidence (uncurated web, but figures align with known provider documentation trends)
- [Event Sourcing Pattern — Azure Architecture Center, Microsoft Learn](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing) — MEDIUM-HIGH confidence (official vendor architecture reference, generic pattern not iOS-specific)
- [Sentiment and time-series analysis of direct-message conversations — ScienceDirect](https://www.sciencedirect.com/science/article/pii/S2666281724000726) — MEDIUM confidence (peer-reviewed, supports event/timeline sentiment modeling approach)

**Gap flagged:** No public architecture disclosures found for direct competitors (Rizz, YourMove.ai, Plug AI) — their screenshot-to-suggestion pipelines are inferred from stated product behavior in PROJECT.md, not verified technical sources. Treat competitor-specific implementation details as unverified.

---
*Architecture research for: iOS keyboard-extension + companion-app + LLM-backend dating-coach system*
*Researched: 2026-07-03*
