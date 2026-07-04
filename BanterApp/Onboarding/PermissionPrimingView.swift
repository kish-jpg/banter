import SwiftUI

/// Screen 4.2 — generic permission priming explainer (ONBD-02,
/// 04-UI-SPEC.md). Parameterized (icon/heading/body/onContinue/onSkip) so
/// Phase 5's keyboard-enable priming reuses this exact component -
/// written generic from the start, never Photos-hardcoded.
struct PermissionPrimingView: View {
    let icon: String
    let heading: String
    let body_: String
    let onContinue: () -> Void
    let onSkip: () -> Void

    init(icon: String, heading: String, body: String, onContinue: @escaping () -> Void, onSkip: @escaping () -> Void) {
        self.icon = icon
        self.heading = heading
        self.body_ = body
        self.onContinue = onContinue
        self.onSkip = onSkip
    }

    var body: some View {
        VStack(spacing: Banter.Spacing.md) {
            Spacer()

            Image(systemName: icon)
                .font(.system(size: 64))
                .foregroundStyle(Banter.Colors.textSecondary)
                .padding(.top, Banter.Spacing.xl)
                .accessibilityHidden(true)

            Text(heading)
                .font(Banter.TextStyle.heading)
                .multilineTextAlignment(.center)

            Text(body_)
                .font(Banter.TextStyle.body)
                .foregroundStyle(Banter.Colors.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Banter.Spacing.md)

            Button {
                onContinue()
            } label: {
                Text("Continue")
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

            Button {
                onSkip()
            } label: {
                Text("Not Now")
                    .font(Banter.TextStyle.body)
                    .foregroundStyle(Banter.Colors.accent)
                    .frame(minHeight: 44)
            }

            Spacer()
        }
        .padding(.horizontal, Banter.Spacing.md)
        .background(Banter.Colors.background.ignoresSafeArea())
    }
}

extension PermissionPrimingView {
    /// The Photos permission priming instance (04-UI-SPEC.md Screen 4.2).
    /// Copy must stay technically true to CAPT-04's structural guarantee -
    /// this is not marketing language.
    static func photos(onContinue: @escaping () -> Void, onSkip: @escaping () -> Void) -> PermissionPrimingView {
        PermissionPrimingView(
            icon: "photo.on.rectangle.angled",
            heading: "Let Banter read your screenshot",
            body: "We only look at the one screenshot you choose. It never leaves your device — Banter reads it, then forgets it.",
            onContinue: onContinue,
            onSkip: onSkip
        )
    }
}
