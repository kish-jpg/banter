# Walking Skeleton — Banter

**Phase:** 1
**Generated:** 2026-07-03

## Capability Proven End-to-End

The companion app writes sample structured data (a conversation message, a reply suggestion, a sentiment event) into an App Group container via the shared `BanterShared` package, and the keyboard extension reads it back — verified by a green GitHub Actions run that generates the Xcode project from `project.yml`, builds both targets on the iOS Simulator with no code signing, and passes the App Group round-trip test plus the CAPT-04 no-raw-image structural guard test.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Project generation | **XcodeGen** (`project.yml` → `Banter.xcodeproj`) | Developer has NO Mac; the project must be fully declarative text. XcodeGen is the lazy fit for a 2-target skeleton (Tuist's caching/DSL is overkill). The generated `.xcodeproj` is a gitignored build artifact regenerated in CI. |
| Build/test environment | **GitHub Actions `macos-26` runner**, simulator-only, no signing | The only available "device" — local machine is Windows. Simulator builds need no signing/no paid Apple account, covering 100% of Phase 1's criteria. |
| Shared data contract | **`BanterShared` local SPM package** imported by both targets | Single source of truth for model shapes + App Group suite name; prevents the classic keyboard-extension drift bug (app and extension silently disagreeing on a key). |
| App ↔ keyboard handoff | **App Group `group.com.banter.shared`** via `AppGroupStore` (`UserDefaults(suiteName:)`) | Sanctioned iOS pattern; app writes, keyboard reads. Suite name declared exactly once in `AppGroupStore.suiteName`. |
| Privacy boundary (CAPT-04) | **Structural: String/primitive-only network DTOs + build-time guard test** | "Raw screenshots never leave the device" is a compile-time type constraint (DTOs cannot declare `Data`/`UIImage`) backed by a grep-based guard test, not a convention. No live backend exists yet. |
| Git topology | **Dedicated private GitHub repo `kish-jpg/banter`** (independent `.git`, nested in Nex_Doc on disk) | Mirrors the sibling FocusForge pattern. CI needs a GitHub repo; the monorepo remote is claimed by an unrelated project and holds unrelated private content. |
| Deployment target | **iOS 17.0** | Max device compatibility; Apple Foundation Models (iOS 26) treated as a later enhancement, not a baseline. Built with the iOS 26 SDK (App Store requirement) but supporting iOS 17. |
| Directory layout | **`BanterApp/`, `BanterKeyboard/`, `BanterShared/` at repo root**, `project.yml` + `.github/workflows/ci.yml` at root | Matches project-level ARCHITECTURE.md; Phase 1 builds only the skeleton subset. |
| Paid Apple Developer account | **Deferred** (not needed until on-device/TestFlight — likely Phase 5, certainly Phase 8) | Simulator CI covers all Phase 1 criteria signing-free. |

## Stack Touched in Phase 1

- [x] Project scaffold — XcodeGen `project.yml` (2 targets) + `.github/workflows/ci.yml` + `.gitignore`, lint/build/test via `xcodebuild` on the runner
- [x] Routing — N/A (single-screen skeleton app; one keyboard input view)
- [x] "Database" — App Group container read AND write (app writes 3 model types, keyboard reads them back) via `AppGroupStore`
- [x] UI — BanterApp button writes sample data; BanterKeyboard displays what it read (one interactive write + one read-and-render)
- [x] Deployment — green GitHub Actions CI run on the dedicated repo (the only full-stack run environment; no local Mac)

## Out of Scope (Deferred to Later Slices)

Explicit — this list prevents later phases from re-litigating Phase 1's minimalism:

- Real screenshot import, Vision OCR, speaker attribution, transcript confirmation → **Phase 2**
- Any live backend / HTTP call / LLM orchestration (the CAPT-04 boundary this phase is a *type/test* guarantee, not a tested network call — no backend exists yet) → **Phase 3**
- Real onboarding, suggestion cards, tone control, love-calculator UI, paywall → **Phase 4**
- Real keyboard suggestion UI, one-tap insertion, Full Access / `RequestsOpenAccess YES`, guided enable flow → **Phase 5**
- On-device (cross-process, real-device) App Group verification — Phase 1 proves it same-process on the simulator only; device proof needs a paid account (**Phase 5+**)
- Profile engine, XP, own-attempt grading → **Phase 6**
- Server retention/TTL, in-app deletion, training-consent opt-in → **Phase 7**
- Instrumentation, App Review notes, App Store submission, JD-address folder migration into `10-19 Apps/` → **Phase 8 / workspace migration** (a Nex_Doc workspace concern, NOT one of Banter's 8 roadmap phases)

## Subsequent Slice Plan

Each later phase adds one vertical slice on top of this skeleton without altering its architectural decisions (XcodeGen, macos-26 CI, BanterShared contract, App Group handoff, structural privacy boundary):

- **Phase 2:** Screenshot → on-device OCR → confirmable, speaker-attributed transcript (+ paste fallback) — produces `[ConversationMessage]` feeding `AnalyzeConversationRequest`.
- **Phase 3:** Confirmed transcript → single schema-enforced backend call → 3 psychology-tagged replies + sentiment, gated by an allowlist/banlist artifact.
- **Phase 4:** Onboarding + suggestion cards + tone + love-calculator timeline + freemium reverse trial (RevenueCat/StoreKit 2).
- **Phase 5:** Thin keyboard reads cached suggestions from the App Group and inserts one-tap, Full-Access-off; guided enable flow. (First phase likely needing the paid account for real-device App Group proof.)
- **Phase 6:** Profile engine, personalization, own-attempt grading, XP/levels/"texting DNA".
- **Phase 7:** Short-TTL user-keyed retention, in-app data deletion, explicit training-consent opt-in.
- **Phase 8:** Instrumentation, cohort analysis, App Review notes (guideline 4.5.4 + Nov 2025 AI-transparency wording), App Store submission on the iOS 26 SDK.
