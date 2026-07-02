# Stack Research

**Domain:** iOS app — custom keyboard extension + SwiftUI companion app + AI backend (dating-conversation coach)
**Researched:** 2026-07-03
**Confidence:** HIGH (Apple platform APIs, pricing) / MEDIUM (LLM model choice, third-party SDK specifics — verify current pricing at build time)

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Swift | 6.2+ (toolchain in Xcode 26.6) | App + extension language | Current default; strict concurrency matters for extension↔app data handoff via App Groups (background contexts, no data races) |
| Xcode | 26.6 (or latest 26.x) | Build toolchain | App Store Connect has required builds on the iOS 26 SDK since April 28, 2026 — non-negotiable for new submissions |
| iOS deployment target | 16.0 or 17.0 | Min OS supported | SDK requirement (26) is independent of deployment target — you can build with Xcode 26 and still support iOS 16/17 users. Set target based on Apple Foundation Models need (see below): if the on-device LLM path is core to the pitch, target iOS 26 only; if it's a nice-to-have, target iOS 17 and treat Foundation Models as an enhancement |
| SwiftUI | — (OS-bundled) | Companion app UI | Default for greenfield iOS in 2026; no reason to touch UIKit except inside the keyboard extension where UIInputViewController is UIKit-rooted |
| UIInputViewController (via KeyboardKit) | — | Keyboard extension base class | Apple's only entry point for keyboard extensions — not a choice, a requirement. The choice is whether to use it raw or through KeyboardKit (see below) |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| KeyboardKit (open source) | 9.x | Keyboard extension scaffolding — layouts, autocomplete UI, SwiftUI-in-keyboard, emoji/locale support | Use from day one. Free/MIT core covers the keyboard chrome (QWERTY layout, shift state, autocomplete bar, haptics, SwiftUI rendering inside `UIInputViewController`) that would otherwise be weeks of UIKit boilerplate. Wraps `UIInputViewController` as `KeyboardInputViewController` and exposes SwiftUI views — you still own all app-specific logic (suggestion cards, psychology tags, XP) |
| KeyboardKit Pro | Subscription, tiered by revenue (Standard for indie/startup via Gumroad, Business required above $10M company revenue or $1M app revenue) | Autocomplete engine, 75+ locales, dictation, emoji keyboard, "AI support" utilities | Skip Pro at MVP unless autocomplete/dictation is core UX — Banter's differentiator is the suggestion panel, not autocomplete quality. Revisit if free-tier keyboard typing experience (autocorrect) becomes a complaint |
| Vision framework (`VNRecognizeTextRequest`) | OS-bundled | On-device OCR of chat screenshots in the companion app | Default choice. Runs on Neural Engine, milliseconds per screenshot, zero network round-trip, zero per-OCR cost, data never leaves device. Accuracy on clean chat-app screenshots (rendered text, not photos) is at parity with cloud OCR in 2026 — the accuracy gap that used to justify server-side OCR has closed for this exact use case (typed UI text, not photographed documents) |
| Alamofire / URLSession | URLSession (stdlib) | Networking from companion app to backend | Use plain `URLSession` with `async/await` — no need for Alamofire in 2026; URLSession's async API covers everything a thin JSON API client needs. Skip the dependency |
| RevenueCat SDK | 5.x | Subscription purchase flow, entitlements, receipt validation | See Subscriptions section below |
| Supabase Swift SDK | 2.x | Auth, Postgres data, storage | See Backend section below |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| App Groups (`com.banter.shared`) | Data handoff between keyboard extension and host app | Keyboard extensions cannot read other apps' screens or access the photo library directly while typing — the only sanctioned pattern is: user takes/has a screenshot → opens companion app → OCRs it there → writes parsed conversation + suggestions to an App Group shared container (or `UserDefaults(suiteName:)` for small payloads) → keyboard extension reads that container when Full Access is granted. Do not attempt to do OCR or the photo picker from inside the keyboard extension itself |
| `RequestsOpenAccess` (Full Access) | Enables `URLSession` networking + `UIPasteboard` from the keyboard extension | Required if the keyboard itself calls the AI backend directly (e.g., "regenerate reply" without reopening the app) or reads the system pasteboard for pasted conversation text. Users must explicitly grant this in Settings — expect meaningful opt-out; design the core "insert suggested reply" flow to work from data already staged in the App Group container so a user who denies Full Access still gets value, and gate live regeneration/paste behind Full Access with a clear explainer screen (App Review scrutinizes keyboards that request Full Access without justifying it, and dating/intimate-content categories draw extra scrutiny) |
| Instruments (Xcode) | Memory profiling for the keyboard extension | Keyboard extensions run under a strict Jetsam memory ceiling — historically ~48MB on older devices, ~66MB observed on iPhone XS Max class hardware, generally cited as "roughly 60-70MB" and device-dependent; exceeding it gets the extension silently killed by the OS. Budget aggressively: no image decoding, no large caches, no heavyweight frameworks loaded inside the extension target. Keep KeyboardKit's SwiftUI rendering lean and avoid loading Vision/CoreML models inside the extension — do OCR and AI calls from the host app or via the App Group handoff, not inside the extension process |

