# Pitfalls Research

**Domain:** AI dating-conversation coach (iOS keyboard extension + companion app)
**Researched:** 2026-07-03
**Confidence:** MEDIUM (web sources, cross-checked across multiple independent queries per topic; no official Apple rejection-log or paid-tier documentation access — see Gaps)

## Critical Pitfalls

### Pitfall 1: Full Access rejection or dead-on-arrival adoption

**What goes wrong:**
Two failure modes stack here. (a) App Review rejects the keyboard extension for requesting Full Access without a justification that maps cleanly to a user-facing feature — Apple's guideline requires keyboards to "remain functional without full access" and reviewers push back when Full Access looks like a pretext for network/data collection. (b) Even if approved, most users never flip the Full Access toggle — it requires leaving the keyboard, going to Settings > General > Keyboard, and granting network + iCloud + full data access to a third-party keyboard, which is a well-documented trust/friction wall. Banter's core loop (screenshot → AI analysis → suggested reply) needs network access to call the LLM, which keyboard extensions cannot do without Full Access.

**Why it happens:**
Teams build the keyboard-first flow assuming Full Access is a formality, then discover in review (or in production analytics) that a large fraction of installs never enable it — so the "instant relief" promise breaks for a meaningful slice of users on day one.

**How to avoid:**
Design the companion app as the primary AI-analysis surface (screenshot upload happens there, where full network access is unrestricted), and treat the keyboard extension as a thin insertion/retrieval layer that reads pre-generated suggestions from the shared App Group container rather than calling the network itself. This sidesteps the Full Access-for-network requirement entirely for the core "get a reply" path. Only gate Full Access behind features that generuinely need it (if any), and make the justification screen explicit about what data leaves the device and why, before the OS prompt appears.

**Warning signs:**
- Any architecture spec where the keyboard extension itself makes the LLM API call.
- No fallback UX defined for "Full Access is OFF" state.
- App Review Notes (submitted with the build) don't explicitly explain Full Access usage in plain language.

**Phase to address:**
Architecture/foundation phase — the App Group + host-app-does-the-work pattern must be the default design, not a retrofit.

---

### Pitfall 2: Authenticity backlash — the product looks like the thing users are learning to spot

**What goes wrong:**
60% of dating app users in a 2025 Norton study believe they've encountered AI-written messages, and users report reliably detecting AI text via em dashes, "rule of three" phrasing, and flat emotional tone. Competitor Rizz is specifically criticized in reviews as producing "mechanical and cheesy" replies. The category has a trust problem: users want convenience but reject anything that reads as generated when the context is emotionally loaded (dating). If Banter's suggested replies read like typical LLM output, the product inherits this backlash regardless of the teaching framing.

**Why it happens:**
Teams optimize the LLM prompt for "good reply" without adversarially testing for the stylistic tells that make text read as AI-generated (em dashes, listy structure, over-polished grammar, generic compliments). Teaching-tag UI doesn't fix voice quality — a well-labeled cringe reply is still a cringe reply.

**How to avoid:**
Two structural mitigations, both already implied by Banter's thesis: (1) the "teaching not lines" positioning changes what's being shipped — a psychology-tagged *option* the user edits/personalizes is a different artifact than a copy-paste line, so measure and market against "reply you send after adapting it," not "reply you send verbatim." (2) Prompt-engineer explicitly against AI-tells: ban em dashes and listy triads in output style, calibrate to the user's own captured voice/style profile (per PROJECT.md's "user profile engine"), and keep replies short and imperfect rather than polished. Track a "sent verbatim vs. edited" metric post-launch as the real authenticity signal.

**Warning signs:**
- Suggested replies use em dashes, semicolons, or "not just X, but Y" constructions.
- No user-voice-calibration step in the reply-generation prompt.
- App Store reviews mentioning "sounds fake" or "she could tell."

**Phase to address:**
Core reply-generation phase (prompt design) — bake anti-AI-tell constraints and voice-matching into the first working version, not a post-launch patch. Revisit at the user-profile-engine phase once style data exists to calibrate against.

---

### Pitfall 3: Intimate conversation data mishandled — privacy failure with outsized consequence

