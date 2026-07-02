---
phase: 01-foundation-privacy-boundary
plan: 01
subsystem: infra
tags: [git, github, xcodegen, gitignore, ci-prerequisite]

# Dependency graph
requires: []
provides:
  - Independent git repository at banter/ (own .git, no longer absorbed into the nexdo-timekeeper-web monorepo)
  - Dedicated private GitHub repo kish-jpg/banter with origin remote and first push landed
  - Xcode/SPM .gitignore (build artifacts + generated .xcodeproj + research cache excluded)
affects: [01-foundation-privacy-boundary (plans 02-04), all future CI workflow phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dedicated nested repo pattern (mirrors sibling FocusForge): app folder stays at its current filesystem location inside Nex_Doc, but is version-controlled as its own independent git repo with its own GitHub remote — directory nesting and git-repo boundaries are orthogonal."
    - "Generated .xcodeproj is treated as a build artifact (gitignored), not committed — XcodeGen regenerates it from project.yml in CI."

key-files:
  created:
    - banter/.gitignore
    - banter/.git/ (independent repository, root commit 5d196ab)
  modified: []

key-decisions:
  - "Created kish-jpg/banter as PRIVATE (not public) — commercial product with future proprietary backend logic, despite the 10x GitHub Actions macOS-runner minutes cost noted in RESEARCH.md."
  - "Also gitignored .planning/research/.cache/ (regeneratable web-fetch cache, ~47K of hashed JSON blobs) — not explicitly named in the plan's action step but excluded per Rule 2 to keep the first commit limited to real source-of-truth planning docs."
  - ".planning/ GSD scaffolding committed into the new dedicated repo alongside the code it will describe, per RESEARCH.md Git Topology recommendation (option 1, not the split-across-two-repos alternative)."

patterns-established:
  - "Task commits use `feat(01-01): ...` scoped to phase-plan; this convention should continue for remaining Phase 1 plans."

requirements-completed: []

coverage:
  - id: D1
    description: "banter/ is an independent git repository with its own .git, separate from the nexdo-timekeeper-web monorepo"
    verification:
      - kind: other
        ref: "git -C banter rev-parse --show-toplevel resolves to banter/ itself (not the monorepo root)"
        status: pass
    human_judgment: false
  - id: D2
    description: "origin remote points at the dedicated kish-jpg/banter GitHub repo (private), not nexdo-timekeeper-web, with the first push landed"
    verification:
      - kind: other
        ref: "git remote -v shows origin -> https://github.com/kish-jpg/banter.git; git ls-remote origin shows refs/heads/main == local HEAD (5d196ab); gh repo view kish-jpg/banter --json isPrivate returns true"
        status: pass
    human_judgment: false
  - id: D3
    description: "Xcode/SPM build artifacts (.build/, DerivedData/, generated .xcodeproj) are gitignored"
    verification:
      - kind: other
        ref: "grep -q 'Banter.xcodeproj/' banter/.gitignore; grep -q '.build/' banter/.gitignore; grep -q 'DerivedData/' banter/.gitignore"
        status: pass
    human_judgment: false

duration: 4min
completed: 2026-07-02
status: complete
---

# Phase 1 Plan 1: Foundation & Privacy Boundary — Git Split & GitHub Repo Summary

**banter/ split into its own independent git repo with a dedicated private GitHub remote (kish-jpg/banter), root commit pushed to origin/main, Xcode/SPM .gitignore in place**

## Performance

- **Duration:** 4 min
- **Started:** 2026-07-02T21:42:48Z
- **Completed:** 2026-07-02T21:46:36Z
- **Tasks:** 2 (1 auto, 1 checkpoint:human-verify resolved via pre-authenticated `gh`)
- **Files modified:** 1 created (.gitignore); 17 GSD planning docs carried into the new repo's root commit

## Accomplishments
- `banter/` is now an independent git repository (own `.git`, branch `main`) — no longer absorbed into the parent `nexdo-timekeeper-web` monorepo history
- Created dedicated private GitHub repo `kish-jpg/banter` and pushed the root commit; `origin` confirmed pointing at the correct dedicated repo (not the unrelated monorepo)
- `.gitignore` in place excluding Xcode/SPM build artifacts and the CI-regenerated `Banter.xcodeproj/`
- This unblocks all subsequent Phase 1 plans (BanterShared package, XcodeGen project, CI workflow) — CI cannot exist without a GitHub-hosted repo

## Task Commits

Each task was committed atomically:

1. **Task 1: Initialize independent git repo and gitignore** - `5d196ab` (feat) — root commit; `git init`, `git branch -M main`, `.gitignore` created, `.planning/` GSD scaffolding brought into the new repo

**Task 2 (checkpoint:human-verify, gate="blocking-human"): Create dedicated GitHub repo and push** — resolved without a user pause. Per the orchestrator's `<environment_facts>`, `gh` was already authenticated as `kish-jpg` (verified via `gh auth status`) and the user had pre-approved creation of `kish-jpg/banter` as PRIVATE. Executed `gh repo create kish-jpg/banter --private --source=banter --remote=origin --push` directly, then independently re-verified all three checkpoint confirmation steps from the plan (`git remote -v`, `git ls-remote origin`, `gh repo view --json isPrivate`) before considering the task done. No new commit — this task only wires the remote and pushes the existing root commit.

**Plan metadata:** (pending — see final commit below)

_Note: no TDD tasks in this plan; both tasks are infra/repo-setup, no test commits applicable._

## Files Created/Modified
- `banter/.gitignore` - Xcode/SPM build-artifact ignores (`.build/`, `DerivedData/`, `*.xcuserstate`, `.DS_Store`, `xcuserdata/`, `Banter.xcodeproj/`) plus `.planning/research/.cache/` (regeneratable research cache)
- `banter/.git/` - new independent repository, root commit `5d196ab` on branch `main`, tracking `origin/main`
- 17 pre-existing `.planning/` files (PROJECT.md, ROADMAP.md, REQUIREMENTS.md, STATE.md, config.json, phase docs, research docs) — carried into the new repo's history as part of the root commit, per RESEARCH.md's recommendation to move planning docs into the dedicated repo alongside the code they describe

## Decisions Made
- **Private repo, accepting the 10x Actions-minutes cost**: RESEARCH.md flagged public-vs-private as an open cost tradeoff (public repos get free/unlimited Actions minutes). Chose private per the plan's explicit instruction and the user's pre-approval — Banter is a commercial product that will eventually contain proprietary backend logic; the minutes cost is accepted now rather than revisited later when converting a repo's visibility mid-project is disruptive.
- **Excluded `.planning/research/.cache/` from the first commit** (Rule 2 — auto-add missing correctness item): this directory holds ~47K of hashed JSON blobs from the research phase's web-fetch cache. It wasn't named in the plan's literal gitignore list, but committing ephemeral, regeneratable API-response cache into a fresh repo's root commit would pollute history for no benefit. Added one line to `.gitignore`; did not otherwise touch cache contents.
- **`.gitignore` LF line endings under Windows autocrlf**: git printed benign CRLF-conversion warnings on `git add` (all 18 files) — expected Windows behavior, no action needed, contents are correct on disk.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added `.planning/research/.cache/` to .gitignore**
- **Found during:** Task 1 (pre-commit `git status` review)
- **Issue:** The plan's literal `.gitignore` action step named only Xcode/SPM ignores (`.build/`, `DerivedData/`, `*.xcuserstate`, `.DS_Store`, `xcuserdata/`, `Banter.xcodeproj/`). Inspecting untracked files before staging revealed `.planning/research/.cache/` — a directory of hashed research web-fetch cache blobs, already untracked in the outer monorepo (for unrelated reasons — no matching gitignore rule was found there either) — that would otherwise land in the new repo's first commit.
- **Fix:** Added one line (`.planning/research/.cache/`) to the new `.gitignore` alongside the Xcode/SPM rules.
- **Files modified:** `banter/.gitignore`
- **Verification:** `git status --short` after `git add` confirmed no `.cache/` entries staged; Task 1's automated verify command (`grep -q 'Banter.xcodeproj/' banter/.gitignore`) re-ran and still passed after the addition.
- **Committed in:** `5d196ab` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing-critical gitignore addition)
**Impact on plan:** Zero scope creep — the addition only prevents ephemeral cache blobs from polluting the new repo's git history. All plan-specified acceptance criteria (Xcode/SPM ignores present, `Banter.xcodeproj/` ignored, no folder move) verified unchanged.

