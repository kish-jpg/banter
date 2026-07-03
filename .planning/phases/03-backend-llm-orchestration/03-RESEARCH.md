# Phase 3: Backend LLM Orchestration - Research

**Researched:** 2026-07-04
**Domain:** LLM structured-output orchestration on self-hosted Supabase Edge Functions (Deno), Gemini API, provider-abstracted client
**Confidence:** MEDIUM (Apple-adjacent/Swift parts HIGH from prior phases; Gemini REST + Supabase self-hosted Edge Function mechanics MEDIUM — official docs read directly, some pages served stale/mismatched content requiring cross-verification; psychology-taxonomy synthesis MEDIUM per PITFALLS.md's existing confidence rating, no new claims added here)

## Summary

Phase 3 has one hard sequencing constraint the roadmap already calls out: **the psychology taxonomy artifact (COAC-06) must exist and be loaded before any prompt is assembled**, because it is the literal gate — not a documentation afterthought. The artifact is a checked-in JSON file (`Backend/llm/taxonomy.json` or similar) with a flat list of `{id, framework, technique, tagName, oneLineExplanation, citation}` allowed entries and a parallel `bannedTerms: string[]` list. The edge function reads this file at cold-start, injects only the allowed tag vocabulary into the system prompt, and — as a backstop, not a substitute — validates every `psychology_tag` string in the LLM's structured response against the same allowlist before returning to the client. A response with a tag not in the allowlist, or containing a banned term anywhere in reply text, is rejected and either retried once or returned as a 502 to the caller. This makes the gate mechanical (code-enforced), not prompt-hope.

The core LLM call is a single Gemini `generateContent` request with `responseMimeType: "application/json"` and a `responseSchema` that forces exactly 3 replies (each with text/tag/style/confidence), a sentiment object, and — for the opener path (COAC-07) — a variant shape keyed off a match-profile transcript instead of a two-sided conversation. This is the same "structured-output single-call" pattern already locked in ARCHITECTURE.md Pattern 2; Phase 3's job is to make it real against Gemini specifically, wrapped in a provider-abstract interface so Claude/GPT can be swapped in later without touching the edge function's calling code.

The backend lives in the self-hosted Supabase stack already cloned at `infra/supabase/` (shallow clone, gitignored, not vendored into the repo) as a Deno Edge Function under `supabase/functions/coaching/`. It holds `GEMINI_API_KEY` server-side only; the iOS app never sees it. CI cannot run this stack (Docker Desktop isn't installed on the dev machine yet, and the existing macOS CI runner shouldn't absorb Docker-in-Docker cost) — so this phase adds a **second CI job on `ubuntu-latest`** that runs `deno test` against the function's pure logic with a mocked `fetch`, keeping the existing macOS job untouched. A shared JSON fixture file is consumed by both the Deno tests and a new `BanterShared` Swift contract test, so the iOS-side `CoachingResponse` decoder and the edge function's response shape are provably in sync without a live network call in CI. A live smoke test (real Docker stack + real Gemini key) is a developer-run script, never a CI step.

**Primary recommendation:** Build the taxonomy artifact first as a standalone, independently-testable JSON file with its own Deno unit test; build the Gemini adapter behind a two-method `LLMProvider` interface (`generateCoaching`, `generateOpeners`) so provider swap-out later touches only one new adapter file; keep the edge function itself thin (parse request → load taxonomy → assemble prompt → call provider → validate against taxonomy → return) so unit tests can exercise each stage independently of the network.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Psychology taxonomy artifact (allowlist/banlist) | API/Backend | — | Must be server-side and version-controlled; the prompt assembler and the output validator both read it — client never sees or trusts a copy of it |
| Prompt assembly (system instruction + user content) | API/Backend | — | Never on-device: the taxonomy, the anti-AI-tell rules, and the API key all must stay server-side |
| Gemini API call (structured output) | API/Backend | — | Holds `GEMINI_API_KEY`; iOS app must never call an LLM provider directly (ARCHITECTURE.md Integration Points, already locked) |
| Output validation (tag-in-allowlist, banned-term lint) | API/Backend | — | Mechanical gate must run server-side before the client ever sees a reply; a client-side check could be bypassed and doesn't protect against a compromised prompt |
| Provider abstraction (`LLMProvider` interface) | API/Backend | — | Swap point lives entirely in the edge function's `llm/` folder; the iOS client only ever talks to Banter's own backend contract, never to a specific LLM vendor's SDK shape |
| Sentiment event persistence | Database/Storage | API/Backend | Postgres (self-hosted Supabase) stores the append-only `SentimentEvent` log; the edge function only computes and appends, doesn't own storage schema decisions beyond this phase's insert path |
| `CoachingClient` (iOS) | Browser/Client (companion app process) | — | Decodes `CoachingResponse`, hits a configurable base URL; contains zero psychology/prompt logic — pure network + decode |
| Confirmed transcript input | Browser/Client (companion app process) | — | Already produced by Phase 2's `ImportFlowModel` / `ConfirmTranscriptView`; Phase 3 only consumes `[ConversationMessage]`, doesn't re-touch OCR |

## User Constraints

<user_constraints>
## User Constraints (from CONTEXT.md)

No `03-CONTEXT.md` exists for this phase at research time — `/gsd:discuss-phase 3` was not run before this research. The following constraints are LOCKED decisions carried from `PROJECT.md` Key Decisions (2026-07-04) and `STATE.md` Accumulated Context, and must be treated with the same authority as a CONTEXT.md `## Decisions` section:

### Locked Decisions
- Self-hosted Supabase for dev/test: shallow clone at `infra/supabase/` (docker compose stack); Docker Desktop not yet installed on the dev Windows machine — assume it arrives during execution.
- Gemini API first (key validated live: `gemini-2.5-flash` visible on `v1beta/models`) — but the LLM client must be provider-abstracted so Claude/GPT swap in for later model-quality testing.
- Psychology allowlist/banlist artifact locked in Phase 3 *before* prompt engineering, to avoid schema-rework risk (roadmap decision).
- Privacy designed into the backend now, verified in a dedicated hardening pass later (Phase 7) — do not defer the "no raw screenshots, structured text only" boundary; do defer deep retention-TTL/consent-UI work.

### Claude's Discretion
- Exact taxonomy artifact file format (JSON vs YAML vs MD) — not specified by the user; this research recommends JSON (see Package/Format section below).
- Exact sentiment factor set (interest/reciprocity/warmth/responsiveness) — CALC-01 only requires "a sentiment score," factors are an implementation choice grounded in the same taxonomy.
- CI job layout (single vs second job) — user's "Research MUST cover" section explicitly asks for a recommendation; this research recommends a second `ubuntu-latest` job.

### Deferred Ideas (OUT OF SCOPE for Phase 3)
- Managed Supabase hosting decision — deferred to pre-launch (PROJECT.md Key Decisions).
- CALC-02/CALC-03 (health-score UI, timeline visualization) — Phase 4.
- COAC-02 (tone picker UI), COAC-04 (tap-to-expand citation UI) — Phase 4; Phase 3 only needs the backend to accept an optional `tone` and return a `citation`-bearing tag, not build the UI for either.
- PROF-01/02/03 (user profile personalization) — Phase 6; Phase 3's call signature accepts a `profile` parameter per the phase description but Phase 3 does not build profile storage — pass whatever the confirmed-transcript screen already has (nothing durable yet) or a minimal stub.
</user_constraints>

## Phase Requirements

<phase_requirements>
| ID | Description | Research Support |
|----|-------------|------------------|
| COAC-06 | Evidence-based framework allowlist + PUA/coercive banlist, maintained as a literal artifact | Taxonomy artifact design (JSON schema, gate mechanics) — see "Psychology Taxonomy Artifact" section |
| COAC-01 | User receives 3 suggested replies per analysis | Gemini `responseSchema` with `minItems`/`maxItems: 3` on the `replies` array — see "Gemini Structured Output" section |
| COAC-03 | Every suggested reply carries a one-line psychology tag by default | `psychology_tag` field required in schema, validated against taxonomy allowlist post-generation |
| COAC-05 | Suggestions match user's texting voice, avoid AI tells, enforced at prompt level | System-instruction anti-AI-tell rules + post-generation banned-token lint — see "Anti-AI-Tell Enforcement" |
| COAC-07 | Generate conversation openers from a match-profile screenshot | Second call shape (`generateOpeners`) reusing the same taxonomy gate and provider interface, different input (profile text, no two-sided transcript) |
| CALC-01 | Sentiment score in the same structured LLM call | `sentiment` object in the same `responseSchema`, mapped to `SentimentEvent` on write — see "Sentiment/Event Shape" section |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase Edge Runtime | v1.74.0 (pinned in `infra/supabase/docker/docker-compose.yml`, self-hosted clone) `[VERIFIED: infra/supabase/docker/docker-compose.yml]` | Executes Deno-based Edge Functions in the self-hosted stack | Already the locked backend host per PROJECT.md; version confirmed by reading the vendored compose file directly |
| Deno (bundled in edge-runtime image) | Runtime-provided by edge-runtime v1.74.0, no separate install for the function itself `[CITED: supabase.com/docs/guides/functions]` | JS/TS runtime for the edge function | Supabase Edge Functions ARE Deno functions; no alternative runtime option in this stack |
| Native `fetch` (Deno global) | Deno built-in, no version to pin | Call the Gemini REST API directly | `[CITED: supabase.com/docs/guides/getting-started/ai-prompts/edge-functions]` — Supabase's own AI-prompt guidance explicitly recommends native `fetch` over adding an SDK dependency; also the ponytail-correct call (stdlib beats a new dependency for one REST call) |
| `denoland/setup-deno` GitHub Action | v2 `[CITED: github.com/denoland/setup-deno]` | Installs Deno on the new `ubuntu-latest` CI job | Official Deno GitHub Action, standard for Deno-in-CI |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `jose` (Deno, via `https://deno.land/x/jose@v4.14.4`) | Already vendored in `infra/supabase/docker/volumes/functions/main/index.ts` `[VERIFIED: infra/supabase/docker/volumes/functions/main/index.ts]` | JWT verification for the Kong-routed `main` gateway function | Not something Phase 3 adds — it's part of the stock self-hosted stack's existing router; the new `coaching` function is served behind it, does not need to re-implement JWT verification itself unless bypassing `main` |
| `@std/testing/bdd` (Deno standard library, JSR `jsr:@std/testing`) | Latest stable per Deno stdlib versioning, no npm install needed `[CITED: supabase.com/docs/guides/functions/unit-test]` | Structuring Deno unit tests (describe/it) for the edge function's pure logic | Use for the taxonomy-loader and output-validator unit tests; optional — plain `Deno.test()` also works and is simpler (ponytail: skip `@std/testing/bdd` unless test count grows past a handful of files) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native `fetch` to Gemini REST | `@google/genai` npm/JSR SDK | SDK adds a dependency + version-pin surface for one HTTP call; native `fetch` matches Supabase's own guidance and keeps the provider-abstraction layer trivially portable (any provider is "build a request object, fetch, parse JSON") |
| JSON taxonomy artifact | YAML taxonomy artifact | YAML needs a parser dependency in Deno for no benefit; JSON is native to both TypeScript (edge function) and Swift (`Codable`, if the artifact is ever inspected client-side) and needs zero extra tooling |
| Second CI job on `ubuntu-latest` | Run Deno tests inside the existing macOS job | Wastes macOS-runner minutes (10x cost, per Phase 1's own decision log) on work that has no macOS dependency; Deno/edge-function logic is 100% platform-agnostic |
| `Deno.serve` built-in HTTP handling | Oak or another Deno web framework | One route, one function, no routing complexity — a framework is unrequested abstraction for a single `Deno.serve(handler)` |

**Installation:** No new package installs. The edge function is authored directly as TypeScript files served by the existing `supabase/edge-runtime:v1.74.0` container; Deno resolves any `https://` or `jsr:` imports at runtime with no `npm install` step. The only new CI-side install is the `denoland/setup-deno` action (a GitHub Action, not a package dependency).

**Version verification:** `edge-runtime:v1.74.0` confirmed directly from the vendored `infra/supabase/docker/docker-compose.yml` (read 2026-07-04) — this is the actual pinned version in the self-hosted clone the user already has, not a training-data guess. Gemini model `gemini-2.5-flash` was validated live by the user against `v1beta/models` per the phase brief; this research did not re-call the live API (no key in this environment) but confirmed via Google's own docs that `gemini-2.5-flash` supports `responseMimeType`/`responseSchema` structured output (a sibling model, `gemini-2.5-flash-image`, notably does NOT support it per a GitHub issue found during research — do not swap models without re-checking this).

## Package Legitimacy Audit

No external packages are being installed for this phase. The edge function uses only Deno/Supabase-provided runtime globals (`Deno.serve`, `Deno.env.get`, `fetch`) and the Gemini HTTP API directly. The one existing third-party import in the stack (`jose` in the stock `main` gateway function) predates this phase and is part of Supabase's own self-hosted scaffold, not a Phase 3 addition.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| *(none — no new packages installed this phase)* | — | — | — | — | — | N/A |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
Companion App (BanterApp, confirmed transcript already in memory)
    │
    │  POST /coaching  { messages: [ConversationMessage], tone?, profile? }
    │  (structured text only — CAPT-04 boundary already enforced client-side)
    ▼
Kong Gateway (self-hosted Supabase stack, routes /functions/v1/* → edge-runtime)
    │
    ▼
Edge Function: supabase/functions/coaching/index.ts  (Deno, on edge-runtime v1.74.0)
    │
    ├─▶ 1. Parse + validate request body (messages non-empty, tone in enum)
    │
    ├─▶ 2. Load taxonomy.json (allowlist + banlist) — cold-start cached in module scope
    │
    ├─▶ 3. Assemble prompt:
    │        systemInstruction = anti-AI-tell rules + allowed-tag vocabulary (from taxonomy)
    │        contents = transcript formatted as speaker-attributed lines
    │
    ├─▶ 4. LLMProvider.generateCoaching(prompt)  ── provider-abstracted call
    │        │
    │        └─▶ GeminiAdapter: fetch() → generativelanguage.googleapis.com/v1beta/
    │                models/gemini-2.5-flash:generateContent
    │                { contents, systemInstruction, generationConfig:
    │                  { responseMimeType: "application/json", responseSchema } }
    │
    ├─▶ 5. Parse response JSON → CoachingResponse candidate
    │
    ├─▶ 6. Validate: every psychology_tag ∈ taxonomy.allowlist tag names?
    │        any reply text or tag containing a taxonomy.bannedTerm (case-insensitive)?
    │        banned-AI-tell lint (em dash, "not just X but Y", etc.)?
    │        ── FAIL → retry once with a stricter system reminder, else 502
    │
    ├─▶ 7. Append SentimentEvent to Postgres (self-hosted DB, via Supabase client
    │        or direct fetch to PostgREST) — non-blocking relative to the response
    │
    ▼
Response: CoachingResponse { replies: [3], sentiment: {...} }  →  Companion App
    │
    ▼
Companion App decodes via BanterShared.CoachingClient, renders suggestions,
writes to App Group for the keyboard (Phase 5 concern, not built yet)
```

### Recommended Project Structure

```
infra/supabase/docker/volumes/functions/     # gitignored clone root — do NOT put
                                              # Banter-authored code only here; the
                                              # clone itself is throwaway/regenerable.
```

Because `infra/supabase/` is gitignored (confirmed in `.gitignore`: `infra/supabase/`), the actual Banter-authored edge function source must live in a path that IS tracked by git and gets synced/copied into the running stack — not authored directly inside the gitignored clone. Recommended layout:

```
Backend/
├── functions/
│   └── coaching/
│       ├── index.ts                # Deno.serve handler — thin: parse, orchestrate, respond
│       ├── taxonomy.ts             # loads + type-checks taxonomy.json at module scope
│       ├── taxonomy.json           # the literal allowlist/banlist artifact (COAC-06)
│       ├── promptAssembly.ts       # builds systemInstruction + contents from transcript
│       ├── llm/
│       │   ├── LLMProvider.ts      # interface: generateCoaching(), generateOpeners()
│       │   ├── GeminiAdapter.ts    # implements LLMProvider via fetch() to Gemini REST
│       │   └── schema.ts           # the responseSchema JSON object, shared by all adapters
│       ├── validate.ts             # tag-in-allowlist check, banned-term lint, AI-tell lint
│       └── sentiment.ts            # maps LLM sentiment output → SentimentEvent, writes to DB
├── tests/
│   ├── fixtures/
│   │   └── coaching-response.sample.json   # shared contract fixture — see Validation Architecture
│   ├── taxonomy.test.ts
│   ├── promptAssembly.test.ts
│   ├── validate.test.ts
│   └── GeminiAdapter.test.ts        # mocks globalThis.fetch, never hits real Gemini
└── scripts/
    └── smoke-coaching.sh            # developer-run: real Docker stack + real Gemini key
```

A deploy/sync step (either a `Makefile` target or a documented manual step) copies `Backend/functions/coaching/` into `infra/supabase/docker/volumes/functions/coaching/` before `docker compose up` picks it up — since the volumes path is inside the gitignored clone, it cannot be the source of truth. This mirrors how `infra/supabase/docker/volumes/functions/main/` and `hello/` already exist as stock examples inside the clone; Banter's own function is new content layered on top, tracked in `Backend/` and synced in.

**Note on `BanterShared` naming clash:** the existing `Backend/` folder name is what ARCHITECTURE.md's "Recommended Project Structure" already proposed in Phase-agnostic research — this phase is the first to actually populate it.

### Pattern 1: Taxonomy-as-Gate (mechanical enforcement, not prompt-hope)

**What:** The taxonomy artifact (`taxonomy.json`) is read at both prompt-assembly time (only allowed tag names + one-line explanations are injected into the system instruction, so the model is never even shown banned framing) and at validation time (every tag in the response must match an allowlist entry's `tagName` field exactly; any banned term appearing anywhere in `text` or `psychology_tag` fields fails validation).

**When to use:** Every single coaching/opener call — this is not optional or a nice-to-have, it's COAC-06's literal requirement ("maintained as a literal artifact").

**Example taxonomy.json shape:**
```json
{
  "version": "2026-07-04",
  "allowed": [
    {
      "framework": "Gottman Method",
      "technique": "turning-toward-bids",
      "tagName": "Turning toward a bid",
      "explanation": "Responding to a small connection attempt instead of ignoring it — builds trust over time.",
      "citation": "Gottman & Levenson; Gottman Institute, 'The Four Horsemen'"
    },
    {
      "framework": "Aron self-disclosure",
      "technique": "reciprocal-escalation",
      "tagName": "Reciprocal self-disclosure",
      "explanation": "Matching their openness with a bit of your own — closeness grows through mutual sharing.",
      "citation": "Aron et al. 1997, Personality and Social Psychology Bulletin ('36 Questions')"
    }
  ],
  "bannedTerms": [
    "negging", "scarcity", "alpha male", "beta male", "push-pull",
    "last-minute resistance", "neuro-linguistic programming"
  ]
}
```
```typescript
// Backend/functions/coaching/taxonomy.ts
import taxonomyData from "./taxonomy.json" with { type: "json" };

export interface TaxonomyEntry {
  framework: string;
  technique: string;
  tagName: string;
  explanation: string;
  citation: string;
}

export interface Taxonomy {
  version: string;
  allowed: TaxonomyEntry[];
  bannedTerms: string[];
}

export const taxonomy: Taxonomy = taxonomyData as Taxonomy;

export function allowedTagNames(): Set<string> {
  return new Set(taxonomy.allowed.map((e) => e.tagName));
}

export function containsBannedTerm(text: string): string | null {
  const lower = text.toLowerCase();
  for (const term of taxonomy.bannedTerms) {
    if (lower.includes(term.toLowerCase())) return term;
  }
  return null;
}
```
Note: Deno's native JSON module import (`import x from "./x.json" with { type: "json" }`) is the current stable syntax `[CITED: docs.deno.com — JSON module imports]`; older `assert { type: "json" }` syntax was deprecated in favor of `with` — verify against the exact Deno version bundled in edge-runtime v1.74.0 before relying on this, since import-attribute syntax has changed across Deno major versions. `[ASSUMED]` risk: flagged in Assumptions Log.

### Pattern 2: Provider Abstraction (Gemini now, Claude/GPT later)

**What:** A minimal interface with exactly the two methods Phase 3 needs — no speculative generality.

```typescript
// Backend/functions/coaching/llm/LLMProvider.ts
export interface CoachingRequest {
  transcript: { speaker: "user" | "match"; text: string; order: number }[];
  tone?: "playful" | "sincere" | "witty" | "direct";
  profileSummary?: string; // stubbed/empty until Phase 6 profile engine exists
}

export interface CoachingResponse {
  replies: { text: string; psychologyTag: string; style: string; confidence: number }[];
  sentiment: { score: number; factors: Record<string, number>; signal: string };
}

export interface OpenerRequest {
  profileText: string; // OCR'd match-profile screenshot, structured text only
}

export interface LLMProvider {
  generateCoaching(req: CoachingRequest, allowedTags: TaxonomyEntry[]): Promise<CoachingResponse>;
  generateOpeners(req: OpenerRequest, allowedTags: TaxonomyEntry[]): Promise<{ openers: CoachingResponse["replies"] }>;
}
```

**What keeps a Claude/OpenAI adapter a drop-in later:** all three major providers (Gemini, OpenAI, Anthropic) support schema-enforced JSON output as of 2026 — OpenAI via Structured Outputs (`response_format: { type: "json_schema" }`), Anthropic via forced tool-use with a JSON schema tool definition, Gemini via `responseSchema` `[CITED: ARCHITECTURE.md Pattern 2, already-locked research from Phase-agnostic research pass]`. The differences that bite when swapping:
- **Schema dialect differences:** Gemini's schema subset (no `oneOf`/`anyOf`, `propertyOrdering` hint, `enum` support) is narrower than full JSON Schema; an OpenAI/Anthropic adapter with a richer schema would need its own schema file (`llm/schema.ts` should NOT be shared as a single blind JSON object across providers — each adapter owns its own schema translation from a shared internal shape).
- **System instruction placement:** Gemini uses a top-level `systemInstruction` field separate from `contents`; OpenAI uses a `system` role message in the same `messages` array; Anthropic uses a top-level `system` string parameter. Each adapter handles this internally — the `LLMProvider` interface only ever takes the already-built `CoachingRequest`, never a raw prompt string.
- **Auth header shape:** Gemini uses `x-goog-api-key` header (or `?key=` query param); OpenAI/Anthropic use `Authorization: Bearer` — trivially adapter-internal, no interface impact.
- **Rate limits differ sharply:** Gemini free tier is far more restrictive (see Environment Availability) than a paid OpenAI/Anthropic key would be — this affects test/dev cadence, not the interface.

**Example GeminiAdapter (core call shape, verified against official docs):**
```typescript
// Backend/functions/coaching/llm/GeminiAdapter.ts
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export class GeminiAdapter implements LLMProvider {
  constructor(private apiKey: string) {}

  async generateCoaching(req: CoachingRequest, allowedTags: TaxonomyEntry[]): Promise<CoachingResponse> {
    const systemInstruction = buildSystemInstruction(allowedTags, req.tone); // anti-AI-tell + allowlist
    const contents = [{ role: "user", parts: [{ text: formatTranscript(req.transcript) }] }];

    const response = await fetch(`${GEMINI_URL}?key=${this.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: COACHING_RESPONSE_SCHEMA, // see schema.ts
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    const jsonText = data.candidates[0].content.parts[0].text;
    return JSON.parse(jsonText) as CoachingResponse;
  }
  // generateOpeners: same pattern, different schema/prompt — omitted for brevity
}
```
`[CITED: ai.google.dev/gemini-api/docs/structured-output, ai.google.dev/api/generate-content — REST shape cross-verified across two doc fetches + one WebSearch example]`. Response text extraction path (`candidates[0].content.parts[0].text`) is the standard Gemini REST response shape `[CITED: ai.google.dev/api/generate-content]` — always still call `JSON.parse` on the text even though `responseMimeType` was requested; Gemini returns the JSON as a string inside the normal candidate structure, not as a separate structured field.

### Pattern 3: responseSchema for the coaching call

```typescript
// Backend/functions/coaching/llm/schema.ts
export const COACHING_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    replies: {
      type: "ARRAY",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "OBJECT",
        properties: {
          text: { type: "STRING" },
          psychologyTag: { type: "STRING" },
          style: { type: "STRING", enum: ["playful", "sincere", "witty", "direct"] },
          confidence: { type: "NUMBER" },
        },
        required: ["text", "psychologyTag", "style", "confidence"],
        propertyOrdering: ["text", "psychologyTag", "style", "confidence"],
      },
    },
    sentiment: {
      type: "OBJECT",
      properties: {
        score: { type: "NUMBER" },
        factors: {
          type: "OBJECT",
          properties: {
            interest: { type: "NUMBER" },
            reciprocity: { type: "NUMBER" },
            warmth: { type: "NUMBER" },
            responsiveness: { type: "NUMBER" },
          },
          required: ["interest", "reciprocity", "warmth", "responsiveness"],
        },
        signal: { type: "STRING" },
      },
      required: ["score", "factors", "signal"],
    },
  },
  required: ["replies", "sentiment"],
};
```
`minItems`/`maxItems` on the `replies` array is what mechanically enforces COAC-01's "exactly 3 replies" at the schema level `[CITED: ai.google.dev/gemini-api/docs/structured-output — array items/minItems/maxItems support]` — this is a hard constraint the model must satisfy structurally, not a prompt instruction that can be ignored. `propertyOrdering` is a Gemini-specific hint (not standard JSON Schema) that stabilizes field order in the output; other providers ignore/don't need it `[CITED: googleapis cookbook example, cross-verified via WebSearch curl example]`.

### Anti-Patterns to Avoid

- **Trusting the model's own tag choice without validation:** Even with the allowlist injected into the prompt, an LLM can still emit an unlisted tag or a banned-adjacent framing under prompt drift. The `validate.ts` post-generation check is not redundant — it is the actual gate; the prompt injection only makes the gate easier to satisfy honestly.
- **Sharing one `responseSchema` object across providers:** OpenAI/Anthropic schema dialects differ enough (see Pattern 2) that a single exported schema object reused verbatim across adapters will silently drop fields or error on unsupported keywords (e.g. Gemini's `propertyOrdering` isn't meaningful to OpenAI). Each adapter should own its own schema definition, translated from the same internal `CoachingRequest`/`CoachingResponse` TypeScript types.
- **Adding an LLM SDK dependency for a single edge function:** per Supabase's own guidance and the ponytail ladder, native `fetch` is simpler, has zero dependency-pinning surface, and is the sanctioned pattern for this exact use case.
- **Putting the taxonomy artifact inside the gitignored `infra/supabase/` clone:** it must live in the tracked `Backend/` tree and be synced into the running stack, or the literal "artifact" COAC-06 requires would not actually be version-controlled — defeating the requirement's intent.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON schema enforcement on LLM output | A custom regex/parse-and-retry loop around free-text generation | Gemini's native `responseSchema`/`responseMimeType` | ARCHITECTURE.md already measured this: 99.8%+ schema compliance vs 8-15% failure rate for unconstrained JSON-in-prose `[CITED: ARCHITECTURE.md Pattern 2]` |
| JWT verification for the edge function | A hand-rolled JWT decode/verify | The `main` gateway function's existing `jose`-based verification (already in the stock self-hosted clone) — or Supabase's `FUNCTIONS_VERIFY_JWT` env toggle for simpler cases | Already solved, already vendored; re-implementing JWT verification is a security-sensitive hand-roll with no upside |
| Mocking HTTP in Deno tests | A custom fetch-interceptor abstraction layer | Direct `globalThis.fetch = mockFn` reassignment before the test, restored after | This is the documented, zero-production-code-change pattern `[CITED: supabase.com/docs/guides/functions/unit-test]` — no library needed |
| Detecting AI-tell phrasing (em dashes, listy triads) | A full NLP/style-classifier model | A short banned-token/regex lint (`—`, `; `, `not just.*but`, three-item comma lists via a simple regex) run post-generation as a backstop | PITFALLS.md Pitfall 2 already specifies this is a prompt-level + lint-level problem, not a model-training problem; a regex lint is proportionate to a v1 backstop |

**Key insight:** every "don't hand-roll" here has the same shape — the platform (Gemini's schema enforcement, the stock gateway's JWT handling, Deno's fetch mockability) already solves the reliability problem; Phase 3's actual engineering work is the *taxonomy gate* and the *provider abstraction seam*, which are genuinely novel to this project and cannot be delegated to a library.

## Common Pitfalls

### Pitfall 1: `infra/supabase/` being gitignored means "author code there" silently loses work

**What goes wrong:** A developer edits files directly under `infra/supabase/docker/volumes/functions/coaching/` because that's where `docker compose up` actually serves functions from — then `git status` shows nothing, and the work is invisible to the repo, CI, and code review.

**Why it happens:** The self-hosted Supabase clone is (correctly) gitignored as a whole directory, but the *functions volume* inside it is also where the runtime expects to find function code, creating a "the only place it runs is the only place it's not tracked" trap.

**How to avoid:** Author all Banter-specific function code under a tracked path (`Backend/functions/coaching/`) and treat the gitignored volume as a build/sync target, never a source. Document (and, ideally, script) the sync step explicitly rather than relying on manual copy-paste memory.

**Warning signs:** `git diff` shows no changes after a coding session that clearly touched the coaching function; `infra/supabase/docker/volumes/functions/coaching/` has files with no corresponding entry anywhere in `Backend/`.

### Pitfall 2: Assuming CI can validate the real Gemini call

**What goes wrong:** A plan writes a CI step that spins up Docker Compose and calls the real Gemini API from GitHub Actions — this either fails silently (Docker Desktop unavailability was the whole reason self-hosted dev/test was chosen, and CI runners may not support nested Docker cleanly for this stack) or burns real API quota/cost on every push, and free-tier rate limits (10 RPM per the Environment Availability section below) will start failing CI runs under any push volume.

**How to avoid:** CI validates function *logic* only, via mocked `fetch`. The real end-to-end path (Docker stack + real Gemini key) is a developer-run smoke script, never a CI job — this is explicitly requested in the phase brief's "Research MUST cover" item 5 and must not be relaxed under time pressure.

**Warning signs:** Any CI YAML with `docker compose up` or a bare `GEMINI_API_KEY` secret reference outside a manual/workflow_dispatch-gated job.

### Pitfall 3: Provider-specific schema quirks breaking silently on swap

**What goes wrong:** A later phase swaps `GeminiAdapter` for `ClaudeAdapter` and reuses the exact same `responseSchema` object — Gemini-specific keys like `propertyOrdering` or its stricter type-name casing (`"OBJECT"` vs standard JSON Schema `"object"`) either get ignored (silently losing the ordering hint) or rejected outright by a stricter provider's schema validator.

**Why it happens:** The temptation to "just reuse the schema" is strong because it looks identical enough to work — until a provider's parser is pickier than Gemini's.

**How to avoid:** Each adapter translates from a single shared internal TypeScript type (`CoachingResponse`) into its own provider-specific schema representation. Never export and directly reuse Gemini's literal schema object from a different adapter file.

**Warning signs:** A new adapter file that imports `COACHING_RESPONSE_SCHEMA` from `GeminiAdapter.ts` or `schema.ts` without any translation step.

### Pitfall 4: Trusting `responseSchema` alone to satisfy COAC-06's gate

**What goes wrong:** The schema enforces *shape* (3 replies, each with a `psychologyTag` string field) but does not and cannot enforce *content* (that the tag string is actually one of the allowlisted tag names, or that reply text avoids banned framing). A team ships the schema and calls COAC-06 done.

**Why it happens:** Schema enforcement is dramatically more visible/testable than the taxonomy validator, so it's easy to feel like "structured output" already solved the safety requirement.

**How to avoid:** Treat schema enforcement (shape) and taxonomy validation (content) as two separate, both-required gates — `validate.ts` in the recommended structure is not optional scaffolding, it is where COAC-06 is actually enforced.

**Warning signs:** No test exists that sends a crafted mock Gemini response containing a banned term or an off-allowlist tag and asserts the edge function rejects it.

## Code Examples

### Anti-AI-tell system instruction fragment (backstop-paired)

```typescript
// Backend/functions/coaching/promptAssembly.ts
export function buildSystemInstruction(allowedTags: TaxonomyEntry[], tone?: string): string {
  const tagList = allowedTags
    .map((t) => `- "${t.tagName}" (${t.framework}): ${t.explanation}`)
    .join("\n");

  return `You are a texting coach. Generate exactly 3 reply options for the user's dating
conversation, each grounded in ONE of the following evidence-based techniques only —
never invent a tag name outside this list:

${tagList}

Style rules (hard constraints):
- Never use an em dash (—) anywhere in reply text.
- Never use a semicolon to join two clauses.
- Never use "not just X, but Y" or similar rule-of-three rhetorical constructions.
- Keep replies short, imperfect, and in a natural texting register — not polished prose.
- Never use negging, manufactured scarcity, "alpha"/"beta" framing, or push-pull-as-manipulation.
${tone ? `- Bias tone toward: ${tone}.` : ""}`;
}
```
`[ASSUMED: specific banned-phrase regex list is this project's own synthesis from PITFALLS.md Pitfall 2, not an externally citable "AI-tell" standard — treat the exact phrase list as a v1 starting point to be tuned against real output, not a verified-complete list]`.

### Post-generation validator (the actual COAC-06 gate)

```typescript
// Backend/functions/coaching/validate.ts
export function validateCoachingResponse(
  resp: CoachingResponse,
  allowedTags: Set<string>,
  bannedTermCheck: (text: string) => string | null
): { valid: boolean; reason?: string } {
  if (resp.replies.length !== 3) {
    return { valid: false, reason: `expected 3 replies, got ${resp.replies.length}` };
  }
  for (const reply of resp.replies) {
    if (!allowedTags.has(reply.psychologyTag)) {
      return { valid: false, reason: `tag "${reply.psychologyTag}" not in allowlist` };
    }
    const banned = bannedTermCheck(reply.text) ?? bannedTermCheck(reply.psychologyTag);
    if (banned) {
      return { valid: false, reason: `banned term "${banned}" found` };
    }
    if (/—/.test(reply.text) || /;/.test(reply.text)) {
      return { valid: false, reason: "AI-tell punctuation (em dash or semicolon) detected" };
    }
  }
  return { valid: true };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Free-text LLM generation + regex/second-pass JSON extraction | Native schema-enforced structured output (`responseSchema`/`response_format: json_schema`/forced tool-use) | Adopted across all three major providers by 2025-2026 | Eliminates the parsing-failure class of bugs entirely; this is why ARCHITECTURE.md already locked this pattern before Phase 3 started |
| `assert { type: "json" }` for Deno JSON module imports | `with { type: "json" }` import attribute syntax | Deno/TC39 import-attributes standardization, landed across recent Deno versions | Verify the exact bundled Deno version in edge-runtime v1.74.0 supports `with` before relying on it — flagged as an assumption below |

**Deprecated/outdated:**
- Sending raw multimodal image bytes directly to an LLM for both OCR and reply generation in one call — ARCHITECTURE.md and PITFALLS.md both already reject this pattern (Phase 2 already built the structured-OCR-first pipeline); Phase 3 only ever receives already-structured `[ConversationMessage]` text, never images, per CAPT-04.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Deno's `with { type: "json" }` JSON-module-import syntax is supported by the exact Deno version bundled inside `supabase/edge-runtime:v1.74.0` | Pattern 1 (taxonomy.ts) | LOW — if unsupported, swap to `Deno.readTextFile` + `JSON.parse` at module init, a one-line fix; does not affect architecture |
| A2 | The specific banned-phrase/AI-tell regex list (em dash, semicolon, "not just X but Y") fully captures what reads as "AI-generated" to a dating-app user | Code Examples (system instruction) | MEDIUM — PITFALLS.md itself rates this domain MEDIUM confidence; an incomplete lint list means some AI-tell replies pass the backstop. Mitigate by treating this as a v1 starting list, explicitly revisited once real user/reviewer feedback exists (PITFALLS.md's own recommendation) |
| A3 | Gemini free-tier rate limits (10 RPM / 250 RPD / 250K TPM) are current as of this research date — Google's own rate-limits doc did not surface exact numbers on direct fetch, this figure comes from a secondary WebSearch synthesis, not Google's page directly | Environment Availability | MEDIUM — if the real limit is lower, developer smoke-testing cadence needs to slow further; if higher, no harm. Verify directly in Google AI Studio's rate-limit dashboard (linked in official docs) before relying on a specific number for dev-workflow planning |
| A4 | `gemini-2.5-flash` (not `-lite` or `-image` variants) is the correct model for this call, and supports `responseSchema` | Standard Stack | LOW — user already validated `gemini-2.5-flash` live against `v1beta/models`; this research additionally found a documented case (`gemini-2.5-flash-image`) where a sibling model name does NOT support structured output, so model-name precision matters — do not substitute a different Gemini variant without re-verifying structured-output support |
| A5 | Sentiment factor set (interest, reciprocity, warmth, responsiveness) is a reasonable grounding in the locked taxonomy frameworks (Gottman/attachment/Aron) | Pattern 3 (schema) | LOW — CALC-01 only requires "a sentiment score," these four factors are this research's proposed decomposition, explicitly marked as Claude's Discretion in User Constraints; free to change during planning/discussion |

**If this table is empty:** N/A — see entries above; none block proceeding to planning, all are either low-risk or explicitly marked as discretionary.

## Open Questions

1. **Does the self-hosted stack's `docker-compose.yml` need a new service entry, or does the existing `functions` service already serve any subdirectory under `volumes/functions/`?**
   - What we know: the `functions` service mounts `./volumes/functions:/home/deno/functions:z` and the stock `main` router (Kong-routed) dispatches by path segment (`service_name = path_parts[1]`) to `/home/deno/functions/${service_name}`.
   - What's unclear: whether a new `coaching` folder under that mount is automatically servable at `/functions/v1/coaching` with zero compose changes, or whether Kong's routing config (`kong.yml`, not read in this research pass) needs an explicit route added.
   - Recommendation: the planner should have a task that greps `infra/supabase/docker/volumes/api/kong.yml` (or wherever Kong config lives in this clone) for the existing `functions` route pattern before assuming zero-config works; this is a 5-minute grep, not a re-research item.

2. **Exact Postgres schema/table for `SentimentEvent` persistence — does one already exist from Phase 1?**
   - What we know: `BanterShared/Sources/BanterShared/Models/SentimentEvent.swift` already exists client-side (Swift struct) from a prior phase, with the exact fields ARCHITECTURE.md's Pattern 3 specifies.
   - What's unclear: whether a corresponding Postgres migration/table exists anywhere in the self-hosted stack's `supabase/migrations/` yet — this research did not find one (only stock `seed.sql` from the vendored clone).
   - Recommendation: Phase 3 plan should include a migration-authoring task (`infra/supabase` sync target, e.g. `Backend/migrations/`) creating a `sentiment_events` table matching the Swift model's fields, keyed by `conversation_id` (UUID) — not by any match-identifying field, per the already-locked anti-dossier constraint.

3. **Does the confirmed transcript already carry a stable `conversationId`, or does Phase 3 need to mint one?**
   - What we know: `ConversationMessage` (Phase 2) has no `conversationId` field — it's just `{speaker, text, order}`.
   - What's unclear: whether the companion app already generates a `UUID` per import session that Phase 3 should receive in the request, or whether the edge function should mint one server-side per call.
   - Recommendation: the planner should decide this explicitly — minting server-side is simpler (no client change needed) but loses the ability for the client to reference "this conversation" across multiple coaching calls within the same session; check whether CALC-01/CALC-02 (health-score-over-time, Phase 4) implies the client needs to hold a stable ID across calls, which would push this decision toward client-generated.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Docker Desktop | Self-hosted Supabase stack (`docker compose up`) | ✗ (not yet installed on dev Windows machine per phase brief) | — | None for actually running the stack locally — phase brief explicitly assumes it "arrives during execution"; until then, edge-function logic can still be authored and unit-tested via `deno test` without Docker |
| Deno CLI (local, for `deno test` outside CI) | Local dev-loop testing before pushing | Not verified in this research session (no shell probe run against the dev machine directly by this agent) | — | CI's `ubuntu-latest` job with `denoland/setup-deno` provides the guaranteed test-execution environment regardless of local Deno availability |
| Gemini API key | All LLM calls | ✓ (validated live by user against `v1beta/models`, per phase brief) | `gemini-2.5-flash` confirmed visible | — |
| Gemini free-tier rate limit | Developer smoke-testing cadence | ✓ available, but constrained | ~10 RPM / ~250 RPD (per secondary WebSearch synthesis — see Assumption A3) `[ASSUMED — verify in AI Studio dashboard]` | If the free tier proves too restrictive for even manual smoke-testing cadence, request a paid-tier upgrade before Phase 3 execution rather than mid-execution |
| GitHub Actions `ubuntu-latest` runner | New Deno CI job | ✓ (standard GitHub-hosted runner, already available to the repo which already uses `macos-26` for the existing job) | — | — |

**Missing dependencies with no fallback:**
- None that block Phase 3 planning or the majority of execution — Docker's absence blocks only the live end-to-end smoke test, which this research already scopes as a developer-run, non-CI step to be run once Docker Desktop is installed.

**Missing dependencies with fallback:**
- Docker Desktop absence: edge-function code can be fully authored and unit-tested (mocked fetch, no real network) without it; only the live smoke test waits on Docker's arrival.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Deno's built-in test runner (`Deno.test()`), optionally `@std/testing/bdd` for structure — no framework install needed `[CITED: supabase.com/docs/guides/functions/unit-test]` |
| Config file | none required for Deno tests; a `deno.json` with a `test` task is optional convenience, not required — see Wave 0 |
| Quick run command | `deno test Backend/tests/ --allow-env` |
| Full suite command | `deno test Backend/tests/ --allow-env` (same command — this test suite is small and fast; no separate "quick vs full" split needed at this scale) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COAC-06 | Taxonomy loads correctly; allowlist/banlist parse into expected shape | unit | `deno test Backend/tests/taxonomy.test.ts --allow-env` | ❌ Wave 0 |
| COAC-06 | Validator rejects an off-allowlist tag | unit | `deno test Backend/tests/validate.test.ts --allow-env` | ❌ Wave 0 |
| COAC-06 | Validator rejects a banned term embedded in reply text | unit | `deno test Backend/tests/validate.test.ts --allow-env` | ❌ Wave 0 |
| COAC-01 | Gemini adapter call (mocked fetch) returns exactly 3 replies | unit | `deno test Backend/tests/GeminiAdapter.test.ts --allow-env` | ❌ Wave 0 |
| COAC-03 | Each reply in a mocked response carries a non-empty `psychologyTag` | unit | `deno test Backend/tests/validate.test.ts --allow-env` | ❌ Wave 0 |
| COAC-05 | Validator rejects reply text containing an em dash or semicolon | unit | `deno test Backend/tests/validate.test.ts --allow-env` | ❌ Wave 0 |
| COAC-07 | Opener-generation path (mocked fetch) returns a valid opener set from profile text input | unit | `deno test Backend/tests/GeminiAdapter.test.ts --allow-env` | ❌ Wave 0 |
| CALC-01 | Sentiment object present and shape-valid in the same mocked response as replies | unit | `deno test Backend/tests/promptAssembly.test.ts --allow-env` | ❌ Wave 0 |
| (contract) | iOS `CoachingClient` decodes the same fixture JSON the Deno tests use, without error | contract (Swift) | `swift test --package-path BanterShared --filter CoachingClientContractTests` | ❌ Wave 0 |
| (integration, manual) | Real Docker stack + real Gemini key returns a valid response end-to-end | manual/developer smoke | `Backend/scripts/smoke-coaching.sh` (developer-run, not CI) | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `deno test Backend/tests/ --allow-env` (fast, seconds — no network, no Docker)
- **Per wave merge:** same command, plus `swift test --package-path BanterShared` (existing Swift suite, now including the new contract test) run on the existing macOS CI job
- **Phase gate:** Both CI jobs green (`ubuntu-latest` Deno job + existing `macos-26` job) before `/gsd:verify-work`; developer runs `smoke-coaching.sh` manually at least once before considering the phase done, once Docker is available

### Wave 0 Gaps
- [ ] `Backend/tests/taxonomy.test.ts` — covers COAC-06 (artifact loads/parses correctly)
- [ ] `Backend/tests/validate.test.ts` — covers COAC-06, COAC-03, COAC-05 (the actual gate logic)
- [ ] `Backend/tests/GeminiAdapter.test.ts` — covers COAC-01, COAC-07 (mocked-fetch call shape)
- [ ] `Backend/tests/promptAssembly.test.ts` — covers CALC-01 (sentiment object present in assembled/parsed response)
- [ ] `Backend/tests/fixtures/coaching-response.sample.json` — shared contract fixture consumed by both Deno tests and the new Swift contract test
- [ ] New Swift test file (e.g. `BanterShared/Tests/BanterSharedTests/CoachingClientContractTests.swift`) — decodes the shared fixture, asserts against `CoachingResponse`/`ReplySuggestion`/`SentimentEvent` Swift types
- [ ] New `.github/workflows/ci.yml` second job (`ubuntu-latest`, `denoland/setup-deno@v2`) — runs the Deno test suite; must not touch or slow the existing `macos-26` job
- [ ] Framework install: none — `deno test` and Deno's std/testing are runtime-bundled; the only new CI-side install is the `denoland/setup-deno` action itself

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | yes | Existing Kong-routed JWT verification (`main` gateway function's `jose`-based check, or Supabase's `FUNCTIONS_VERIFY_JWT` toggle) gates access to the `coaching` function — the edge function itself does not re-implement auth |
| V3 Session Management | no (not applicable — stateless per-request coaching calls, no session concept introduced this phase) | — |
| V4 Access Control | yes | The coaching function must only ever act on the calling user's own transcript/profile data; no cross-user data access path exists in this phase's scope (no shared/multi-tenant read paths introduced) |
| V5 Input Validation | yes | Request body validation (non-empty `messages`, `tone` in enum, reasonable length caps to bound Gemini token cost) before any prompt assembly — prevents malformed/oversized requests from reaching the LLM call |
| V6 Cryptography | yes (indirectly) | `GEMINI_API_KEY` and any DB credentials are handled via Deno's `Deno.env.get()` / Supabase secrets management (`supabase secrets set --env-file`), never hardcoded or logged — never hand-rolled encryption needed this phase since the key is a bearer secret, not data-at-rest requiring its own crypto |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Prompt injection via transcript content (a message crafted to make the LLM ignore the taxonomy gate or leak the system instruction) | Tampering / Elevation of Privilege | The post-generation `validate.ts` gate is the actual defense — even if the model is tricked into emitting an off-allowlist tag or banned content, the mechanical validator catches it before the response ever reaches the client. Do not rely on prompt wording alone. |
| API key leakage into client bundle or logs | Information Disclosure | `GEMINI_API_KEY` lives only in the edge function's environment (`Deno.env.get`), never in any response body, never in `NetworkDTOs.swift`/client code (already structurally impossible per `NetworkBoundaryGuardTests`'s existing pattern — apply the same "grep for forbidden token" tripwire to the key name in client source as a Phase 3 verification step) |
| Oversized/adversarial transcript input causing excessive Gemini token spend or timeout | Denial of Service (cost-based) | Input length cap (e.g., reject transcripts over N messages or M total characters) enforced in request validation before the Gemini call — a proportionate v1 control, not a full rate-limiter (that's an infra/API-gateway concern, likely Kong-level, out of scope for this phase's function code) |
| Match-identifying data leaking into the sentiment/coaching persistence layer | Information Disclosure (third-party privacy) | Already an architectural constraint from PITFALLS.md Pitfall 3 / ARCHITECTURE.md Anti-Pattern 2 — `SentimentEvent` is keyed by `conversationId` + `speaker` enum (`.user`/`.match`), never by a match's name/identifier; Phase 3 must not add any column or field that stores match-identifying text long-term |

## Sources

### Primary (HIGH confidence)
- `infra/supabase/docker/docker-compose.yml` (vendored, read directly) — confirmed `supabase/edge-runtime:v1.74.0` pin, functions service mount/env shape
- `infra/supabase/docker/volumes/functions/main/index.ts` and `hello/index.ts` (vendored, read directly) — confirmed stock JWT-verification pattern and `Deno.serve` handler shape already present in the self-hosted clone
- `BanterShared/Sources/BanterShared/Models/ConversationMessage.swift`, `ReplySuggestion.swift`, `SentimentEvent.swift`, `NetworkDTOs.swift` (read directly) — confirmed exact existing Swift types this phase's backend contract must match
- `BanterShared/Tests/BanterSharedTests/NetworkBoundaryGuardTests.swift` (read directly) — confirmed the existing CAPT-04 structural-guard test pattern this phase should extend to the new API key boundary
- `.github/workflows/ci.yml` (read directly) — confirmed the existing single macOS CI job this phase adds a second job alongside, without modifying

### Secondary (MEDIUM confidence)
- [Structured outputs — Gemini API | Google AI for Developers](https://ai.google.dev/gemini-api/docs/structured-output) — schema type support (STRING/NUMBER/OBJECT/ARRAY/etc.), minItems/maxItems, propertyOrdering
- [Generating content | Gemini API reference](https://ai.google.dev/api/generate-content) — REST request/response shape, systemInstruction placement, GenerationConfig field names
- [Testing your Edge Functions | Supabase Docs](https://supabase.com/docs/guides/functions/unit-test) — Deno test file layout, `globalThis.fetch` mocking pattern, `deno test` command shape
- [AI Prompt: Writing Supabase Edge Functions | Supabase Docs](https://supabase.com/docs/guides/getting-started/ai-prompts/edge-functions) — native `fetch` over SDK guidance, `Deno.env.get()` secrets pattern
- [Environment Variables | Supabase Docs](https://supabase.com/docs/guides/functions/secrets) — `supabase secrets set --env-file` pattern for `GEMINI_API_KEY`
- [denoland/setup-deno GitHub Action](https://github.com/denoland/setup-deno) — CI job pattern for `ubuntu-latest` Deno test execution
- ARCHITECTURE.md, PITFALLS.md (this project's prior phase-agnostic research, already MEDIUM-confidence-rated by that research pass) — structured-output pattern, event-sourced sentiment pattern, anti-AI-tell pitfall specifics, App Group/backend boundary decisions

### Tertiary (LOW confidence)
- WebSearch synthesis on Gemini free-tier rate limits (10 RPM / 250 RPD / 250K TPM) — Google's own rate-limits page did not surface exact per-model numbers on direct fetch; this figure is aggregated from third-party blog summaries, flagged as Assumption A3, verify directly in AI Studio's rate-limit dashboard before relying on it for dev-cadence planning
- WebSearch example curl request showing `propertyOrdering` usage — from a GitHub cookbook issue thread, not the primary docs page itself, though consistent with the primary docs' description of the field

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH for the self-hosted stack version/shape (read directly from vendored files); MEDIUM for Gemini REST specifics (official docs fetched directly, but one fetch returned mismatched/stale content requiring cross-verification via a second fetch + WebSearch)
- Architecture: HIGH — builds directly on the already-locked ARCHITECTURE.md Pattern 2 (structured-output single call) and Pattern 3 (event-sourced sentiment), which were independently researched and rated MEDIUM-HIGH in that prior pass; this phase's contribution (taxonomy-as-gate, provider abstraction) is original synthesis at MEDIUM confidence, clearly marked
- Pitfalls: MEDIUM — directly extends PITFALLS.md's own MEDIUM-confidence Pitfall 2 (authenticity) and Pitfall 4 (PUA-adjacent framing) sections; no new pitfall claims introduced without grounding in that existing research

**Research date:** 2026-07-04
**Valid until:** 30 days for the Supabase/Deno mechanics (stable, self-hosted version pinned); 14 days for Gemini-specific rate-limit figures (fast-moving, provider-controlled, explicitly flagged as needing live verification before relying on the exact numbers)