**What goes wrong:**
Dating conversations are among the most sensitive data categories a consumer app can touch (attraction, rejection, sometimes explicit content, third-party — the match's — personal details). Two concrete risks: (a) default-to-indefinite retention or using conversation content to fine-tune/improve models without explicit consent, which under GDPR risks fines up to €20M or 4% global revenue and is a growing App Store review flashpoint (Apple's Nov 2025 AI-transparency enforcement requires disclosure + consent before sharing data with third-party AI services); (b) building a persistent profile on the *match* (the other person in the conversation, who never consented to being profiled) — PROJECT.md already flags this as an anti-feature, correctly, because it's both an ethical and an App-Store-rejection risk (this is effectively surveillance of a non-user).

**Why it happens:**
Screenshot-based OCR pipelines naturally capture the match's messages, name, and sometimes profile details alongside the user's own text. It's easy to let this data flow into long-term storage or training pipelines "for personalization" without a retention policy, and easy to let "conversation history" silently become "dossier on this person across conversations."

**How to avoid:**
- Default to short retention (30-90 days) for raw screenshots/OCR text; process-then-discard where feasible (analyze, return suggestions, delete the image).
- Never persist match-identifying data outside the single conversation session — no cross-conversation match profile, ever (this is already a Key Decision in PROJECT.md; make it a technical constraint enforced by schema design, not just a policy).
- Do not train/fine-tune on user conversation content without explicit, separate opt-in consent (distinct from ToS accept-all).
- On-device processing where feasible (OCR via iOS Vision framework can run on-device) to minimize what ever leaves the device.
- Explicit deletion flow honoring GDPR's 1-month response requirement from day one, not bolted on before EU launch.

**Warning signs:**
- Any schema with a `matches` or `people` table that aggregates data across conversations.
- Screenshot images retained after analysis completes.
- "Improve our AI" consent bundled into general ToS rather than a separate toggle.

**Phase to address:**
Data architecture phase, before any conversation-analysis feature ships. Retrofit is expensive once user data is flowing.

---

### Pitfall 4: LLM safety framing — accidentally shipping pickup-artist manipulation instead of communication coaching

**What goes wrong:**
"Get better at texting" is one prompt-design decision away from "manipulate people into responding" — and the difference is not obvious to an LLM optimizing for "reply that gets a response." Pickup-artist (PUA) methodology is widely documented as pseudoscientific (its NLP roots have no evidentiary base) and as encoding manipulative, sometimes coercive framing toward women. If the reply-generation prompt or its training examples lean on scarcity, neg-style teasing-as-manipulation, or "close the deal" framing, Banter ships the exact ethical and reputational liability the product thesis explicitly wants to avoid.

**Why it happens:**
"Push-pull dynamic," "playful tease," and similar pop-psychology terms (already used as an example tag in PROJECT.md) sit right at the boundary between legitimate flirtation psychology and PUA-coded language. Without a hard editorial line, prompt iteration under "make replies more effective" pressure drifts toward whatever gets the highest engagement/response-rate metric, which is exactly the optimization target PUA methodology also chases.

**How to avoid:**
Adopt an explicit **evidence-based-only framework allowlist** for the psychology layer, and treat it as a hard constraint on prompt design and tag vocabulary, not a suggestion:

**Citable / evidence-based — safe to build on:**
- **Gottman Method** (Gottman & Levenson, 40+ years, ~3,000 couples) — Four Horsemen (criticism, contempt, defensiveness, stonewalling) as communication patterns to *avoid*; predicts relational breakdown with ~93.6% accuracy in Gottman's studies. Directly useful for "don't send this" flags and de-escalation coaching.
- **Attachment theory** (Bowlby/Ainsworth, extended to adult romantic attachment) — peer-reviewed work (e.g., Vanderbilt et al. 2025, Sage Journals; Luo & Slatcher, PubMed) shows attachment style measurably predicts texting frequency preference, response latency, and interpretation of delay-as-rejection. Useful for calibrating suggestion tone to the user's (self-reported or inferred) attachment style — frame as "understanding your pattern," never as reading or exploiting the match's attachment style.
- **Self-disclosure / reciprocity research** (Aron et al. 1997, *Personality and Social Psychology Bulletin*, "36 Questions" study) — escalating, reciprocal, personalistic self-disclosure builds closeness; grounded in self-expansion theory. Useful for pacing/depth-of-question suggestions. Caveat honestly: it builds closeness, not guaranteed attraction — don't oversell it in-app copy.
- **Reciprocity norm** (Cialdini, *Influence*) — used descriptively (mutual give-and-take builds rapport), not manipulatively (do not frame as "create false indebtedness").
- **Active listening / validation** (Rogers-derived, standard in couples/communication therapy) — safe, well-established, low citation risk.

