# Banter — Product Requirements Document

**Version 1.0 · 2026-07-12 · Owner: Kish (founder) · Status: canonical**
**Live product: https://banter-tau.vercel.app · Repo: kish-jpg/banter (branch feat/web)**
**Inputs: shipped system (56 backend + 22 web tests), competitive teardown (11 sources, mid-2026), 6-domain expert panel, founder interview (confirmed intent docs: INTENT-PERSONA-ENGINE.md)**

---

## 0. The refined brief (what this document answers)

> Build the communication coach that a socially anxious introvert — someone whose reliance
> on AI is quietly eroding the very skill he needs most — would trust with his real
> conversations, and that provably makes him need it less every week. Make the intelligence
> behind every suggestion legible and evidence-cited. Make the interface as calm as Wispr
> Flow. Make the business model honest enough to survive its own success: we monetize
> graduation, not dependency. Dating first, friendship close behind, because the thesis is
> bigger than dating: **in the AI era, human connection is the last scarce skill.**

---

## 1. Thesis

Every text-assistant app on the market answers the question *"what should I send?"*
Banter answers a different question: *"why did that work — and can you do it yourself
next time?"*

The market data says the first question is worth real money: the category leader has
~7.5M users paying ~$7/week for canned replies. The same data says the market hates what
it's buying — the four loudest complaints across every review set are (1) replies that
sound like a bot, (2) predatory paywalls, (3) fear of an AI reading private chats, and
(4) — stated verbatim by reviewers — *the app becomes a crutch that stops you developing
your own skills.*

Nobody in the category fills gap #4, because filling it means building a product whose
success metric is the user leaving. We build exactly that, and we solve the business
paradox it creates (§9). The macro trend is our tailwind: as AI mediates more human
communication, the ability to connect *without* mediation appreciates. We are not selling
rizz. We are selling the return of a capability.

### Founder's note (the user we build for first)

The founder is an introvert with severe social anxiety who struggles to communicate not
just with dates but with friends — and who watched heavy AI use make it worse, not
better. In clinical terms (§5.2): AI reply generation is a textbook **safety behavior** —
it relieves the anxiety of the moment and starves the skill that would dissolve the
anxiety for good. Banter is designed by someone inside that loop, to break that loop.
That is the product's soul and its marketing story, and every design decision below is
tested against one question: *does this make the anxious user more capable, or more
dependent?*

---

## 2. The problem, precisely

Three nested problems, each feeding the next:

1. **In-the-moment paralysis.** A message arrives that matters. The user rereads it nine
   times, drafts and deletes, and either over-invests (double-texts, walls of text) or
   avoids (leaves it a day, kills the momentum). They have no read on what the other
   person is feeling and no vocabulary for what a good reply *does*.
2. **The dependency spiral.** Generic AI (ChatGPT, Rizz-class apps) solves problem 1 by
   replacement. Relief is immediate; atrophy is compounding. The user's own voice
   calcifies; live conversation (the date itself, the phone call, the catch-up with an
   old friend) becomes MORE terrifying because the gap between assisted-them and real-them
   has widened. Reviewers of competitor apps name this unprompted.
