# Intent: Persona Engine + Openers (confirmed 2026-07-10)

Confirmed via interview (Kish, explicit yes). This is the statement of intent; build docs
and code cite this file.

## Outcome

Banter goes from per-conversation tool to relationship-aware coach: openers from a
profile screenshot, persistent receiver personas the user picks when starting/continuing
a chat, hyper-personal suggestions with reasoning, and forced own-reply coaching moments
that are scored. Coaching reads the rhythm: who replies fast, who's cooling, whether now
is the right time to send.

## User

Dating-first. Relationship type (date / friend / business) is a persona-level context
tag from day one steering tone; business gets a shallow tone tag only in v1 (the
Gottman/Aron taxonomy is relationship science and does not transfer — no fake depth).

## Success

A returning user picks "Sarah," pastes a new screenshot, and suggestions naturally call
back things Sarah actually said weeks ago, without re-explaining. The user is
periodically made to write their own reply first and is scored on it. The coaching
reads pace and timing, and treats **a secured date as the win condition**.

## The Persona Engine (framework)

1. **Facts with metadata**: type (interest/dislike/story/inside-joke/boundary/logistics/hook),
   exact source quote (provenance = anti-fabrication), source (conversation/profile/manual),
   recency, times-used, confidence. Auto-extracted post-import via schema-enforced pass;
   low-confidence = suggested, user accepts/edits (add/edit surface is first-class).
2. **Salience scoring at retrieval**: relevance to last messages × recency decay ×
   novelty penalty (heavily bury already-used facts) × stage-appropriateness. Top 3-5
   injected with quotes. Never the whole persona.
3. **Stage machine**: opening → rapport → depth → momentum, from message count + signal
   trajectory. Gates fact types, techniques, and coach-mode cadence.
4. **Callback ledger (flywheel)**: track fact → used-in-sent-reply → next-turn signal
   delta. Promote/demote facts. Log everything: this is the future training set and the
   monetizable asset. NO model training now.

## Hard constraints (Kish chose the strict option on the record)

- **Strict provenance**: persona facts come ONLY from in-app conversations, uploaded
  profile screenshots, and the user's own manual edits. No external enrichment.
- Persona always **visible and editable** by the user (the briefing surface doubles as
  the transparency mechanism).
- **Sensitive-inference blocklist** at extraction: never store inferred religion, health,
  orientation, ethnicity, politics, finances — even when inferable.
- User-keyed; **delete-everything wipes personas too**. Device-local (localStorage) this
  build, same as threads.
- Taxonomy gate on ALL generation, including openers and any timing advice.
- **Timing rule**: mirror their energy; NEVER advise manufacturing distance ("wait 3
  hours to seem busy" = scarcity, banned). Pace advice preserves authenticity.
- **Banded signal reads** (low/warming/strong), not raw precision; every low read ships
  with a next action, never a bare verdict.
- **Adaptive assist**: assistance visibly fades as demonstrated skill (XP/grades) rises.
- **Walk-away** is a first-class recommendation when trajectory says so.
- **Outcome check-ins**: quiet thread at momentum stage → "did you two meet up?" →
  jackpot XP. We optimize for dates, not thread length.

## Timing (two capabilities)

1. Message-gap signals: optional timestamps from imports → per-side latency, trend,
   double-text detection → watch-outs + prompt context + flywheel dimension.
2. Send-time awareness: client clock tints suggestions/watch-outs (the 1am note).
   No push notifications / "text her now" nudges — out of scope.

## Out of scope (this build)

Payment/paywall mechanics (log flywheel data, gate later), model training (log now,
train later), auth/cloud sync, push notifications, deep business-context coaching.

## Build order

1. Backend: additive personaFacts + pace context + timing gate rule (extend, never rewrite)
2. Persona store + salience + fact extraction + persona UI
3. Opener flow (engine's COAC-07 path already exists; OCR + UI is new)
4. Timing signals end-to-end
5. Stage machine + cadence + banded reads + walk-away + check-ins
6. Verify, deploy (Supabase + Vercel), handoff
