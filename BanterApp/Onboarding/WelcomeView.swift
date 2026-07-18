import SwiftUI
import PostHog

/// Screen 4.1 — Onboarding Welcome (ONBD-01, 04-UI-SPEC.md). First screen a
/// fresh install sees. Routes straight into the real screenshot -> confirm
/// -> coaching loop - no signup/login screen exists in this phase's scope.
struct WelcomeView: View {
    let model: OnboardingFlowModel

    var body: some View {
        ScrollView {
            VStack(spacing: Banter.Spacing.md) {
                Image(systemName: "bubble.left.and.bubble.right.fill")
                    .font(.system(size: 56))
                    .foregroundStyle(Banter.Colors.accent)
                    .padding(.top, Banter.Spacing.xxxl)
                    .accessibilityHidden(true)

                Text("Never freeze on a reply again")
                    .font(Banter.TextStyle.display)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, Banter.Spacing.md)

                Text("Import a screenshot, get 3 great replies instantly — with the psychology behind each one.")
                    .font(Banter.TextStyle.body)
                    .foregroundStyle(Banter.Colors.textSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, Banter.Spacing.md)

                Button {
                    PostHogSDK.shared.capture("onboarding_started")
                    model.start()
                } label: {
                    Text("Try It Now")
                        .font(Banter.TextStyle.body)
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .frame(minHeight: 52)
                }
                .buttonStyle(.borderedProminent)
                .tint(Banter.Colors.accent)
                .clipShape(RoundedRectangle(cornerRadius: Banter.Radius.md))
                .padding(.horizontal, Banter.Spacing.md)
                .padding(.top, Banter.Spacing.md)
            }
        }
        .background(Banter.Colors.background.ignoresSafeArea())
    }
}
