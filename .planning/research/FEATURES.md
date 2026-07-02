# Feature Research

**Domain:** AI dating-conversation coach (screenshot analysis + iOS keyboard + reply generation)
**Researched:** 2026-07-03
**Confidence:** MEDIUM

Confidence is MEDIUM, not HIGH: findings come from web search of vendor sites, app-store listings, and third-party review/blog aggregators — no official API docs or paid teardown reports. Pricing figures conflict across sources for the same app (see STACK/PITFALLS-adjacent note in Sources) and should be treated as directional, not exact. Cross-checked claims (same finding from 2+ independent sources) are called out as such below.

## Feature Landscape

### Table Stakes (Users Expect These)

Every competitor reviewed (Rizz/W Rizz/RizzGPT/Rizz Plug, YourMove.ai, Plug AI, Keys, RizzPlus, AILoveTap, KOPY, Typly, SmoothRizz) converges on the same core loop. Missing any of these makes the product feel like an unfinished clone.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Screenshot upload → reply suggestions | This IS the category; every competitor leads with it (cross-checked, 6+ sources) | MEDIUM | Vision model reads chat screenshot, extracts message thread + speaker attribution. Single-screenshot-only is a known limitation competitors get criticized for (Rizz: "does not allow multiple screenshots... no option to provide written context" — swipestats.io review) |
| Multiple reply options per generation (2-3) | Users want to choose their voice, not accept one canned line; Rizz ships 2, YourMove ships 3 | LOW | Once generation works, returning N variants is a prompt/UI change, not new capability |
| Tone/vibe selector (Funny, Flirty, Confident, etc.) | Standard across every keyboard app (Rizz, AILoveTap, KOPY, Typly — cross-checked, 4+ sources) | LOW-MEDIUM | KOPY claims "40 unique reply styles" via tone × mode combos — diminishing returns past ~4-5 tones; more is marketing, not UX value |
| Custom iOS keyboard extension | Validates the interaction model — insert suggestion directly into the native chat app without app-switching (RizzPlus, AILoveTap, KOPY, Typly, ReplyAssistant all ship one) | HIGH | iOS keyboard extensions have hard platform limits: ~60-70MB memory ceiling, no default network access (Full Access opt-in required, which itself scares privacy-conscious users), can't read the host app's screen — context must be pasted/screenshotted in. This is a real engineering constraint, not a nice-to-have to skip |
| Opener generation from profile/bio screenshot | Second-most-common entry point after reply generation (YourMove: "3 personalized openers in 5 seconds"; Rizz: bio + chat screenshot both accepted) | MEDIUM | Same vision pipeline as chat analysis, different prompt context |
| Free tier with hard usage caps | Every competitor gates volume, not core capability, behind a paywall (YourMove: 7 messages/day free; Rizz: "free for the first week" then paywall) | LOW | This is a business-model table stake, not an engineering one — see Pricing section below |
| Paste-text fallback (no screenshot) | Users complain when screenshot-only is the sole input path; some competitors (Typly, SmoothRizz) support paste directly | LOW | Cheaper to build than vision pipeline and removes a screenshot-privacy objection in one path |

### Differentiators (Competitive Advantage)