3. **No feedback loop in real life.** Conversations die and nobody tells you why. Real
   coaching is $97+/session (ROAST's top tier sells anyway — feedback demand is proven).
   Without feedback there is no deliberate practice; without practice there is no skill;
   without skill, back to problem 1.

**Evidence the problem is bigger than dating:** the category leader's own stats — 50% of
conversations imported to Rizz come from non-dating platforms (iMessage, Instagram), and
25% of its users are already in relationships. People aren't buying pickup lines. They're
buying help *communicating with humans they care about.*

---

## 3. Users

| Persona | Situation | Job to be done | What they fear |
|---|---|---|---|
| **The Overthinker** (core) | Anxious introvert, 22-35, dating apps + a shrinking friend circle | "Tell me what's actually happening in this conversation, help me respond, and make me better so I stop needing help" | Being exposed as awkward; sending the wrong thing; being caught using AI |
| **The Rebuilder** | Post-breakup or post-isolation; skills rusty, confidence low | "Get me back to conversational fitness like a couch-to-5k program" | That it's too late to change |
| **The Optimizer** | Socially fine, wants an edge and a read | "Am I reading this right? Is now the time to ask?" | Wasting weeks on a dead conversation |
| **The Reconnector** | Wants to revive friendships gone quiet ("we haven't talked in 8 months and I don't know how to start") | "Give me a way back in that doesn't feel weird" | That reaching out reads as needy or random |

The Overthinker is the design target. When a decision trades off between personas, the
Overthinker wins. Wispr-calm exists for them: an anxious user in a loud interface closes
the tab.

---

## 4. Product principles (each one falsifiable)

1. **Teach, don't replace.** Every assisted moment carries its lesson (the "why this
   works" citation). Violated if any surface shows a reply without one tap to its reason.
2. **Fade the scaffold.** Assistance measurably decreases as competence increases
   (§5.6). Violated if a level-10 user gets the same help as a level-1 user.
3. **Truth over comfort.** Banded reads with next actions; the walk-away card when the
   trajectory is bad. Violated if the app flatters to retain.
4. **Evidence or silence.** Every technique cited to real research; the taxonomy gate
   rejects anything else, including from our own model. Violated by a single uncited
   psychology claim.
5. **Their words, their consent.** Persona facts only from what the other person actually
   said, quote attached, sensitive attributes blocked, user-editable, one-tap
   delete-everything. Violated by any inference or external enrichment.
6. **The win is offline.** Dates met and friendships revived are the success events, not
   messages sent. Violated if any metric rewards thread length.
7. **Calm is the interface.** One primary action per screen, warm dark, no clutter, no
   badges screaming for attention. Violated by any engagement mechanic that manufactures
   urgency.

---

## 5. The intelligence stack (the system, layer by layer)

Everything in this section is shipped and tested unless marked **[NEXT]**. Formulas are
the actual production code.

### 5.0 Capture — get the conversation in, lose nothing, keep nothing

- **Inputs:** up to 6 screenshots (multi-shot, unlike the category leader's
  one-at-a-time) AND/OR pasted text, in one request. Client downsizes images to ≤1280px
  JPEG before upload (privacy + latency).
- **Extraction:** Gemini 2.5 Flash vision with a schema-enforced response: each message
  gets `speaker (user|match)`, exact text (no paraphrase), and — when visibly present —
  an ISO timestamp (`never guess` is a prompt-level rule; unparseable times are dropped).
  Speaker attribution from bubble alignment; pasted text attributed from `me:`/`them:`
  markers or content.
- **Privacy invariant:** screenshots exist only in request memory. No storage write, no
  log line, no training. The transcript the user confirms is the only artifact.
- **Confirm step:** the user always reviews the transcript (tap bubble = swap speaker,
  ✎ = edit text) before any coaching. This is a trust surface, not just error correction.

### 5.1 Comprehension — facts with receipts

After every import, a second, temperature-0 extraction pass proposes **persona facts**
about the other person:

- Typed: `interest | dislike | story | inside-joke | boundary | logistics | hook`
- Every fact carries the **exact quote** it derives from. No quote, no fact.
- **Sensitive-inference blocklist** (hard, at every intake path including manual entry):
  religion, sexual orientation, physical/mental health, ethnicity, politics, finances —
  even when stated outright. The regex gate is defense-in-depth on top of the prompt rule.
- Facts are **suggested, never silently saved**: "I picked up on a few things — only
  saved if you keep them." Keep/drop per fact.

### 5.2 Memory — the persona engine

One persona per real person, holding facts, a context tag (`date | friend | business`),
and usage counters. At coaching time we do NOT dump the persona into the prompt. Each
fact is **salience-scored** for this specific turn:

```
S(fact) = max(0.15, relevance) × recency × novelty × stageWeight

relevance  = keyword overlap(fact, last 6 messages), floored at 0.15 so fresh
             stage-appropriate facts can surface without topical overlap
recency    = 0.5^(ageDays/14)          — 14-day half-life; manual facts never decay
novelty    = 1/(1 + timesUsed²)        — a fact called back twice is buried (nothing
                                          reads more AI than mentioning her dog again)
stageWeight= lookup(stage, factType)   — hooks peak at opening, stories at depth,
                                          logistics at momentum; boundaries always 1.0
```

Top-4 facts above threshold 0.05 are injected **with their quotes**, under a prompt rule:
*use at most one or two, only where natural, never stack callbacks, never mention what
they didn't bring up themselves.* The callback ledger (§5.7) closes the loop.

### 5.3 The read — signal, stage, pace

**Signal read.** Every coaching response carries a sentiment: overall score, a one-line
signal in plain language, and four factors ∈ [0,1]: interest, warmth, reciprocity,
responsiveness (shown as "momentum"). **We never show raw percentages of a person** —
factors render as bands: `low < 0.45 ≤ warming < 0.70 ≤ strong`. A low band always ships
with a next action (watch-out), never a bare verdict — a "34% interest" dial pointed at
someone an anxious user likes is harm, not information.

**Stage machine.** `opening → rapport → depth → momentum`, computed from message count +
signal trajectory:

```
opening   : messages < 6
momentum  : messages ≥ 12 ∧ interest ≥ 0.75 ∧ reciprocity ≥ 0.65   (make the plan)
depth     : messages ≥ 20 ∧ mean(warmth, reciprocity) ≥ 0.55
rapport   : otherwise
```

Stage gates fact selection (§5.2), technique preference, watch-out framing, and the
coach-mode cadence (§5.6). Momentum's product meaning: **the goal of texting is the
date/meetup, not the thread** — reaching momentum reframes all coaching toward making
the plan.

**Pace engine.** From whatever timestamps the import surfaced (graceful when none):
per-side median response gaps; trend = cooling if the later half of the other person's
gaps exceeds 1.7× the earlier median (warming at <0.6×); user double-texts counted at
same-speaker gaps ≥ 20 min. Send-time awareness from the client clock (a 1 a.m. draft
gets a 1 a.m. note). **Hard ethical rule, enforced in the prompt:** pace advice mirrors
energy; the app never advises manufactured distance ("wait 3 hours to seem busy" is the
banned scarcity tactic sneaking in a side door — we detect and refuse the pattern).

**Walk-away.** Two consecutive reads with `mean(interest, reciprocity)` below 0.45 then
0.40 without recovery triggers "real talk": the honest recommendation to spend the energy
where it's met. No competitor dares ship this; it is the single strongest trust move in
the category, and it costs us engagement on purpose (principle 6 > principle-less growth).

### 5.4 Coaching — generation behind a gate

Prompt assembly (server-side, Deno edge function, the same engine that passed 56 tests):

```
systemInstruction = taxonomy allowlist (name + framework + explanation each)
                  + 5 anti-AI-tell style directives
                  + tone bias (playful|sincere|witty|direct, optional)
                  + user profile line (their voice, applied lightly)
                  + persona facts block w/ callback rules      (§5.2)
                  + pace context w/ anti-scarcity rule         (§5.3)
user content      = [TRANSCRIPT] fenced, speaker-attributed
response          = schema-enforced JSON: exactly 3 replies {text, psychologyTag, style}
                  + sentiment {score, factors, signal}
```

**The gate (COAC-06: every generated token passes or nothing ships):**

1. `psychologyTag` must be on the allowlist — an invented technique name is a rejection.
2. Banned-term scan (word-boundary, case-insensitive) across ALL text: negging, scarcity,
   push-pull, alpha/beta, LMR, NLP-manipulation vocabulary.
3. Anti-AI-tell: em-dash and semicolon-join punctuation rejected (the tells that get
   people caught), plus prompt-level bans on "not just X but Y" constructions and
   rule-of-three parallelism.
4. Shape: exactly 3 replies, styles from the enum.

Failure → one stricter retry → hard 502. **A bad reply is never repaired into
compliance; it is discarded.** The user sees "try again," not manipulation with the
serial numbers filed off.

**The "why" layer:** each reply's tag maps to the taxonomy entry — explanation + real
citation (Gottman & Levenson; Aron et al. 1997; Bowlby/Ainsworth lineage; Cialdini;
Rogers-derived active listening). The taxonomy JSON is single-sourced from the backend
and CI-checked byte-identical in every client. No fabricated citations, structurally.

### 5.5 Teaching — the grading engine

The feature no competitor has, validated by its own design research (06-RESEARCH):

- User writes an attempt → judged at **temperature 0** on four dimensions, 1-5 each:
  warmth, specificity, reciprocity, naturalness.
- **Reasoning-before-score** enforced by response-schema property ordering (the
  LLM-as-judge variance reduction from the literature — the model must argue before it
  numbers).
- Feedback = per-dimension reasoning + one strength + one specific upgrade + a cited
  technique (`citedTag` must pass the same allowlist; grading feedback is gated exactly
  like generation — a grade that praises "push-pull" dies in validation).
- The attempt text is fenced as untrusted data ([ATTEMPT] block + injection-boundary
  reminder) — it is the most adversarial input the app accepts.
- **Anti-gaming, client-side, before any network call:** Jaccard trigram similarity ≥0.6
  against the shown suggestions = "that's one of mine 😉" → copy XP only, no grade. The
  grading LLM never receives a pasted suggestion as an "own attempt."

### 5.6 The fade — adaptive assistance (the anti-dependency core)

```
XP economy   : copy suggestion +5 · confirm "I sent this" +10 · own attempt
               +round(20 × grade/5 × 2) = 8..40 · date confirmed +100
Level curve  : cost(level n → n+1) = 100 + 50(n-1)
Cadence      : own-attempt gate fires every N assisted rounds,
               N = max(2, 5 − ⌊(level−1)/2⌋)      — 5 for beginners → 2 for skilled
Gate behavior: suggestions LOCK behind "you first this time"; write → get graded →
               explicit unlock ("now see what I'd send"). The grade stays on screen;
               the reveal is the user's choice, not an interruption.
```

The XP asymmetry is the ethics encoded as arithmetic: **the highest-XP action in the app
is doing it yourself; the highest single reward is meeting in real life.** Copying is
worth 5. The app literally cannot be speedrun by dependence. [NEXT §6 extends this into
a full graduation ladder with clinical grounding.]

### 5.7 The flywheel — ground truth and self-improvement

- **"I sent this"** (explicit, per reply) is the ground-truth event: records the sent
  text + style + timestamp on the thread, marks the round's injected persona facts as
  used (novelty decay input), and feeds style preference back into the user profile.
- **Date check-in:** a thread quiet ≥48h at momentum stage asks once — "did you two meet
  up?" → `met 🎉 (+100xp) | not yet | it fizzled`. Outcomes, not vibes.
- **[NEXT] Fact promotion:** score each used fact by next-turn signal delta
  (Δ mean(interest, reciprocity) attributed to the round it appeared in); promote facts
  that land, demote those that don't. The log already accumulates; this is the training
  set for a future reranker — the data asset that makes Banter compound while wrappers
  stay flat.
- Every event is user-keyed and dies with delete-everything. The flywheel is an asset,
  never a dossier.

### 5.8 Ground-truth validation

The full stack was audited against a real 393-screenshot, two-week conversation
(**CASE-STUDY-TAMSYN.md** — read it; it is the PRD's evidence base). Result: every
shipped mechanism appears organically in a successful real conversation (salient
callbacks, boundary-respect → trust deepening, affirmation matched to stated love
language, bit-building, pace mirroring), and the corpus exposed eight functions the
stack still needs (F1–F8, folded into §7). The case study also demonstrates the
productized form of our one-off revenue SKU (§9): a deep thread review is exactly this
document, generated on demand.

---

## 6. Framework Library v2 (the expanded science)

The taxonomy is the product's constitution: nothing ships uncited, nothing manipulative
ships at all. v1 carries six entries (Gottman turning-toward + repair, secure-base
framing, Aron reciprocal self-disclosure, reciprocity norm, reflective validation).
v2 additions, each operationalized and validator-checkable. *(Source basis: expert-panel
synthesis; entries marked (m) are memory-based pending citation verification before the
taxonomy JSON ships.)*

| Framework | Source | Text operationalization | Validator hook |
|---|---|---|---|
| **Active-Constructive Responding** | Gable et al., capitalization research (m) | When their last message contains good news, the reply celebrates actively + asks an expanding question. Passive/deflecting responses to good news are flagged in grading | Good-news detector on match messages → prefer/require ACR-tagged reply |
| **Five Secrets of Effective Communication** | David Burns, *Feeling Good Together* (m) | Disarming (find the truth in what they said), thought/feeling empathy, gentle inquiry, "I feel" statements, genuine affirmation — deployed in repair moments and hard conversations; designed FOR anxious communicators | Repair-moment detector → Five-Secrets technique preference |
| **Conversation-type matching** | Duhigg, *Supercommunicators* (m) | Classify each exchange: practical / emotional / social. THE new signal: mismatch (they're emotional, you're practical) is the most common silent conversation-killer | NEW read chip: conversation type + mismatch watch-out |
| **Observation vs evaluation** | Rosenberg, NVC (m) | Reply coaching prefers observations ("you went quiet this week") over evaluations ("you're distant") in friend/repair contexts | Evaluation-language detector in drafts |
| **Text prosody (the Vinh Giang adaptation)** | Giang's vocal-foundations system, adapted (m) | Spoken variety → **message rhythm variance**: vary length, drop the reflex question, let a beat land (the pause), lead with energy words when matching their spike. Directly fixes the uniform-polish AI-tell from the case study | Naturalness coach: cadence-variance scoring across a thread, not just per message |
| **Open loops (storytelling hooks)** | narrative practice, Giang/storytelling craft (m) | "I'll tell you that story later" is a promise and an asset. Teach deliberate loop-opening; track loops in the ledger; close them on dates | Open-loop ledger (§7.3) |
| **Record → review → refine** | Giang's core feedback loop | HIS insight, OUR engine: grading is the text version of recording yourself. v2 extends it to voice: rehearse your owned stories aloud pre-date | IRL Bridge rehearsal (§7.5) |

**Gate v2 additions** (beyond the banlist): frame classifier (prize-framing /
withholding — the case study's final-message drift), question-stacking detector (>1
question per turn), evaluation-language flag, good-news-passed-over flag. Each is a
validator rule, not a vibe.

**Learning-science mechanics** *(expert lane, (m))*: the own-attempt gate is the
**generation effect** applied (attempting before seeing answers beats studying answers);
XP asymmetry implements **desirable difficulty**; the Practice Gym (§7.6) runs
**spaced repetition** (intervals 1d → 3d → 7d → 14d per weak dimension) with
**interleaved** drill types so skills generalize instead of overfitting to one thread.
Goodhart guard: XP never attaches to message *volume* or sharing others' content — only
to attempts, sends, outcomes, and practice.

---

## 7. Feature roadmap v2 (ground-truth-derived: F1–F8 from the case study)

**7.1 Dual-persona engine + attribute buckets (F1).** The receiver persona grows the
"long list": `logistics` (work, roster, commute, location), `food` (the Tamsyn corpus
proves food alone can carry three sessions), `people & animals`, `interests`,
`values` (honesty norms, non-negotiables), `boundaries`, `humor register` (dry/absurd/
physical), `love-language signals` (stated or inferred-from-stated-only), `style`
(message length, emoji dialect, morning/night pattern), `open questions` (what you still
don't know — the app suggests what to be curious about next). NEW: the **user-self
persona** built from the user's own messages — the "who I am in chat" model that §7.5
trains toward. Same provenance rules both sides.

**7.2 Resonance map + bit tracker (F2).** Computed compatibility, never horoscope:
rare-trait locks weighted by population rarity (two non-drinkers > two music likers),
tension registry (tracked honestly, never hidden: kids, distance, pace), and
**couple-tokens** — recurring bits promoted to first-class objects with recurrence
counts. Ground truth: the hot-chocolate bit recurred 6+ sessions and became the date
container. Bits ARE the relationship's shared property; the map shows which are alive.

**7.3 Moment detection + open-loop ledger (F4).** Detectors for: boundary statements
(auto-add to persona, auto-warn on approach), trust gates (intent questions, dealbreaker
disclosures — coach shifts to honesty-first mode), misfires (their flag → recovery
coaching), and **open loops**: stories promised, plans seeded, games invented. The
ledger surfaces before a date: "you owe her the caffeine story; the accent game is
ready to play."

**7.4 Draft coach + frame classifier (F5).** Paste/type a draft → instant read BEFORE
sending: gate check, frame check, stacking check, tone-vs-their-state check. The case
study's decisive evidence: the user's own edit made his final message *worse* — the
warmer unsent draft would have scored higher. Cheapest feature, highest save-rate.

**7.5 IRL Bridge (F6 — the founder's feature).** The gap is not content, it's retrieval
under anxiety without a compose box. Components: **Readiness score** (facts recalled
cold × stories owned × loops ready ÷ assistance dependence), **Debt list** (claims and
promises made while assisted), **Fact quiz** (spaced, 5 cards/day — her order, Ruby,
Topaz, dad-cooks, off-Mondays), **Story rehearsal** (tell it aloud, 60–90s, record →
self-review; v2.1: transcribed + graded on the same rubric), **Date brief** (one
screen, 30 seconds: bits alive, loops to close, do-not-force list, their comfort
logistics). Rote learning the night before is exactly what this replaces.

**7.6 Practice Gym.** Daily 3-minute drill, generated from the user's OWN history:
replay a real moment (theirs, redacted) with a different constraint ("reply without
asking a question", "respond to good news", "repair this"), graded, spaced toward weak
dimensions. Streak feeds the existing system. This converts the app from
conversation-reactive to skill-proactive — and it is the subscription's daily-use spine.

**7.7 Authenticity meter (F7).** Per thread: % of sent messages that were assisted,
trending. The goal state is visible and celebrated: **the fade** (82% → 19% before the
date). This is the anti-dependency contract rendered as a chart — and per the growth
brief, the We-Met card prints it as marketing no competitor can copy.

**7.8 Growth artifacts (expert-panel spec, cached brief).** Three shareable cards, all
server-rendered (@vercel/og), all PII-redacted with preview-before-share: **The Read**
(gauge bars, stage badge, one redacted quote, verdict line), **Texting DNA** (radar +
archetype from a 12-entry table — "The Slow Burner" — rarity cue, 2 strengths + 1
growth edge, self-referential = zero consent risk), **We Met** (days-to-date, fade
sparkline, no receiver info at all). Referral: short code burned into pixels, /r/{code}
lands in a live demo read, XP rewards both sides (never cash — spam guard). Hard rules
from the brief: never fabricate conversations for content; never XP-reward sharing
other-party cards; explicit opt-in + human review before anything is featured.

**7.9 Friend & Reconnect mode.** The founder's second ask and the market's hidden half
(50% of category usage is non-dating): "we haven't talked in 8 months" flows —
low-pressure re-entry openers (no apology spirals), memory of the friendship's bits,
maintenance cadence suggestions. Same engine, different stage machine (no momentum
stage; the win is the meetup/call).

**Platform ladder (constraint honesty):** web cannot live-read other apps (the locked
iOS finding — same wall Grammarly hits). Ladder: PWA **share-target** (share a
screenshot to Banter from the OS sheet in one tap — near-live UX, zero platform risk)
→ desktop browser extension (true in-page assist for web chats) → mobile
keyboard/share extension (last, highest privacy stakes — Keys AI's reviews show the
trust cost).

---

## 8. Design language (the Wispr bar, codified)

Canonical tokens live in `web/DESIGN.md` (enforced in code via `@layer components`).
The PRD-level contract:

- **Scene:** in bed, 11 pm, phone, heart rate slightly up. Warm near-black
  (OKLCH coral-hue-tinted neutrals, never blue-black), one coral accent (#ff5c7a),
  bands never raw numbers, one primary action per screen.
- **Type:** Geist only; display 2.5rem/1.05 for the landing; lowercase section labels;
  65–75ch prose cap.
- **Motion:** 150–250ms ease-out-quart, state changes only. Signature moments — the
  scan shimmer while "reading the room," staggered reply reveal, the gate's lock/unlock,
  We-Met confetti (the single celebration in the app; scarcity keeps it meaningful).
- **Voice:** warm, direct friend; lowercase-leaning; never clinical, never bro; the
  walk-away card is the voice's proof ("Your call, no judgement").
- **Cards (share artifacts):** screenshot-native — 9:16 + 4:5, verdict readable at
  thumbnail size in <2s, brand + link burned into pixels, one curiosity gap.

---

## 9. Business model (solving the graduation paradox)

The paradox: our promise is "you'll need us less." Subscriptions monetize the opposite.
The market's answer ($5–7/WEEK, card-before-trial, silent renewal) produced the most
hated reviews in the category. Our answer — monetize the learning period honestly,
convert graduation into acquisition:

- **Free forever:** 3 coached reads + 3 graded attempts/day, 1 persona, full teaching
  content, full delete-everything. Teaching-free is the moat: the crutch apps charge
  for replies; we never charge for learning. (Also the funnel: free grading feeds DNA
  feeds share cards.)
- **Banter Plus — $9.99/mo or $59/yr.** Monthly, not weekly, cancel-anytime with a
  one-tap flow (the anti-Plug positioning is a feature). Unlimited reads/grades,
  unlimited personas, IRL Bridge, Practice Gym full, DNA history, priority.
- **One-off wedges (no subscription required):** **Deep Thread Review $9.99** — the
  productized case study (§5.8): full trajectory, both personas, resonance map,
  what-worked/what-to-fix, readiness plan. ROAST's $6.99–$97 tiers prove feedback is
  bought à la carte; ours is deeper than their top tier at a tenth the price.
  **Profile Roast $4.99** (reuses /api/extract-profile) — acquisition SKU.
- **The Fluent tier (graduation mechanic):** sustain >70% own-attempt ratio for 30 days
  → Plus price drops to $4.99/mo ("maintenance"), alumni badge, gift-a-month to a
  friend, invitation to be featured. Churn becomes advocacy; the We-Met/graduation
  loop (§7.8) turns leavers into the top of the funnel. LTV models the learning period
  (~4–8 months) not perpetuity — and the COGS fall with assistance fade, so the $4.99
  tier holds margin.
- **Unit economics (mark: memory-based pricing, verify current rates):** Gemini 2.5
  Flash ≈ $0.30/1M input, $2.50/1M output tokens → a coaching round (~3k in / 1k out)
  ≈ **$0.003–0.005**; OCR ≈ $0.002/screenshot; grading ≈ $0.002. A HEAVY user (20
  rounds/day) costs ~$2.50/mo; typical Plus user <$0.60/mo → **>90% gross margin** at
  $9.99. Free tier fully loaded costs <$0.15/user/mo — sustainable as pure funnel.
- **Funnel targets (growth brief, memory-based benchmarks to instrument):** landing →
  capture 35–45% · capture → read ≥85% · read → own attempt 40% (the teaching
  activation) · D7 15–18% · free → paid 3–5% · one-off converts 8–10% of
  non-subscribing readers · K ≈ 0.4–0.6 from artifacts (halves blended CAC; K>1 is
  not the plan).

---

## 10. Metrics (what we optimize, in order)

1. **Time-to-first-read** ≤ 60s from landing (activation event; instrument as "aha").
2. **Teach-through rate**: own attempts ÷ (attempts + copies + sends). North-star for
   the mission. Target 40% of readers write ≥1 attempt in session one.
3. **The fade curve**: median assisted% per user-week, downward = product working.
   (The only company in the category whose success metric slopes down.)
4. **Outcomes**: dates/meetups confirmed per WAU; walk-away acceptance rate (did they
   stop investing in dead threads — trust metric).
5. **Retention**: D7/D30 with the gym as the daily spine; graduation rate (Fluent-tier
   entries) tracked as a WIN alongside churn.
6. **Loop health**: cards rendered → shared/saved → ref clicks → captures (K per §9).
7. **Gate integrity**: % generations rejected by validator (quality canary), zero
   uncited techniques shipped (invariant, not a metric).

---

## 11. Go-to-market (growth brief, condensed)

- **Positioning:** "The coach that fires itself." Founder story as pillar one — an
  introvert with social anxiety who got so AI-dependent his own skills eroded, building
  the anti-Rizz. Voiceover-over-product formats (no face needed; batch-recordable —
  designed for an anxious founder to actually sustain).
- **Content:** real product output ONLY (the UI is the content) — real redacted reads
  with consent, synthetic threads labeled demo. Five pillars: real reads · founder POV ·
  60-second psychology (Gottman bids et al.) · graduation stories · anti-PUA reactions
  (the validator banning negging on screen). Never one fabricated conversation: the
  ethics moat IS the business.
- **Community:** go where anxious introverts already are (r/socialanxiety,
  r/socialskills, r/texts) — 60 days of value-first founder participation before any
  link; own Discord later, anonymous-first, async-only, lurker-safe.
- **Wedges:** Profile Roast SEO + the Deep Thread Review as the "wow" purchase.

---

## 12. Risks & ethics (named, with owners in the design)

| Risk | Mitigation (built, not promised) |
|---|---|
| Product deepens dependency instead of breaking it | Fade mechanics + gym + authenticity meter; the fade curve is a public company metric; XP never rewards volume |
| "Catfished by competence" — chat-self outruns real-self | Adaptive assist ceiling + IRL Bridge + readiness score; the case study is the design brief |
| Share cards leak someone's words | Default redaction, preview-before-share, one quote max, self-referential cards preferred, no XP for sharing thread cards |
| Other-party privacy at capture | In-memory screenshots, own-words facts only, sensitive blocklist, delete-everything; never enrichment |
| Paywall rage (category norm) | Monthly not weekly, no card-before-value, one-tap cancel, teaching free forever |
| TikTok moderation of dating-AI content | Communication-skills framing, multi-account, zero PUA-coded hooks (also our own gate) |
| Gemini single-vendor | LLMProvider adapter interface already isolates the vendor; schema dialects deliberately not shared |
| Anxious-founder marketing sustainability | Faceless formats, batch recording, pillar kit pre-scripted |
| Fabrication temptation as growth pressure rises | Hard rule in this PRD: one exposed fake ends the moat. Not negotiable at any view count |

---

## 13. Release plan

**Shipped (live at banter-tau.vercel.app):** engine + gate (56 tests) · capture/OCR ·
signal read + stages + pace · grading + XP + gate cadence · personas + salience ·
openers · threads · walk-away · date check-in · auto-demo onboarding · PWA · design
system · DNA radar + streak (22 web tests).

- **R1 — Loop (growth):** The Read + DNA + We-Met cards, referral plumbing, consent
  gate, PostHog funnel. *(Everything in §7.8; @vercel/og; ~1 wk of build.)*
- **R2 — Bridge (the founder's release):** open-loop ledger, debt list, fact quiz
  (spaced), date brief, readiness score, draft coach + frame classifier.
- **R3 — Depth:** dual-persona buckets + user-self persona, resonance map + bit
  tracker, conversation-type signal (Duhigg), Framework Library v2 in the taxonomy
  (citations verified before ship), Practice Gym v1.
- **R4 — Accounts & revenue:** Supabase auth + Postgres sync (all stores are row-ready),
  Plus subscription + Deep Thread Review SKU, Fluent tier mechanics.
- **R5 — Reach:** PWA share-target, Friend/Reconnect mode, desktop extension spike.

Each release ships behind the same invariants: gate on every generation, provenance on
every fact, the fade as the success metric. **The product wins when the user stops
needing it — and tells someone why.**

*— end of PRD v1.0 —*
