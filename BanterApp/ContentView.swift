import SwiftUI
import BanterShared
import PostHog

/// App root. A fresh install enters the onboarding coordinator (Welcome ->
/// Photos priming -> real import/confirm/coaching demo loop, ONBD-01/02)
/// rather than jumping straight to Import Entry. `--seed-sample-transcript`
/// alone (no onboarding seed arg) still lands directly on the Confirm
/// screen via ImportFlowModel's own seed, preserving the Phase 2
/// ScreenshotArtifactTests CI path unchanged. Once onboarding completes,
/// later launches route straight to the real (cap-gated) HomeView --
/// ContentView only routes between the two; it never constructs
/// entitlement/cap machinery itself (that lives in HomeModel).
struct ContentView: View {
    @AppStorage("hasCompletedOnboarding") private var hasCompletedOnboarding = false

    var body: some View {
        NavigationStack {
            Group {
                if hasCompletedOnboarding && !forcesOnboarding {
                    HomeView()
                } else {
                    ValueDemoCoordinatorView(onComplete: {
                        PostHogSDK.shared.capture("onboarding_completed")
                        hasCompletedOnboarding = true
                    })
                }
            }
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    /// DEBUG-only: a fresh-install/reset-onboarding seed on a reused CI
    /// simulator must always force onboarding, even if a stale persisted
    /// `hasCompletedOnboarding` flag says otherwise. `--seed-sample-transcript`
    /// alone is deliberately NOT included here -- that path must keep
    /// routing exactly as it does today.
    private var forcesOnboarding: Bool {
        #if DEBUG
        CommandLine.arguments.contains(OnboardingFlowModel.seedFreshInstallArgument)
            || CommandLine.arguments.contains(OnboardingFlowModel.resetOnboardingStateArgument)
        #else
        false
        #endif
    }
}