Where Banter competes. Cross-referencing against PROJECT.md's stated thesis: **teaching is the wedge — every reviewed competitor generates, almost none teach.**

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Psychology tag per reply ("Playful tease → push-pull dynamic") | Zero competitors surveyed do this at the per-reply level. Smoothspeak is the closest analog — "Cue tells you why something works so you actually improve," built on "insights from top dating coaches" — but it's chat-level coaching commentary, not a structured, citable tag attached to each individual reply option | MEDIUM | This is a prompt-engineering + taxonomy problem, not a new pipeline: same generation call, add a structured "why" field grounded in a fixed psychology framework (Gottman, attachment theory, reciprocity/self-disclosure — per PROJECT.md's citability requirement). The taxonomy itself (a closed, sourced tag set) is the actual research/design work, not the UI |
| XP for writing your own attempt vs. copy-paste | No competitor rewards *not* using the AI output verbatim. This is the mechanism that resolves the "AI-dependent forever" criticism leveled at Rizz/PlugAI in reviews ("outright do not use AI," "feel formulaic if you overuse them" — cross-checked across 3 review sources) | MEDIUM | Requires: (1) a lightweight similarity/edit-distance check between user's sent message and the suggested options to detect "wrote their own" vs "copied," (2) an XP delta rule. Second-order design question: false positives (user tweaks one word) — needs a threshold, not perfect classification |
| Sentiment-tracking "love calculator" | Some competitors surface sentiment internally (unnamed apps described in market-overview pieces: "NLP scans conversations for positive vibes," "real-time feedback on sentiment and tone") but none surface it as a named, user-facing score. OkCupid-style compatibility percentages exist on matching platforms, not on coaching/keyboard apps — this is a category crossover, not a copy | MEDIUM-HIGH | Needs a scoring model that's honest about being heuristic (engagement length, response latency, question-asking ratio, reciprocity) rather than pseudo-precise ("73% compatible") — false precision is a credibility risk given the "not slop or gimmick" quality bar in PROJECT.md |
| Gamified skill progression (levels, streaks, texting-style profile) | Rizz-category apps have zero progression systems — they're single-use utility tools, not habit products. Duolingo's model (XP, streaks with freeze, leagues) proves gamification lifts retention 48-60% in a skill-building context (cross-checked, 3+ sources), but no dating-coach competitor has applied it | MEDIUM-HIGH | The retention mechanism PROJECT.md is betting on ("dating is episodic... alumni are the testimonial engine") is structurally different from language learning's daily-practice loop — streaks need to survive weeks-long gaps between matches without feeling punishing. Streak *freeze*/pause-by-default may fit better than raw daily-streak pressure |
| Wispr Flow-grade onboarding | Explicitly named design bar in PROJECT.md. No dating-coach competitor reviewed has notable onboarding — they're generic quiz→paywall flows | MEDIUM | See dedicated Onboarding section below — this is a UX-craft investment, not a new feature surface |
| Per-conversation match insights (no persistent dossier) | Differentiator framed as ethics/App-Store-safety, but also a genuine UX difference from any tool that would build a cross-conversation profile of a match | LOW-MEDIUM | Architecturally this is actually the *simpler* path (no cross-conversation data model needed) — constraint and simplicity point the same direction here |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|------------------|-------------|
| Live in-keyboard reading of the host chat app | "Why do I have to screenshot, just read the screen" | iOS keyboard extensions cannot access other apps' screen content — this is a hard platform sandboxing limit, not a product choice (already correctly listed Out of Scope in PROJECT.md) | Screenshot/paste input, made as low-friction as possible (share-sheet extension, clipboard auto-detect) |
| AI-generated profile photos | YourMove.ai ships this; user reviews call it "a real weakness" and "draw consistent complaints" (cross-checked) | Different competency (image generation quality bar, deepfake/catfishing optics), doesn't serve the "become a better texter" core value, and is reputationally risky for an App-Store-sensitive product | Skip entirely — bio/photo *feedback* (text critique) is in-scope-adjacent and lower risk than photo *generation* |
| NSFW/pickup-line tone options | Some competitors (Rizz AI Talk) offer "NSFW" tone as a differentiator | Directly conflicts with App Store review sensitivity (explicitly a first-class constraint in PROJECT.md) and undermines the psychology-credibility positioning | Keep tone options in the Funny/Flirty/Confident/Warm range only |
| Persistent cross-conversation profiling of matches ("this is what she likes") | Feels like a natural extension of "get better data on your match" | Explicitly called out as a privacy/App-Store risk in PROJECT.md; also ethically dubious — building a dossier on a non-consenting third party | Per-conversation insights only, discarded/not correlated across matches |
| Maximal tone-selector count ("40 combinations" a la KOPY) | Looks impressive in marketing copy | Choice overload at the exact moment (panic/left-on-read) the product's own thesis says relief must be instant and frictionless | 3-4 tone options max, chosen for psychological distinctiveness not permutation count |
| Real-time in-app chat with matches (becoming a messaging platform) | Adjacent scope creep — "why not let people chat inside Banter" | Directly contradicts PROJECT.md Out of Scope ("Being a dating app itself") — turns a coaching tool into a competing dating platform, invites App Store category confusion | Stay a coaching layer on top of existing dating apps |

