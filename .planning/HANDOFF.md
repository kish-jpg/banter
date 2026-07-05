# Banter — Session Handoff (written 2026-07-05)

> **UPDATE 2026-07-05 (later session):** Phase 4 is now CLOSED — gap plans 04-06/04-07 wired the monetization + conversation-health surfaces, re-verification passed 5/5, everything is pushed, and CI is green (run 28740477670 after 4 fix-forward iterations). The "Resume exactly here" steps 1–4 below are DONE. Resume at step 5: `/gsd:plan-phase 5` (Keyboard Extension). All locked decisions, invariants, environment facts, and subagent boilerplate below remain current.

**Audience:** a fresh Claude Code session on a different account, picking up mid-Phase-4.
**Read this file first, then STATE.md, then follow "Resume exactly here" below.**

## Project in one paragraph

Banter is an iOS AI dating-conversation coach (companion app + keyboard extension), GSD-managed (`gsd-core` plugin). 8-phase roadmap in `.planning/ROADMAP.md`. Phases 1–3 complete and verified. Phase 4 (Companion App UI & Paywall) is executed but **not closed**: verification returned `gaps_found` (3/5 must-haves). Your job is to close the Phase 4 gaps, get the phase verified, then continue Phases 5–8 through the normal GSD loop.

## Where things live

- Project root (a NESTED git repo inside an outer worktree): `C:\Users\Nexdo\Nex_Doc\20-29 Projects\.claude\worktrees\beautiful-gould-3cb355\banter`
- **Critical for subagents:** always `cd` to that path first and run all git/gsd commands from it. `git rev-parse --show-toplevel` from the session cwd resolves to the WRONG outer repo. Pass the absolute path into every executor/verifier prompt (see "Subagent prompt boilerplate" below).
- gsd-tools shim: `node "$HOME/.claude/gsd-core/bin/gsd-tools.cjs" <args>` (run from project root).
- Remote: `kish-jpg/banter` (private). **Nothing from Phase 4 has been pushed — CI has never compiled any Phase 4 Swift code.**

## Environment facts (they shape every step)

- Windows host, Git Bash available. **No local Swift toolchain.** All Swift compile/test proof is CI-deferred (GitHub Actions macOS). Local verification is grep/structural — this is the established precedent from Phases 1–4; don't fight it.
- Deno 2.9.1 is installed: `deno test Backend/` runs the backend suite locally (40/40 green at handoff).
- GSD worktree isolation auto-degrades to sequential here (`worktree.base-check` → `fork-ref-unknown`); executors run sequentially on the main tree. This is normal.
- GSD config: models researcher=sonnet / planner=opus / checker=haiku / executor=sonnet / verifier=sonnet; commit_docs=true; auto-advance off (checkpoints go to the human).

## Phase 4 state at handoff

All 5 plans executed (5/5 SUMMARYs exist), code review done (21 findings), fixer applied 15/15 Critical+Warning fixes, verifier ran:

- **VERIFICATION status: `gaps_found` (3/5)** — see `.planning/phases/04-companion-app-ui-paywall/04-VERIFICATION.md` (structured gaps in frontmatter).
- **Gap 1 (SC4, MONE-01/02/03):** `PaywallView`, `EntitlementManager`, `DailyCapTracker`, `DowngradeBanner` are built + unit-tested but have ZERO production call sites. `CoachingResultModel.capGate`/`onAnalysisRecorded` are never injected. Pure wiring work.
- **Gap 2 (SC3, CALC-02):** `SentimentTimelineStore.append` never called; `ConversationHealthView` never presented. Same wiring shape.
- What verifiably works end-to-end: onboarding value-before-paywall (ONBD-01/02), tone picker + tag explainers (COAC-02/04), backend suite, taxonomy drift guard.
- Also read: `04-REVIEW.md`, `04-REVIEW-FIX.md`, `deferred-items.md` (WR-02 deferral that the verifier confirmed).

## Locked decisions — do not re-ask, do not violate

