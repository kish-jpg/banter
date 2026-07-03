---
phase: 03-backend-llm-orchestration
plan: 02
subsystem: api
tags: [deno, gemini, prompt-engineering, provider-abstraction, structured-output, anti-ai-tell]

# Dependency graph
requires:
  - "Backend/functions/coaching/taxonomy.ts (03-01) - allowedTagNames()/allowed[] source for prompt injection"
  - "Backend/functions/coaching/validate.ts (03-01) - the post-generation gate this prompt is defense-in-depth for"
provides:
  - "Backend/functions/coaching/llm/LLMProvider.ts - locked CoachingRequest/CoachingResponse/OpenerRequest types + LLMProvider interface (generateCoaching, generateOpeners)"
  - "Backend/functions/coaching/promptAssembly.ts - buildSystemInstruction(), formatTranscript()"
  - "Backend/functions/coaching/llm/schema.ts - COACHING_RESPONSE_SCHEMA, OPENER_RESPONSE_SCHEMA (Gemini-dialect only)"
  - "Backend/functions/coaching/llm/GeminiAdapter.ts - GeminiAdapter class implementing LLMProvider, mocked-fetch tested"
affects: [03-03-edge-function-and-ci]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Provider-abstracted LLMProvider interface - index.ts (03-03) will depend only on this interface, never on GeminiAdapter directly (D-03 swap seam)"
    - "Gemini schema dialect kept local to schema.ts, imported only by GeminiAdapter - a future Claude/OpenAI adapter would own its own schema translation (RESEARCH Pitfall 3)"
    - "Anti-AI-tell directives phrased to avoid literally embedding banned punctuation/phrases in the prompt text itself, so promptAssembly.ts never trips validate.ts's own negative greps"

key-files:
  created:
    - Backend/functions/coaching/llm/LLMProvider.ts
    - Backend/functions/coaching/promptAssembly.ts
    - Backend/functions/coaching/llm/schema.ts
    - Backend/functions/coaching/llm/GeminiAdapter.ts
    - Backend/tests/promptAssembly.test.ts
    - Backend/tests/GeminiAdapter.test.ts
  modified: []

key-decisions:
  - "CoachingResponse.replies has NO confidence field, matching Swift ReplySuggestion.swift exactly (text/psychologyTag/style only) - confirmed for 03-03's shared fixture author."
  - "sentiment.factors is a fixed-key object {interest, reciprocity, warmth, responsiveness}, NOT Record<string, number> - locked per the plan's exact signature."
  - "Anti-AI-tell directives in buildSystemInstruction describe the banned constructions (e.g. 'the horizontal dash punctuation mark') rather than quoting them literally, so the prompt-assembly source file itself never contains an em dash or semicolon that would trip validate.ts's negative-grep checks if ever cross-scanned."
  - "Did not run requirements.mark-complete for COAC-01/COAC-03/COAC-05/CALC-01 in this plan - 03-03's PLAN.md frontmatter claims the same requirement IDs (it wires validate.ts into an actual HTTP response), so marking complete here would be premature. Deferred to 03-03's completion."

requirements-completed: []

coverage:
  - id: D1
    description: "A single mocked Gemini generateContent call returns exactly 3 replies (locked shape, no confidence) plus a locked-shape sentiment object"
    requirement: "COAC-01, COAC-03, CALC-01"
    verification:
      - kind: unit
        ref: "Backend/tests/GeminiAdapter.test.ts (generateCoaching resolves to exactly 3 replies + sentiment)"
        status: pass
    human_judgment: false
  - id: D2
    description: "System instruction injects only allowlisted tag names and states 5 anti-AI-tell directives without embedding banned punctuation/phrases literally"
    requirement: "COAC-05"
    verification:
      - kind: unit
        ref: "Backend/tests/promptAssembly.test.ts (allowlist-only injection + 5-directive assertions)"
        status: pass
    human_judgment: false
  - id: D3
    description: "GeminiAdapter implements LLMProvider - the sole interface a future caller (index.ts, 03-03) depends on"
    requirement: "D-03 (provider swap seam)"
    verification:
      - kind: other
        ref: "deno check Backend/functions/coaching/llm/GeminiAdapter.ts (implements LLMProvider, compiles clean)"
        status: pass
    human_judgment: false
  - id: D4
    description: "responseSchema mechanically forces minItems=maxItems=3 on the replies/openers arrays"
    requirement: "COAC-01"
    verification:
      - kind: unit
        ref: "Backend/tests/GeminiAdapter.test.ts (asserts responseSchema.properties.replies.minItems/maxItems === 3)"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-07-03
status: complete
---

# Phase 3 Plan 2: Prompt Assembly + LLMProvider Interface + GeminiAdapter Summary