## Feature Dependencies

```
Screenshot upload (vision pipeline)
    └──requires──> Chat-thread parsing (speaker attribution, message ordering)
                       └──enables──> Reply generation (3 options)
                                        └──enhances──> Psychology tag per reply (differentiator)
                                        └──enables──> Tone selector

Reply generation (3 options)
    └──requires──> User profile engine (style/goals/context) for hyper-tailored suggestions

Psychology tag per reply
    └──requires──> Sourced psychology taxonomy (Gottman, attachment theory, reciprocity/self-disclosure) — RESEARCH DELIVERABLE, not engineering
    └──enables──> XP for own-attempt (the "why" content is what makes self-writing feel guided, not blind)

XP for own-attempt
    └──requires──> Reply generation (needs a baseline suggestion to compare the user's own text against)
    └──enables──> Gamified progression (levels, streaks, texting-style profile)

Sentiment analysis per exchange
    └──requires──> Chat-thread parsing (same as reply generation — shared input)
    └──enables──> Love calculator (score display)

Gamified progression ──requires──> XP for own-attempt + Psychology tag exposure (both feed the XP economy)

Custom iOS keyboard ──enhances──> Reply generation (delivery surface) but does NOT require it —
    keyboard can ship v1 as "insert last-generated companion-app suggestion" without its own on-device generation

Onboarding (Wispr Flow-grade) ──enhances──> everything (first-run teaching of the mental model) but is not a hard dependency of any feature — can be built/iterated in parallel
```

### Dependency Notes

- **Psychology tag requires a sourced taxonomy, which is a research task, not a coding task.** This should land as its own research/design deliverable before the reply-generation prompt work — the taxonomy is the actual moat, and building the tagging UI before the taxonomy exists risks having to redo the schema.
- **XP for own-attempt requires reply generation to exist first** (needs suggestions to serve as the "copied vs. original" comparison baseline) — so the differentiator can't ship before the table-stakes generation loop.
- **Keyboard extension does not block companion-app v1.** Given the iOS platform constraints (memory ceiling, no default network), the lower-risk sequencing is: build screenshot analysis + reply generation + teaching layer in the companion app first, then add the keyboard as a thinner client that talks to the same backend, once the core loop is proven. This avoids debugging both a new product concept and a constrained extension environment simultaneously.
- **Love calculator requires sentiment analysis, which shares its input (parsed chat thread) with reply generation** — same upstream parsing step, so building it isn't a second pipeline, just a second consumer of the first one's output.

## MVP Definition

### Launch With (v1)

- [ ] Screenshot upload → parsed chat thread → 3 reply suggestions — table stakes, the entire category entry ticket
- [ ] Psychology tag per reply (one-line, from a fixed sourced taxonomy) — the core differentiator; must exist from day one per the "monetize the crutch, gamify the graduation" thesis (PROJECT.md) — this is what separates free-tier Banter from free-tier Rizz
- [ ] Tone selector (3-4 options) — near-zero-cost UI layer on top of generation, expected by users
- [ ] Basic user profile (style/goals) feeding tailored suggestions — needed so "hyper-tailored" isn't just marketing copy
- [ ] Free tier with daily cap + paid unlock (StoreKit) — no monetization path otherwise
- [ ] Wispr Flow-grade onboarding for the core loop — this is where the "premium feel" differentiator is won or lost on first run, and it's cheap relative to backend work
- [ ] Paste-text fallback alongside screenshot — cheap, removes a friction/privacy objection

### Add After Validation (v1.x)

- [ ] Custom iOS keyboard extension — add once the core generation+teaching loop is proven in the companion app; triggers: users are actively asking to avoid app-switching, or retention data shows companion-app-only isn't sticky enough
- [ ] XP for own-attempt + gamified progression (levels, streaks, texting-style profile) — triggers: enough usage volume exists to make progression meaningful (a level system with 10 users feels empty); also needs the "wrote own vs copied" detection tuned first
- [ ] Bio/profile review feature (text feedback, not photo generation) — triggers: users are already engaging with reply generation; profile review is a natural upsell into the teaching narrative once trust is established
- [ ] Sentiment tracking + love calculator — triggers: enough conversation history per user exists for the score to feel earned rather than arbitrary on exchange #2