## Installation

```bash
# Swift Package Manager (Xcode: File > Add Package Dependencies)
# KeyboardKit
https://github.com/KeyboardKit/KeyboardKit.git   # from 9.0.0

# RevenueCat
https://github.com/RevenueCat/purchases-ios.git  # from 5.0.0

# Supabase Swift
https://github.com/supabase/supabase-swift.git   # from 2.0.0

# No Alamofire, no OCR SDK, no LLM SDK — Vision is OS-bundled;
# LLM calls are plain HTTPS JSON from your own backend, not a client SDK.
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|--------------------------|
| KeyboardKit (open source core) | Raw `UIInputViewController`, no library | Only if the keyboard UI is trivial (a few static buttons) — Banter's keyboard needs a scrollable suggestion-card UI in SwiftUI inside the extension, which is exactly what KeyboardKit's `KeyboardInputViewController` + SwiftUI hosting exists to simplify. Building that plumbing from scratch is wasted weeks |
| On-device Vision OCR | Cloud OCR (Google Cloud Vision, AWS Textract, GPT-4o/Claude vision) | Only if screenshots are frequently low-quality photos-of-screens (moire, glare, rotation) rather than native screenshots — unlikely for a dating-app screenshot flow where users share direct captures. If OCR quality issues surface in testing, add a cloud OCR *fallback* only for screenshots where Vision confidence is low, not as the primary path — preserves the privacy default |
| Claude Haiku / GPT-5-mini for reply generation + sentiment | Fine-tuned small encoder (e.g., fine-tuned Qwen2.5-7B) for sentiment only | Fine-tuning wins on cost-at-scale (roughly 2 orders of magnitude cheaper per classification once volume is high) and on latency, but requires labeled training data and MLOps you don't have at MVP. Start with prompted frontier-model calls; revisit fine-tuning a dedicated sentiment/scoring model once you have real conversation-outcome data to train on (which you won't have until after launch) |
| Apple Foundation Models framework (on-device, iOS 26+) for the "love calculator" sentiment scoring | Server-side LLM for all sentiment scoring | Use Foundation Models on-device for the parts of sentiment/tagging that are simple classification (tone, escalation direction, engagement signal) once you're iOS 26+ only — it's free (no API cost), private (data never leaves device), and Apple explicitly ships a `contentTagging` use-case adapter suited to this. Keep reply *generation* (higher creativity/quality bar) on Claude/GPT server-side, since the 3B on-device model is not tuned for high-quality creative writing and Apple explicitly discourages using it as a general chat/knowledge model |
| RevenueCat + StoreKit 2 | Raw StoreKit 2, no RevenueCat | Only if you have a specific reason to avoid a third-party SDK (none apply here) — RevenueCat is free up to $2,500 MTR, 1% above that, wraps StoreKit 2 (so you're never locked out of migrating to raw StoreKit 2 later), and gives you entitlement management + subscriber analytics you'd otherwise hand-roll. For a subscription-first product like Banter, the analytics (churn, trial conversion) are worth the 1% alone |
| Supabase (Postgres + Auth + Storage) | Firebase (Firestore + Auth) | Choose Firebase instead if you need best-in-class offline-first sync or you're optimizing for fastest possible time-to-MVP with the most mature mobile SDK and don't care about relational modeling. Banter's data model (users, conversations, exchanges, sentiment scores, XP/progression) is inherently relational with row-level ownership — Postgres + Row Level Security is a more natural fit than Firestore's document model, and RLS lets you enforce "a user only ever sees their own conversation data" at the database layer, which matters given the privacy sensitivity of this data |
| Mixpanel (analytics/experimentation) | PostHog or Amplitude | Use PostHog instead if you want feature flags + session replay + analytics in one open-source SDK and are comfortable with a less mature iOS SDK. Use Amplitude instead only once you're past ~100K MAU and need warehouse-native behavioral analytics — overkill pre-launch |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|--------------|
| Reading the photo library or running OCR *inside* the keyboard extension process | Extensions run under a strict Jetsam memory ceiling (~60-70MB) and have no photo-library picker API available to them; attempting heavyweight work here gets the extension killed by the OS mid-session | Do OCR + AI analysis in the host companion app; hand results to the keyboard via an App Group shared container |
| Treating Full Access (`RequestsOpenAccess`) as required for the whole app to function | Many users decline Full Access on keyboards, especially for a dating/intimate-content app category where privacy concern is elevated; a keyboard that's useless without it will suppress adoption and invite App Review scrutiny | Design the core suggestion-insertion flow to work from data pre-staged by the host app (no live network call needed from inside the keyboard); gate only "live regenerate" or "paste-to-analyze" behind Full Access |
| Firestore/NoSQL for the core relational data model (users, conversations, sentiment history, XP) | Document modeling fights you on relational queries like "average sentiment trend across a user's last N conversations" or enforcing per-row ownership consistently | Postgres via Supabase, with Row Level Security scoping every table to `auth.uid()` |
| Fine-tuning a model before you have real usage data | You have zero labeled conversation-outcome data pre-launch; fine-tuning without it is guessing, and the 2026 consensus best practice is prompt-first, fine-tune only once scale/cost or accuracy pain is proven | Prompted Claude Haiku 4.5 or GPT-5-mini at launch; revisit fine-tuning post-launch once real data + a real cost problem exist |
| Building a custom OAuth/session/JWT auth system | This is a solved problem with real security risk if hand-rolled (token rotation, PKCE, refresh handling), and it's intimate personal data — a custom auth bug here is a trust-destroying breach, not just a bug | Supabase Auth (or Firebase Auth) — both handle PKCE, refresh tokens, and Sign in with Apple (required if you offer any third-party sign-in, per App Store guideline 4.8) |
| Alamofire for a thin JSON API client | `URLSession` with `async/await` covers GET/POST/JSON in a few lines; Alamofire is a dependency for a problem Swift's stdlib already solved | `URLSession.shared.data(for:)` with `Codable` |

## Stack Patterns by Variant

**If the on-device sentiment/tagging path (Apple Foundation Models) is core to your privacy pitch:**
- Set minimum deployment target to iOS 26.0
- Accept the adoption-rate tradeoff (iOS 26 share will still be ramping through 2026) in exchange for a genuinely defensible "your conversations never leave your phone for tagging" claim — a real differentiator given the intimacy of the data
- Keep reply generation server-side (needs the biggest model for quality) but do sentiment/tone classification on-device where the accuracy bar is lower and privacy value is highest

**If you want maximum device-compatibility instead:**
- Target iOS 16/17, skip Apple Foundation Models entirely at launch
- Do all sentiment analysis and reply generation server-side via Claude/GPT
- Compensate on privacy messaging with strict retention limits (auto-delete conversation text after N days) and no persistent third-party-profile storage — matches the "per-conversation insights only" constraint already in PROJECT.md regardless of on-device vs server processing

**If App Store review flags the Full-Access keyboard + dating-content combination:**
- Fall back to a share-extension-first flow (screenshot → iOS share sheet → Banter) instead of leaning on keyboard Full Access at all; keyboard becomes purely an insertion mechanism for pre-computed suggestions, no networking inside it at all

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|------------------|-------|
| KeyboardKit 9.x | Swift 6.2 / Xcode 26.x | Actively maintained against current Xcode; check release notes at major Xcode bumps since keyboard extensions are sensitive to SDK changes |
| Apple Foundation Models framework | iOS 26+ only (device must support Apple Intelligence — A17 Pro/M-series or later) | Not available on older/base-tier hardware even on iOS 26 — treat as an enhancement path, not a baseline requirement, unless you're comfortable excluding non-Apple-Intelligence devices entirely |
| Supabase Swift SDK 2.x | Swift 6.2, Postgres (managed) | RLS policies must be written before shipping — do not ship with RLS disabled on any table touching conversation content |
| RevenueCat SDK 5.x | StoreKit 2 (wraps it) | Requires products configured in App Store Connect first; sandbox testing needs a Sandbox Apple ID |

## Sources

- [Apple: Creating a custom keyboard](https://developer.apple.com/documentation/UIKit/creating-a-custom-keyboard) — HIGH confidence, official docs
- [Apple: Configuring open access for a custom keyboard](https://developer.apple.com/documentation/uikit/configuring-open-access-for-a-custom-keyboard) — HIGH confidence, official docs, Full Access / `RequestsOpenAccess` behavior
- [Apple: `RequestsOpenAccess` property list key](https://developer.apple.com/documentation/bundleresources/information-property-list/nsextension/nsextensionattributes/requestsopenaccess) — HIGH confidence, official docs
- [KeyboardKit GitHub](https://github.com/KeyboardKit/KeyboardKit) and [KeyboardKit Pro GitHub](https://github.com/KeyboardKit/KeyboardKitPro) — HIGH confidence, primary source for library capability claims
- [KeyboardKit Pricing](https://keyboardkit.com/pricing) — MEDIUM confidence (exact dollar tiers not confirmed via search snippet; verify directly before budgeting)
- [Apple: `VNRecognizeTextRequest`](https://developer.apple.com/documentation/vision/vnrecognizetextrequest) — HIGH confidence, official docs
- [On-Device vs Cloud OCR: Privacy, Speed, and Accuracy](https://scanlens.io/blog/on-device-vs-cloud-ocr) — MEDIUM confidence, third-party analysis, directionally consistent with known Vision framework capability
- [Apple Machine Learning Research: Introducing Apple's On-Device and Server Foundation Models](https://machinelearning.apple.com/research/introducing-apple-foundation-models) — HIGH confidence, official Apple research blog
- [Apple: Foundation Models framework docs](https://developer.apple.com/documentation/FoundationModels) — HIGH confidence, official docs
- [WWDC26: Bring an LLM provider to the Foundation Models framework](https://developer.apple.com/videos/play/wwdc2026/339/) — HIGH confidence, official
- [DevTk.AI: AI API Pricing Comparison June 2026](https://devtk.ai/en/blog/ai-api-pricing-comparison-2026/) and [TLDL: LLM API Pricing 2026](https://www.tldl.io/resources/llm-api-pricing-2026) — MEDIUM confidence, aggregator sites; cross-check exact per-token pricing against anthropic.com/pricing and openai.com/pricing before finalizing cost model
- [Cost-Aware Model Selection for Text Classification (arXiv 2602.06370)](https://arxiv.org/pdf/2602.06370) — HIGH confidence, peer-reviewed-style cost/accuracy analysis of fine-tuned encoders vs prompted LLMs for classification
- [theswiftk.it: StoreKit 2 vs RevenueCat 2026](https://theswiftk.it.com/blog/storekit-2-vs-revenuecat-ios-subscriptions) — MEDIUM confidence, third-party blog, consistent with known RevenueCat positioning
- [RevenueCat Pricing](https://www.revenuecat.com/pricing) — HIGH confidence, official pricing page (free under $2,500 MTR, 1% above)
- [RamamTech: Best backend for iOS — Firebase, Supabase, AWS Amplify](https://ramamtech.com/blog/best-ios-backend-firebase-supabase-amplify-swift) and [Tech Insider: Supabase vs Firebase 2026](https://tech-insider.org/supabase-vs-firebase-2026/) — MEDIUM confidence, third-party comparisons, consistent with well-known platform positioning (Firebase = mobile-first real-time/offline; Supabase = relational + RLS)
- [Amplitude: PostHog vs Mixpanel](https://amplitude.com/compare/posthog-vs-mixpanel), [PostHog vs Mixpanel blog](https://posthog.com/blog/posthog-vs-mixpanel) — MEDIUM confidence, vendor and semi-vendor sources; directionally reliable for positioning, verify current free-tier limits before committing
- [Xcode 26 Release Notes](https://developer.apple.com/documentation/xcode-release-notes/xcode-26-release-notes) and [Xcode 26.6 RC 2 Release Notes](https://developer.apple.com/go/?id=xcode-26_6-sdk-rn) — HIGH confidence, official Apple release notes; iOS 26 SDK build requirement effective April 28, 2026 confirmed

---
*Stack research for: iOS dating-conversation coach (keyboard extension + companion app + AI backend)*
*Researched: 2026-07-03*