**Pseudoscience / hard no — do not cite, do not encode as technique:**
- Neuro-linguistic programming (NLP) framing — no evidentiary base.
- "Negging," scarcity manufacturing, false time pressure, "last-minute resistance" tactics — documented as coercive in PUA literature.
- Any "alpha/beta" framing or gendered-manipulation language.

Enforce this as a literal content filter on prompt templates and tag vocabulary (a banned-terms lint on any string shipped as a "psychology tag"), reviewed at each prompt-iteration cycle, not just at initial design.

**Warning signs:**
- Any tag or prompt referencing "neg," "scarcity," "push-pull" used as manufactured unavailability rather than descriptive playfulness, "alpha," or response-rate-maximization without a well-being framing.
- Prompt iteration driven purely by "which reply got a response" A/B data without a parallel healthy-communication review.

**Phase to address:**
Psychology-framework/teaching-layer phase — this is the phase PROJECT.md calls out as needing "sourced frameworks," so build the allowlist as a literal artifact (a frameworks doc + banned-terms list) that the LLM prompt and every tag string must pass through.

---

### Pitfall 5: OCR/screenshot pipeline hallucinates conversation context

**What goes wrong:**
Screenshot → OCR → LLM is the only viable context path (keyboards can't read other apps' screens — a platform constraint PROJECT.md already documents). OCR misreads (wrong sender attribution, garbled emoji, dropped messages, misread timestamps) feed directly into the LLM prompt. LLMs then hallucinate on top of bad OCR input — inventing plausible-sounding text that was never in the screenshot, especially under generic/malformed extraction prompts. In a dating-advice context this is not a cosmetic bug: a suggested reply that responds to a message the match never sent, or attributes the wrong line to the wrong speaker, actively damages the user's real conversation.

**Why it happens:**
Screenshot layouts vary wildly across dating apps (Hinge, Tinder, Bumble all have different bubble styles, timestamps, read-receipts) and vary again across iOS system-level screenshot styles (status bar, notch, dynamic island cropping). Generic OCR-to-LLM prompting without grounding compounds small extraction errors into confident-sounding wrong answers.

**How to avoid:**
- Use iOS Vision framework (on-device, no network round-trip, no extra vendor to trust with images) for initial text extraction and bubble/layout detection (sender-side vs. match-side, based on bubble color/alignment) rather than sending raw images straight to a multimodal LLM and hoping.
- Ground the LLM prompt in the *structured* OCR output (speaker-attributed line-by-line transcript), not the raw image — cuts hallucination materially versus generic prompting.
- Show the user the parsed transcript before generating suggestions (a lightweight "did we read this right?" confirmation step) so misattribution is caught before it produces a bad suggestion, not after.
- Cross-validate ambiguous parses (e.g., low OCR confidence score) by falling back to asking the user directly rather than silently guessing.

**Warning signs:**
- No confidence score or user-facing confirmation step between OCR and reply generation.
- Testing only on clean, single-app screenshot formats instead of the full matrix of dating-app UIs and device sizes.
- Reply generation triggers immediately from raw image bytes with no intermediate structured-transcript stage.

**Phase to address:**
Screenshot-ingestion/OCR phase, before reply-generation is wired up — this is foundational plumbing, not a later polish pass.

---

### Pitfall 6: Paywall kills the free-tier hook that makes the product different

