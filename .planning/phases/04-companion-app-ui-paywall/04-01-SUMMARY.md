---
phase: 04-companion-app-ui-paywall
plan: 01
subsystem: ui
tags: [ios, swiftui, revenuecat, storekit, taxonomy, wave-0, xctest, xcuitest]

# Dependency graph
requires:
  - phase: 03-backend-llm-orchestration
    provides: AnalyzeConversationRequest/CoachingResponseDTO contract, taxonomy.ts/taxonomy.json backend source
provides:
  - RevenueCat SPM dependency declared in project.yml, resolvable from BanterApp
  - TaxonomyEntry Codable model (BanterShared) mirroring backend taxonomy.ts field shape
  - BanterApp/Resources/taxonomy.json offline-bundled, byte-synced copy of backend taxonomy
  - Backend/scripts/sync-taxonomy.sh drift guard
  - Banter.storekit local StoreKit config (com.banter.premium.weekly, 14-day trial, premium entitlement)
  - 7 failing Wave-0 test scaffolds (TonePicker, TagExplainer, SentimentTimelineStore, DailyCapTracker, EntitlementManager, OnboardingFlow, PermissionPriming) gating later Phase 4 plans
affects: [04-02, 04-03, 04-04, 04-05]

# Tech tracking
tech-stack:
  added: ["RevenueCat/purchases-ios v5.80.2 (SPM)"]
  patterns:
    - "Protocol-seam mocking for third-party SDK entitlement state (EntitlementSource/EntitlementState) — tests never import the live SDK"
    - "#filePath-based source-scan negative structural guards (CALC-03 identity-token ban), extending NetworkBoundaryGuardTests/GeminiKeyBoundaryGuardTests style"
    - "Backend-authoritative bundled-copy drift guard (sync-taxonomy.sh), mirroring sync-fixture.sh"

key-files:
  created:
    - BanterShared/Sources/BanterShared/Models/TaxonomyEntry.swift
    - BanterApp/Resources/taxonomy.json
    - Backend/scripts/sync-taxonomy.sh
    - Banter.storekit
    - BanterShared/Tests/BanterSharedTests/TonePickerTests.swift
    - BanterShared/Tests/BanterSharedTests/TagExplainerTests.swift
    - BanterShared/Tests/BanterSharedTests/SentimentTimelineStoreTests.swift
    - BanterShared/Tests/BanterSharedTests/DailyCapTrackerTests.swift
    - BanterShared/Tests/BanterSharedTests/EntitlementManagerTests.swift
    - BanterUITests/OnboardingFlowTests.swift
    - BanterUITests/PermissionPrimingTests.swift
  modified:
    - project.yml

key-decisions:
  - "RevenueCat/purchases-ios human-verified (T-04-SC blocking checkpoint) before SPM resolution: official RevenueCat org, SPM URL https://github.com/RevenueCat/purchases-ios.git, pinned from: \"5.80.2\""
  - "Client bundles a synced copy of taxonomy.json rather than adding a new endpoint (04-RESEARCH.md Pattern 1 / Open Question 2 default)"
  - "EntitlementManagerTests defines its own EntitlementSource/EntitlementState protocol seam so Wave-0 tests never require import RevenueCat to compile"

patterns-established:
  - "Wave-0 test scaffolds intentionally reference not-yet-built production symbols so they fail-red on 'cannot find X in scope' — this is the intended red state for later plans' real automated gates, not a bug"

requirements-completed: [COAC-04]