1. RevenueCat/purchases-ios pinned `from: "5.80.2"` — human-approved supply-chain add (recorded in commit 5fff379 body).
2. Entitlement id `premium`; weekly product id `com.banter.premium.weekly` (in `Banter.storekit`).
3. Free-tier daily cap **N = 3**/day, date-based reset; **tags always visible at cap** (MONE-01).
4. Reverse trial **14 days**, graceful downgrade to free (MONE-02).
5. **StoreKit-config-only testing for now** — RevenueCat SDK key is a deferred placeholder (`RC_PUBLIC_SDK_KEY_PLACEHOLDER` sentinel); do not invent a key.
6. RevenueCat v5 API (verified against live docs): `try await Purchases.shared.customerInfo()`, `entitlements["premium"]?.isActive == true`; intro eligibility via `checkTrialOrIntroDiscountEligibility(product:)` → `.status`.

## Invariants (grep-guarded; any new wiring must preserve them)

- CAPT-04: `CoachingClient` sends structured-text DTOs only; no image bytes, no secrets in source.
- ONBD-01: onboarding demo-path files contain **zero** `EntitlementManager`/`DailyCapTracker` code references — the cap gate applies to the post-onboarding flow only.
- MONE-01: no tier branch around psychology-tag rendering, ever.
- CALC-03: `SentimentTimelineStore` keyed by conversationId only — no match-identity keys (negative structural test enforces).
- No `$<digit>` price literal in Swift source — price comes from StoreKit/RevenueCat at runtime (grep guard).

## Resume exactly here

1. `/gsd:plan-phase 4 --gaps` — reads 04-VERIFICATION.md, creates gap-closure plans (`gap_closure: true`). Expect 1–2 small wiring plans.
2. `/gsd:execute-phase 4 --gaps-only` — executes them.
3. Verifier re-runs automatically at the end of step 2; goal is `status: passed`, which auto-marks the phase complete (roadmap/state/requirements updates are handled by the workflow).
4. **Push and watch CI** (`git push` from the banter repo; check the GitHub Actions run). Phase 4 Swift has never compiled anywhere — expect possible CI fixups (the review flagged WR-04/09/10 concurrency/isolation changes as needing CI confirmation). Treat a red CI as a gap: fix, commit, re-push.
5. Then continue the roadmap: `/gsd:plan-phase 5` (Keyboard Extension — UI hint yes, so the ui-phase gate will fire) → execute → verify. Same for 6 (Profile/XP/Grading), 7 (Privacy Hardening), 8 (Metrics & Launch).

## Process conventions this project has used (keep them)

- No discuss-phase / no CONTEXT.md (phases 1–4 all planned from research + requirements — choose "Continue without context" at the gate).
- Research: yes, before planning every phase.
- UI phases (5, 6): run `/gsd:ui-phase <N>` (or accept the blocking UI gate's recommendation) to produce `<NN>-UI-SPEC.md` before planning; Phase 2's `02-UI-SPEC.md` tokens are locked — extend, never contradict.
- Checkpoints marked `autonomous: false` (supply-chain adds, pricing/config) must go to the human — never self-approve.
- Executors verify via grep locally and defer compile proof to CI; every SUMMARY notes this.

## Subagent prompt boilerplate (paste into every executor/verifier spawn)

> **PROJECT ROOT (critical):** `C:\Users\Nexdo\Nex_Doc\20-29 Projects\.claude\worktrees\beautiful-gould-3cb355\banter` — NESTED git repository inside an outer worktree. cd here FIRST; run ALL git/test/gsd-tools commands from here. Do NOT use `git rev-parse --show-toplevel` from your starting cwd. Windows host, no Swift toolchain — grep-based verification locally, compile proof deferred to CI.

## Known open items beyond Phase 4

- REQUIREMENTS.md header says 27 v1 requirements but lists 32 (tracked in STATE.md blockers — reconcile someday).
- Phase 8 note: ROADMAP cites App Store guideline 4.5.4 for AI transparency; research suggests 5.1.2(i) (Nov 2025) is the current cite — re-verify at Phase 8.
- Own-attempt LLM grading (Phase 6) needs a prompt-engineering spike with real attempts.
- `DailyCapTrackerTests` previously wrote real UserDefaults; fixed with teardown (WR-07) — keep tests hermetic.
