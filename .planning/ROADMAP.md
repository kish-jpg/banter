# Roadmap: Banter

## Overview

Banter goes from empty Xcode project to App Store launch along a strict dependency chain: shared models and the on-device privacy boundary come first, then the OCR capture pipeline turns screenshots into structured transcripts, then the backend LLM orchestration (gated by a psychology allowlist/banlist locked *before* prompt engineering) produces tagged replies plus sentiment in one call. On that engine we build the companion app UI, onboarding, love calculator, and paywall — making the product usable and monetizable. Only then does the thin keyboard extension ship (it depends on the app's App Group data contract), followed by the pulled-not-pushed growth layer (profile, XP, own-attempt grading), a dedicated privacy-hardening pass, and finally instrumentation plus App Store submission.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Privacy Boundary** - Shared package, App Group plumbing, and the on-device data boundary everything else builds on (completed 2026-07-03)
- [ ] **Phase 2: Screenshot Import & OCR Pipeline** - Vision OCR + speaker attribution + user-confirmable transcript, plus paste fallback
- [ ] **Phase 3: Backend LLM Orchestration** - Psychology taxonomy artifact, then schema-enforced tagged replies + sentiment in one anti-AI-tell call
- [ ] **Phase 4: Companion App UI & Paywall** - Wispr-grade onboarding, suggestion cards, tone control, love-calculator timeline, and the freemium reverse trial
- [ ] **Phase 5: Keyboard Extension** - Thin App Group reader that inserts cached suggestions in any chat app without Full Access
- [ ] **Phase 6: Profile Engine, XP & Grading** - Personalization from a live user profile plus own-attempt grading and visible skill progression
- [ ] **Phase 7: Privacy Hardening** - Short-TTL user-keyed retention, in-app deletion, and explicit training-consent opt-in
- [ ] **Phase 8: Metrics & Launch** - Instrumentation, cohort analysis, App Review notes, and App Store submission

## Phase Details

### Phase 1: Foundation & Privacy Boundary

**Goal**: The project skeleton, shared model package, and App Group bridge exist, and the "raw screenshots never leave the device" boundary is a structural guarantee — not a later promise.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: CAPT-04
**Success Criteria** (what must be TRUE):

  1. App and (placeholder) keyboard target both build and share a single BanterShared package via a common App Group ID.
  2. A round-trip test proves data written by the app is readable by the keyboard target through the shared container.
  3. The network/send boundary only accepts structured text — there is no code path that transmits a raw image off-device.
  4. Shared model types (transcript, suggestion, sentiment event) are defined once and imported by both targets.

**Plans**: 4/4 plans complete
**Wave 1**

- [x] 01-01-PLAN.md — Split banter/ into its own dedicated private GitHub repo + Xcode/SPM .gitignore (blocking CI prerequisite)
- [x] 01-02-PLAN.md — BanterShared package: 3 Codable models + AppGroupStore + structured-text-only NetworkDTOs, with round-trip + CAPT-04 guard tests (CAPT-04)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-03-PLAN.md — XcodeGen project.yml + minimal BanterApp (writer) and BanterKeyboard (reader) targets sharing BanterShared via the App Group entitlement

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-04-PLAN.md — GitHub Actions macOS CI: generate project, build both targets signing-free on simulator, run both tests green (the phase gate)

### Phase 2: Screenshot Import & OCR Pipeline

**Goal**: A user can turn a chat screenshot (or pasted text) into a structured, correctly-attributed transcript they confirm before anything is analyzed — no confident replies built on a bad parse.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: CAPT-01, CAPT-02, CAPT-03
**Success Criteria** (what must be TRUE):

  1. User can pick a chat screenshot and see it parsed on-device into a message-by-message transcript.
  2. Each parsed message is attributed to "you" or "match," and the user can flip an attribution or edit text before continuing.
  3. User can paste raw conversation text and get the same confirmable transcript as a fallback path.
  4. Nothing is sent for analysis until the user confirms the transcript.

**Plans**: 1/5 plans executed
**UI hint**: yes

**Wave 1**

- [x] 02-01-PLAN.md — iOS 18 bump (both config files) + Wave-0 Vision-in-simulator canary: OCRPipeline + RecognizedLine + one fixture PNG (CAPT-01)

**Wave 2** *(blocked on Wave 1)*

- [ ] 02-02-PLAN.md — BubbleAttributor: reading-order sort (bottom-left-origin fix) + x-alignment attribution (0.4 constant) + noise filter, with fixture-integration test (CAPT-01)
- [ ] 02-03-PLAN.md — PasteTextParser: prefix-pattern + alternating fallback, ReDoS-safe against adversarial paste (CAPT-03)

**Wave 3** *(blocked on Wave 2)*

- [ ] 02-04-PLAN.md — SwiftUI slice: Banter design tokens + 3 screens (Import Entry, Parsing Progress, Confirm Transcript flip/edit/confirm) per 02-UI-SPEC.md (CAPT-01, CAPT-02, CAPT-03)

**Wave 4** *(blocked on Wave 3)*

- [ ] 02-05-PLAN.md — CI screenshot-artifact deliverable: BanterUITests XCUITest target + upload-artifact@v4, with human-verify checkpoint (CAPT-02)

### Phase 3: Backend LLM Orchestration

**Goal**: A confirmed transcript returns 3 psychology-tagged reply options and a sentiment score in a single schema-enforced call — every reply gated by an evidence-based framework allowlist and a PUA banlist, with AI tells suppressed.
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: COAC-06, COAC-01, COAC-03, COAC-05, COAC-07, CALC-01
**Success Criteria** (what must be TRUE):

  1. A literal allowlist/banlist artifact (Gottman / attachment / Aron allowed; negging / scarcity / "alpha" banned) exists and every generation call is gated by it.
  2. One backend call returns exactly 3 replies, each with a one-line psychology tag, plus a sentiment score for the exchange.
  3. Generated replies avoid AI tells (no em-dash triads / listy tells) and read in a natural texting voice.
  4. User can generate openers from a match-profile screenshot through the same gated pipeline.

**Plans**: TBD

### Phase 4: Companion App UI & Paywall

**Goal**: The end-to-end core loop is a polished, monetized product — a user onboards, sees value before any paywall, gets tagged suggestions with expandable "why," reads a per-conversation love-calculator timeline, and hits a freemium reverse trial.
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: ONBD-01, ONBD-02, COAC-02, COAC-04, CALC-02, CALC-03, MONE-01, MONE-02, MONE-03
**Success Criteria** (what must be TRUE):

  1. A first-run user experiences the core value (screenshot → tagged replies) before any signup or paywall.
  2. User can pick a tone (playful / sincere / witty / direct) and tap any psychology tag to expand a plain-English, cited "why this works."
  3. User can view a per-conversation health score with an emotional-factor timeline, scoped to that conversation only (no match dossier).
  4. Free tier caps daily analyses but always shows psychology tags; a 14-day full-access reverse trial downgrades gracefully to free, and premium unlocks unlimited analyses + calculator depth via RevenueCat/StoreKit 2.
  5. Photos and keyboard permissions are primed with contextual explainers at the moment of need.

**Plans**: TBD
**UI hint**: yes

### Phase 5: Keyboard Extension

**Goal**: The wedge ships — a custom keyboard shows the app's cached suggestions and inserts one into any chat app with a single tap, working entirely without Full Access.
**Mode:** mvp
**Depends on**: Phase 4
**Requirements**: KEYS-01, KEYS-02, KEYS-03, KEYS-04
**Success Criteria** (what must be TRUE):

  1. The keyboard displays suggestions read from the App Group shared container (populated by the app).
  2. User can tap a suggestion to insert it into any chat app in one tap.
  3. The keyboard's core loop functions with Full Access off — it never calls the network directly.
  4. A guided enable flow with a contextual explainer walks the user through turning the keyboard on.

**Plans**: TBD
**UI hint**: yes

### Phase 6: Profile Engine, XP & Grading

**Goal**: Growth is pulled, not pushed — suggestions personalize to a live user profile, and users who write their own attempts get graded feedback and earn more XP than copy-pasters, with visible skill progression.
**Mode:** mvp
**Depends on**: Phase 4
**Requirements**: PROF-01, PROF-02, PROF-03, GROW-01, GROW-02, GROW-03
**Success Criteria** (what must be TRUE):

  1. Onboarding captures the user's goals, texting style, and dating context into a profile that visibly shapes later suggestions.
  2. The profile updates from usage (picked replies, tone choices) so suggestions drift toward the user's voice over time.
  3. User can write their own reply attempt and receive a grade with specific, actionable feedback.
  4. XP rewards own-attempt quality and reduced suggestion dependence more than copy-paste, and the user can view level progression plus a "texting DNA" report.

**Plans**: TBD
**UI hint**: yes

### Phase 7: Privacy Hardening

**Goal**: The intimate-data promises are verified, not just designed — retention is short and user-keyed, users can delete everything, and any training use requires explicit separate consent.
**Mode:** mvp
**Depends on**: Phase 6
**Requirements**: PRIV-01, PRIV-02, PRIV-03
**Success Criteria** (what must be TRUE):

  1. Server-side conversation data is short-TTL and strictly user-keyed — verifiably never match-keyed and never a persistent dossier.
  2. User can delete all their data (account and content) from within the app and confirm it is gone.
  3. Any training use of user data is off by default and requires a separate, explicit opt-in that is honored.

**Plans**: TBD

### Phase 8: Metrics & Launch

**Goal**: Banter is instrumented, App-Review-ready, and submitted — the project's success gate (live on the App Store) is reachable. Delivers no new user feature; it closes launch readiness for the requirements shipped in Phases 1-7.
**Mode:** mvp
**Depends on**: Phase 7
**Requirements**: (none — launch/instrumentation gate for prior phases)
**Success Criteria** (what must be TRUE):

  1. Core-loop and conversion events are instrumented well enough to read activation, cap-hit, trial-start, and subscribe cohorts.
  2. App Review notes cite verbatim guideline 4.5.4 + the Nov 2025 AI-transparency wording, and document the privacy/consent model.
  3. The build is submitted to the App Store on the iOS 26 SDK with the keyboard extension and subscription products configured.

**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Privacy Boundary | 4/4 | Complete    | 2026-07-03 |
| 2. Screenshot Import & OCR Pipeline | 1/5 | In Progress|  |
| 3. Backend LLM Orchestration | 0/TBD | Not started | - |
| 4. Companion App UI & Paywall | 0/TBD | Not started | - |
| 5. Keyboard Extension | 0/TBD | Not started | - |
| 6. Profile Engine, XP & Grading | 0/TBD | Not started | - |
| 7. Privacy Hardening | 0/TBD | Not started | - |
| 8. Metrics & Launch | 0/TBD | Not started | - |
