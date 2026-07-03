# Requirements: Banter

**Defined:** 2026-07-03
**Core Value:** The user gets instant relief (great replies, right now) while becoming a measurably better texter over time — real skill transfer, backed by citable psychology.

## v1 Requirements

### Capture

- [x] **CAPT-01**: User can upload a chat screenshot and have it parsed on-device (Vision OCR) into a structured transcript
- [ ] **CAPT-02**: Parsed transcript attributes each message to user or match, and user can confirm/correct it before analysis
- [x] **CAPT-03**: User can paste conversation text as a fallback context path
- [x] **CAPT-04**: Raw screenshots never leave the device — only structured text is sent to the backend

### Coaching

- [ ] **COAC-01**: User receives 3 suggested replies per analysis
- [ ] **COAC-02**: User can select a tone (playful, sincere, witty, direct) to steer suggestions
- [ ] **COAC-03**: Every suggested reply carries a one-line psychology tag by default (zero extra taps)
- [ ] **COAC-04**: User can tap a tag to expand a plain-English "why this works" explanation with framework citation
- [ ] **COAC-05**: Suggestions match the user's texting voice and avoid AI tells (enforced at prompt level)
- [ ] **COAC-06**: All coaching content is gated by an evidence-based framework allowlist (Gottman, attachment theory, Aron self-disclosure) and a PUA/coercive-technique banlist — maintained as a literal artifact
- [ ] **COAC-07**: User can generate conversation openers from a match profile screenshot

### Love Calculator

- [ ] **CALC-01**: Each analyzed exchange is sentiment-scored (same structured LLM call as reply generation)
- [ ] **CALC-02**: User can view a per-conversation health score with a timeline of emotional factors
- [ ] **CALC-03**: Insights are scoped per-conversation only — no persistent profile of the match

### Profile Engine

- [ ] **PROF-01**: Onboarding captures the user's goals, texting style, and dating context into a profile
- [ ] **PROF-02**: Suggestions are personalized using the user profile
- [ ] **PROF-03**: The profile updates continuously from usage (picked replies, tone choices, outcomes)

### Growth & Gamification

- [ ] **GROW-01**: User can write their own reply attempt and receive a grade with specific feedback
- [ ] **GROW-02**: XP rewards own-attempt quality and reduced suggestion dependence more than copy-paste
- [ ] **GROW-03**: User can view their skill progression over time (levels + "texting DNA" report)

### Keyboard

- [ ] **KEYS-01**: Custom keyboard displays cached suggestions from the App Group shared container
- [ ] **KEYS-02**: User can insert a suggestion into any chat app with one tap
- [ ] **KEYS-03**: Keyboard core loop works without Full Access (never calls the network directly)
- [ ] **KEYS-04**: Guided keyboard-enable flow with contextual explainer

### Onboarding

- [ ] **ONBD-01**: Onboarding demonstrates core value before any signup or paywall (Wispr Flow pattern)
- [ ] **ONBD-02**: Permissions (photos, keyboard) are primed contextually with explainer screens at the moment of need

### Monetization

- [ ] **MONE-01**: Free tier with daily analysis cap — psychology tags always visible on the free tier
- [ ] **MONE-02**: Premium subscription (RevenueCat/StoreKit 2) unlocks unlimited analyses, love-calculator depth, and full progression
- [ ] **MONE-03**: Reverse trial — 14 days full access, then graceful downgrade to free tier

### Privacy

- [ ] **PRIV-01**: Server retention of conversation data is short-TTL and strictly user-keyed
- [ ] **PRIV-02**: User can delete all their data (account and content) from within the app
- [ ] **PRIV-03**: Any training use of user data requires a separate, explicit opt-in consent

## v2 Requirements

### Platform & Reach

- **PLAT-01**: Android app (keyboard + companion)
- **PLAT-02**: On-device sentiment tagging via Apple Foundation Models (iOS 26 devices)

### Coaching Depth

- **COAC-08**: Dating-profile/bio review and improvement suggestions
- **COAC-09**: Conversation-revival prompts for stalled chats (surfaced, not a separate UI)
- **COAC-10**: Deep voice calibration from user's message history

### Engagement

- **ENGA-01**: Streak mechanics + push notifications (designed against streak-anxiety pitfall)
- **ENGA-02**: Cross-conversation skill insights (user-side only, never match-side)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Being a dating app (matching, browsing) | We improve conversations, not supply them |
| AI-generated profile photos | Explicitly criticized in competitor reviews; off-thesis |
| Persistent cross-conversation match dossiers | Privacy/GDPR/App Store risk; schema-level ban |
| PUA techniques (negging, scarcity, "alpha" framing) | Documented pseudoscience, coercive; hard banlist |
| Voice/video coaching | Text-first product |
| Live in-keyboard reading of other apps' chats | Platform-impossible on iOS |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CAPT-04 | Phase 1 | Complete |
| CAPT-01 | Phase 2 | Complete |
| CAPT-02 | Phase 2 | Pending |
| CAPT-03 | Phase 2 | Complete |
| COAC-06 | Phase 3 | Pending |
| COAC-01 | Phase 3 | Pending |
| COAC-03 | Phase 3 | Pending |
| COAC-05 | Phase 3 | Pending |
| COAC-07 | Phase 3 | Pending |
| CALC-01 | Phase 3 | Pending |
| ONBD-01 | Phase 4 | Pending |
| ONBD-02 | Phase 4 | Pending |
| COAC-02 | Phase 4 | Pending |
| COAC-04 | Phase 4 | Pending |
| CALC-02 | Phase 4 | Pending |
| CALC-03 | Phase 4 | Pending |
| MONE-01 | Phase 4 | Pending |
| MONE-02 | Phase 4 | Pending |
| MONE-03 | Phase 4 | Pending |
| KEYS-01 | Phase 5 | Pending |
| KEYS-02 | Phase 5 | Pending |
| KEYS-03 | Phase 5 | Pending |
| KEYS-04 | Phase 5 | Pending |
| PROF-01 | Phase 6 | Pending |
| PROF-02 | Phase 6 | Pending |
| PROF-03 | Phase 6 | Pending |
| GROW-01 | Phase 6 | Pending |
| GROW-02 | Phase 6 | Pending |
| GROW-03 | Phase 6 | Pending |
| PRIV-01 | Phase 7 | Pending |
| PRIV-02 | Phase 7 | Pending |
| PRIV-03 | Phase 7 | Pending |

**Coverage:**

- v1 requirements: 32 total (header previously read "27" — miscount; list contains 32)
- Mapped to phases: 32
- Unmapped: 0 ✓
- Note: Phase 8 (Metrics & Launch) delivers no new v1 requirement — it is the App Store launch/instrumentation gate for Phases 1-7.

---
*Requirements defined: 2026-07-03*
*Last updated: 2026-07-03 after roadmap creation (traceability populated, count corrected 27→32)*