**What goes wrong:**
PROJECT.md's thesis is explicit: "never block relief," free tier keeps teaching tags because that's the differentiator. The generic pitfall here is inverting that — gating the psychology explanation (the thing competitors don't have) behind the paywall while leaving bare suggestions free, which collapses Banter into "just another Rizz" and destroys the exact differentiation the product strategy depends on. A second version of this mistake: hard paywall with no free path to experience value at all, which the research shows converts worse than a reverse-trial/soft-gate approach (temporary full access, then loss-aversion-framed downgrade) — and dating-app users in 2026 already report high subscription fatigue (78% report app burnout partly tied to monetization pressure across the category).

**Why it happens:**
Under revenue pressure, it's tempting to move the highest-perceived-value feature (teaching/explanation) behind the paywall because it feels premium — but that's backwards for this specific product: the explanation *is* the retention/differentiation mechanic, and volume/depth (unlimited suggestions, love calculator, deep insights) is the correct thing to meter.

**How to avoid:**
Keep the Key Decision as a hard product constraint, not a suggestion: teaching tags always free, volume + calculator + deep insights behind subscription. If using a reverse-trial (recommended by paywall-conversion research), still preserve teaching-tag visibility even in the post-trial free state — the trial should widen *volume*, not gate the differentiator.

**Warning signs:**
- Any spec that shows a psychology tag as a "premium" or blurred/locked UI element.
- Paywall triggers before the user has seen a single suggestion (should trigger after relief is delivered, at the depth/volume ceiling).

**Phase to address:**
Monetization/paywall phase — verify against the Product Thesis checklist at spec time, not just at ship time.

---

### Pitfall 7: Gamification trivializes the skill it claims to teach

**What goes wrong:**
Duolingo's streak/XP system is widely documented as producing anxiety (loss-aversion-driven compulsive use, "streak freeze" monetizing the very anxiety it creates) and, more importantly for Banter, as not reliably improving the underlying skill — users optimize for the metric (streak, XP) rather than the competency (actual fluency / actual texting skill). PROJECT.md's thesis explicitly wants "measurable skill growth," which is a much higher bar than "engagement metric goes up." If Banter's XP system rewards *usage* (opening the app, using suggestions) rather than *demonstrated skill* (writing an original reply that scores well, needing fewer suggestions over time), it will produce the same metric-chasing-without-competence pattern critics document in Duolingo, and undermine the "not slop or gimmick" quality bar in PROJECT.md.

**Why it happens:**
Usage-based gamification (streaks, daily-open XP) is far easier to implement than competence-based gamification (grading a user's own attempt, tracking reduced reliance on suggestions over time) — so under time pressure, teams default to the easy metric even when the product thesis calls for the hard one.

**How to avoid:**
PROJECT.md already specifies the right mechanic — "writing your own attempt first earns more XP than copy-paste" — so the concrete implementation guardrail is: XP/skill-score must be weighted toward *reduced dependence on suggestions* and *quality of self-written attempts*, never toward raw app-open frequency or streak length alone. If a streak mechanic ships at all, pair it with forgiveness (streak freezes, grace periods) from day one rather than adding it reactively after users complain — and avoid escalating urgency UI (flashing icons, guilt-based push notifications) that manufactures anxiety rather than motivation.

**Warning signs:**
- XP awarded equally for "used a suggestion verbatim" and "wrote your own reply."
- Streak has no forgiveness/freeze mechanic at launch.
- No metric tracked for "suggestion-dependence over time" (the actual skill-growth signal the product promises).

**Phase to address:**
Gamification/progression-system phase — design the scoring formula around dependence-reduction before any streak/XP UI is built, since the UI will calcify around whatever the underlying formula rewards.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Keyboard extension calls LLM API directly (needs Full Access) | Simpler v0 architecture, one less App Group round-trip | Full Access friction kills adoption for a large user segment; App Review risk | Never for the primary flow — acceptable only for a genuinely optional premium feature, clearly justified |
| Send raw screenshot straight to multimodal LLM, skip structured OCR stage | Faster to prototype | Hallucinated context, wrong-speaker attribution, no confidence signal to catch errors | MVP/spike only, must be replaced before real users see suggestions |
| Bundle "improve our AI" consent into general ToS instead of separate opt-in | Fewer onboarding screens | GDPR exposure, App Store AI-transparency rejection risk (enforced from Nov 2025) | Never |
| Usage-based XP (open app = points) instead of competence-based scoring | Ships faster, simpler formula | Undermines "measurable skill growth" thesis, invites Duolingo-style burnout backlash | Never — this is core-thesis-breaking, not a minor shortcut |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|-------------------|
| iOS Keyboard Extension ↔ Host App | Assuming keyboard can call network APIs without Full Access | Host app does all LLM/network work; keyboard reads pre-computed suggestions from shared App Group container |
| iOS Vision framework (OCR) | Feeding raw image straight into LLM prompt with no structured intermediate | Extract structured, speaker-attributed transcript first; ground LLM prompt in that, not raw pixels |
| LLM provider (for reply generation) | No output-style constraints, so replies carry AI "tells" (em dashes, listy structure) | Explicit anti-AI-tell style constraints + user-voice calibration in the system prompt |
| StoreKit / subscription | Hard paywall before any suggestion is shown | Reverse-trial or soft-gate pattern; paywall triggers at volume/depth ceiling, after relief already delivered |
| App Store Review submission | Full Access / AI-usage justification left vague in App Review Notes | Explicit, plain-language justification of Full Access use and AI data handling submitted with the build |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Keyboard extension memory creep (image buffers, cached suggestion history in-process) | Keyboard randomly disappears/crashes mid-typing | Keep keyboard extension state minimal; store history in host app / shared container, not extension process memory | Consistently at ~60-70MB RAM (device-dependent), an easy ceiling to hit if caching too much |
| Synchronous OCR+LLM call blocking the "instant relief" promise | Suggestion generation feels slow, breaks the "left on read panic moment" UX thesis | Async pipeline with optimistic UI (loading state with early partial results if possible) | Noticeable at any real network latency once an LLM round-trip plus OCR is in the critical path |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Persisting match-identifying data across conversations | Non-consenting third-party surveillance dossier — ethical violation, App Store rejection risk, potential GDPR liability re: the match as a data subject | Schema-level constraint: no cross-conversation match profile table, ever; enforce per-conversation scoping architecturally |
| Retaining raw screenshots after analysis | Expands breach blast radius with the most sensitive data category the app touches | Process-then-discard; short TTL on any retained image data; prefer on-device OCR to avoid ever uploading the raw image |
| Training/fine-tuning on user conversation content without separate consent | GDPR exposure, App Store AI-transparency rejection (Nov 2025 enforcement) | Separate, explicit opt-in toggle distinct from general ToS; default OFF |
| No verified check for Full Access state before assuming network capability | Keyboard silently fails or crashes attempting network calls it doesn't have | Use the UIPasteboard-access workaround (or App Group flag set by host app) to detect Full Access state and degrade gracefully |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|------------------|
| Suggestion reads as obviously AI-generated (em dashes, generic compliments) | User doesn't trust or use it; if sent, match detects it, damaging the real conversation | Voice-calibrated, terse, imperfect output; explicit anti-AI-tell prompt constraints |
| No confirmation step between OCR read and reply generation | Suggestions respond to misread/hallucinated context, actively harmful in a live conversation | Lightweight "did we read this right?" transcript confirmation before generating suggestions |
| Streak/XP UI with no forgiveness mechanic | Compulsive use, anxiety, churn when a streak breaks (Duolingo-documented pattern) | Grace periods/freezes from day one; weight scoring toward skill growth, not raw frequency |
| Teaching tag locked behind paywall | Collapses the core differentiator into "just another Rizz"; breaks the product thesis | Teaching tags always free; meter volume/depth only |
| Persistent "insight dossier" on a specific match across conversations | Feels (and is) like surveillance of a non-consenting third party; App Store risk | Per-conversation insights only, never aggregated across conversations with the same person |

## "Looks Done But Isn't" Checklist

- [ ] **Keyboard extension "works":** Often missing the Full-Access-OFF degraded state — verify the extension has a coherent, useful UX when Full Access is never granted (majority-likely scenario).
- [ ] **OCR pipeline "works":** Often missing coverage of the actual dating-app screenshot matrix (Hinge/Tinder/Bumble bubble styles, notch/dynamic-island crops, dark mode) — verify against real screenshots from each target app, not one clean test image.
- [ ] **Psychology tags "sourced":** Often missing an actual citation/framework doc a reviewer (or a curious user) could check — verify every tag traces to one of the evidence-based frameworks (Gottman, attachment theory, self-disclosure/reciprocity, active listening), not vibes-based labeling.
- [ ] **Privacy policy "compliant":** Often missing the separate AI-training consent toggle and the explicit Full-Access/AI-data justification text required for App Review — verify both exist as distinct, explicit UI/copy artifacts, not folded into a general ToS wall of text.
- [ ] **Paywall "shipped":** Often missing verification that teaching tags remain visible post-trial/free-tier — verify against the Product Thesis checklist before ship, not just "does StoreKit work."

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|-----------------|
| App Review rejection for Full Access justification | LOW | Resubmit with explicit App Review Notes; usually a 1-2 cycle fix if architecture already avoids extension-side network calls |
| Authenticity backlash after launch (reviews say "sounds fake") | MEDIUM | Prompt-iterate on anti-AI-tell constraints; add/expose voice-calibration step; re-market around "edit, don't copy-paste" |
| Discovered cross-conversation match profiling in shipped schema | HIGH | Requires data migration + deletion of aggregated match data + possible breach-style user disclosure depending on jurisdiction; far cheaper to prevent at schema design |
| Gamification found to reward usage over skill post-launch | MEDIUM | Reweight XP formula, communicate the change as a positive ("smarter scoring"), risk of backlash from users who built streaks under the old formula |
| OCR hallucination causes a bad real-world suggestion incident | MEDIUM | Add confirmation step retroactively; publish transparent "how we read your screenshot" explainer to rebuild trust |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|-------------------|----------------|
| Full Access rejection / dead adoption | Architecture/foundation phase | Keyboard extension makes zero direct network calls; App Review Notes draft reviewed before submission |
| Authenticity backlash (AI-sounding replies) | Reply-generation/prompt phase | Blind test: can a reviewer tell which of 5 replies were AI-suggested vs. human-written; no em dashes/listy-triad patterns in output |
| Intimate data privacy failure | Data architecture phase | Schema review confirms no cross-conversation match table; retention TTL configured; AI-training consent is a separate opt-in |
| PUA-adjacent/manipulative framing | Psychology-framework phase | Every shipped tag/prompt string checked against the evidence-based allowlist + banned-terms list |
| OCR hallucination / wrong context | Screenshot-ingestion phase | Structured transcript stage exists between OCR and LLM; confidence threshold triggers user confirmation |
| Paywall breaks the differentiator | Monetization phase | Teaching tags visible in free tier at ship time, checked against Product Thesis explicitly |
| Gamification trivializes skill | Progression-system phase | XP formula weights self-written/dependence-reduction over raw usage; streak has forgiveness mechanic |

## Sources

- [App Review Guidelines - Apple Developer](https://developer.apple.com/app-store/review/guidelines/)
- [iOS App Store Review Guidelines 2026](https://theapplaunchpad.com/blog/ios-app-store-review-guidelines/)
- [App Store Review Guidelines 2025: Essential AI App Rules](https://openforge.io/app-store-review-guidelines-2025-essential-ai-app-rules/)
- [Avoiding App Store Rejection for Dating Apps 2026](https://www.ongraph.com/avoiding-app-store-rejection-for-dating-apps/)
- [App Privacy Details - Apple Developer](https://developer.apple.com/app-store/app-privacy-details/)
- [Security of Third-Party Keyboard Apps on Mobile Devices](https://zeltser.com/third-party-keyboards-security)
- [Limitations of custom iOS keyboards - Medium](https://medium.com/@inFullMobile/limitations-of-custom-ios-keyboards-3be88dfb694)
- [Are There Any Limitations When Creating Custom Keyboards on iOS? - Fleksy](https://www.fleksy.com/blog/limitations-of-custom-keyboards-on-ios/)
- [Rizz App Review - SwipeStats](https://www.swipestats.io/blog/rizz-app-review)
- [So You Fell for a Robot — 'Chatfishing' - Scientific American](https://www.scientificamerican.com/article/the-rise-of-ai-chatfishing-in-online-dating-poses-a-modern-turing-test/)
- [AI Is Not a Match for Dating Apps - TIME](https://time.com/7272515/ai-dating-apps-connection-essay/)
- [Message from her match was 'like a robot had sent it' - CBC News](https://www.cbc.ca/news/canada/hamilton/online-dating-ai-burlington-9.7097111)
- [Men Are Using AI to Flirt and It's a Disaster - Good Men Project](https://goodmenproject.com/sex-relationships/men-are-using-ai-to-flirt-and-its-a-disaster/)
- [The Four Horsemen: Criticism, Contempt, Defensiveness, and Stonewalling - Gottman Institute](https://www.gottman.com/blog/the-four-horsemen-recognizing-criticism-contempt-defensiveness-and-stonewalling/)
- [The Four Horsemen That Predict Divorce, Explained - mindbodygreen](https://www.mindbodygreen.com/articles/four-horsemen-gottman-research)
- [The Impact of Attachment Style on Communication Frequency and Language Use in Romantic Partners' Text Messages - Sage Journals 2025](https://journals.sagepub.com/doi/10.1177/0261927X251344949)
- [Adult Romantic Attachment, Electronic Messaging, and Relationship Quality - PubMed](https://pubmed.ncbi.nlm.nih.gov/35085449/)
- [Creating love in the lab: The 36 questions that spark intimacy - Berkeley News](https://news.berkeley.edu/2015/02/12/love-in-the-lab/)
- [36 Questions for Increasing Closeness - Greater Good in Action, Berkeley](https://ggia.berkeley.edu/practice/36_questions_for_increasing_closeness)
- [Pickup Artists, Alpha Males, and the Male Supremacist 'Self Help' Industry - SPLC](https://www.splcenter.org/resources/extremist-files/pickup-artists-alpha-males-self-help/)
- [The Sexist Pseudoscience of Alpha Male Pick-Up Artists - New Republic](https://newrepublic.com/article/118036/sexist-pseudoscience-alpha-male-pick-artists)
- [Problematising expressives: magical affirmations in the pick-up artist paradigm - ScienceDirect](https://www.sciencedirect.com/science/article/pii/S0378216625000657)
- [The Reciprocity Norm - Cognitigence](https://www.cognitigence.com/blog/principle-of-reciprocity-norm)
- [7 GDPR Rules for AI Chatbots](https://agentiveaiq.com/blog/7-golden-rules-of-gdpr-for-ai-chatbots-explained)
- [AI Chatbot Privacy Concerns: Risks, Data Collection, and Compliance](https://chatboq.com/blogs/ai-chatbot-privacy-concerns)
- [The essential guide to mobile paywalls for subscription apps - RevenueCat](https://www.revenuecat.com/blog/growth/guide-to-mobile-paywalls-subscription-apps/)
- [State of Subscription Apps 2026 - RevenueCat](https://www.revenuecat.com/state-of-subscription-apps/)
- [Swipe Right to Pay: How Dating Apps Turned Love Into a Subscription Service - Groundwork Collaborative](https://groundworkcollaborative.org/work/swipe-right-to-pay-how-dating-apps-turned-love-into-a-subscription-service/)
- [Streak Creep: The perils of too much gamification - The Decision Lab](https://thedecisionlab.com/insights/consumer-insights/streak-creep-the-perils-of-too-much-gamification)
- [Duolingo's Shallow Learning Trap: Gamified Streaks, Harmful Habits - DEV Community](https://dev.to/yaptech/duolingos-shallow-learning-trap-gamified-streaks-harmful-habits-4134)
- [Why Do LLMs Fail at OCR and Document Parsing?](https://ironsoftware.com/csharp/ocr/blog/using-ironocr/llm-for-ocr/)
- [Reducing hallucinations when extracting data from PDF using LLMs - DEV Community](https://dev.to/parthex/reducing-hallucinations-when-extracting-data-from-pdf-using-llms-4nl5)
- [Document Data Extraction in 2026: LLMs vs OCRs - Vellum](https://www.vellum.ai/blog/document-data-extraction-llms-vs-ocrs)

**Note on confidence:** All sources are web search results (LOW base tier per this project's source-hierarchy tooling), not official Apple documentation, paywalled App Review case databases, or peer-reviewed meta-analyses accessed directly. Confidence is elevated to MEDIUM at the synthesis level only where 2+ independent search queries corroborated the same finding (Full Access friction, authenticity-detection backlash, Gottman/attachment/Aron citability, gamification/streak anxiety). Treat App-Store-specific rejection mechanics and exact guideline numbering as directional, not verbatim — verify against `developer.apple.com/app-store/review/guidelines/` directly before writing App Review Notes copy.

---
*Pitfalls research for: AI dating-conversation coach (iOS keyboard extension + companion app)*
*Researched: 2026-07-03*
