# Project Research Summary

**Project:** Banter (iOS dating-conversation coach — custom keyboard + companion app)
**Domain:** AI dating-assistant / conversational coaching (iOS keyboard extension + LLM backend)
**Researched:** 2026-07-03
**Confidence:** MEDIUM (stack HIGH; features/architecture/pitfalls MEDIUM)

## Executive Summary

Banter is a viable iOS dating-coach product with clear competitive positioning. The recommended architecture is **companion-app-first, keyboard-extension-second** — this is both a platform requirement (keyboard extensions have ~60-70MB memory caps and no default network access) and the better UX choice: all heavy work (OCR, LLM calls, profile logic) happens in the app, and the keyboard just reads cached suggestions from a shared App Group container.

The stack is straightforward and well-established: Swift 6.2 + Xcode 26.6+ (iOS 26 SDK required for new App Store submissions as of April 2026), KeyboardKit 9.x for the keyboard, on-device Vision framework OCR, Supabase + Claude Haiku backend with schema-enforced structured output, and RevenueCat for subscriptions. No exotic dependencies.

The differentiator is psychology tags per reply (e.g., "Playful tease → push-pull dynamic") grounded in sourced, evidence-based frameworks (Gottman, attachment theory, Aron's self-disclosure research). **No competitor currently ships this**, and none has gamified progression — both differentiators are wide-open space. The top risks are all architectural and must be designed in, not retrofitted: Full Access rejection/adoption friction, authenticity backlash (users detecting AI text), and intimate-data privacy.

## Key Findings

### Recommended Stack

**Core technologies:**
- **Swift 6.2 / Xcode 26.6+ / iOS 26 SDK**: required for new App Store submissions (April 2026 rule)
- **KeyboardKit 9.x (MIT core)**: keyboard extension on `UIInputViewController` — cuts weeks of layout/SwiftUI-hosting plumbing; skip Pro tier at MVP
- **Vision framework (`VNRecognizeTextRequest`)**: on-device OCR — free, private, millisecond-fast, at parity with cloud OCR for clean rendered chat screenshots
- **Claude Haiku (server-side)**: reply generation + sentiment in ONE schema-enforced structured-output call; Apple Foundation Models (on-device, iOS 26) optional for sentiment/tagging half
- **Supabase 2.x**: Postgres + Row Level Security fits relational, privacy-sensitive, per-user-scoped data better than Firebase
- **RevenueCat 5.x**: wraps StoreKit 2, free under $2,500 MTR, no lock-in

### Expected Features

**Must have (table stakes):**
- Screenshot upload → 2-3 tone-selectable reply options — every competitor's core loop
- Paste-text fallback for context input
- Opener generation from match profile — market-standard capability
- Free tier with daily cap; subscription paywall
- Keyboard extension for in-chat insertion (expected surface; sequence late in v1)

**Differentiators (Banter's wedge — no competitor ships these):**
- Psychology tag per reply with tap-to-expand "why this works" (closest competitor, Smoothspeak, does chat-level commentary only)
- Gamified skill progression (XP weighted to own attempts, own-attempt grading) — zero market precedent; Duolingo shows 48-60% retention lift from analogous mechanics
- Love calculator: event-sourced sentiment timeline per conversation
- Voice calibration / anti-AI-tell generation

**Anti-features (deliberately NOT build):**
- AI profile photos (explicitly criticized in competitor reviews)
- Separate "conversation revival" surface (just a use-case of reply generation)
- Persistent cross-conversation dossiers on matches (privacy/App Store risk)

### Architecture Patterns

- **Thin keyboard**: extension only reads pre-computed suggestions from App Group shared container and inserts text; never calls network directly; works without Full Access
- **App Group + shared Swift package**: the only data bridge between app and extension; identical group ID, shared model definitions
- **OCR pipeline in companion app**: Vision OCR + bubble-attribution heuristics (bounding-box position) + user confirmation step before generation
- **Single structured-output LLM call**: reply + psychology tag + sentiment in one schema-enforced response (99.8%+ compliance vs 8-15% failure parsing free text)
- **Event-sourced sentiment**: append-only `SentimentEvent`s materialized into the love-calculator timeline; scoring can improve without reprocessing screenshots
- **Privacy by structure**: raw screenshots never leave device; only structured text to backend; short TTL; user-keyed (never match-keyed) data

### Critical Pitfalls

1. **Full Access rejection / dead adoption** — most users never enable it; mitigate architecturally: app does LLM work, keyboard reads cache (Phase: foundation/keyboard)
2. **Authenticity backlash** — 60% of dating-app users believe they've seen AI text; Rizz criticized as "mechanical, cheesy"; mitigate with anti-AI-tell prompt constraints (ban em dashes, listy triads) + "edit and personalize" positioning (Phase: LLM orchestration)
3. **Privacy failure with intimate data** — match dossiers are App-Store-rejection and GDPR risk; schema-level constraint: per-conversation scoping, short TTL, separate training-consent toggle (Phase: backend + hardening)
4. **PUA pseudoscience contamination** — evidence-based allowlist (Gottman Four Horsemen: 93.6% divorce-prediction accuracy; attachment theory; Aron self-disclosure/reciprocity) vs banned coercive framing (negging, scarcity, "alpha") — literal allowlist/banlist artifact gating every prompt (Phase: LLM orchestration)
5. **OCR hallucination** — bad parse → confidently wrong replies; structured-transcript confirmation step before generation (Phase: OCR)
6. **Paywall inverting the thesis** — gating teaching tags = collapsing into "just another Rizz"; tags stay free, volume + calculator depth paid; reverse-trial (14 days full) is best practice (Phase: monetization)
7. **Gamification trivializing skill** — usage-based XP (open app = points) contradicts "measurable skill growth"; XP must weight own-attempt quality and reduced suggestion dependence (Phase: progression)

## Implications for Roadmap

**Suggested 8-phase structure:**

1. **Foundation & Shared Models** — BanterShared package, App Group plumbing, project skeleton
2. **Screenshot Import + OCR Pipeline** — Vision OCR, bubble attribution, transcript confirmation UI
3. **Backend LLM Orchestration** — psychology taxonomy artifact (allowlist/banlist) FIRST, then schema-enforced generation with tags + sentiment + anti-AI-tell constraints
4. **Companion App UI + Paywall** — Wispr Flow-grade onboarding, suggestion cards, love-calculator timeline, RevenueCat reverse trial
5. **Keyboard Extension** — thin App Group reader; Full Access optional
6. **Profile Engine + XP + Grading** — personalization, own-attempt grading, skill-growth progression
7. **Privacy Hardening** — TTLs, deletion, GDPR checks, App Review notes prep
8. **Metrics + Launch** — instrumentation, cohort analysis, App Store submission

**Ordering rationale:** dependency chain forces models → OCR → LLM → UI → keyboard; psychology taxonomy must be locked before prompt engineering (schema-rework risk); keyboard ships after the suggestion pipeline is real; gamification needs the core loop as its baseline.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Apple docs authoritative; iOS 26 SDK requirement confirmed; mature dependencies |
| Features | MEDIUM | Competitor matrix from listings/reviews; pricing conflicts across sources — re-validate at planning |
| Architecture | MEDIUM | Platform mechanics HIGH (official docs); LLM orchestration patterns MEDIUM; competitor internals LOW |
| Pitfalls | MEDIUM | Most cross-checked 2+ sources; psychology framework evidence HIGH (peer-reviewed) |

## Gaps to Address

- **Phase 2 (OCR):** per-app bubble-parsing heuristics (Hinge/Tinder/Bumble variance) need real screenshot collection; post-launch tuning expected
- **Phase 6 (Grading):** own-attempt LLM grading is novel — needs a prompt-engineering spike with real user attempts
- **Pricing:** ~$7/wk anchor is directionally right but conflicting sources — verify against live App Store listings before setting price
- **App Store guidelines:** pull verbatim 4.5.4 + Nov 2025 AI-transparency wording from developer.apple.com before drafting App Review Notes

## Sources

### Primary (HIGH confidence)
- `.planning/research/STACK.md` — Apple developer docs, KeyboardKit/Supabase/RevenueCat official pages
- `.planning/research/ARCHITECTURE.md` — developer.apple.com (App Groups, keyboard extensions, Vision framework)

### Secondary (MEDIUM confidence)
- `.planning/research/FEATURES.md` — App Store listings + reviews for Rizz family, YourMove.ai, Plug AI, Smoothspeak, KOPY, Typly; Wispr Flow onboarding teardown; Duolingo retention research
- `.planning/research/PITFALLS.md` — Norton/Scientific American/CBC on AI-text detection; peer-reviewed Gottman/attachment/Aron research; GDPR + App Store policy sources

---
*Research completed: 2026-07-03*
*Ready for roadmap: yes*
*Synthesized from 4 parallel research agents; persisted by orchestrator (#222 self-heal — synthesizer returned document inline without writing it).*
