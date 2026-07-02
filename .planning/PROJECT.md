# Banter (working title)

## What This Is

An iOS dating-conversation coach — a custom keyboard plus companion app — that suggests psychology-backed replies for dating-app conversations, explains the *why* behind each suggestion, tracks conversational sentiment into a "love calculator," and gamifies progression so users genuinely become better texters instead of AI-dependent. Rizz gives you fish; Banter teaches fishing — with the receipts to prove the psychology.

## Core Value

The user gets instant relief (great replies, right now) while becoming a measurably better texter over time — real skill transfer, backed by citable psychology, not generated lines.

## Business Context

- **Customer**: People struggling with dating-app texting who'll pay to get better — premium iPhone demographic
- **Revenue model**: Freemium subscription — free tier: limited analyses/day with full teaching tags; premium: unlimited suggestions, love calculator, deep match insights, progression system (~US$7/wk market standard, validate in research)
- **Success metric**: Live on App Store with paying subscribers; users report better conversations and actual dates; measurable skill growth over time
- **Strategy notes**: Product thesis locked 2026-07-03 (see Key Decisions)

## The Product Thesis

**Never block relief. Attach growth to it. Monetize the crutch, gamify the graduation.**

1. **Relief is instant, always** — at the "left on read" panic moment, 3 reply options immediately. No quiz gates, no forced lessons.
2. **Every reply teaches passively** — each option carries a one-line psychology tag by default ("Playful tease → push-pull dynamic"). Learning as a side effect of relief.
3. **Growth is pulled, not pushed** — gamified layer (skill XP, texting-style profile, calculator accuracy) rewards deeper engagement; writing your own attempt first earns more XP than copy-paste. Training wheels rise voluntarily.
4. **Graduation-churn is a myth** — dating is episodic; users return per new match/phase/dry spell. Alumni are the testimonial engine. Duolingo retention model, not Rizz novelty-churn.
5. **Monetize the crutch** — free tier hooks with teaching tags (the differentiator); premium unlocks volume + depth.
6. **Match privacy** — insights framed per-conversation, never a persistent dossier on the other person. Ethical and App-Store-review-safe.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Screenshot upload → conversation analysis → 3 suggested replies with psychology tags
- [ ] Custom iOS keyboard for in-chat reply insertion and quick access
- [ ] User profile engine — maps the user's style, goals, and context; suggestions hyper-tailored
- [ ] Sentiment analysis per exchange feeding a "love calculator" (emotional-factor scoring of the conversation)
- [ ] Teaching layer — psychology tag per reply + progressive skill-building (XP, own-attempt grading)
- [ ] Gamified progression — skill growth visible, streaks/levels, conversation navigation
- [ ] Wispr Flow-grade onboarding
- [ ] Freemium subscription (StoreKit)

### Out of Scope

- Android — v2, after the engine is proven on iOS
- Live in-keyboard reading of other apps' chats — platform-impossible; context via screenshot/paste
- Being a dating app itself (matching, profile browsing) — we improve conversations, not supply them
- Voice/video coaching — text-first
- Persistent profiling of non-consenting matches — privacy/App Store risk; per-conversation insights only

## Context

- Owner: Kish — founder track (Track 2). Note: takes the founder-slot alongside/instead of FocusForge per his one-active-project rule (surfaced and acknowledged).
- Competitive field: Rizz, YourMove.ai, Plug AI — all generate lines; none teach. All use screenshot upload + keyboard, validating the interaction model.
- Design bar: Wispr Flow onboarding quality; premium iOS-native feel.
- Hard requirement: psychology layer must be citable research (e.g., Gottman, attachment theory, reciprocity/self-disclosure research), not vibes. Research phase must produce sourced frameworks.
- Workspace: lives in Nex_Doc as root-level app folder `banter/` (pre-Phase 2 convention); assign JD address in 10-19 Apps during Phase 2 migration.

## Constraints

- **Platform**: iOS keyboard extensions cannot read other apps' screens — conversation context must come from screenshots or paste. Keyboard has memory (~60-70MB) and network (Full Access opt-in) restrictions.
- **Tech**: Swift/SwiftUI app + keyboard extension; shared AI backend. Stack finalized after research.
- **Ethics/Privacy**: Intimate conversation data — on-device where possible, minimal retention, no dossiers on third parties. App Store review sensitivity is a first-class constraint.
- **Quality bar**: Psychology-backed and sourced, or it doesn't ship — explicitly "not slop or gimmick."

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keyboard + companion app both in v1 | Full vision from day one; keyboard is the wedge, app is the depth | — Pending |
| iOS first, Android v2 | Paying dating demographic skews iPhone; competitors validated iOS-first; halves native work | — Pending |
| Graduated assist ("training wheels that rise") | Only model that serves both relief (conversion) and growth (mission + retention) | — Pending |
| Never gate relief behind learning friction | Friction at the panic moment loses to Rizz; teaching rides along passively | — Pending |
| Freemium sub; teaching tags free, depth paid | The differentiator hooks; volume + calculator monetize | — Pending |
| Per-conversation match insights only | Ethics + App Store safety; avoids surveillance-dossier framing | — Pending |
| Success = App Store launch + paying users | Commercial product from day one, not a portfolio piece | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-07-03 after initialization*
