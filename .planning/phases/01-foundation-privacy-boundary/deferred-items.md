# Deferred Items — Phase 1

Out-of-scope discoveries logged during plan execution (not fixed — pre-existing, unrelated to the current task's changes).

## From Plan 01-01

- **`gsd-tools state update-progress` percent field not persisting to STATE.md**: The command's JSON response correctly reports `percent: 25` (1/4 plans complete), but the STATE.md frontmatter's `progress.percent` field and the body's `Progress: [...] X%` bar both remain at `0%` after running the command (verified via two separate invocations). This is a pre-existing behavior in the `gsd-tools` `state.cjs` handler, unrelated to any change made in 01-01-PLAN.md (git repo split + GitHub remote creation). Not fixed here — out of scope per the executor's scope-boundary rule. Flag for a future gsd-tools maintenance pass if the discrepancy persists across subsequent plan completions.