coverage:
  - id: D1
    description: "RevenueCat SPM package added to project.yml and BanterApp target dependencies, human-verified before resolution (T-04-SC)"
    verification:
      - kind: other
        ref: "grep 'RevenueCat|purchases-ios' project.yml"
        status: pass
      - kind: e2e
        ref: "CI xcodegen/build (deferred — no local Swift toolchain)"
        status: unknown
    human_judgment: true
    rationale: "Package resolution and build compile proof can only be confirmed on CI (macOS runner); local grep proves the declaration exists, not that it resolves."
  - id: D2
    description: "TaxonomyEntry Codable model with 5 fields matching backend taxonomy.ts interface exactly"
    verification:
      - kind: other
        ref: "grep 'public struct TaxonomyEntry: Codable' + field order check, BanterShared/Sources/BanterShared/Models/TaxonomyEntry.swift"
        status: pass
    human_judgment: false
  - id: D3
    description: "BanterApp/Resources/taxonomy.json byte-identical to Backend/functions/coaching/taxonomy.json, with sync-taxonomy.sh drift guard passing"
    verification:
      - kind: other
        ref: "bash Backend/scripts/sync-taxonomy.sh"
        status: pass
    human_judgment: false
  - id: D4
    description: "Banter.storekit defines com.banter.premium.weekly with 14-day trial and premium entitlement"
    verification:
      - kind: other
        ref: "grep 'com.banter.premium.weekly|premium' Banter.storekit"
        status: pass
    human_judgment: false
  - id: D5
    description: "7 Wave-0 test scaffolds exist and are structurally correct (forbidden-token guard, protocol seam, XCUITest launch-arg seeding)"
    verification:
      - kind: unit
        ref: "swift test --package-path BanterShared (deferred — no local Swift toolchain, CI is the compile/red-state gate)"
        status: unknown
      - kind: other
        ref: "grep verification of file existence + acceptance-criteria markers (matchName token, no import RevenueCat, #filePath scan)"
        status: pass
    human_judgment: true
    rationale: "Actual red-state compile failure (fails on missing production symbols, not unrelated errors) can only be confirmed by running swift test on CI — no local Swift toolchain available."

duration: 18min
completed: 2026-07-04
status: complete
---

# Phase 4 Plan 1: Wave-0 Foundations Summary

**RevenueCat SPM dependency (human-verified), offline-bundled TaxonomyEntry taxonomy, Banter.storekit weekly-premium config, and 7 failing Wave-0 test scaffolds gating the rest of Phase 4**

## Performance

- **Duration:** 18 min
- **Started:** 2026-07-04 (continuation from prior blocking checkpoint)
- **Completed:** 2026-07-04
- **Tasks:** 3 (1 checkpoint + 2 auto)
- **Files modified:** 12 (1 modified, 11 created)

## Accomplishments
- RevenueCat/purchases-ios legitimacy human-verified (T-04-SC) and declared as an SPM dependency in project.yml, wired into the BanterApp target
- TaxonomyEntry Codable model created in BanterShared, field-for-field matching Backend/functions/coaching/taxonomy.ts's TaxonomyEntry interface
- BanterApp/Resources/taxonomy.json bundled as a byte-identical, offline copy of the backend-authoritative taxonomy, with Backend/scripts/sync-taxonomy.sh as a CI drift guard
- Banter.storekit created defining the weekly premium subscription (com.banter.premium.weekly) with a 14-day free-trial intro offer and a `premium` entitlement
- All 7 Wave-0 test scaffolds created (TonePickerTests, TagExplainerTests, SentimentTimelineStoreTests, DailyCapTrackerTests, EntitlementManagerTests, OnboardingFlowTests, PermissionPrimingTests), each referencing the not-yet-built production symbol it will eventually gate

## Task Commits

Each task was committed atomically:

1. **Task 1: Human-verify RevenueCat package legitimacy (T-04-SC)** - recorded in `5fff379` commit body (no code change; user responded "approved" for SPM URL `https://github.com/RevenueCat/purchases-ios.git`, `from: "5.80.2"`)
2. **Task 2: Add RevenueCat SPM package + TaxonomyEntry model + synced bundled taxonomy + StoreKit config** - `5fff379` (feat)
3. **Task 3: Create 7 failing Wave-0 test scaffolds** - `8bbcbc6` (test)

**Plan metadata:** commit pending (this SUMMARY + STATE/ROADMAP update)

