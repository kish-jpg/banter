# Deferred Items — Phase 4

Out-of-scope gaps recorded during the Phase 4 code-review fix pass (04-REVIEW.md).

## From code review (WR-02) — monetization surfaces built but not wired

**MONE-01/MONE-02 UI is structurally inert as shipped in Phase 4.** The app
root is `ContentView -> ValueDemoCoordinatorView` (the ONBD-01 ungated
onboarding demo path), and that is the entire reachable UI. The following
have zero production call sites:

- `PaywallView` — never presented; `dailyCapReached` is observed by nothing.
- `DowngradeBanner` — `DowngradeBannerStorageKey.lastSeenDowngrade` is
  written/read by nothing; "shown once per downgrade event" is unimplemented.
- `ConversationHealthView` — nothing writes to `SentimentTimelineStore` in
  production, so it would always show the empty state.
- `EntitlementManager` / `DailyCapTracker` — never constructed in production;
  the only `CoachingResultModel` instantiation (onboarding demo) passes no
  `capGate`, so every analysis in the shipping app is uncapped.

**Why not wired in the review-fix pass:** wiring requires a new
post-onboarding home/settings surface that constructs
`EntitlementManager` + `DailyCapTracker`, supplies
`capGate`/`onAnalysisRecorded` to `CoachingResultModel`, and presents
`PaywallView` when `dailyCapReached` flips — a feature build, not a fix.
Any wiring must also preserve the ONBD-01 hard invariant: the onboarding
demo path stays ungated (no `EntitlementManager`/`DailyCapTracker` code
references in demo-path files).

**Action for verification:** do NOT count MONE-01/MONE-02 UI enforcement as
delivered in Phase 4. The cap gate, paywall presentation, downgrade banner,
and health-view write path land with the first post-onboarding surface
(planned alongside Phase 5's keyboard flow or a dedicated home-surface plan).

## From code review (WR-11) — no production coaching endpoint

`CoachingClient.defaultBaseURL` targets `http://localhost:54321` in DEBUG and
an unroutable `.invalid` sentinel host in release (fails fast at the
suggestions error+Retry surface). Before any real-device/TestFlight build:
deploy the coaching edge function, then move the base URL into
xcconfig/Info.plist and replace the sentinel.