### Future Consideration (v2+)

- [ ] Android — explicitly deferred in PROJECT.md until iOS engine is proven
- [ ] Cross-conversation pattern insights for the *user* (not the match) — e.g. "you tend to over-explain jokes" as a longitudinal self-insight, distinct from the banned persistent match-dossier — defer until there's enough per-user history to be statistically meaningful, and until the ethics/framing is worked out carefully (still about the user, never the match)
- [ ] Voice/video coaching — explicitly out of scope, text-first per PROJECT.md

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|----------------------|----------|
| Screenshot → 3 replies | HIGH | MEDIUM | P1 |
| Psychology tag per reply | HIGH (the differentiator) | MEDIUM | P1 |
| Tone selector | MEDIUM | LOW | P1 |
| User profile engine | MEDIUM | MEDIUM | P1 |
| Free/paid tiering (StoreKit) | HIGH (revenue) | LOW-MEDIUM | P1 |
| Wispr Flow-grade onboarding | HIGH (conversion + premium feel) | MEDIUM | P1 |
| Paste-text fallback | LOW-MEDIUM | LOW | P1 |
| iOS keyboard extension | HIGH (category-validating) | HIGH | P2 |
| XP / own-attempt scoring | HIGH (retention differentiator) | MEDIUM | P2 |
| Gamified progression (levels/streaks) | HIGH (retention differentiator) | MEDIUM-HIGH | P2 |
| Bio/profile text review | MEDIUM | MEDIUM | P2 |
| Sentiment tracking / love calculator | MEDIUM-HIGH (differentiator, but needs data volume) | MEDIUM-HIGH | P2 |
| AI profile photo generation | LOW (reviews call it a weakness) | HIGH | Do not build |
| NSFW tone option | LOW (App Store risk) | LOW | Do not build |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible

## Onboarding Deep-Dive: Why Wispr Flow's Onboarding Is the Bar

PROJECT.md names Wispr Flow onboarding as the explicit design bar. Research surfaced the specific mechanisms that make it work (source: kristenberman.substack.com "8 lessons from the best onboarding I've seen" — cross-checked against multiple Wispr Flow review sites describing the same trial/no-credit-card structure):

1. **Teaches the mental model before the mechanism.** First screen asks "Which of these resonate with you?" listing user pain points ("I can't keep up with my messages," "I'm tired of typing all day") — it sells the *problem recognition*, not the feature list. For Banter, the analog is naming the panic moment ("left on read," "don't know what to say back") before showing any UI.
2. **Error-proofs so users can't fail the first try** ("poka yoke" — placeholder text, inline prompts, guided steps). For Banter: the first screenshot upload or paste should have a guided, hard-to-mess-up path (sample screenshot pre-loaded as a demo option, clear crop/paste affordance).
3. **Low-stakes practice before the real thing.** Wispr has users dictate a throwaway note before trusting it with real email. For Banter: let the user try the reply-generation flow on a sample/demo conversation before uploading their own real, sensitive chat — this also softens the privacy objection identified in competitor reviews ("sharing potentially sensitive personal data... with a third-party company").
4. **Treats learning as the product, not friction before the product.** This directly parallels Banter's own thesis line 2 ("every reply teaches passively") — the onboarding philosophy and the product philosophy are the same idea applied at different moments.
5. **14-day free trial, no credit card required, unlocks everything.** This is a specific, testable pricing-flow decision, not just a vibe — removes the "will I get charged" anxiety that suppresses trial starts.

General onboarding best practice corroborating this (cross-checked across paywall/onboarding UX blogs): short flow (3-5 screens), personalization questions that visibly change what's shown next, first meaningful action within 60 seconds, and a value-recap screen between the quiz and the paywall rather than a jump straight to price.

## Pricing & Paywall Landscape

Confidence: MEDIUM — figures vary by source and by which of several similarly-named "Rizz" apps is being described (there are at least 4 distinct App Store listings using "Rizz" branding, likely unrelated or copycat apps, which explains inconsistent pricing across sources).