## Files Created/Modified
- `project.yml` - added RevenueCat SPM package entry + BanterApp target dependency
- `BanterShared/Sources/BanterShared/Models/TaxonomyEntry.swift` - Codable model, 5 fields (framework, technique, tagName, explanation, citation)
- `BanterApp/Resources/taxonomy.json` - bundled offline copy of backend taxonomy
- `Backend/scripts/sync-taxonomy.sh` - drift guard, mirrors sync-fixture.sh
- `Banter.storekit` - weekly premium product + 14-day trial + premium entitlement
- `BanterShared/Tests/BanterSharedTests/TonePickerTests.swift` - COAC-02 round-trip test (4 ReplyStyle cases)
- `BanterShared/Tests/BanterSharedTests/TagExplainerTests.swift` - COAC-04 taxonomy lookup test
- `BanterShared/Tests/BanterSharedTests/SentimentTimelineStoreTests.swift` - CALC-02/03 round-trip, isolation, negative structural guard
- `BanterShared/Tests/BanterSharedTests/DailyCapTrackerTests.swift` - MONE-01 daily-cap blocking + date-scoped reset
- `BanterShared/Tests/BanterSharedTests/EntitlementManagerTests.swift` - MONE-02/03 protocol-seam entitlement states
- `BanterUITests/OnboardingFlowTests.swift` - ONBD-01 fresh-install -> suggestions, zero paywall/signup UI
- `BanterUITests/PermissionPrimingTests.swift` - ONBD-02 Photos priming heading precedes system prompt

## Decisions Made
- RevenueCat/purchases-ios T-04-SC checkpoint approved by human exactly as specified in the plan (official org repo, SPM URL, version pin) — no changes to the package/version requested.
- Bundled-copy-of-taxonomy.json approach used (not a new backend endpoint), per 04-RESEARCH.md's Open Question 2 default.
- EntitlementManagerTests defines its own `EntitlementSource`/`EntitlementState` protocol seam locally in the test file (rather than assuming production names) so the test both documents the expected seam shape for the later plan's `EntitlementManager` implementation and compiles without `import RevenueCat`.

## Deviations from Plan

None - plan executed exactly as written. Task 1's human-verify checkpoint was satisfied by the user's prior "approved" response (with the exact package/version specified in the plan, no concerns raised); Tasks 2 and 3 were executed to their acceptance criteria without needing any Rule 1-4 deviations.

## Issues Encountered

None. No local Swift toolchain is available in this environment (Windows host) — per Phases 1-3 precedent, all acceptance criteria were verified via grep-based structural checks (file existence, exact field/token presence) rather than `swift test`/`xcodebuild`. Actual compile-time red-state verification (the 7 new test files failing specifically on "cannot find X in scope" for the not-yet-built production symbols, not on an unrelated syntax error) is deferred to CI, consistent with every prior phase in this project.

## User Setup Required

None - no external service configuration required. The RevenueCat public API key (to be added when `EntitlementManager` is implemented in a later plan) is safe-to-embed client-side per 04-RESEARCH.md; only the SPM package *add* itself needed human legitimacy verification, which was completed in Task 1.

## Next Phase Readiness

- RevenueCat is a declared, human-vetted SPM dependency — later Phase 4 plans (04-02 through 04-05) can now `import RevenueCat` inside `EntitlementManager` without a fresh supply-chain gate.
- TaxonomyEntry decodes the offline-bundled taxonomy — `TagExplainer` (04-0x) has a real data source to read from with zero network dependency.
- Banter.storekit is present for local purchase/trial testing once `PaywallView`/`EntitlementManager` are built.
- All 7 Wave-0 test files exist as real `<automated>` gates for later plans' acceptance criteria — each plan building `TonePicker`, `TagExplainer`, `SentimentTimelineStore`, `DailyCapTracker`, `EntitlementManager`, the onboarding Welcome/suggestions flow, or the Photos permission-priming screen should expect its corresponding Wave-0 test to flip from red to green as the direct, plan-level completion signal.
- CI (GitHub Actions macOS runner) remains the sole environment that can confirm actual compile/test-red-state for this plan's new test files — flag for the next executor/verifier to check the CI run once pushed.

---
*Phase: 04-companion-app-ui-paywall*
*Completed: 2026-07-04*