**A single mocked Gemini generateContent call returns exactly 3 tagged replies + a locked-shape sentiment object, reached only through a provider-abstracted LLMProvider interface, with the system instruction injecting exclusively allowlisted psychology tags plus five anti-AI-tell directives - 23/23 Deno tests passing locally, zero real network calls.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-03T21:11:29Z
- **Completed:** 2026-07-03T21:19:01Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- `LLMProvider.ts`: locked `CoachingRequest`/`CoachingResponse`/`OpenerRequest` TypeScript types matching the plan's exact signatures - `replies` carry `text`/`psychologyTag`/`style` with NO `confidence` field (verified against `ReplySuggestion.swift`), `sentiment.factors` is a fixed-key object (`interest`/`reciprocity`/`warmth`/`responsiveness`), never `Record<string, number>`
- `promptAssembly.ts`: `buildSystemInstruction()` injects only allowlisted tag names + explanations from `taxonomy.ts`, then states 5 anti-AI-tell directives (em dash, semicolon-join, "not just X but Y", rule-of-three, edited-not-copied) mirroring the 03-01 validator's checks one-for-one, phrased to never embed the literal banned punctuation/phrase in the prompt text itself; `formatTranscript()` sorts by `order` and emits `You:`/`Match:` prefixed lines
- `llm/schema.ts`: `COACHING_RESPONSE_SCHEMA`/`OPENER_RESPONSE_SCHEMA` as Gemini-dialect schema objects (`minItems`/`maxItems: 3` on the replies/openers arrays, `propertyOrdering` hints, no `confidence` property), explicitly annotated as Gemini-only and imported solely by `GeminiAdapter.ts`
- `llm/GeminiAdapter.ts`: `GeminiAdapter` class implementing `LLMProvider`, model pinned to `gemini-2.5-flash` as a const, `generateCoaching`/`generateOpeners` POST to the Gemini REST endpoint with `responseMimeType: "application/json"` + the schema, throw on non-ok response, extract `candidates[0].content.parts[0].text` and `JSON.parse`
- Both test files (`promptAssembly.test.ts`, `GeminiAdapter.test.ts`) pass with zero real network calls - `GeminiAdapter.test.ts` reassigns `globalThis.fetch` to a mock in every test and restores it in a `finally` block
- Full backend suite: 23/23 tests passing (`taxonomy.test.ts` 5, `validate.test.ts` 7, `promptAssembly.test.ts` 5, `GeminiAdapter.test.ts` 6)

## Task Commits

Each task was committed atomically:

1. **Task 1: Prompt assembly + provider types** - `e1b0642` (feat)
2. **Task 2: Gemini responseSchema + GeminiAdapter** - `5bb53d5` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified
- `Backend/functions/coaching/llm/LLMProvider.ts` - locked provider types + `LLMProvider` interface
- `Backend/functions/coaching/promptAssembly.ts` - `buildSystemInstruction()`, `formatTranscript()`
- `Backend/functions/coaching/llm/schema.ts` - `COACHING_RESPONSE_SCHEMA`, `OPENER_RESPONSE_SCHEMA`
- `Backend/functions/coaching/llm/GeminiAdapter.ts` - `GeminiAdapter` class, model pinned to `gemini-2.5-flash`
- `Backend/tests/promptAssembly.test.ts` - 5 Deno.test() cases
- `Backend/tests/GeminiAdapter.test.ts` - 6 Deno.test() cases, mocked `globalThis.fetch`

## Resolved Contract for 03-03's Fixture Author

`CoachingResponse` field set is confirmed as:
```typescript
{
  replies: { text: string; psychologyTag: string; style: "playful" | "sincere" | "witty" | "direct" }[]; // NO confidence field
  sentiment: {
    score: number;
    factors: { interest: number; reciprocity: number; warmth: number; responsiveness: number }; // fixed keys, not Record<string, number>
    signal: string;
  };
}
```
This matches `ReplySuggestion.swift` (`text`/`psychologyTag`/`style`, no `confidence`) exactly. 03-03's shared fixture (`Backend/tests/fixtures/coaching-response.sample.json`) and Swift contract test should target this exact shape.

## Decisions Made
- Anti-AI-tell directives in `buildSystemInstruction` are phrased descriptively (e.g., "the horizontal dash punctuation mark that joins two clauses") rather than quoting the banned em dash/semicolon characters literally in the instruction string - keeps `promptAssembly.ts`'s own source clean of the exact punctuation `validate.ts` greps for downstream, per the plan's explicit instruction.
- `requirements.mark-complete` was NOT run for COAC-01/COAC-03/COAC-05/CALC-01 in this plan. 03-03's own `PLAN.md` frontmatter claims the identical requirement set (it's the plan that wires `validate.ts` into the actual HTTP response path) - marking these complete at 03-02 would be premature since no HTTP-reachable coaching endpoint exists yet. Deferred to 03-03's completion, where the requirements will be marked once the mechanical gate is actually reachable end-to-end.

## Deviations from Plan

None - plan executed exactly as written. Both tasks matched their `<action>` and `<behavior>` specs precisely; no auto-fixes, no architectural questions, no checkpoints.

## Issues Encountered
- `deno` was not on `PATH` in this session's shell (same issue noted in 03-01-SUMMARY.md). Located the winget-installed binary directly at `/c/Users/Nexdo/AppData/Local/Microsoft/WinGet/Packages/DenoLand.Deno_Microsoft.Winget.Source_8wekyb3d8bbwe/deno.exe` and invoked it via full path for every `deno test`/`deno check` command in this session.

## User Setup Required
None - no external service configuration required this plan. No real Gemini API key was used or needed; all tests mock `fetch`.

## Next Phase Readiness
- `LLMProvider` interface, `CoachingRequest`/`CoachingResponse`/`OpenerRequest` types, and `GeminiAdapter` are ready for `index.ts` (03-03) to instantiate `GeminiAdapter` with `Deno.env.get("GEMINI_API_KEY")` and call it behind the `LLMProvider` interface only.
- `validate.ts` (03-01) is ready to be called on the `GeminiAdapter`'s returned `CoachingResponse` before any response reaches a client - this plan's prompt is defense-in-depth, not the gate itself.
- The resolved `CoachingResponse` field set (above) is ready for 03-03's shared fixture and the new Swift contract test.
- No blockers. `deno test Backend/ --allow-env --allow-read` is green locally (23/23); CI backend job arrives in 03-03 as planned.

## Self-Check: PASSED

All created files verified present on disk; both task commits (e1b0642, 5bb53d5) verified present in git log.