| App | Free tier | Paid pricing (as reported) |
|-----|-----------|----------------------------|
| Rizz (rizz.app, primary) | Free first week, then capped | $7/week reported by one source; $20/month by another; $14.99/month with "unlimited chat feedback, profile overhauls" per a third — treat as directionally ~$7-20/week-to-month range, not a single confirmed number |
| W Rizz (separate App Store listing) | 2 free text generations + 1 free image analysis | $3.99/week |
| Rizz AI Talk (separate App Store listing) | 3-day free trial | $6.99/week |
| YourMove.ai | 7 messages/day free | $79/year (annual only figure found) |

**Pattern (cross-checked across all pricing data found):** every competitor uses volume-capped free tiers (message count or generation count, not feature-gating) plus weekly-first subscription pricing in the ~$4-7/week range, with monthly/annual as an upsell off the weekly anchor. This validates the ~US$7/week figure named in PROJECT.md as a reasonable market anchor to validate against, though note the spread is wide enough (some sources cite $3.99/week, others $14.99/month) that Banter's own pricing test should not treat any single competitor figure as gospel.

**Implication for Banter's model:** the free tier already carrying "full teaching tags" (per PROJECT.md's stated thesis) rather than being pure volume-capping is itself a pricing-model differentiator — no competitor reviewed structures free vs. paid around *depth of teaching* vs. *volume of generation*. Competitors gate volume; Banter's plan gates volume too but keeps the differentiator (tags) in the free tier by design, which is a defensible and distinct paywall shape.

## Competitor Feature Analysis

| Feature | Rizz (+ variants) | YourMove.ai | Plug AI | Smoothspeak | Banter's Approach |
|---------|-------------------|-------------|---------|--------------|--------------------|
| Screenshot analysis | Yes, single screenshot only | Yes, bio + chat | Yes | Yes | Yes, single + paste fallback |
| Reply options | 2 | 3 | Multiple, "mix and match" | Persona-based (4 personas) | 3, each individually tagged |
| Tone selector | Funny/Flirty/Confident | Not emphasized | Rizz/humor/NSFW | Friendly/Romantic/Playful/Confident | Funny/Flirty/Confident/Warm (no NSFW) |
| Psychology "why" per reply | No | No | No | Chat-level coaching commentary, not per-reply tags | Yes — structured, sourced tag per reply (the wedge) |
| Gamification / progression | None found | None found | None found | None found | Levels, streaks, own-attempt XP (differentiator) |
| Sentiment/compatibility score | Not a named feature | Not a named feature | Not a named feature | Not found | "Love calculator," per-conversation only |
| Keyboard extension | Yes (RizzPlus variant) | Not confirmed | Not confirmed | Not confirmed | v1.x, after companion-app core loop validated |
| Profile/bio review | Some variants | Yes (profile writer + AI photos, photos criticized) | Not confirmed | Yes (photo + profile feedback) | Text-based bio review only; no AI photo generation |
| Free tier shape | Volume-capped | Volume-capped (7 msg/day) | Volume-capped | Not confirmed | Volume-capped, but full teaching tags included free |

## Sources