## Issues Encountered

None. Both tasks completed without blockers. The checkpoint (Task 2) did not require a user pause because the orchestrator's `<environment_facts>` supplied everything the checkpoint exists to obtain: pre-verified `gh auth status` (logged in as `kish-jpg`, scopes `gist, read:org, repo, workflow`) and explicit pre-approval of the exact repo name/owner/visibility (`banter`, `kish-jpg`, private). All three of the checkpoint's own `how-to-verify` confirmation commands were run and passed after the push, satisfying the checkpoint's substance even though no interactive user response was solicited.

## User Setup Required

None — GitHub auth was pre-verified and the repo was pre-approved by the user (per orchestrator `<environment_facts>`); no further manual dashboard configuration is needed for this plan.

## Next Phase Readiness

- `banter/` is now a fully independent, GitHub-hosted private repo — the blocking prerequisite for all Phase 1 CI (BanterShared package, XcodeGen `project.yml`, `.github/workflows/ci.yml`) is satisfied.
- Next plan(s) in this phase can safely add CI workflow files and app/keyboard/shared-package source, knowing pushes land in `kish-jpg/banter` and never touch the unrelated `nexdo-timekeeper-web` monorepo.
- No blockers or concerns carried forward from this plan.

---
*Phase: 01-foundation-privacy-boundary*
*Completed: 2026-07-02*