- [RIZZ - #1 AI Dating Assistant](https://rizz.app/)
- [W Rizz: AI Dating Assistant - App Store](https://apps.apple.com/us/app/w-rizz-ai-dating-assistant/id6749450318)
- [Rizz App AI Dating Assistant Review - Scribe](https://scribehow.com/page/Rizz_App_AI_Dating_Assistant_Review_Can_It_Really_Help_You_Date_Smarter_in_2026__0SrPTrdOQry0S4hwfx1REw)
- [Top 6 AI Dating Assistants For Rizz On Demand - VIDA Select](https://www.vidaselect.com/best-ai-dating-assistant)
- [Rizz App Review - SwipeStats](https://www.swipestats.io/blog/rizz-app-review)
- [The Brutally Honest Rizz AI App Review (2025)](https://www.rizonapp.ai/blog/rizz-ai-app-review-2025)
- [Rizz App Review - ROAST](https://roast.dating/blog/rizz-app-review)
- [YourMove AI Features, Pricing, and Alternatives](https://aitools.inc/tools/yourmove-ai)
- [YourMove AI Review 2026 - TruShot](https://trushot.app/blog/yourmove-ai-review)
- [Best AI Dating Coach Apps 2026: Top 10 Compared - RizzAgent AI](https://rizzagentai.com/blog/best-ai-dating-coach-apps-2026)
- [YourMove AI](https://www.yourmove.ai/)
- [Wispr Flow: 8 lessons from the best onboarding I've seen](https://kristenberman.substack.com/p/wispr-flow-8-lessons-from-the-best)
- [Wispr Flow Review 2026 - Spokenly](https://spokenly.app/blog/wispr-flow-review)
- [Plug AI: Rizz Dating Wingman - App Store](https://apps.apple.com/us/app/plug-ai-rizz-dating-wingman/id6504399068)
- [I Let AI Play Cupid: Testing the Best AI Dating Apps - All About AI](https://www.allaboutai.com/best-ai-tools/productivity/dating/)
- [RizzPlus: AI Dating Keyboard - App Store](https://apps.apple.com/us/app/rizzplus-ai-dating-keyboard/id6740608804)
- [AILoveTap - Smart keyboard - App Store](https://apps.apple.com/us/app/ailovetap-smart-keyboard/id6739799329)
- [KOPY — AI Reply Keyboard for iPhone](https://www.getkopy.app/)
- [Best AI Dating App Reply Generators - ChatArtPro](https://www.chatartpro.com/blog/best-ai-dating-keyboard/)
- [Duolingo: Gamification as Design Language - Blake Crosley](https://blakecrosley.com/guides/design/duolingo)
- [Duolingo's Gamification Secrets - Orizon](https://www.orizon.co/blog/duolingos-gamification-secrets)
- [Duolingo Gamification Strategy: A Full Case Study (2026) - Trophy](https://trophy.so/blog/duolingo-gamification-case-study)
- [Smoothspeak: AI Dating Coach - App Store](https://apps.apple.com/us/app/smoothspeak-ai-dating-coach/id6739810324)
- [Smoothspeak](https://www.smoothspeak.ai/)
- [The Real Promise of AI in Dating Isn't Matching—It's Training](https://agoodfirstdate.com/blogs/news/what-ai-really-means-for-dating)
- [Free AI Dating Profile Generator & Tinder Photo Optimizer](https://datephotos.ai/dating-profile-optimizer)
- [Bumble adds AI-powered photo feedback and profile guidance tools - TechCrunch](https://techcrunch.com/2026/02/26/bumble-adds-ai-powered-photo-feedback-and-profile-guidance-tools/)
- [Gamification in Soft Skills Training - TechClass](https://www.techclass.com/resources/learning-and-development-articles/gamification-in-soft-skills-training-engaging-methods-for-better-retention)
- [AI In Dating Apps: How AI Makes Dating Smarter and Safer - MindInventory](https://www.mindinventory.com/blog/ai-in-dating-apps/)
- [Complete Onboarding Breakdown: 9 Steps from First Screen to Paywall](https://dev.to/paywallpro/complete-onboarding-breakdown-9-steps-from-first-screen-to-paywall-2j7)
- [Subscription Onboarding: 15 Patterns You Must Know](https://dev.to/paywallpro/subscription-onboarding-15-patterns-you-must-know-4n4f)
- [From 0.5% to 8% Conversion: App Paywall and Onboarding Optimization - Stormy AI](https://stormy.ai/blog/app-paywall-onboarding-optimization-guide)

**Note on confidence:** No official API docs, no paid competitive-intelligence reports, no direct hands-on testing of competitor apps was performed — all findings are from public web search of vendor marketing pages, App Store listings, and third-party review/blog content. Pricing figures conflict across sources (multiple similarly-branded "Rizz" apps exist with different pricing) and should be re-validated with direct App Store checks before being used for Banter's own pricing decision. Treat this file as directionally reliable for feature landscape and category conventions, and as a starting point (not a final number) for pricing.

---
*Feature research for: AI dating-conversation coach (iOS keyboard + companion app)*
*Researched: 2026-07-03*
